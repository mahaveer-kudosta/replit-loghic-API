import express from 'express';
import { createNotification, getUserNotifications, deleteNotification, clearAllNotifications } from '../controllers/notificationController.js';
import passport from 'passport';

const router = express.Router();

// Create a new notification
router.post('/create', passport.authenticate('jwt', { session: false }), createNotification);

// Get user's notifications
router.get('/getUserNotifications', passport.authenticate('jwt', { session: false }), getUserNotifications);

// Delete a specific notification
router.delete('/deleteNotification/:notificationId', passport.authenticate('jwt', { session: false }), deleteNotification);

// Clear all notifications
router.delete('/clearAllNotifications', passport.authenticate('jwt', { session: false }), clearAllNotifications);

export default router; 