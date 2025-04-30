import Post from '../models/postModel.js'; // Adjust the path as necessary
import mongoose from 'mongoose';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Controller function to get posts with pagination
export const getPosts = async (req, res) => {
  const { page: queryPage, limit: queryLimit } = req.query; // Read page and limit from query string
  const { page: bodyPage = 1, limit: bodyLimit = 20 } = req.body; // Read page and limit from request body

  const page = queryPage ? parseInt(queryPage) : parseInt(bodyPage); // Use query page if available
  const limit = queryLimit ? parseInt(queryLimit) : parseInt(bodyLimit); // Use query limit if available
  const skip = (page - 1) * limit; // Calculate the number of documents to skip

  try {
    // Add logging to see the query and sorting
    // console.log('Fetching posts with filter:', { Post_Status: 'publish' });
    // console.log('Sorting by Post_CreatedDate in descending order');
    
    // First try without the Post_Status filter
    const posts = await Post.find()
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);
    
    // Log the first few posts to verify dates
    // console.log('First few posts with their creation dates:');
    // posts.slice(0, 3).forEach(post => {
    //   console.log(`Post ID: ${post.Post_PublicID}, Created Date: ${post.Post_CreatedDate}, Status: ${post.Post_Status}`);
    // });

    const totalPosts = await Post.countDocuments(); // Get total number of posts

    // Return the response in the desired format
    res.status(200).json({
      status: true,
      message: 'Posts fetched successfully',
      data: { total: totalPosts, page: page, limit: limit, posts: posts},
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ status: false, message: 'Internal Server Error', data: {}});
  }
};

export const getPostbyId = async (req, res) => {
  const { Post_PublicID: querySymbol } = req.query; // Read from query string
  const { Post_PublicID: bodySymbol } = req.body; // Read from request body

  const Post_PublicID = querySymbol || bodySymbol;

  if (!Post_PublicID) {
    return res.status(400).json({ status: false, message: 'Post_PublicID is required', data: {}});
  }

  try {
    // Get post details
    const post = await Post.findOne({ Post_PublicID }); // Find the post by Post_PublicID

    if (!post) {
      return res.status(404).json({ status: false, message: 'Post not found', data: {}});
    }

    // Get all comments for this post
    const comments = await mongoose.connection.db
      .collection('PostComment')
      .find({
        PostComment_PostID: Post_PublicID,
        PostComment_IsDeleted: "no"
      })
      .sort({ PostComment_CreatedDate: -1 })
      .toArray();

    // Structure comments in a tree format
    const commentTree = [];
    const commentMap = new Map();

    // First pass: Create map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.PostComment_PublicID, {
        ...comment,
        PostComment_Replies: []
      });
    });

    // Second pass: Build tree structure
    comments.forEach(comment => {
      if (comment.PostComment_ParentID) {
        const parent = commentMap.get(comment.PostComment_ParentID);
        if (parent) {
          parent.PostComment_Replies.push(commentMap.get(comment.PostComment_PublicID));
        }
      } else {
        commentTree.push(commentMap.get(comment.PostComment_PublicID));
      }
    });

    let postData = {
      ...post.toObject(),
      Post_Comments: commentTree
    };

    // If post is RSS news type, get company and coin price data
    if (post.Post_TypeUserOrCompany === 'rss_news' && post.Post_CompanyID) {
      const companyData = await mongoose.connection.db
        .collection('Company')
        .aggregate([
          { 
            $match: { 
              Company_PublicID: post.Post_CompanyID 
            }
          },
          {
            $lookup: {
              from: 'CoinPrice',
              localField: 'Company_Symbol',
              foreignField: 'Coin_CompanyCode',
              as: 'CoinPrice'
            }
          },
          {
            $unwind: { 
              path: '$CoinPrice',
              preserveNullAndEmptyArrays: true 
            }
          },
          {
            $project: {
              _id: 0,
              Company_PublicID: 1,
              CoinPrice: 1
            }
          }
        ])
        .toArray();

      if (companyData && companyData.length > 0) {
        postData.Company_Data = companyData[0];
      }

      // Get related stories based on company ID
      let relatedStories = await Post.find({
        Post_CompanyID: post.Post_CompanyID,
        Post_PublicID: { $ne: post.Post_PublicID }, // Exclude current post
        Post_TypeUserOrCompany: 'rss_news',
        Post_Status: 'publish'
      })
      .sort({ Post_CreatedDate: -1 })
      .limit(3)
      .lean();

      // If no related stories found, get posts based on matching keywords
      if (!relatedStories || relatedStories.length === 0) {
        // Split keywords and create regex pattern for each keyword
        const keywords = post.Post_Keywords ? post.Post_Keywords.split(',').map(k => k.trim()) : [];
        
        if (keywords.length > 0) {
          // Create an array of regex patterns for each keyword
          const keywordPatterns = keywords.map(keyword => new RegExp(keyword, 'i'));
          
          relatedStories = await Post.find({
            Post_TypeUserOrCompany: 'rss_news',
            Post_Status: 'publish',
            Post_PublicID: { $ne: post.Post_PublicID }, // Exclude current post
            $or: [
              { Post_Keywords: { $in: keywordPatterns } },
              { Post_Title: { $in: keywordPatterns } },
              { Post_Overview: { $in: keywordPatterns } },
              { Post_Category: { $in: keywordPatterns } }
            ]
          })
          .sort({ Post_CreatedDate: -1 })
          .limit(3)
          .lean();
        }
      }

      postData.Post_RelatedStories = relatedStories;
    }

    res.status(200).json({ 
      status: true, 
      message: 'Post fetched successfully', 
      data: postData
    });
  } catch (error) {
    console.error('Error fetching Post:', error);
    res.status(500).json({ status: false, message: 'Internal Server Error', data: {}});
  }
};

