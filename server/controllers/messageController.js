// controllers/messageController.js
import Message from "../models/message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSockets } from "../server.js"; // <-- use userSockets (matches server.js export)

// ================= GET USERS FOR SIDEBAR =================
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

    await Message.updateMany(
      { senderId: selectedUserId, receiverId: myId, seen: false },
      { seen: true }
    );

    res.json({ success: true, messages });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ================= MARK SEEN =================
export const markMessageAsSeen = async (req, res) => {
  try {
    await Message.findByIdAndUpdate(req.params.id, { seen: true });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ================= SEND TEXT / IMAGE =================
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const senderId = req.user._id;
    const receiverId = req.params.id;

    let imageUrl = "";

    if (image) {
      const upload = await cloudinary.uploader.upload(image);
      imageUrl = upload.secure_url;
    }

    const message = await Message.create({
      senderId,
      receiverId,
      text: text || "",
      image: imageUrl || "",
    });

    // Emit to receiver sockets
    emitSocket(receiverId, message);

    res.json({ success: true, newMessage: message });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ================= SEND VOICE =================
export const sendVoiceMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;

    const upload = cloudinary.uploader.upload_stream(
      { resource_type: "video" },
      async (error, result) => {
        if (error) return res.json({ success: false });

        const message = await Message.create({
          senderId,
          receiverId,
          audio: result.secure_url,
        });

        emitSocket(receiverId, message);
        res.json({ success: true, newMessage: message });
      }
    );

    upload.end(req.file.buffer);
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ================= SEND FILE =================
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
          file: {
            url: result.secure_url,
            name: req.file.originalname,
            type: req.file.mimetype,
            size: req.file.size,
          },
        });

        emitSocket(receiverId, message);
        res.json({ success: true, newMessage: message });
      }
    );

    upload.end(req.file.buffer);
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ================= SOCKET EMIT =================
const emitSocket = (receiverId, message) => {
  // userSockets is { userId: Set(socketId) }
  if (!receiverId) return;

  const setOfSocketIds = userSockets[receiverId];
  if (!setOfSocketIds) return;

  // send newMessage and messageSeenUpdate (if you want)
  for (const socketId of setOfSocketIds) {
    io.to(socketId).emit("newMessage", message);
    // optionally, if you want to notify the receiver that the message was 'seen' upon delivery,
    // you can emit other events here (but typically seen is after they open).
  }

  // Also notify sender(s) that message was 'delivered' to the server/forwarded
  // If you want, fetch sender sockets and emit messageDelivered
  const senderSockets = userSockets[message.senderId];
  if (senderSockets) {
    for (const sid of senderSockets) {
      io.to(sid).emit("messageDelivered", message._id);
    }
  }
};
