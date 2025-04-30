import express from 'express';
import { getUsers, getUserbyId, getUserByEmail, updateUserProfile, updateUserPermissions, updateUserPassword, userNotificationsSettings, toggleUserFollow, checkFollowStatus, getUserFollowers } from '../controllers/userController.js'; 
import passport from 'passport';

const router = express.Router();

// GET route to fetch users
router.get('/getUsers', getUsers);
// POST route to fetch users
router.post('/getUsers', getUsers);
// GET route to fetch user by id
router.get('/getUserbyId', getUserbyId); 
// GET route to fetch user by email
router.get('/getUserByEmail', getUserByEmail); 
// PUT route to update user profile
router.put('/updateUserProfile', updateUserProfile);
// POST route for updating user profile (alternative)
router.post('/updateUserProfile', updateUserProfile);
// PUT route to update user permissions
router.put('/updateUserPermissions', updateUserPermissions);
// POST route for updating user permissions (alternative)
router.post('/updateUserPermissions', updateUserPermissions);
// POST route to update user password
router.post('/updateUserPassword', updateUserPassword);

// POST route to get/update user notifications settings
router.post('/userNotificationsSettings', passport.authenticate('jwt', { session: false }), userNotificationsSettings);

// Follow/Unfollow routes
router.post('/follow', passport.authenticate('jwt', { session: false }), toggleUserFollow);
router.post('/followStatus', passport.authenticate('jwt', { session: false }), checkFollowStatus);
router.get('/followers', passport.authenticate('jwt', { session: false }), getUserFollowers);

export default router; 