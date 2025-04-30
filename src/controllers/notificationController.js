import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Create a new notification
export const createNotification = async (req, res) => {
    try {
        const {
            targetUserID,
            notificationType,
            objectType,
            objectID,
            objectSymbol,
            text,
            imageURL
        } = req.body;

        if (!targetUserID || !notificationType || !objectID) {
            return res.status(400).json({
                status: false,
                message: 'Required fields missing',
                data: {}
            });
        }

        // Check user's notification settings
        const userSettings = await mongoose.connection.db.collection('UserNotificationsSettings')
            .findOne({ UserNotificationsSettings_UserID: targetUserID });

        // If no settings found, use default (all notifications enabled)
        const settings = userSettings || {
            UserNotificationsSettings_Public_Comment: false,
            UserNotificationsSettings_Mentions_Public_Comment: false,
            UserNotificationsSettings_Like_Post: false,
            UserNotificationsSettings_Follows: false,
            UserNotificationsSettings_Send_Message: false,
            UserNotificationsSettings_Shares_Post: false
        };

        // Check if this type of notification is enabled
        let isNotificationEnabled = false;
        switch (notificationType) {
            case 'Comment':
                isNotificationEnabled = settings.UserNotificationsSettings_Public_Comment;
                break;
            case 'Mention':
                isNotificationEnabled = settings.UserNotificationsSettings_Mentions_Public_Comment;
                break;
            case 'Like':
                isNotificationEnabled = settings.UserNotificationsSettings_Like_Post;
                break;
            case 'Follow':
                isNotificationEnabled = settings.UserNotificationsSettings_Follows;
                break;
            case 'Message':
                isNotificationEnabled = settings.UserNotificationsSettings_Send_Message;
                break;
            case 'Share':
                isNotificationEnabled = settings.UserNotificationsSettings_Shares_Post;
                break;
            default:
                isNotificationEnabled = false;
        }

        if (!isNotificationEnabled) {
            return res.status(200).json({
                status: false,
                message: 'Notification type is disabled for this user',
                data: {}
            });
        }

        // Create notification
        const notification = {
            UserNotification_PublicID: uuidv4(),
            UserNotification_UserID: targetUserID,
            UserNotification_UnixTime: Math.floor(Date.now() / 1000),
            UserNotification_Text: text,
            UserNotification_ImageURL: imageURL || '',
            UserNotification_NotificationType: notificationType,
            UserNotification_ObjectType: objectType,
            UserNotification_ObjectID: objectID,
            UserNotification_ObjectSymbol: objectSymbol,
            UserNotification_ViewedTF: false,
            UserNotification_CreatedDateTime: new Date(),
            UserNotification_ModifiedDateTime: new Date()
        };

        const result = await mongoose.connection.db.collection('UserNotification')
            .insertOne(notification);

        res.status(201).json({
            status: true,
            message: 'Notification created successfully',
            data: notification
        });

    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({
            status: false,
            message: 'Internal Server Error',
            data: {}
        });
    }
};

// Get user's notifications
export const getUserNotifications = async (req, res) => {
    try {
        const User_PublicID = req.user?.User_PublicID;
        
        if (!User_PublicID) {
            return res.status(401).json({
                status: false,
                message: 'Unauthorized access',
                data: {}
            });
        }

        const notifications = await mongoose.connection.db.collection('UserNotification')
            .find({ 
                UserNotification_UserID: User_PublicID 
            })
            .sort({ UserNotification_CreatedDateTime: -1 })
            .toArray();

        res.status(200).json({
            status: true,
            message: 'Notifications retrieved successfully',
            data: notifications
        });

    } catch (error) {
        console.error('Error retrieving notifications:', error);
        res.status(500).json({
            status: false,
            message: 'Internal Server Error',
            data: {}
        });
    }
};

// Delete a specific notification
export const deleteNotification = async (req, res) => {
    try {
        const User_PublicID = req.user?.User_PublicID;
        const { notificationId } = req.params;

        if (!User_PublicID) {
            return res.status(401).json({
                status: false,
                message: 'Unauthorized access',
                data: {}
            });
        }

        const result = await mongoose.connection.db.collection('UserNotification')
            .deleteOne({
                UserNotification_PublicID: notificationId,
                UserNotification_UserID: User_PublicID
            });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                status: false,
                message: 'Notification not found',
                data: {}
            });
        }

        res.status(200).json({
            status: true,
            message: 'Notification deleted successfully',
            data: {}
        });

    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            status: false,
            message: 'Internal Server Error',
            data: {}
        });
    }
};

// Clear all notifications for a user
export const clearAllNotifications = async (req, res) => {
    try {
        const User_PublicID = req.user?.User_PublicID;

        if (!User_PublicID) {
            return res.status(401).json({
                status: false,
                message: 'Unauthorized access',
                data: {}
            });
        }

        const result = await mongoose.connection.db.collection('UserNotification')
            .deleteMany({ UserNotification_UserID: User_PublicID });

        res.status(200).json({
            status: true,
            message: 'All notifications cleared successfully',
            data: {
                deletedCount: result.deletedCount
            }
        });

    } catch (error) {
        console.error('Error clearing notifications:', error);
        res.status(500).json({
            status: false,
            message: 'Internal Server Error',
            data: {}
        });
    }
}; 