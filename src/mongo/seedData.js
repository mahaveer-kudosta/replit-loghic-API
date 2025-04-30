import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { userModel } from "../schemas/user.schema.js";
import { dbConnect } from "../mongo/index.js";

async function seedDB() {
  dbConnect();
  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash("secret", salt);

  const user = {
    User_ID: 1,
    User_PublicID: "1",
    User_Name: "Admin",
    User_Fname: "Admin",
    User_Email: "admin@jsonapi.com",
    User_Phone: "1234567890",
    User_Gender: "Male",
    User_Password: hashPassword,
    User_HeroLine: "Admin",
    User_About: "Admin",
    User_Address: "Admin",
    User_BusinessNameShowHide: "Admin",
  };

  const admin = new userModel(user);
  await admin.save();

  console.log("DB seeded");
}

seedDB().then(() => {
  mongoose.connection.close();
});
