import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

// ================= SIGNUP =================
export const signup = async (req, res) => {
  const { fullName, email, password, bio } = req.body;

  try {
    if (!fullName || !email || !password || !bio) {
      return res.json({ success: false, message: "Missing Details" });
    }

    const user = await User.findOne({ email });
    if (user) {
      return res.json({ success: false, message: "Account already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      bio
    });

    const token = generateToken(newUser);

    // ✅ SAFE USER (remove password but KEEP isAdmin)
    const safeUser = newUser.toObject();
    delete safeUser.password;

    res.json({
      success: true,
      userData: safeUser,
      token,
      message: "Account created successfully"
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const userData = await User.findOne({ email });
    if (!userData) {
      return res.json({ success: false, message: "User not found" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, userData.password);
    if (!isPasswordCorrect) {
      return res.json({ success: false, message: "Invalid Credentials" });
    }

    const token = generateToken(userData);

    // ✅ SAFE USER
    const safeUser = userData.toObject();
    delete safeUser.password;

    res.json({
      success: true,
      userData: safeUser,
      token,
      message: "Login successful"
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ================= CHECK AUTH =================
export const checkAuth = (req, res) => {
  res.json({ success: true, user: req.user }); // already safe via middleware
};

// ================= UPDATE PROFILE =================
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio, fullName } = req.body;
    const userId = req.user._id;

    let updatedUser;

    if (!profilePic) {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { bio, fullName },
        { new: true }
      );
    } else {
      const upload = await cloudinary.uploader.upload(profilePic);
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { profilePic: upload.secure_url, bio, fullName },
        { new: true }
      );
    }

    const safeUser = updatedUser.toObject();
    delete safeUser.password;

    res.json({ success: true, user: safeUser });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
