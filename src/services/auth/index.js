import dotenv from "dotenv";
import nodemailer from "nodemailer";
import randomToken from "random-token";
import bcrypt from "bcrypt";
import { userModel } from "../../schemas/user.schema";
import { passwordResetModel } from "../../schemas/passwordResets.schema";
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp-relay.sendinblue.com",
  port: 587,
  auth: {
    user: "suresh@kudosta.com",
    pass: "jnt3pKMGfW9RZ7V1",
  },
  tls: {
    rejectUnauthorized: false,
  },
  logger: true,
  debug: true,
});

export const loginRouteHandler = async (req, res, email, password) => { 
  //Check If User Exists 
  let foundUser = await userModel.findOne({ User_Email: email }); 
  if (foundUser == null) 
  {
    return res.status(400).json({
      errors: [{ detail: "Credentials don't match any existing users" }],
    });
  } 
  else 
  {
    const validPassword = await bcrypt.compare(password, foundUser.User_Password);
    if (validPassword) 
    {
      // Generate JWT token
      const token = jwt.sign( { id: foundUser.id, email: foundUser.User_Email, role: foundUser.User_Role },
        process.env.JWT_SECRET, { expiresIn: "24h" });
      return res.json({ token_type: "Bearer", expires_in: "24h", role: foundUser.User_Role,
        access_token: token, refresh_token: token
      });
    } 
    else 
    {
      return res.status(400).json({ errors: [{ detail: "Invalid password" }]});
    }
  }
};

// Function to generate a unique ID similar to PHP's uniqid()
const generateUniqueId = () => {
  return crypto.randomBytes(7).toString('hex').slice(0, 13); // Generates a 13-character hex string
};

export const registerRouteHandler = async (req, res, name, email, password) => {
  const { firstName, lastName, phone, gender } = req.body.data.attributes;
  // check if user already exists
  let foundUser = await userModel.findOne({ User_Email: email });
  if (foundUser) {
    // does not get the error
    return res.status(400).json({ message: "Email is already in use" });
  }

  // check password to exist and be at least 8 characters long
  if (!password || password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters long." });
  }

  // hash password to save in db
  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(password, salt);

  const newUser = new userModel({
    User_PublicID: generateUniqueId(), // Use the custom function to generate the ID
    User_Name: `${firstName} ${lastName}`,
    User_Fname: firstName,
    User_Lname: lastName,
    User_Title: firstName.toLowerCase(),
    User_Email: email,
    User_Phone: phone,
    User_Gender: gender,
    User_Role: "general",
    User_ImageURL: "",
    User_WallpaperImageURL: "",
    Uesr_Advisor_Category	: "",
    User_Password: hashPassword,
    User_Created_at: new Date().toISOString(),
    User_Updated_at: new Date().toISOString(),
  });
  await newUser.save();

  // Generate JWT token
  const token = jwt.sign({ id: newUser.id, email: newUser.User_Email }, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });
  return res.status(200).json({
    token_type: "Bearer",
    expires_in: "24h",
    access_token: token,
    refresh_token: token,
    user: {
      User_PublicID: newUser.User_PublicID,
      User_Name: newUser.User_Name,
      User_Fname: newUser.User_Fname,
      User_Lname: newUser.User_Lname,
      User_Title: newUser.User_Title,
      User_Email: newUser.User_Email,
      User_Phone: newUser.User_Phone,
      User_Gender: newUser.User_Gender,
      User_Created_at: newUser.User_Created_at,
      User_Updated_at: newUser.User_Updated_at,
    }
  });
};

export const forgotPasswordRouteHandler = async (req, res, email) => {
  let foundUser = await userModel.findOne({ User_Email: email });

  if (!foundUser) {
    return res.status(400).json({
      message: "The email does not match any existing user."
    });
  } else {
    let token = randomToken(20);
    let resetLink = `${process.env.APP_URL_CLIENT}/auth/reset-password?token=${token}&email=${email}`;
    let emailMessage = `<p>You requested to change your password. If this request was not made by you, please contact us. Access <a href='${resetLink}'>this link</a> to reset your password.</p>`;
    
    // send mail with defined transport object
    // try {
    //   let info = await transporter.sendMail({
    //     from: "admin@jsonapi.com", // sender address
    //     to: email, // list of receivers
    //     subject: "Reset Password", // Subject line
    //     html: `<p>You requested to change your password. If this request was not made by you, please contact us. Access <a href='${process.env.APP_URL_CLIENT}/auth/reset-password?token=${token}&email=${email}'>this link</a> to reset your password.</p>`, // html body
    //   });
    // } catch (error) {
    //   return res.status(500).json({ message: "Error sending email.", error: error.message });
    // }

    // Check if a reset token already exists for this user
    let existingToken = await passwordResetModel.findOne({ email: foundUser.User_Email });

    if (existingToken) {
      // Update existing token and timestamp
      await passwordResetModel.updateOne(
        { email: foundUser.User_Email },
        {
          $set: {
            token: token,
            User_Created_at: new Date(),
          },
        }
      );
    } else {
      // Create new reset token entry
      await passwordResetModel.create({
        email: foundUser.User_Email,
        token: token,
        User_Created_at: new Date(),
      });
    }

    const dataSent = {
      message: "Check your email for reset instructions.",
      data: {
        type: "password-forgot",
        attributes: {
          redirect_url: `${process.env.APP_URL_API}/password-reset`,
          email: email,
          email_message: emailMessage,
        },
      },
    };
    
    return res.status(200).json(dataSent);
  }
};

export const resetPasswordRouteHandler = async (req, res) => {
  const foundUser = await userModel.findOne({
    User_Email: req.body.data.attributes.email,
  });

  const foundToken = await passwordResetModel.findOne({ 
    User_Email: req.body.data.attributes.email,
    token: req.body.data.attributes.token
  });

  if (!foundUser || !foundToken) {
    return res.status(400).json({errors: { email: ["The email or token does not match any existing user."] }});
  } else {
    const { password } = req.body.data.attributes;
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    await passwordResetModel.deleteOne({ User_Email: foundUser.email });

    await userModel.updateOne(
      { User_Email: foundUser.User_Email },
      { $set: { "User_Password": hashPassword } }
    );
    
    // Send success response with a message and user data
    return res.status(200).json({
      message: "Successfully reset password.",
      user: {
        email: foundUser.User_Email,
        name: foundUser.User_Name,
      }
    });
  }
};
