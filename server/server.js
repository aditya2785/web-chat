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

// ✅ SAFE CLIENT URL PARSER
const CLIENT_URLS = (process.env.CLIENT_URL || "")
  .split(",")
  .map(url => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

// ==================== SOCKET.IO ====================
export const io = new Server(server, {
  cors: {
    origin: CLIENT_URLS,
    credentials: true,
  },
});

export const userSocketMap = {};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) userSocketMap[userId] = socket.id;
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  socket.on("typing", ({ senderId, receiverId }) => {
    io.to(receiverId).emit("showTyping", senderId);
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    io.to(receiverId).emit("hideTyping", senderId);
  });
});

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: "10mb" }));

// ✅ PERFECT CORS FIX (WORKS ON LOCAL + VERCEL)
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, "");

    if (CLIENT_URLS.includes(cleanOrigin)) {
      return callback(null, true);
    }

    console.error("❌ Blocked by CORS:", origin);
    return callback(new Error("Blocked by CORS"));
  },
  credentials: true,
}));

// ==================== ROUTES ====================
app.get("/", (req, res) => {
  res.send("✅ Backend is running!");
});

app.get("/api/users-status", async (req, res) => {
  try {
    const authUserId = req.query.userId;

    const users = await User.find(
      authUserId ? { _id: { $ne: authUserId } } : {}
    ).select("-password");

    const unseenMessages = {};

    if (authUserId) {
      const unreadMsgs = await Message.find({
        receiverId: authUserId,
        seen: false,
      });

      unreadMsgs.forEach((msg) => {
        unseenMessages[msg.senderId] =
          (unseenMessages[msg.senderId] || 0) + 1;
      });
    }

    res.json({ success: true, users, unseenMessages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.use("/api/users", userRouter);
app.use("/api/messages", messageRouter);

// ==================== DATABASE ====================
await connectDB();

// ==================== SERVER ====================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
