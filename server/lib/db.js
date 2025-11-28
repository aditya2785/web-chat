import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Database Connected to:", mongoose.connection.name);
  } catch (error) {
    console.log("DB ERROR:", error.message);
  }
};
