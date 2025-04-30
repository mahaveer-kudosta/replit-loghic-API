import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  Company_PublicID: String,
  Company_Name: String,
  Company_Symbol: String,
  Company_LogoURL: String,
  Company_WebsiteURL: String,
  Company_Categories: String,
  Company_NumArticles: Number,
  Company_NumFollowers: Number,
  Company_Status: String,
  Company_MarketType: String,
  Company_UnixtimeCreated: Number,
});

companySchema.virtual("id").get(function () {
  return this._id.toHexString();
});
companySchema.set("toJSON", { virtuals: true });

const Company = mongoose.model("Company", companySchema, "Company");
export default Company; 