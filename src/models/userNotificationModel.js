import mongoose from 'mongoose';

const userNotificationSchema = new mongoose.Schema({
    UserNotification_PublicID: {
        type: String,
        required: true,
        unique: true
    },
    UserNotification_UserID: {
        type: Number,
        required: true
    },
    UserNotification_UnixTime: {
        type: Number,
        default: () => Math.floor(Date.now() / 1000)
    },
    UserNotification_Text: {
        type: String,
        required: true
    },
    UserNotification_ImageURL: {
        type: String
    },
    UserNotification_ObjectType: {
        type: String,
        required: true,
        enum: ['Post', 'Comment', 'Follow', 'Message', 'Company']
    },
    UserNotification_ObjectID: {
        type: String,
        required: true
    },
    UserNotification_ViewedTF: {
        type: Boolean,
        default: false
    },
    UserNotification_CreatedDateTime: {
        type: Date,
        default: Date.now
    },
    UserNotification_ModifiedDateTime: {
        type: Date,
        default: Date.now
    }
});

const UserNotification = mongoose.model('UserNotification', userNotificationSchema);
export default UserNotification; 