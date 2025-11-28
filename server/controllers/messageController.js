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

    // notify sender (selectedUser) that their messages were seen
    // We find those updated messages and emit seen events to the sender
    const updated = await Message.find({
      senderId: selectedUserId,
      receiverId: myId,
      seen: true,
    }).select("_id senderId");

    // emit seen event per message (you might optimize to a single event)
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
    const message = await Message.findByIdAndUpdate(msgId, { seen: true }, { new: true });

    if (message) {
      // notify original sender that this message was seen
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


// ================= SEND TEXT / IMAGE =================
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const senderId = req.user._id;
    const receiverId = req.params.id;

    let imageUrl = "";

    if (image) {
      const upload = await cloudinary.uploader.upload(image, {
        folder: "chat-images",
        resource_type: "image",
      });
      imageUrl = upload.secure_url;
    }

    const message = await Message.create({
      senderId,
      receiverId,
      text: text || "",
      image: imageUrl || "",
    });

    // Emit to receiver
    const receiverSocketIds = getUserSocketIds(receiverId);
    receiverSocketIds.forEach((sid) => io.to(sid).emit("newMessage", message));

    // Acknowledge delivery
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


// ================= SEND VOICE =================
export const sendVoiceMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;

    const upload = cloudinary.uploader.upload_stream({ resource_type: "video" }, async (error, result) => {
      if (error) return res.json({ success: false });

      const message = await Message.create({
        senderId,
        receiverId,
        audio: result.secure_url,
      });

      // emit to receiver
      const receiverSocketIds = getUserSocketIds(receiverId);
      receiverSocketIds.forEach((sid) => io.to(sid).emit("newMessage", message));

      // notify sender that message was delivered (server forwarded)
      const senderSocketIds = getUserSocketIds(senderId);
      senderSocketIds.forEach((sid) => io.to(sid).emit("messageDelivered", message._id.toString()));

      res.json({ success: true, newMessage: message });
    });

    upload.end(req.file.buffer);
  } catch (error) {
    console.error("sendVoiceMessage error:", error);
    res.json({ success: false, message: error.message });
  }
};

// ================= SEND FILE =================
export const sendFileMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;

    const upload = cloudinary.uploader.upload_stream({ resource_type: "raw" }, async (error, result) => {
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

      // emit to receiver
      const receiverSocketIds = getUserSocketIds(receiverId);
      receiverSocketIds.forEach((sid) => io.to(sid).emit("newMessage", message));

      // notify sender
      const senderSocketIds = getUserSocketIds(senderId);
      senderSocketIds.forEach((sid) => io.to(sid).emit("messageDelivered", message._id.toString()));

      res.json({ success: true, newMessage: message });
    });

    upload.end(req.file.buffer);
  } catch (error) {
    console.error("sendFileMessage error:", error);
    res.json({ success: false, message: error.message });
  }
};
