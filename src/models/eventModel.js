import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  Event_PublicID: String,
  Event_UserID: String,
  Event_CreatedUserID: String,
  Event_CompanyID: String,
  Event_Title: String,
  Event_Description: String,
  Event_Date: Date,
  Event_Time: String,
  Event_EndTime: String,
  Event_TimeZone: String,
  Event_Visibility: String,
  Event_CreatedDate: { type: Date, default: Date.now },
  Event_UpdatedDate: { type: Date, default: Date.now },
  // Add other fields as necessary
});

const Event = mongoose.model("Event", eventSchema, "Event");
export default Event; 