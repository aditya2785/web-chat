import express from "express";
import {
  checkAuth,
  login,
  signup,
  updateProfile,
} from "../controllers/userController.js";
import { protectRoute } from "../middleware/auth.js";
import User from "../models/User.js"; // ✅ fixed import (file is User.js, not userModel.js)

const userRouter = express.Router();

userRouter.post("/signup", signup);
userRouter.post("/login", login);
userRouter.put("/update-profile", protectRoute, updateProfile);
userRouter.get("/check", protectRoute, checkAuth);

// ✅ New route: get all users except logged-in one
userRouter.get("/users", protectRoute, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select(
      "-password"
    );

    res.json({
      success: true,
      users,
      unseenMessages: {}, // you can later replace this with real unseen message count
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= ADMIN DELETE USER =================
userRouter.delete("/delete/:id", protectRoute, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only."
      });
    }

    const userToDelete = await User.findById(req.params.id);

    if (!userToDelete) {
      return res.json({ success: false, message: "User not found" });
    }

    // Prevent admin deleting himself
    if (req.user._id.toString() === req.params.id) {
      return res.json({
        success: false,
        message: "You cannot delete your own admin account"
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "User deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


export default userRouter;
