import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  User_PublicID: { type: String },
  User_Name: { type: String },
  User_Fname: { type: String },
  User_Lname: { type: String },
  User_Title: { type: String },
  User_Email: { type: String },
  User_Phone: { type: String },
  User_Gender: { type: String },
  User_Password: { type: String },
  User_HeroLine: { type: String },
  User_About: { type: String },
  User_Address: { type: String },
  User_BusinessNameShowHide: { type: String },
  User_Status: { type: String },
  User_ImageURL: { type: String },
  User_WallpaperImageURL: { type: String },
  User_TimeJoined: { type: Date },
  User_IPJoined: { type: String },
  User_NumLoginTries: { type: Number },
  User_IsAdminTF: { type: Boolean },
  User_IsCompaniesAdminTF: { type: Boolean },
  User_IsEventsAdminTF: { type: Boolean },
  User_IsAllowedPostTF: { type: Boolean },
  User_IsAllowedPersonalPageTF: { type: Boolean },
  User_IsAllowedSubscribersTF: { type: Boolean },
  User_PasswordResetToken: { type: String },
  User_TimeLastPasswordReset: { type: Date },
  User_Role: { type: String },
  User_Status: { type: String },
  User_LoghicCommissionPercent: { type: Number },
  User_Authentication: { type: String },
  User_IsDeleted: { type: Boolean },
  User_DeletedTime: { type: Date },
  User_Token: { type: String },
  User_Label: { type: String },
  User_WelcomeOption: { type: String },
  User_Created_at: { type: Date },
  User_Updated_at: { type: Date },
});

userSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

userSchema.set("toJSON", { virtuals: true });

export const userModel = mongoose.model("User", userSchema, "User");
