import Event from '../models/eventModel.js'; // Adjust the path as necessary
import mongoose from 'mongoose';

// Controller function to get events with pagination
export const getEvents = async (req, res) => {
  const { page = 1, limit = 10 } = req.body; // Read page and limit from request body
  const skip = (page - 1) * limit; // Calculate the number of documents to skip

  try {
    const events = await Event.find()
      .skip(skip)
      .limit(limit); // Fetch events with pagination

    const totalEvents = await Event.countDocuments(); // Get total number of events

    // Return the response in the desired format
    res.status(200).json({
      status: true,
      message: 'Events fetched successfully',
      data: {
        total: totalEvents,
        page: page,
        limit: limit,
        events: events,
      },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};

// Controller function to get upcoming events
export const getUpcomingEvents = async (req, res) => {
  const { page = 1, limit = 10 } = req.body; // Read page and limit from request body
  const skip = (page - 1) * limit; // Calculate the number of documents to skip

  try {
    const currentDate = new Date(); // Get the current date and time

    const upcomingEvents = await Event.find({
        Event_Date: { $gte: currentDate }, // Filter for events that are on or after the current date
      }).select('Event_PublicID Event_Title Event_Description Event_Date Event_Time Event_EndTime Event_CloseTime Event_TimeZone') // Select only the specified fields
      .sort({ Event_Date: 1, Event_Time: 1 }) // Sort by date and time
      .skip(skip)
      .limit(limit); // Fetch events with pagination

    const totalEvents = await Event.countDocuments({
      Event_Date: { $gte: currentDate }, // Count total upcoming events
    });

    // Return the response in the desired format
    res.status(200).json({
      status: true,
      message: 'Upcoming events fetched successfully',
      data: {
        total: totalEvents,
        page: page,
        limit: limit,
        events: upcomingEvents,
      },
    });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
}; 