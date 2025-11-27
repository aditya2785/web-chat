import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    profilePic: {
      type: String,
      default: ""
    },
    bio: {
      type: String,
      default: ""
    },
    isAdmin: {
      type: Boolean,
      default: false   // ✅ IMPORTANT: admin role system
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
