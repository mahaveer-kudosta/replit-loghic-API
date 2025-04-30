import express from 'express';
import { getAdvisors, getAdvisorById, getAdvisorCategories } from '../controllers/advisorController.js';

const router = express.Router();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   
router.get('/getAdvisors', getAdvisors);

router.get('/getAdvisorById', getAdvisorById);

router.get('/getAdvisorCategories', getAdvisorCategories);

export default router; 