export const getPostbyUserId = async (req, res) => {
  const { Post_UserID: queryUserID } = req.query;
  const { Post_UserID: bodyUserID } = req.body;

  const Post_UserID = queryUserID || bodyUserID;  

  if (!Post_UserID) {
    return res.status(200).json({ status: false, message: 'Post_UserID is required', data: {}});
  }

  try {
    // First check if the user exists
    const user = await mongoose.connection.db
      .collection('User')
      .findOne({ 
        User_PublicID: Post_UserID,
        User_IsDeleted: { $ne: true }
      });

    if (!user) {
      return res.status(200).json({ 
        status: false, 
        message: 'User not found', 
        data: {}
      });
    }

    // If user exists, fetch their posts
    const posts = await Post.find({ 
      Post_UserID: Post_UserID,
      Post_Status: 'publish'
    })
    .sort({ Post_CreatedDate: -1 });

    res.status(200).json({ 
      status: true, 
      message: 'Posts fetched successfully', 
      data: posts
    });
  } catch (error) {
    console.error('Error fetching posts by user ID:', error);
    res.status(500).json({ 
      status: false, 
      message: 'Internal Server Error', 
      data: {}
    });
  }
};

// Controller function to get trending posts
export const getTrendingPosts = async (req, res) => {
  const { page: queryPage, limit: queryLimit } = req.query; // Read page and limit from query string
  const { page: bodyPage = 1, limit: bodyLimit = 10 } = req.body; // Read page and limit from request body

  const page = queryPage ? parseInt(queryPage) : parseInt(bodyPage); // Use query page if available
  const limit = queryLimit ? parseInt(queryLimit) : parseInt(bodyLimit); // Use query limit if available
  const skip = (page - 1) * limit; // Calculate the number of documents to skip

  try {
    // Fetch trending posts based on likes or comments
    const trendingPosts = await Post.find()
      .select('Post_PublicID Post_Title Post_Overview Post_Text Post_Category Post_Visibility Post_CreatedDate Post_UpdatedDate') // Select only the specified fields
      .sort({ Post_NumLikes: -1 }) // Sort by number of likes
      .skip(skip)
      .limit(limit);

    // Count total posts
    const totalPosts = await Post.countDocuments({ Post_Status: 'publish' });

    res.status(200).json({
      status: true,
      message: 'Trending posts fetched successfully',
      data: { total: totalPosts, page: page, limit: limit, posts: trendingPosts},
    });
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    res.status(500).json({ status: false, message: 'Internal Server Error', data: {}});
  }
};

