import express from 'express';
import { searchCompanies, searchAll } from '../controllers/searchController.js';

const router = express.Router();

// Route to search companies by name (GET)
router.get('/searchCompanies', searchCompanies);

// Route to search companies, posts, and users by name
router.get('/searchAll', searchAll);

export default router; 