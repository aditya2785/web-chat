// server.js
import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import jwt from "jsonwebtoken";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";
import User from "./models/User.js";
import Message from "./models/message.js";

const app = express();
const server = http.createServer(app);

// Clean client URLs
const CLIENT_URLS = (process.env.CLIENT_URL || "")
  .split(",")
  .map((u) => u.trim().replace(/\/$/, ""))
  .filter(Boolean);

console.log("✅ Allowed Origins:", CLIENT_URLS);

// ========================== SOCKET.IO ==========================
export const io = new Server(server, {
  cors: {
    origin: CLIENT_URLS,
    credentials: true,
  },
});

// userId → Set(socketId)
export const userSockets = {};

// Helpers
const addUserSocket = (userId, socketId) => {
  if (!userSockets[userId]) userSockets[userId] = new Set();
  userSockets[userId].add(socketId);
};

const removeUserSocket = (userId, socketId) => {
  if (!userSockets[userId]) return;
  userSockets[userId].delete(socketId);
  if (userSockets[userId].size === 0) delete userSockets[userId];
};

const getUserSocketIds = (userId) => {
  return userSockets[userId] ? [...userSockets[userId]] : [];
};

const broadcastOnlineUsers = () => {
  io.emit("getOnlineUsers", Object.keys(userSockets));
};

// ====================== SOCKET AUTH + EVENTS ======================
io.on("connection", (socket) => {
  // --------- JWT AUTH ----------
  let userId = null;
  try {
    const token = socket.handshake.auth?.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    }
  } catch (err) {
    console.log("❌ Invalid JWT on socket connect");
  }

  if (!userId) {
    console.log("❌ Socket rejected — no valid user");
    socket.disconnect();
    return;
  }

  // Register socket
  addUserSocket(userId, socket.id);
  console.log(`⚡ Socket Connected: ${socket.id} (user ${userId})`);

  broadcastOnlineUsers();

  // ----------- TYPING -----------
  socket.on("typing", ({ senderId, receiverId }) => {
    getUserSocketIds(receiverId).forEach((sid) =>
      io.to(sid).emit("typing", { senderId })
    );
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    getUserSocketIds(receiverId).forEach((sid) =>
      io.to(sid).emit("stopTyping", { senderId })
    );
  });

  // ----------- OPTIMISTIC SEND (OPTIONAL) -----------
  socket.on("sendMessage", ({ message }) => {
    if (!message?.receiverId) return;

    // Send to receiver(s)
    getUserSocketIds(message.receiverId).forEach((sid) =>
      io.to(sid).emit("newMessage", message)
    );

    // Notify sender (delivered)
    getUserSocketIds(message.senderId).forEach((sid) =>
      io.to(sid).emit("messageDelivered", message._id)
    );
  });

  // ----------- CLEANUP DISCONNECT -----------
  socket.on("disconnect", () => {
    removeUserSocket(userId, socket.id);
    broadcastOnlineUsers();
    console.log(`🛑 Socket Disconnected: ${socket.id} (user ${userId})`);
  });
});

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: "10mb" }));

app.use(
  cors({
    origin: function (origin, cb) {
      if (!origin) return cb(null, true);
      const clean = origin.replace(/\/$/, "");
      if (CLIENT_URLS.includes(clean)) return cb(null, true);
      console.log("❌ CORS BLOCKED:", origin);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.options(/.*/, cors());

// ==================== ROUTES ====================
app.get("/", (req, res) => {
  res.send("✅ Backend running successfully");
});

app.use("/api/users", userRouter);
app.use("/api/messages", messageRouter);

// ==================== DATABASE ====================
await connectDB();

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
