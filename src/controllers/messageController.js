import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Controller function to send a message
export const sendMessage = async (req, res) => {
  const User_PublicID = req.user?.User_PublicID;
  
  if (!User_PublicID) {
    return res.status(401).json({
      status: false,
      message: 'Unauthorized access',
      data: {},
    });
  }

  const { 
    Message_ReceiverID,
    Message_Message,
    Message_MediaURL,
    Message_MediaName,
    Message_Type = 'text'
  } = req.body;

  if (!Message_ReceiverID || !Message_Message) {
    return res.status(200).json({
      status: false,
      message: 'Message_ReceiverID and Message_Message are required',
      data: {},
    });
  }

  try {
    // Get sender details for notification
    const sender = await mongoose.connection.db.collection('User')
      .findOne({ User_PublicID }, { projection: { User_Name: 1, User_ImageURL: 1 } });

    if (!sender) {
      return res.status(404).json({
        status: false,
        message: 'Sender not found',
        data: {},
      });
    }

    // Check if there's an existing message contact between users
    const messageContact = await mongoose.connection.db
      .collection('MessageContact')
      .findOne({
        $or: [
          {
            MessageContact_UserID: User_PublicID,
            MessageContact_ConnectUserID: Message_ReceiverID
          },
          {
            MessageContact_UserID: Message_ReceiverID,
            MessageContact_ConnectUserID: User_PublicID
          }
        ]
      });

    const currentTime = new Date();
    const unixTime = Math.floor(currentTime.getTime() / 1000);

    // If no contact exists, create new contact requests for both users
    if (!messageContact) {
      // Create contact request for sender
      const senderContact = {
        MessageContact_UserID: User_PublicID,
        MessageContact_ConnectUserID: Message_ReceiverID,
        MessageContact_CompanyID: null,
        MessageContact_Type: 'user',
        MessageContact_UserType: 'sender',
        MessageContact_Status: 'pending',
        MessageContact_CreatedDate: currentTime,
        MessageContact_UpdatedDate: currentTime
      };

      // Create contact request for receiver
      const receiverContact = {
        MessageContact_UserID: Message_ReceiverID,
        MessageContact_ConnectUserID: User_PublicID,
        MessageContact_CompanyID: null,
        MessageContact_Type: 'user',
        MessageContact_UserType: 'receiver',
        MessageContact_Status: 'pending',
        MessageContact_CreatedDate: currentTime,
        MessageContact_UpdatedDate: currentTime
      };

      // Create new message
      const newMessage = {
        Message_SenderID: User_PublicID,
        Message_ReceiverID,
        Message_Message,
        Message_MediaURL: Message_MediaURL || null,
        Message_MediaName: Message_MediaName || null,
        Message_Type,
        Message_Status: 'unread',
        Message_UnixTime: unixTime,
        Message_CreatedDate: currentTime,
        Message_UpdatedDate: currentTime
      };

      // Store both contact requests and message
      const [senderResult, receiverResult, messageResult] = await Promise.all([
        mongoose.connection.db.collection('MessageContact').insertOne(senderContact),
        mongoose.connection.db.collection('MessageContact').insertOne(receiverContact),
        mongoose.connection.db.collection('Message').insertOne(newMessage)
      ]);

      // Check if receiver has message notifications enabled
      const receiverSettings = await mongoose.connection.db.collection('UserNotificationsSettings')
        .findOne({ UserNotificationsSettings_UserID: Message_ReceiverID });

      if (receiverSettings?.UserNotificationsSettings_Send_Message) {
        // Create notification for new message request
        const notification = {
          UserNotification_PublicID: uuidv4(),
          UserNotification_UserID: Message_ReceiverID,
          UserNotification_UnixTime: unixTime,
          UserNotification_Text: `${sender.User_Name} wants to start a conversation with you`,
          UserNotification_ImageURL: sender.User_ImageURL || '',
          UserNotification_NotificationType: 'Message',
          UserNotification_ObjectType: 'MessageContact',
          UserNotification_ObjectID: receiverResult.insertedId.toString(),
          UserNotification_ViewedTF: false,
          UserNotification_CreatedDateTime: currentTime,
          UserNotification_ModifiedDateTime: currentTime
        };

        await mongoose.connection.db.collection('UserNotification')
          .insertOne(notification);
      }

      return res.status(200).json({
        status: true,
        message: 'Message sent successfully',
        data: {
          contactStatus: 'pending',
          senderContactId: senderResult.insertedId,
          receiverContactId: receiverResult.insertedId,
          messageId: messageResult.insertedId,
          message: newMessage,
          showPendingMessage: true,
          pendingMessage: 'Your request is pending from receiver side.'
        },
      });
    }

    // If contact exists but not accepted
    if (messageContact.MessageContact_Status !== 'accept') {
      return res.status(200).json({
        status: false,
        message: `You can not send message, your contact status is ${messageContact.MessageContact_Status}.`,
        data: {
          contactStatus: messageContact.MessageContact_Status
        },
      });
    }

    // If contact is accepted, create and store new message
    const newMessage = {
      Message_SenderID: User_PublicID,
      Message_ReceiverID,
      Message_Message,
      Message_MediaURL: Message_MediaURL || null,
      Message_MediaName: Message_MediaName || null,
      Message_Type,
      Message_Status: 'unread',
      Message_UnixTime: unixTime,
      Message_CreatedDate: currentTime,
      Message_UpdatedDate: currentTime
    };

    const result = await mongoose.connection.db
      .collection('Message')
      .insertOne(newMessage);

    // Check if receiver has message notifications enabled
    const receiverSettings = await mongoose.connection.db.collection('UserNotificationsSettings')
      .findOne({ UserNotificationsSettings_UserID: Message_ReceiverID });

    if (receiverSettings?.UserNotificationsSettings_Send_Message) {
      // Create notification for new message
      const notification = {
        UserNotification_PublicID: uuidv4(),
        UserNotification_UserID: Message_ReceiverID,
        UserNotification_UnixTime: unixTime,
        UserNotification_Text: `New message from ${sender.User_Name}`,
        UserNotification_ImageURL: sender.User_ImageURL || '',
        UserNotification_NotificationType: 'Message',
        UserNotification_ObjectType: 'Message',
        UserNotification_ObjectID: result.insertedId.toString(),
        UserNotification_ViewedTF: false,
        UserNotification_CreatedDateTime: currentTime,
        UserNotification_ModifiedDateTime: currentTime
      };

      await mongoose.connection.db.collection('UserNotification')
        .insertOne(notification);
    }

    res.status(200).json({
      status: true,
      message: 'Message sent successfully',
      data: {
        messageId: result.insertedId,
        message: newMessage
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};

// Controller function to get messages between two users
export const getMessages = async (req, res) => {
  const User_PublicID = req.user?.User_PublicID;
  
  if (!User_PublicID) {
    return res.status(401).json({
      status: false,
      message: 'Unauthorized access',
      data: {},
    });
  }

  const { ConnectUserID: queryConnectUserID } = req.query;
  const { ConnectUserID: bodyConnectUserID } = req.body;
  const { page: queryPage, limit: queryLimit } = req.query;
  const { page: bodyPage = 1, limit: bodyLimit = 50 } = req.body;

  const ConnectUserID = queryConnectUserID || bodyConnectUserID;
  const page = queryPage ? parseInt(queryPage, 10) : parseInt(bodyPage, 10);
  const limit = queryLimit ? parseInt(queryLimit, 10) : parseInt(bodyLimit, 10);
  const skip = (page - 1) * limit;

  if (!ConnectUserID) {
    return res.status(400).json({
      status: false,
      message: 'ConnectUserID is required',
      data: {},
    });
  }

  try {
    // Get contact status and type
    const messageContact = await mongoose.connection.db
      .collection('MessageContact')
      .findOne({
        MessageContact_UserID: User_PublicID,
        MessageContact_ConnectUserID: ConnectUserID
      });

    if (!messageContact) {
      return res.status(200).json({
        status: false,
        message: 'Your Request Is Pending From Receiver Side.',
        data: {},
      });
    }

    // Get contact user details
    const contactUser = await mongoose.connection.db
      .collection('User')
      .findOne(
        { User_PublicID: ConnectUserID },
        { projection: { User_Name: 1, User_ProfileImage: 1, User_CompanyID: 1 } }
      );

    // Get company details if user is associated with a company
    let companyDetails = null;
    if (contactUser?.User_CompanyID) {
      companyDetails = await mongoose.connection.db
        .collection('Company')
        .findOne(
          { Company_PublicID: contactUser.User_CompanyID },
          { projection: { Company_Logo: 1 } }
        );
    }

    // Get messages between users
    const messages = await mongoose.connection.db
      .collection('Message')
      .find({
        $or: [
          {
            Message_SenderID: User_PublicID,
            Message_ReceiverID: ConnectUserID
          },
          {
            Message_SenderID: ConnectUserID,
            Message_ReceiverID: User_PublicID
          }
        ]
      })
      .sort({ Message_CreatedDate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Format messages
    const formattedMessages = messages.map(msg => ({
      Message_ID: msg._id.toString(),
      Message_SenderID: msg.Message_SenderID,
      Message_ReceiverID: msg.Message_ReceiverID,
      Message_Message: msg.Message_Message,
      Message_MediaURL: msg.Message_MediaURL,
      Message_MediaName: msg.Message_MediaName,
      Message_Type: msg.Message_Type,
      Message_Status: msg.Message_Status || 'new',
      Message_UnixTime: msg.Message_UnixTime.toString(),
      Message_CreatedDate: new Date(msg.Message_CreatedDate).toISOString().replace('T', ' ').substring(0, 19),
      Message_UpdatedDate: new Date(msg.Message_UpdatedDate).toISOString().replace('T', ' ').substring(0, 19),
      Message_UserImageURL: contactUser?.User_ProfileImage || null,
      Message_companyImageURL: companyDetails?.Company_Logo || null
    }));

    // Update message status to read for received messages
    await mongoose.connection.db
      .collection('Message')
      .updateMany(
        {
          Message_SenderID: ConnectUserID,
          Message_ReceiverID: User_PublicID,
          Message_Status: 'unread'
        },
        {
          $set: {
            Message_Status: 'read',
            Message_UpdatedDate: new Date()
          }
        }
      );

    res.status(200).json({
      status: true,
      message: 'Messages fetched successfully',
      data: {
        Message: formattedMessages,
        contactUser_id: ConnectUserID,
        contactUser_name: contactUser?.User_Name || 'Unknown',
        contact_status: messageContact.MessageContact_Status,
        contact_userType: messageContact.MessageContact_UserType,
        result: true,
        total: formattedMessages.length,
        page,
        limit
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};

// Controller function to handle message contact request (accept/reject)
export const handleMessageRequest = async (req, res) => {
  const User_PublicID = req.user?.User_PublicID;
  
  if (!User_PublicID) {
    return res.status(401).json({
      status: false,
      message: 'Unauthorized access',
      data: {},
    });
  }

  const { 
    ConnectUserID: queryConnectUserID,
    Action: queryAction 
  } = req.query;
  const { 
    ConnectUserID: bodyConnectUserID,
    Action: bodyAction 
  } = req.body;

  const ConnectUserID = queryConnectUserID || bodyConnectUserID;
  const Action = (queryAction || bodyAction || '').toLowerCase();

  if (!ConnectUserID || !['accept', 'reject'].includes(Action)) {
    return res.status(400).json({
      status: false,
      message: 'ConnectUserID and valid Action (accept/reject) are required',
      data: {},
    });
  }

  try {
    // Find both pending requests (sender's and receiver's)
    const [receiverContact, senderContact] = await Promise.all([
      // Find receiver's contact (current user is receiver)
      mongoose.connection.db
        .collection('MessageContact')
        .findOne({
          MessageContact_UserID: User_PublicID,
          MessageContact_ConnectUserID: ConnectUserID,
          MessageContact_UserType: 'receiver',
          MessageContact_Status: 'pending'
        }),
      // Find sender's contact
      mongoose.connection.db
        .collection('MessageContact')
        .findOne({
          MessageContact_UserID: ConnectUserID,
          MessageContact_ConnectUserID: User_PublicID,
          MessageContact_UserType: 'sender',
          MessageContact_Status: 'pending'
        })
    ]);

    if (!receiverContact || !senderContact) {
      return res.status(404).json({
        status: false,
        message: 'No pending message contact request found',
        data: {},
      });
    }

    const currentTime = new Date();

    if (Action === 'reject') {
      // Delete both contact records and any pending messages
      const [receiverResult, senderResult, messageResult] = await Promise.all([
        // Delete receiver's contact
        mongoose.connection.db
          .collection('MessageContact')
          .deleteOne({ _id: receiverContact._id }),
        // Delete sender's contact
        mongoose.connection.db
          .collection('MessageContact')
          .deleteOne({ _id: senderContact._id }),
        // Delete any pending messages between these users
        mongoose.connection.db
          .collection('Message')
          .deleteMany({
            $or: [
              {
                Message_SenderID: ConnectUserID,
                Message_ReceiverID: User_PublicID
              },
              {
                Message_SenderID: User_PublicID,
                Message_ReceiverID: ConnectUserID
              }
            ],
            Message_Status: 'pending'
          })
      ]);

      return res.status(200).json({
        status: true,
        message: 'Message contact request rejected and records deleted',
        data: {
          receiverContactId: receiverContact._id,
          senderContactId: senderContact._id,
          status: Action,
          deletedReceiver: receiverResult.deletedCount > 0,
          deletedSender: senderResult.deletedCount > 0,
          deletedMessages: messageResult.deletedCount
        },
      });
    }

    // If accepting, update both contact records
    const [receiverResult, senderResult] = await Promise.all([
      // Update receiver's contact
      mongoose.connection.db
        .collection('MessageContact')
        .updateOne(
          { _id: receiverContact._id },
          {
            $set: {
              MessageContact_Status: Action,
              MessageContact_UpdatedDate: currentTime
            }
          }
        ),
      // Update sender's contact
      mongoose.connection.db
        .collection('MessageContact')
        .updateOne(
          { _id: senderContact._id },
          {
            $set: {
              MessageContact_Status: Action,
              MessageContact_UpdatedDate: currentTime
            }
          }
        )
    ]);

    // If accepting, update any pending messages to unread
    await mongoose.connection.db
      .collection('Message')
      .updateMany(
        {
          $or: [
            {
              Message_SenderID: ConnectUserID,
              Message_ReceiverID: User_PublicID
            },
            {
              Message_SenderID: User_PublicID,
              Message_ReceiverID: ConnectUserID
            }
          ],
          Message_Status: 'pending'
        },
        {
          $set: {
            Message_Status: 'unread',
            Message_UpdatedDate: currentTime
          }
        }
      );

    res.status(200).json({
      status: true,
      message: 'Message contact request accepted successfully',
      data: {
        receiverContactId: receiverContact._id,
        senderContactId: senderContact._id,
        status: Action,
        updatedReceiver: receiverResult.modifiedCount > 0,
        updatedSender: senderResult.modifiedCount > 0
      },
    });
  } catch (error) {
    console.error('Error handling message contact request:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};

// Controller function to get message contact list
export const getMessageContacts = async (req, res) => {
  const User_PublicID = req.user?.User_PublicID;
  
  if (!User_PublicID) {
    return res.status(401).json({
      status: false,
      message: 'Unauthorized access',
      data: {},
    });
  }

  const { page: queryPage, limit: queryLimit } = req.query;
  const { page: bodyPage = 1, limit: bodyLimit = 20 } = req.body;

  const page = queryPage ? parseInt(queryPage, 10) : parseInt(bodyPage, 10);
  const limit = queryLimit ? parseInt(queryLimit, 10) : parseInt(bodyLimit, 10);
  const skip = (page - 1) * limit;

  try {
    // Get all contacts (both sent and received) that are accepted
    const contacts = await mongoose.connection.db
      .collection('MessageContact')
      .aggregate([
        {
          $match: {
            $or: [
              { MessageContact_UserID: User_PublicID }
            ],
          }
        },
        {
          $sort: { MessageContact_UpdatedDate: -1 }
        },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'User',
            let: { 
              userId: {
                $cond: {
                  if: { $eq: ['$MessageContact_UserID', User_PublicID] },
                  then: '$MessageContact_ConnectUserID',
                  else: '$MessageContact_UserID'
                }
              }
            },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$User_PublicID', '$$userId'] }
                }
              },
              {
                $project: {
                  _id: 0,
                  User_PublicID: 1,
                  User_Name: 1,
                  User_ProfileImage: 1
                }
              }
            ],
            as: 'UserData'
          }
        },
        {
          $unwind: '$UserData'
        },
        // Get last message between users
        {
          $lookup: {
            from: 'Message',
            let: { 
              userId: '$UserData.User_PublicID'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { 
                        $and: [
                          { $eq: ['$Message_SenderID', User_PublicID] },
                          { $eq: ['$Message_ReceiverID', '$$userId'] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$Message_SenderID', '$$userId'] },
                          { $eq: ['$Message_ReceiverID', User_PublicID] }
                        ]
                      }
                    ]
                  }
                }
              },
              { $sort: { Message_CreatedDate: -1 } },
              { $limit: 1 }
            ],
            as: 'LastMessage'
          }
        },
        {
          $unwind: {
            path: '$LastMessage',
            preserveNullAndEmptyArrays: true
          }
        },
        // Count unread messages
        {
          $lookup: {
            from: 'Message',
            let: { 
              userId: '$UserData.User_PublicID'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$Message_SenderID', '$$userId'] },
                      { $eq: ['$Message_ReceiverID', User_PublicID] },
                      { $eq: ['$Message_Status', 'unread'] }
                    ]
                  }
                }
              },
              { $count: 'unread' }
            ],
            as: 'UnreadCount'
          }
        },
        {
          $project: {
            _id: 1,
            contact: '$UserData',
            lastMessage: '$LastMessage',
            unreadCount: {
              $cond: {
                if: { $gt: [{ $size: '$UnreadCount' }, 0] },
                then: { $arrayElemAt: ['$UnreadCount.unread', 0] },
                else: 0
              }
            }
          }
        }
      ])
      .toArray();

    // Count total contacts
    const totalContacts = await mongoose.connection.db
      .collection('MessageContact')
      .countDocuments({
        $or: [
          { MessageContact_UserID: User_PublicID },
          { MessageContact_ConnectUserID: User_PublicID }
        ],
        MessageContact_Status: 'accept'
      });

    res.status(200).json({
      status: true,
      message: 'Message contacts fetched successfully',
      data: {
        total: totalContacts,
        page,
        limit,
        contacts,
      },
    });
  } catch (error) {
    console.error('Error fetching message contacts:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
}; 