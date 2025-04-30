import mongoose from 'mongoose';

const advisorSchema = new mongoose.Schema({
    User_PublicID: String,
    User_Name: String,
    User_Fname: String,
    User_Lname: String,
    User_Title: String,
    User_Email: String,
    User_Phone: String,
    User_Gender: String,
    User_Password: String,
    User_HeroLine: String,
    User_About: String,
    User_Address: String,
    User_BusinessNameShowHide: String,
    User_Status: String,
    User_ImageURL: String,
    User_WallpaperImageURL: String,
    User_TimeJoined: Date,
    User_IPJoined: String,
    User_NumLoginTries: Number,
    User_IsAdminTF: Boolean,
    User_IsCompaniesAdminTF: Boolean,
    User_IsEventsAdminTF: Boolean,
    User_IsAllowedPostTF: Boolean,
    User_IsAllowedPersonalPageTF: Boolean,
    User_IsAllowedSubscribersTF: Boolean,
    User_PasswordResetToken: String,
    User_TimeLastPasswordReset: Date,
    User_Role: String,
    User_LoghicCommissionPercent: Number,
    User_Authentication: String,
    User_IsDeleted: Boolean,
    User_DeletedTime: Date,
    User_Token: String,
    User_Label: String,
    User_WelcomeOption: String,
    User_Created_at: Date,
    User_Updated_at: Date
});

advisorSchema.virtual("id").get(function () {
    return this._id.toHexString();
});

advisorSchema.set("toJSON", { virtuals: true });

const Advisor = mongoose.model("Advisor", advisorSchema, "User");
export default Advisor; 