// Controller function to create a new post
export const createPost = async (req, res) => {
  try {
    const {
      Post_Title,
      Post_Overview,
      Post_Text,
      Post_ImageURL,
      Post_VideoURL,
      Post_PdfURL,
      Post_CompanyID,
      Post_CompanyCode,
      Post_CompanyName,
      Post_CompanyLogoURL,
      Post_Visibility,
      Post_Status,
      Post_CompanyCollaborate,
      Post_TypeUserOrCompany,
      Post_Category,
      Post_AdvisorSecuritiesMentioned,
      Post_Language,
      Post_Symbol,
      Post_AllSymbol,
      Post_Country,
      Post_MarketType
    } = req.body;

    // Validate required fields
    if (!Post_Title || !Post_Text) {
      return res.status(400).json({ 
        status: false, 
        message: 'Post title and text are required', 
        data: {}
      });
    }

    // Generate a unique Post_PublicID
    const Post_PublicID = new mongoose.Types.ObjectId().toString();
    console.log(Post_PublicID);
    // Get user information from JWT token
    const user = req.user;

    const newPost = new Post({
      Post_PublicID,
      Post_Title,
      Post_Overview,
      Post_Text,
      Post_ImageURL,
      Post_VideoURL,
      Post_PdfURL,
      Post_StatusTF: true,
      Post_CompanyID,
      Post_CompanyCode,
      Post_CompanyName,
      Post_CompanyLogoURL,
      Post_NumComments: 0,
      Post_NumLikes: 0,
      Post_NumDislikes: 0,
      Post_NumViews: 0,
      Post_PublishedAt: null,
      Post_ReleaseUnixTime: Math.floor(Date.now() / 1000),
      Post_ReleaseUnixTimeSydney: null,
      Post_UserID: user.User_PublicID,
      Post_UserName: user.User_Name,
      Post_UserImageURL: user.User_ImageURL,
      Post_Visibility: Post_Visibility || 'public',
      Post_Status: Post_Status || 'publish',
      Post_CompanyCollaborate: Post_CompanyCollaborate || false,
      Post_TypeUserOrCompany: Post_TypeUserOrCompany || 'user',
      Post_Category,
      Post_AdvisorSecuritiesMentioned,
      Post_Language,
      Post_Symbol,
      Post_AllSymbol,
      Post_Country,
      Post_MarketType,
      Post_CreatedDate: new Date(),
      Post_UpdatedDate: new Date()
    });

    await newPost.save();

    res.status(201).json({ 
      status: true, 
      message: 'Post created successfully', 
      data: newPost
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ 
      status: false, 
      message: 'Internal Server Error', 
      data: {}
    });
  }
};

