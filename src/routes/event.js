import express from 'express';
import { getEvents, getUpcomingEvents } from '../controllers/eventController.js';

const router = express.Router();

// POST route to fetch events
router.post('/getEvents', getEvents);

// POST route to fetch upcoming events
router.post('/getUpcomingEvents', getUpcomingEvents);

export default router; 