import express from "express";
import {
  checkAuth,
  login,
  signup,
  updateProfile,
} from "../controllers/userController.js";
import { protectRoute } from "../middleware/auth.js";
import { verifyAdmin } from "../middleware/adminMiddleware.js";
import User from "../models/User.js";

const userRouter = express.Router();

// ================= AUTH ROUTES =================
userRouter.post("/signup", signup);
userRouter.post("/login", login);
userRouter.put("/update-profile", protectRoute, updateProfile);
userRouter.get("/check", protectRoute, checkAuth);

// ================= GET ALL USERS =================
userRouter.get("/users", protectRoute, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select("-password");

    res.json({
      success: true,
      users,
      unseenMessages: {},
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================= ADMIN DELETE USER =================
userRouter.delete("/delete/:id", protectRoute, verifyAdmin, async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.json({
        success: false,
        message: "You cannot delete your own admin account"
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