// Controller function to get Post categories from Company collection
export const getPostCategories = async (req, res) => {
  try {
    const companies = await mongoose.connection.db
      .collection('Company')
      .find({}, { Company_Categories: 1 })
      .toArray();

    // Extract categories and split them
    const allCategories = companies
      .map(company => company.Company_Categories ? company.Company_Categories.split(',').map(cat => cat.trim()) : [])
      .flat()
      .filter(Boolean); // Remove empty strings

    // Get unique categories
    const uniqueCategories = [...new Set(allCategories)];

    res.status(200).json({
      status: true,
      message: 'Categories fetched successfully',
      data: {
        categories: uniqueCategories
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {}
    });
  }
};

// Controller function to handle post votes (likes/dislikes)
export const postVote = async (req, res) => {
  try {
    const { PostVote_PostID, PostVote_VoteType } = req.body;
    const user = req.user; // Get user from JWT token

    if (!user.User_PublicID) {
      return res.status(400).json({
        status: false,
        message: 'User authentication error',
        data: {}
      });
    }

    if (!PostVote_PostID || !PostVote_VoteType) {
      return res.status(400).json({
        status: false,
        message: 'PostVote_PostID and PostVote_VoteType are required',
        data: {}
      });
    }

    // Validate vote type
    if (!['Like', 'Dislike'].includes(PostVote_VoteType)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid PostVote_VoteType. Must be either "Like" or "Dislike"',
        data: {}
      });
    }

    // Check if the post exists
    const post = await Post.findOne({ Post_PublicID: PostVote_PostID });
    if (!post) {
      return res.status(404).json({
        status: false,
        message: 'Post not found',
        data: {}
      });
    }

    // Check if a vote record already exists for this user and post
    const existingVote = await mongoose.connection.db
      .collection('PostVote')
      .findOne({
        PostVote_PostID,
        PostVote_UserID: user.User_PublicID
      });

    const currentDate = new Date();
    const unixTime = Math.floor(currentDate.getTime() / 1000);

    let shouldNotify = false;
    // Determine if we should send a notification
    // We notify if:
    // 1. It's a new Like (no existing vote)
    // 2. Or if changing from Dislike to Like
    if (PostVote_VoteType === 'Like' && 
        (!existingVote || existingVote.PostVote_VoteType === 'Dislike')) {
      shouldNotify = true;
    }

    if (existingVote) {
      // If the existing vote is the same as the new vote
      if (existingVote.PostVote_VoteType === PostVote_VoteType) {
        return res.status(200).json({
          status: false,
          message: `Sorry! You already ${PostVote_VoteType.toLowerCase()}d this post!`,
          data: {
            PostVote_PostID,
            PostVote_VoteType,
            Post_NumLikes: post.Post_NumLikes,
            Post_NumDislikes: post.Post_NumDislikes
          }
        });
      }

      // Update existing vote
      const result = await mongoose.connection.db
        .collection('PostVote')
        .updateOne(
          {
            PostVote_PostID,
            PostVote_UserID: user.User_PublicID
          },
          {
            $set: {
              PostVote_VoteType,
              PostVote_UpdatedDate: currentDate.toISOString()
            }
          }
        );

      if (result.modifiedCount === 0) {
        throw new Error('Failed to update vote');
      }
    } else {
      // Create new vote record
      const PostVote_PublicID = new mongoose.Types.ObjectId().toString();
      
      await mongoose.connection.db
        .collection('PostVote')
        .insertOne({
          PostVote_PublicID,
          PostVote_PostID,
          PostVote_UserID: user.User_PublicID,
          PostVote_UserName: user.User_Name,
          PostVote_VoteType,
          PostVote_UserType: "User",
          PostVote_CreatedDate: currentDate.toISOString(),
          PostVote_UpdatedDate: currentDate.toISOString()
        });
    }

    // Update post like/dislike counts
    const voteCounts = await mongoose.connection.db
      .collection('PostVote')
      .aggregate([
        {
          $match: { PostVote_PostID }
        },
        {
          $group: {
            _id: '$PostVote_VoteType',
            count: { $sum: 1 }
          }
        }
      ]).toArray();

    const likes = voteCounts.find(v => v._id === 'Like')?.count || 0;
    const dislikes = voteCounts.find(v => v._id === 'Dislike')?.count || 0;

    // Update post with new counts
    await Post.updateOne(
      { Post_PublicID: PostVote_PostID },
      {
        $set: {
          Post_NumLikes: likes,
          Post_NumDislikes: dislikes,
          Post_UpdatedDate: currentDate
        }
      }
    );

    // Send notification if it's a like and not the post owner liking their own post
    if (shouldNotify && post.Post_UserID !== user.User_PublicID) {
      // Check post owner's notification settings
      const postOwnerSettings = await mongoose.connection.db
        .collection('UserNotificationsSettings')
        .findOne({ UserNotificationsSettings_UserID: post.Post_UserID });

      if (postOwnerSettings?.UserNotificationsSettings_Like_Post) {
        const notification = {
          UserNotification_PublicID: uuidv4(),
          UserNotification_UserID: post.Post_UserID,
          UserNotification_UnixTime: unixTime,
          UserNotification_Text: `${user.User_Name} liked your post: "${post.Post_Title}"`,
          UserNotification_ImageURL: user.User_ImageURL || '',
          UserNotification_NotificationType: 'Like',
          UserNotification_ObjectType: 'Post',
          UserNotification_ObjectID: PostVote_PostID,
          UserNotification_ViewedTF: false,
          UserNotification_CreatedDateTime: currentDate,
          UserNotification_ModifiedDateTime: currentDate
        };

        await mongoose.connection.db
          .collection('UserNotification')
          .insertOne(notification);
      }
    }

    res.status(200).json({
      status: true,
      message: `You have successfully ${PostVote_VoteType.toLowerCase()}d this post!`,
      data: {
        PostVote_PostID,
        PostVote_VoteType,
        Post_NumLikes: likes,
        Post_NumDislikes: dislikes
      }
    });
  } catch (error) {
    console.error('Error handling post vote:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {}
    });
  }
};

