// server.js
import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";
import User from "./models/User.js";
import Message from "./models/message.js";

const app = express();
const server = http.createServer(app);

// AUTO-CLEAN CLIENT URLS (same logic you already had)
const CLIENT_URLS = (process.env.CLIENT_URL || "")
  .split(",")
  .map((u) => u.trim().replace(/\/$/, ""))
  .filter(Boolean);

console.log("✅ Allowed Origins:", CLIENT_URLS);

// ======= SOCKET.IO SETUP =======
export const io = new Server(server, {
  cors: {
    origin: CLIENT_URLS,
    credentials: true,
  },
});

// user -> Set(socketId)
export const userSockets = {}; // { userId: Set(socketId) }

// helper to add socket id
const addUserSocket = (userId, socketId) => {
  if (!userId) return;
  if (!userSockets[userId]) userSockets[userId] = new Set();
  userSockets[userId].add(socketId);
};

// helper to remove socket id
const removeUserSocket = (userId, socketId) => {
  if (!userId || !userSockets[userId]) return;
  userSockets[userId].delete(socketId);
  if (userSockets[userId].size === 0) delete userSockets[userId];
};

// get all socket ids for a user
const getUserSocketIds = (userId) => {
  if (!userSockets[userId]) return [];
  return Array.from(userSockets[userId]);
};

// broadcast online user list (userIds)
const broadcastOnlineUsers = () => {
  const online = Object.keys(userSockets);
  io.emit("getOnlineUsers", online);
};

io.on("connection", (socket) => {
  // Accept userId through query param for simplicity (you may switch to token auth)
  const userId = socket.handshake.query.userId || null;

  if (userId) {
    addUserSocket(userId, socket.id);
    console.log(`Socket connected: ${socket.id} (user: ${userId})`);
  } else {
    console.log(`Socket connected without userId: ${socket.id}`);
  }

  // Inform everyone about online users
  broadcastOnlineUsers();

  // Typing forwarding: client emits "typing" { senderId, receiverId }
  socket.on("typing", ({ senderId, receiverId }) => {
    if (!receiverId) return;
    const ids = getUserSocketIds(receiverId);
    ids.forEach((sid) => io.to(sid).emit("typing", { senderId }));
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    if (!receiverId) return;
    const ids = getUserSocketIds(receiverId);
    ids.forEach((sid) => io.to(sid).emit("stopTyping", { senderId }));
  });

  // Optional: allow clients to emit sendMessage directly (optimistic UX).
  // We'll still persist via REST normally, but if client emits, forward it.
  socket.on("sendMessage", async ({ message }) => {
    try {
      // message should already include senderId, receiverId, etc.
      if (!message || !message.receiverId) return;

      const receiverIds = getUserSocketIds(message.receiverId);
      // forward to receiver(s)
      receiverIds.forEach((sid) => io.to(sid).emit("newMessage", message));

      // notify sender that message was delivered to server/forwarded
      const senderSocketIds = getUserSocketIds(message.senderId);
      senderSocketIds.forEach((sid) =>
        io.to(sid).emit("messageDelivered", message._id)
      );
    } catch (err) {
      console.error("sendMessage socket error:", err);
    }
  });

  // Clean up on disconnect
  socket.on("disconnect", () => {
    if (userId) {
      removeUserSocket(userId, socket.id);
      console.log(`Socket disconnected: ${socket.id} (user: ${userId})`);
      broadcastOnlineUsers();
    } else {
      console.log(`Socket disconnected: ${socket.id}`);
    }
  });
});

// ================= MIDDLEWARE =================
// Accept big base64 images from mobile
app.use(express.json({ limit: "50mb", extended: true }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));



app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, "");
      if (CLIENT_URLS.includes(cleanOrigin)) {
        return callback(null, true);
      }
      console.log("❌ CORS BLOCKED:", origin);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options(/.*/, cors());

// ================= ROUTES =================
app.get("/", (req, res) => {
  res.send("✅ Backend running perfectly");
});

app.get("/api/users-status", async (req, res) => {
  try {
    const authUserId = req.query.userId;

    const users = await User.find(authUserId ? { _id: { $ne: authUserId } } : {}).select("-password");

    const unseenMessages = {};

    if (authUserId) {
      const unreadMsgs = await Message.find({
        receiverId: authUserId,
        seen: false,
      });

      unreadMsgs.forEach((msg) => {
        unseenMessages[msg.senderId] = (unseenMessages[msg.senderId] || 0) + 1;
      });
    }

    res.json({ success: true, users, unseenMessages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.use("/api/users", userRouter);
app.use("/api/messages", messageRouter);

// ================= DATABASE =================
await connectDB();

// ================= SERVER =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
