import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};
