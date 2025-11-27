import express from "express";
import { protectRoute } from "../middleware/auth.js";
import multer from "multer";
import {
  getMessages,
  getUsersForSidebar,
  markMessageAsSeen,
  sendMessage,
  sendVoiceMessage,
  sendFileMessage,
} from "../controllers/messageController.js";

const messageRouter = express.Router();

// ===================== FILE UPLOAD CONFIG =====================
const storage = multer.memoryStorage();
const upload = multer({
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

// ===================== USERS FOR SIDEBAR =====================
messageRouter.get("/users", protectRoute, getUsersForSidebar);

// ===================== GET CHAT MESSAGES =====================
messageRouter.get("/:id", protectRoute, getMessages);

// ===================== MARK MESSAGE AS SEEN =====================
messageRouter.put("/mark/:id", protectRoute, markMessageAsSeen);

// ===================== NORMAL TEXT / IMAGE MESSAGE =====================
messageRouter.post("/send/:id", protectRoute, sendMessage);

// ===================== 🎤 VOICE MESSAGE =====================
messageRouter.post(
  "/send-voice/:id",
  protectRoute,
  upload.single("audio"),
  sendVoiceMessage
);

// ===================== 📎 FILE MESSAGE =====================
messageRouter.post(
  "/send-file/:id",
  protectRoute,
  upload.single("file"),
  sendFileMessage
);

export default messageRouter;
