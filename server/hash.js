import bcrypt from "bcryptjs";

const run = async () => {
  const password = "aditya"; // <--- your new password
  const hash = await bcrypt.hash(password, 10);
  console.log(hash);
};

run();
