import express from 'express';
import passport from 'passport';
import {
  sendMessage,
  getMessages,
  handleMessageRequest,
  getMessageContacts
} from '../controllers/messageController.js';

const router = express.Router();

// Send message
router.post('/send', 
  passport.authenticate('jwt', { session: false }), 
  sendMessage
);

// Get messages between users
router.get('/list', 
  passport.authenticate('jwt', { session: false }), 
  getMessages
);

// Handle message contact request (accept/reject)
router.post('/request/handle', 
  passport.authenticate('jwt', { session: false }), 
  handleMessageRequest
);

// Get message contacts
router.get('/contacts', 
  passport.authenticate('jwt', { session: false }), 
  getMessageContacts
);

export default router; 