// Controller function to create a new post comment
export const createPostComment = async (req, res) => {
  try {
    const { 
      PostComment_PostID, 
      PostComment_ParentID,
      PostComment_Comment,
      PostComment_ImageURL,
      PostComment_UserType
    } = req.body;
    
    const user = req.user;

    if (!user.User_PublicID) {
      return res.status(400).json({
        status: false,
        message: 'User authentication error',
        data: {}
      });
    }

    if (!PostComment_PostID || !PostComment_Comment) {
      return res.status(400).json({
        status: false,
        message: 'PostComment_PostID and PostComment_Comment are required',
        data: {}
      });
    }

    // Check if the post exists and get post owner details
    const post = await Post.findOne({ Post_PublicID: PostComment_PostID });
    if (!post) {
      return res.status(404).json({
        status: false,
        message: 'Post not found',
        data: {}
      });
    }

    let parentComment = null;
    // If ParentID is provided, verify it exists and get parent comment owner details
    if (PostComment_ParentID) {
      parentComment = await mongoose.connection.db
        .collection('PostComment')
        .findOne({ PostComment_PublicID: PostComment_ParentID });

      if (!parentComment) {
        return res.status(404).json({
          status: false,
          message: 'Parent comment not found',
          data: {}
        });
      }
    }

    // Generate a unique PostComment_PublicID
    const PostComment_PublicID = new mongoose.Types.ObjectId().toString();
    const currentDate = new Date();
    const unixTime = Math.floor(currentDate.getTime() / 1000);

    // Create new comment with all fields
    const newComment = {
      PostComment_PublicID,
      PostComment_ParentID: PostComment_ParentID || "",
      PostComment_PostID,
      PostComment_Comment,
      PostComment_ImageURL: PostComment_ImageURL || "",
      PostComment_NumDislikes: 0,
      PostComment_NumLikes: 0,
      PostComment_UnixTime: unixTime,
      PostComment_UserID: user.User_PublicID,
      PostComment_UserImageURL: user.User_ImageURL || "",
      PostComment_UserName: user.User_Name,
      PostComment_TypeUserOrCompany: PostComment_UserType || "user",
      PostComment_IsDeleted: "no",
      PostComment_CreatedDate: currentDate.toISOString()
    };

    // Insert the comment
    await mongoose.connection.db
      .collection('PostComment')
      .insertOne(newComment);

    // Update post comment count
    const commentCount = await mongoose.connection.db
      .collection('PostComment')
      .countDocuments({
        PostComment_PostID,
        PostComment_IsDeleted: "no"
      });

    await Post.updateOne(
      { Post_PublicID: PostComment_PostID },
      { 
        $set: { 
          Post_NumComments: commentCount,
          Post_UpdatedDate: currentDate
        }
      }
    );

    // Check post owner's notification settings and send notification if enabled
    const postOwnerSettings = await mongoose.connection.db
      .collection('UserNotificationsSettings')
      .findOne({ UserNotificationsSettings_UserID: post.Post_UserID });

    if (post.Post_UserID !== user.User_PublicID && // Don't notify if user comments on their own post
        postOwnerSettings?.UserNotificationsSettings_Public_Comment) {
      const postOwnerNotification = {
        UserNotification_PublicID: uuidv4(),
        UserNotification_UserID: post.Post_UserID,
        UserNotification_UnixTime: unixTime,
        UserNotification_Text: `${user.User_Name} commented on your post: "${post.Post_Title}"`,
        UserNotification_ImageURL: user.User_ImageURL || '',
        UserNotification_NotificationType: 'Comment',
        UserNotification_ObjectType: 'Post',
        UserNotification_ObjectID: PostComment_PostID,
        UserNotification_ViewedTF: false,
        UserNotification_CreatedDateTime: currentDate,
        UserNotification_ModifiedDateTime: currentDate
      };

      await mongoose.connection.db
        .collection('UserNotification')
        .insertOne(postOwnerNotification);
    }

    // If this is a reply to another comment, notify the parent comment owner
    if (parentComment && parentComment.PostComment_UserID !== user.User_PublicID) { // Don't notify if user replies to their own comment
      const parentCommentOwnerSettings = await mongoose.connection.db
        .collection('UserNotificationsSettings')
        .findOne({ UserNotificationsSettings_UserID: parentComment.PostComment_UserID });

      if (parentCommentOwnerSettings?.UserNotificationsSettings_Public_Comment) {
        const replyNotification = {
          UserNotification_PublicID: uuidv4(),
          UserNotification_UserID: parentComment.PostComment_UserID,
          UserNotification_UnixTime: unixTime,
          UserNotification_Text: `${user.User_Name} replied to your comment on post: "${post.Post_Title}"`,
          UserNotification_ImageURL: user.User_ImageURL || '',
          UserNotification_NotificationType: 'Comment',
          UserNotification_ObjectType: 'Comment',
          UserNotification_ObjectID: PostComment_PublicID,
          UserNotification_ViewedTF: false,
          UserNotification_CreatedDateTime: currentDate,
          UserNotification_ModifiedDateTime: currentDate
        };

        await mongoose.connection.db
          .collection('UserNotification')
          .insertOne(replyNotification);
      }
    }

    res.status(201).json({
      status: true,
      message: 'Comment added successfully',
      data: newComment
    });

  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {}
    });
  }
};

