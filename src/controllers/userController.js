import User from '../models/userModel.js'; // Adjust the path as necessary 
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Controller function to get users with pagination
export const getUsers = async (req, res) => {
  // console.log('Query params:', req.query, 'Body:', req.body, 'Headers:', req.headers);
  const { page = 1, limit = 20 } = req.body; // Read page and limit from request body
  const skip = (page - 1) * limit; // Calculate the number of documents to skip
  try {
    const users = await User.find().skip(skip).limit(limit); // Fetch users with pagination
    const totalUsers = await User.countDocuments(); // Get total number of users
    // Return the response in the desired format
    res.status(200).json({
      status: true,
      message: 'Users fetched successfully',
      data: { total: totalUsers, page: page, limit: limit, users: users},
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ status: false, message: 'Internal Server Error', data: {}});
  }
};

export const getUserbyId = async (req, res) => {
  const { User_PublicID: queryPublicID } = req.query; // Read from query string
  const { User_PublicID: bodyPublicID } = req.body; // Read from request body

  const User_PublicID = queryPublicID || bodyPublicID;

  if (!User_PublicID) {
    return res.status(400).json({ status: false, message: 'User_PublicID is required', data: {}});
  }

  try {
    const user = await User.findOne({ User_PublicID }); // Find the user by User_PublicID

    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found', data: {}});
    }
    res.status(200).json({ status: true, message: 'User fetched successfully', data: user});
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ status: false, message: 'Internal Server Error', data: {}});
  }
};

