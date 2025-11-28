import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ FIXED: use decoded.userId (correct field)
    const user = await User.findById(decoded.userId);

    if (!user || !user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Admin Auth Error:", error.message);
    res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};