// Controller function to get comments for a post
export const getPostComments = async (req, res) => {
  const { PostComment_PostID: queryPostID } = req.query;
  const { PostComment_PostID: bodyPostID } = req.body;
  const { page: queryPage, limit: queryLimit } = req.query;
  const { page: bodyPage = 1, limit: bodyLimit = 10 } = req.body;

  const PostComment_PostID = queryPostID || bodyPostID;
  const page = queryPage ? parseInt(queryPage) : parseInt(bodyPage);
  const limit = queryLimit ? parseInt(queryLimit) : parseInt(bodyLimit);
  const skip = (page - 1) * limit;

  if (!PostComment_PostID) {
    return res.status(400).json({
      status: false,
      message: 'PostComment_PostID is required',
      data: {}
    });
  }

  try {
    // Get comments for the post
    const comments = await mongoose.connection.db
      .collection('PostComment')
      .find({
        PostComment_PostID,
        PostComment_IsDeleted: "no"
      })
      .sort({ PostComment_CreatedDate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count of comments
    const totalComments = await mongoose.connection.db
      .collection('PostComment')
      .countDocuments({
        PostComment_PostID,
        PostComment_IsDeleted: "no"
      });

    res.status(200).json({
      status: true,
      message: 'Comments fetched successfully',
      data: {
        total: totalComments,
        page: page,
        limit: limit,
        comments: comments
      }
    });

  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {}
    });
  }
};

// Controller function to delete a comment
export const deletePostComment = async (req, res) => {
  try {
    const { PostComment_PublicID } = req.body;
    const user = req.user;

    if (!PostComment_PublicID) {
      return res.status(400).json({
        status: false,
        message: 'PostComment_PublicID is required',
        data: {}
      });
    }

    // Find the comment
    const comment = await mongoose.connection.db
      .collection('PostComment')
      .findOne({ PostComment_PublicID });

    if (!comment) {
      return res.status(404).json({
        status: false,
        message: 'Comment not found',
        data: {}
      });
    }

    // Check if user owns the comment
    if (comment.PostComment_UserID !== user.User_PublicID) {
      return res.status(403).json({
        status: false,
        message: 'Unauthorized to delete this comment',
        data: {}
      });
    }

    // Soft delete the comment
    await mongoose.connection.db
      .collection('PostComment')
      .updateOne(
        { PostComment_PublicID },
        { 
          $set: { 
            PostComment_IsDeleted: "yes",
            PostComment_UpdatedDate: new Date().toISOString()
          }
        }
      );

    // Update post comment count
    const commentCount = await mongoose.connection.db
      .collection('PostComment')
      .countDocuments({
        PostComment_PostID: comment.PostComment_PostID,
        PostComment_IsDeleted: "no"
      });

    await Post.updateOne(
      { Post_PublicID: comment.PostComment_PostID },
      { 
        $set: { 
          Post_NumComments: commentCount,
          Post_UpdatedDate: new Date()
        }
      }
    );

    res.status(200).json({
      status: true,
      message: 'Comment deleted successfully',
      data: {}
    });

  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {}
    });
  }
};

