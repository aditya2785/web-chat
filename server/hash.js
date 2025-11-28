import bcrypt from "bcryptjs";

const run = async () => {
  const password = "NewAdmin123"; // <--- your new password
  const hash = await bcrypt.hash(password, 10);
  console.log(hash);
};

run();
