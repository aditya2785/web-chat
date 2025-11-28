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

// ✅ ALLOWED FRONTEND DOMAINS
const allowedOrigins = [
  "http://localhost:5173",
  "https://web-chat-blush.vercel.app"
];

// ================= SOCKET.IO =================
export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// ================= MIDDLEWARE =================
app.use(express.json({ limit: "10mb" }));

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS blocked: " + origin));
  },
  credentials: true
}));

// ================= ROUTES =================
app.get("/", (req, res) => {
  res.send("✅ Backend working!");
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

// ================= DATABASE =================
await connectDB();

// ================= SERVER =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
