import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // 🔖 Message Type Controller
    type: {
      type: String,
      enum: ["text", "image", "voice", "file"],
      default: "text"
    },

    // 📝 Text Message
    text: {
      type: String,
      default: ""
    },

    // 🖼 Image Message (URL)
    image: {
      type: String,
      default: ""
    },

    // 🎤 Voice Message (Cloud URL)
    voice: {
      type: String,
      default: ""
    },

    // 📎 File Message
    file: {
      url: { type: String, default: "" },
      name: { type: String, default: "" },
      mimeType: { type: String, default: "" },
      size: { type: Number, default: 0 }
    },

    // 👁 Seen by receiver
    seen: {
      type: Boolean,
      default: false
    },

    // ✅ Delivered to receiver socket
    delivered: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
