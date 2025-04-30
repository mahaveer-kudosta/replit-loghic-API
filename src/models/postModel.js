import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  Post_PublicID: { type: String, required: true },
  Post_Title: { type: String, required: true },
  Post_Overview: { type: String },
  Post_Text: { type: String, required: true },
  Post_ImageURL: { type: String },
  Post_VideoURL: { type: String },
  Post_PdfURL: { type: String },
  Post_StatusTF: { type: Boolean, default: true },
  Post_CompanyID: { type: String },
  Post_CompanyCode: { type: String },
  Post_CompanyName: { type: String },
  Post_CompanyLogoURL: { type: String },
  Post_NumComments: { type: Number, default: 0 },
  Post_NumLikes: { type: Number, default: 0 },
  Post_NumDislikes: { type: Number, default: 0 },
  Post_NumViews: { type: Number, default: 0 },
  Post_PublishedAt: { type: Date },
  Post_ReleaseUnixTime: { type: Number },
  Post_ReleaseUnixTimeSydney: { type: Date },
  Post_UserID: { type: String, required: true },
  Post_UserName: { type: String },
  Post_UserImageURL: { type: String },
  Post_Visibility: { type: String, default: 'public' },
  Post_Status: { type: String, default: 'publish' },
  Post_CompanyCollaborate: { type: Boolean, default: false },
  Post_TypeUserOrCompany: { type: String, default: 'company' },
  Post_Category: { type: String },
  Post_AdvisorSecuritiesMentioned: { type: String },
  Post_Language: { type: String },
  Post_Symbol: { type: String },
  Post_AllSymbol: { type: String },
  Post_Country: { type: String },
  Post_MatchScore: { type: String },
  Post_SentimentScore: { type: String },
  Post_Source: { type: String },
  Post_Keywords: { type: String },
  Post_MarketType: { type: String },
  Post_CreatedDate: { type: Date, default: Date.now },
  Post_UpdatedDate: { type: Date, default: Date.now }
});

postSchema.virtual("id").get(function () {
  return this._id.toHexString();
});
postSchema.set("toJSON", { virtuals: true });

const Post = mongoose.model("Post", postSchema, "Post");
export default Post; 