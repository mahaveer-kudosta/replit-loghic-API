import express from 'express';
import { 
  getPosts, 
  getPostbyId, 
  getTrendingPosts, 
  createPost, 
  getPostCategories, 
  postVote,
  createPostComment,
  getPostComments,
  deletePostComment,
  getPostbyUserId,
  postCommentVote
} from '../controllers/postController.js';
import passport from 'passport'; // Ensure passport is imported

const router = express.Router();

// GET route to fetch posts
router.get('/getPosts', getPosts); 
// GET route to fetch post by id
router.get('/getPostbyId', getPostbyId);
// GET route to fetch post by user id
router.get('/getPostbyUserId', getPostbyUserId);
// POST route to fetch trending posts
router.post('/getTrendingPosts', getTrendingPosts);
// POST route to create a new post
router.post('/createPost', passport.authenticate('jwt', { session: false }), createPost);
// GET route to fetch unique categories
router.get('/getPostCategories', getPostCategories);
// POST route to handle post likes/dislikes
router.post('/postVote', passport.authenticate('jwt', { session: false }), postVote);

// Comment routes
// POST route to create a new comment
router.post('/submitComment', passport.authenticate('jwt', { session: false }), createPostComment);
// GET route to fetch comments for a post
router.get('/getPostComments', getPostComments);
// DELETE route to remove a comment
router.post('/deleteComment', passport.authenticate('jwt', { session: false }), deletePostComment);
// POST route to handle comment likes/dislikes
router.post('/postCommentVote', passport.authenticate('jwt', { session: false }), postCommentVote);

export default router; 