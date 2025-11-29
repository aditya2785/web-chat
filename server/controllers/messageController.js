// controllers/messageController.js
import Message from "../models/message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSockets } from "../server.js";

// helper: get all socket ids for a user
const getUserSocketIds = (userId) => {
  if (!userSockets[userId]) return [];
  return Array.from(userSockets[userId]);
};

// ================= GET USERS =================
export const getUsersForSidebar = async (req, res) => {
  try {
    const userId = req.user._id;
    const users = await User.find({ _id: { $ne: userId } }).select("-password");

    const unseenMessages = {};
    for (const user of users) {
      const count = await Message.countDocuments({
        senderId: user._id,
        receiverId: userId,
        seen: false,
      });
      if (count > 0) unseenMessages[user._id] = count;
    }

    res.json({ success: true, users, unseenMessages });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ================= GET MESSAGES =================
export const getMessages = async (req, res) => {
  try {
    const myId = req.user._id;
    const selectedUserId = req.params.id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: selectedUserId },
        { senderId: selectedUserId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    // mark as seen for messages sent by selectedUser -> me
    await Message.updateMany(
      { senderId: selectedUserId, receiverId: myId, seen: false },
      { seen: true }
    );

    // notify sender (selectedUser)
    const updated = await Message.find({
      senderId: selectedUserId,
      receiverId: myId,
      seen: true,
    }).select("_id senderId");

    const senderSocketIds = getUserSocketIds(selectedUserId);
    updated.forEach((m) => {
      senderSocketIds.forEach((sid) =>
        io.to(sid).emit("messageSeenUpdate", m._id.toString())
      );
    });

    res.json({ success: true, messages });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ================= MARK SEEN (single message) =================
export const markMessageAsSeen = async (req, res) => {
  try {
    const msgId = req.params.id;
    const message = await Message.findByIdAndUpdate(
      msgId,
      { seen: true },
      { new: true }
    );

    if (message) {
      const senderSocketIds = getUserSocketIds(message.senderId);
      senderSocketIds.forEach((sid) =>
        io.to(sid).emit("messageSeenUpdate", message._id.toString())
      );
    }

    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ================= SEND TEXT / IMAGE / AUDIO (BASE64) =================
export const sendMessage = async (req, res) => {
  try {
    const { text, image, file, voice } = req.body; // 🔥 voice = base64 audio
    const senderId = req.user._id;
    const receiverId = req.params.id;

    let imageUrl = "";
    let voiceUrl = "";

    // IMAGE UPLOAD
    if (image) {
      const upload = await cloudinary.uploader.upload(image, {
        folder: "chat-images",
        resource_type: "auto",
      });
      imageUrl = upload.secure_url;
    }

    // AUDIO (BASE64) – no cloudinary needed
    if (voice) {
      voiceUrl = voice;
    }

    const message = await Message.create({
      senderId,
      receiverId,
      type: voice ? "voice" : image ? "image" : "text",
      text: text || "",
      image: imageUrl,
      voice: voiceUrl,
      file: file || null,
    });

    // Emit to receiver
    const receiverSocketIds = getUserSocketIds(receiverId);
    receiverSocketIds.forEach((sid) => io.to(sid).emit("newMessage", message));

    // sender delivery confirm
    const senderSocketIds = getUserSocketIds(senderId);
    senderSocketIds.forEach((sid) =>
      io.to(sid).emit("messageDelivered", message._id.toString())
    );

    res.json({ success: true, newMessage: message });
  } catch (error) {
    console.error("sendMessage error:", error);
    res.json({ success: false, message: error.message });
  }
};

// ================= SEND FILE (CLOUDINARY) =================
export const sendFileMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;

    const upload = cloudinary.uploader.upload_stream(
      { resource_type: "raw" },
      async (error, result) => {
        if (error) return res.json({ success: false });

        const message = await Message.create({
          senderId,
          receiverId,
          type: "file",
          file: {
            url: result.secure_url,
            name: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
          },
        });

        const receiverSocketIds = getUserSocketIds(receiverId);
        receiverSocketIds.forEach((sid) =>
          io.to(sid).emit("newMessage", message)
        );

        const senderSocketIds = getUserSocketIds(senderId);
        senderSocketIds.forEach((sid) =>
          io.to(sid).emit("messageDelivered", message._id.toString())
        );

        res.json({ success: true, newMessage: message });
      }
    );

    upload.end(req.file.buffer);
  } catch (error) {
    console.error("sendFileMessage error:", error);
    res.json({ success: false, message: error.message });
  }
};
