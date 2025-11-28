import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,     // ✅ MUST be userId to match middleware
      isAdmin: user.isAdmin
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};