// Controller function to handle post comment votes (likes/dislikes)
export const postCommentVote = async (req, res) => {
  try {
    const { 
      PostCommentVote_CommentID,
      PostCommentVote_VoteType,
      PostCommentVote_PostType = 'Post' // Default to 'Post' if not provided
    } = req.body;
    
    const user = req.user; // Get user from JWT token

    if (!user.User_PublicID) {
      return res.status(200).json({
        status: false,
        message: 'User authentication error',
        data: {}
      });
    }

    if (!PostCommentVote_CommentID || !PostCommentVote_VoteType) {
      return res.status(200).json({
        status: false,
        message: 'PostCommentVote_CommentID and PostCommentVote_VoteType are required',
        data: {}
      });
    }

    // Validate vote type
    if (!['Like', 'Dislike'].includes(PostCommentVote_VoteType)) {
      return res.status(200).json({
        status: false,
        message: 'Invalid PostCommentVote_VoteType. Must be either "Like" or "Dislike"',
        data: {}
      });
    }

    // Check if the comment exists
    const comment = await mongoose.connection.db
      .collection('PostComment')
      .findOne({ 
        PostComment_PublicID: PostCommentVote_CommentID,
        PostComment_IsDeleted: "no"
      });

    if (!comment) {
      return res.status(200).json({
        status: false,
        message: 'Comment not found',
        data: {}
      });
    }

    // Check if a vote record already exists for this user and comment
    const existingVote = await mongoose.connection.db
      .collection('PostCommentVote')
      .findOne({
        PostCommentVote_CommentID,
        PostCommentVote_UserID: user.User_PublicID
      });

    const currentDate = new Date().toISOString();

    if (existingVote) {
      // If the existing vote is the same as the new vote
      if (existingVote.PostCommentVote_VoteType === PostCommentVote_VoteType) {
        return res.status(200).json({
          status: false,
          message: `You have already ${PostCommentVote_VoteType.toLowerCase()}d this comment!`,
          data: {
            PostCommentVote_CommentID,
            PostCommentVote_VoteType
          }
        });
      }

      // Update existing vote
      const result = await mongoose.connection.db
        .collection('PostCommentVote')
        .updateOne(
          {
            PostCommentVote_CommentID,
            PostCommentVote_UserID: user.User_PublicID
          },
          {
            $set: {
              PostCommentVote_VoteType,
              PostCommentVote_UpdatedDate: currentDate
            }
          }
        );

      if (result.modifiedCount === 0) {
        throw new Error('Failed to update vote');
      }
    } else {
      // Create new vote record
      const PostCommentVote_PublicID = new mongoose.Types.ObjectId().toString();
      
      await mongoose.connection.db
        .collection('PostCommentVote')
        .insertOne({
          PostCommentVote_PublicID,
          PostCommentVote_CommentID,
          PostCommentVote_UserID: user.User_PublicID,
          PostCommentVote_VoteType,
          PostCommentVote_PostType,
          PostCommentVote_UserType: "user",
          PostCommentVote_CreatedDate: currentDate,
          PostCommentVote_UpdatedDate: currentDate
        });
    }

    // Update comment like/dislike counts
    const voteCounts = await mongoose.connection.db
      .collection('PostCommentVote')
      .aggregate([
        {
          $match: { PostCommentVote_CommentID }
        },
        {
          $group: {
            _id: '$PostCommentVote_VoteType',
            count: { $sum: 1 }
          }
        }
      ]).toArray();

    const likes = voteCounts.find(v => v._id === 'Like')?.count || 0;
    const dislikes = voteCounts.find(v => v._id === 'Dislike')?.count || 0;

    // Update comment with new counts
    await mongoose.connection.db
      .collection('PostComment')
      .updateOne(
        { PostComment_PublicID: PostCommentVote_CommentID },
        {
          $set: {
            PostComment_NumLikes: likes,
            PostComment_NumDislikes: dislikes,
            PostComment_UpdatedDate: new Date()
          }
        }
      );

    res.status(200).json({
      status: true,
      message: `You have successfully ${PostCommentVote_VoteType.toLowerCase()}d this comment!`,
      data: {
        PostCommentVote_CommentID,
        PostCommentVote_VoteType,
        PostComment_NumLikes: likes,
        PostComment_NumDislikes: dislikes
      }
    });
  } catch (error) {
    console.error('Error handling comment vote:', error);
    res.status(200).json({
      status: false,
      message: 'Internal Server Error',
      data: {}
    });
  }
};

export default router;