// Controller function to get user by email
export const getUserByEmail = async (req, res) => {
  // Check both query parameters and request body
  const { User_Email: queryEmail } = req.query; // Read from query string
  const { User_Email: bodyEmail } = req.body; // Read from request body

  const User_Email = queryEmail || bodyEmail;

  if (!User_Email) {
    return res.status(400).json({
      status: false,
      message: 'User_Email is required',
      data: {},
    });
  }

  try {
    const user = await User.findOne({ User_Email }).select('-User_Password -User_Token');

    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found',
        data: {},
      });
    }

    res.status(200).json({
      status: true,
      message: 'User fetched successfully',
      data: user,
    });
  } catch (error) {
    console.error('Error fetching user by email:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};

// Controller function to update user profile by User_PublicID
export const updateUserProfile = async (req, res) => {
  // Get User_PublicID from query or body
  const User_PublicID = req.query.User_PublicID || req.body.User_PublicID;

  if (!User_PublicID) {
    return res.status(400).json({
      status: false,
      message: 'User_PublicID is required',
      data: {},
    });
  }

  // Extract profile data from request body
  const {
    User_Name,
    User_Fname,
    User_Lname,
    User_Email,
    User_Phone,
    User_Gender,
    User_Address,
    User_About,
    User_HeroLine,
    User_Role,
    User_ImageURL
  } = req.body.data.attributes;

  // Create an object with the fields to update
  const updateFields = {};
  
  if (User_Name !== undefined) updateFields.User_Name = User_Name;
  if (User_Fname !== undefined) updateFields.User_Fname = User_Fname;
  if (User_Lname !== undefined) updateFields.User_Lname = User_Lname;
  if (User_Email !== undefined) updateFields.User_Email = User_Email;
  if (User_Phone !== undefined) updateFields.User_Phone = User_Phone;
  if (User_Gender !== undefined) updateFields.User_Gender = User_Gender;
  if (User_Address !== undefined) updateFields.User_Address = User_Address;
  if (User_About !== undefined) updateFields.User_About = User_About;
  if (User_HeroLine !== undefined) updateFields.User_HeroLine = User_HeroLine;
  if (User_Role !== undefined) updateFields.User_Role = User_Role;
  if (User_ImageURL !== undefined) updateFields.User_ImageURL = User_ImageURL;
  
  // Add updated timestamp
  updateFields.User_Updated_at = new Date();

  try {
    // Find user and update
    const user = await User.findOneAndUpdate(
      { User_PublicID },
      { $set: updateFields },
      { new: true } // Return the updated document
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found',
        data: {},
      });
    }

    // Return success response
    res.status(200).json({
      status: true,
      message: 'User profile updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};

// Controller function to update user permissions by User_PublicID
export const updateUserPermissions = async (req, res) => {
  // Get User_PublicID from query or body
  const User_PublicID = req.query.User_PublicID || req.body.User_PublicID;

  if (!User_PublicID) {
    return res.status(400).json({
      status: false,
      message: 'User_PublicID is required',
      data: {},
    });
  }

  // Extract permissions data from request body
  const {
    User_IsAdminTF,
    User_IsCompaniesAdminTF,
    User_IsEventsAdminTF,
    User_IsAllowedPostTF,
    User_IsAllowedPersonalPageTF,
    User_IsAllowedSubscribersTF
  } = req.body.data.attributes; 
  const updateFields = {};
  
  if (User_IsAdminTF !== undefined) updateFields.User_IsAdminTF = User_IsAdminTF;
  if (User_IsCompaniesAdminTF !== undefined) updateFields.User_IsCompaniesAdminTF = User_IsCompaniesAdminTF;
  if (User_IsEventsAdminTF !== undefined) updateFields.User_IsEventsAdminTF = User_IsEventsAdminTF;
  if (User_IsAllowedPostTF !== undefined) updateFields.User_IsAllowedPostTF = User_IsAllowedPostTF;
  if (User_IsAllowedPersonalPageTF !== undefined) updateFields.User_IsAllowedPersonalPageTF = User_IsAllowedPersonalPageTF;
  if (User_IsAllowedSubscribersTF !== undefined) updateFields.User_IsAllowedSubscribersTF = User_IsAllowedSubscribersTF;
  
  // Add updated timestamp
  updateFields.User_Updated_at = new Date();

  try { 
    // Find user and update
    const user = await User.findOneAndUpdate(
      { User_PublicID },
      { $set: updateFields },
      { new: true } // Return the updated document
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found',
        data: {},
      });
    }

    // Return success response
    res.status(200).json({
      status: true,
      message: 'User permissions updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};

// Controller function to update user password
export const updateUserPassword = async (req, res) => {
  // Get User_PublicID from query or body
  const User_PublicID = req.query.User_PublicID || req.body.User_PublicID;

  if (!User_PublicID) {
    return res.status(400).json({
      status: false,
      message: 'User_PublicID is required',
      data: {},
    });
  }

  // Extract password data from request body
  const {
    User_CurrentPassword,
    User_NewPassword,
    User_ConfirmPassword
  } = req.body.data.attributes;

  // Validate input
  if (!User_CurrentPassword || !User_NewPassword || !User_ConfirmPassword) {
    return res.status(400).json({
      status: false,
      message: 'Current password, new password, and confirm password are required',
      data: {},
    });
  }

  // Check if new password and confirm password match
  if (User_NewPassword !== User_ConfirmPassword) {
    return res.status(400).json({
      status: false,
      message: 'New password and confirm password do not match',
      data: {},
    });
  }

  // Validate password strength (minimum 8 characters)
  if (User_NewPassword.length < 8) {
    return res.status(400).json({
      status: false,
      message: 'Password must be at least 8 characters long',
      data: {},
    });
  }

  try {
    // Find the user (include password for verification)
    const user = await User.findOne({ User_PublicID });

    if (!user) {
      return res.status(404).json({status: false, message: 'User not found', data: {}});
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(User_CurrentPassword, user.User_Password);
    
    if (!isPasswordValid) {
      return res.status(404).json({status: false, message: 'Current password is incorrect', data: {}});
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(User_NewPassword, salt);

    // Update the password
    user.User_Password = hashedPassword;
    user.User_Updated_at = new Date();
    await user.save();

    // Return success response (without sending the password back)
    res.status(200).json({
      status: true,
      message: 'Password updated successfully',
      data: {
        User_PublicID: user.User_PublicID,
        User_Email: user.User_Email,
        User_Name: user.User_Name
      },
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};

// Combined controller function to get and update user notifications settings
export const userNotificationsSettings = async (req, res) => {
  try {
    const User_PublicID = req.user?.User_PublicID;
    
    if (!User_PublicID) {
      return res.status(401).json({
        status: false,
        message: 'Unauthorized access',
        data: {},
      });
    }

    // If request body exists, update the settings
    if (Object.keys(req.body).length > 0) {
      const {
        UserNotificationsSettings_Public_Comment,
        UserNotificationsSettings_Mentions_Public_Comment,
        UserNotificationsSettings_Like_Post,
        UserNotificationsSettings_Follows,
        UserNotificationsSettings_Send_Message,
        UserNotificationsSettings_Shares_Post
      } = req.body;

      // Create update object with only provided settings
      const updateFields = {};
      
      if (UserNotificationsSettings_Public_Comment !== undefined) {
        updateFields.UserNotificationsSettings_Public_Comment = UserNotificationsSettings_Public_Comment;
      }
      if (UserNotificationsSettings_Mentions_Public_Comment !== undefined) {
        updateFields.UserNotificationsSettings_Mentions_Public_Comment = UserNotificationsSettings_Mentions_Public_Comment;
      }
      if (UserNotificationsSettings_Like_Post !== undefined) {
        updateFields.UserNotificationsSettings_Like_Post = UserNotificationsSettings_Like_Post;
      }
      if (UserNotificationsSettings_Follows !== undefined) {
        updateFields.UserNotificationsSettings_Follows = UserNotificationsSettings_Follows;
      }
      if (UserNotificationsSettings_Send_Message !== undefined) {
        updateFields.UserNotificationsSettings_Send_Message = UserNotificationsSettings_Send_Message;
      }
      if (UserNotificationsSettings_Shares_Post !== undefined) {
        updateFields.UserNotificationsSettings_Shares_Post = UserNotificationsSettings_Shares_Post;
      }

      // Add modified timestamp
      updateFields.UserNotificationsSettings_ModifiedDateTime = new Date();

      // Update settings
      const result = await mongoose.connection.db.collection('UserNotificationsSettings')
        .findOneAndUpdate(
          { UserNotificationsSettings_UserID: User_PublicID },
          { 
            $set: updateFields,
            $setOnInsert: {
              UserNotificationsSettings_CreatedDateTime: new Date()
            }
          },
          { 
            returnDocument: 'after', // Return updated document
            upsert: true // Create if doesn't exist
          }
        );

      return res.status(200).json({
        status: true,
        message: 'Notification settings updated successfully',
        data: result.value
      });
    }

    // If no update requested, just get current settings
    const settings = await mongoose.connection.db.collection('UserNotificationsSettings')
      .findOne({ UserNotificationsSettings_UserID: User_PublicID });

    // If no settings found, return default settings
    if (!settings) {
      const defaultSettings = {
        UserNotificationsSettings_UserID: User_PublicID,
        UserNotificationsSettings_Public_Comment: false,
        UserNotificationsSettings_Mentions_Public_Comment: false,
        UserNotificationsSettings_Like_Post: false,
        UserNotificationsSettings_Follows: false,
        UserNotificationsSettings_Send_Message: false,
        UserNotificationsSettings_Shares_Post: false,
        UserNotificationsSettings_CreatedDateTime: new Date(),
        UserNotificationsSettings_ModifiedDateTime: new Date()
      };

      return res.status(200).json({
        status: true,
        message: 'Default notification settings retrieved',
        data: defaultSettings
      });
    }

    // Return success response with settings
    return res.status(200).json({
      status: true,
      message: 'Notification settings retrieved successfully',
      data: settings
    });

  } catch (error) {
    console.error('Error managing notification settings:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};

// Controller function to follow/unfollow a user
export const toggleUserFollow = async (req, res) => {
    try {
        const followerUserID = req.user?.User_PublicID; // Current logged-in user
        const { User_PublicID } = req.body; // User to follow/unfollow
        const checkOnly = req.query.checkOnly === 'true'; // Optional query parameter to only check status

        if (!followerUserID || !User_PublicID) {
            return res.status(400).json({
                status: false,
                message: 'Required fields missing',
                data: {}
            });
        }

        // Check if users exist
        const [follower, targetUser] = await Promise.all([
            mongoose.connection.db.collection('User').findOne({ User_PublicID: followerUserID }),
            mongoose.connection.db.collection('User').findOne({ User_PublicID: User_PublicID })
        ]);

        if (!follower || !targetUser) {
            return res.status(404).json({
                status: false,
                message: 'User not found',
                data: {}
            });
        }

        // Check if already following
        const existingFollow = await mongoose.connection.db.collection('UserFollow')
            .findOne({
                UserFollow_FollowerID: followerUserID,
                UserFollow_FollowingID: User_PublicID
            });

        // If checkOnly is true, just return the follow status
        if (checkOnly) {
            return res.status(200).json({
                status: true,
                message: 'Follow status retrieved successfully',
                data: {
                    isFollowing: !!existingFollow
                }
            });
        }

        if (existingFollow) {
            // Unfollow
            await mongoose.connection.db.collection('UserFollow')
                .deleteOne({
                    UserFollow_FollowerID: followerUserID,
                    UserFollow_FollowingID: User_PublicID
                });

            return res.status(200).json({
                status: true,
                message: 'Successfully unfollowed user',
                data: {
                    isFollowing: false,
                    targetUser: {
                        User_PublicID: targetUser.User_PublicID,
                        User_Name: targetUser.User_Name,
                        User_ImageURL: targetUser.User_ImageURL
                    }
                }
            });
        }

        // Create new follow record
        const followData = {
            UserFollow_PublicID: uuidv4(),
            UserFollow_FollowerID: followerUserID,
            UserFollow_FollowingID: User_PublicID,
            UserFollow_CreatedDateTime: new Date(),
            UserFollow_ModifiedDateTime: new Date()
        };

        await mongoose.connection.db.collection('UserFollow')
            .insertOne(followData);

        // Check if user has notifications enabled for follows
        const userSettings = await mongoose.connection.db.collection('UserNotificationsSettings')
            .findOne({ UserNotificationsSettings_UserID: User_PublicID });

        if (userSettings?.UserNotificationsSettings_Follows) {
            // Create notification for the target user
            const notification = {
                UserNotification_PublicID: uuidv4(),
                UserNotification_UserID: User_PublicID,
                UserNotification_UnixTime: Math.floor(Date.now() / 1000),
                UserNotification_Text: `${follower.User_Name} started following you`,
                UserNotification_ImageURL: follower.User_ImageURL || '',
                UserNotification_ObjectType: 'Follow',
                UserNotification_ObjectID: followData.UserFollow_PublicID,
                UserNotification_ViewedTF: false,
                UserNotification_CreatedDateTime: new Date(),
                UserNotification_ModifiedDateTime: new Date()
            };

            await mongoose.connection.db.collection('UserNotification')
                .insertOne(notification);
        }

        return res.status(200).json({
            status: true,
            message: 'Successfully followed user',
            data: {
                isFollowing: true,
                targetUser: {
                    User_PublicID: targetUser.User_PublicID,
                    User_Name: targetUser.User_Name,
                    User_ImageURL: targetUser.User_ImageURL
                }
            }
        });

    } catch (error) {
        console.error('Error in follow/unfollow:', error);
        res.status(500).json({
            status: false,
            message: 'Internal Server Error',
            data: {}
        });
    }
};

// Controller function to get user's followers
export const getUserFollowers = async (req, res) => {
    try {

        const { page: queryPage, limit: queryLimit, User_PublicID: queryPublicID } = req.query; // Read page and limit from query string
        const { page: bodyPage = 1, limit: bodyLimit = 20, User_PublicID: bodyPublicID } = req.body; // Read page and limit from request body
      
        const User_PublicID = queryPublicID || bodyPublicID;
        const page = queryPage ? parseInt(queryPage) : parseInt(bodyPage); // Use query page if available
        const limit = queryLimit ? parseInt(queryLimit) : parseInt(bodyLimit); // Use query limit if available
        const skip = (page - 1) * limit; // Calculate the number of documents to skip

        if (!User_PublicID) {
            return res.status(400).json({
                status: false,
                message: 'User ID is required',
                data: {}
            });
        }

        const followers = await mongoose.connection.db.collection('UserFollow')
            .aggregate([
                {
                    $match: { UserFollow_FollowingID: User_PublicID }
                },
                {
                    $lookup: {
                        from: 'User',
                        localField: 'UserFollow_FollowerID',
                        foreignField: 'User_PublicID',
                        as: 'follower'
                    }
                },
                {
                    $unwind: '$follower'
                },
                {
                    $project: {
                        _id: 0,
                        UserFollow_PublicID: 1,
                        User_PublicID: '$follower.User_PublicID',
                        User_Name: '$follower.User_Name',
                        User_ImageURL: '$follower.User_ImageURL',
                        UserFollow_CreatedDateTime: 1
                    }
                },
                { $skip: skip },
                { $limit: limit }
            ]).toArray();

        const totalFollowers = await mongoose.connection.db.collection('UserFollow')
            .countDocuments({ UserFollow_FollowingID: User_PublicID });

        return res.status(200).json({
            status: true,
            message: 'Followers retrieved successfully',
            data: {
                followers,
                pagination: {
                    total: totalFollowers,
                    page,
                    limit,
                    totalPages: Math.ceil(totalFollowers / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error getting followers:', error);
        res.status(500).json({
            status: false,
            message: 'Internal Server Error',
            data: {}
        });
    }
};

// Controller function to check if user is following another user
export const checkFollowStatus = async (req, res) => {
    try {
        const followerUserID = req.user?.User_PublicID;
        const { User_PublicID: queryPublicID } = req.query;
        const { User_PublicID: bodyPublicID } = req.body;
        
        const User_PublicID = queryPublicID || bodyPublicID;

        if (!followerUserID || !User_PublicID) {
            return res.status(400).json({
                status: false,
                message: 'Required fields missing',
                data: {}
            });
        }

        // Get follow status and target user details
        const [followStatus, targetUser] = await Promise.all([
            mongoose.connection.db.collection('UserFollow')
                .findOne({
                    UserFollow_FollowerID: followerUserID,
                    UserFollow_FollowingID: User_PublicID
                }),
            mongoose.connection.db.collection('User')
                .findOne({ User_PublicID: User_PublicID })
        ]);

        return res.status(200).json({
            status: true,
            message: 'Follow status retrieved successfully',
            data: {
                isFollowing: !!followStatus,
                targetUser: targetUser ? {
                    User_PublicID: targetUser.User_PublicID,
                    User_Name: targetUser.User_Name,
                    User_ImageURL: targetUser.User_ImageURL
                } : null
            }
        });

    } catch (error) {
        console.error('Error checking follow status:', error);
        res.status(500).json({
            status: false,
            message: 'Internal Server Error',
            data: {}
        });
    }
};

