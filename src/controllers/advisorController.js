import Advisor from '../models/advisorModel.js';
import mongoose from 'mongoose';

/**
 * @function getAdvisors
 * @description Get all financial advisors with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with advisors data
 */
export const getAdvisors = async (req, res) => {
    const { page: queryPage, limit: queryLimit } = req.query;
    const { page: bodyPage = 1, limit: bodyLimit = 20 } = req.body;

    const page = queryPage ? parseInt(queryPage, 10) : parseInt(bodyPage, 10);
    const limit = queryLimit ? parseInt(queryLimit, 10) : parseInt(bodyLimit, 10);
    const skip = (page - 1) * limit;

    try {
        const advisors = await mongoose.connection.db
            .collection('User')
            .aggregate([
                { 
                    $match: { 
                        User_Role: 'financial-advisor',
                        User_IsDeleted: { $ne: true }
                    } 
                },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        User_PublicID: 1,
                        User_Name: 1,
                        User_Fname: 1,
                        User_Lname: 1,
                        User_Title: 1,
                        User_Email: 1,
                        User_Phone: 1,
                        User_HeroLine: 1,
                        User_About: 1,
                        User_ImageURL: 1,
                        User_WallpaperImageURL: 1,
                        Uesr_Advisor_Category: 1,
                        User_Status: 1,
                        User_Role: 1,
                        User_Created_at: 1,
                        User_Updated_at: 1
                    }
                }
            ])
            .toArray();

        const total = await mongoose.connection.db
            .collection('User')
            .countDocuments({ 
                User_Role: 'financial-advisor',
                User_IsDeleted: { $ne: true }
            });

        if (!advisors || advisors.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No financial advisors found'
            });
        }

        return res.status(200).json({
            success: true,
            data: advisors,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error in getAdvisors:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching financial advisors',
            error: error.message
        });
    }
};

/**
 * @function getAdvisorById
 * @description Get a specific financial advisor by User_PublicID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with advisor data
 */
export const getAdvisorById = async (req, res) => {
    const { User_PublicID: querySymbol } = req.query; // Read from query string
    const { User_PublicID: bodySymbol } = req.body; // Read from request body

    const User_PublicID = querySymbol || bodySymbol;

    if (!User_PublicID) {
        return res.status(400).json({
            status: false,
            message: 'User_PublicID is required',
            data: {}
        });
    }

    try {
        const advisor = await mongoose.connection.db
            .collection('User')
            .findOne({ 
                User_PublicID: User_PublicID,
                User_IsDeleted: { $ne: true }
            }, {
                projection: {
                    User_Password: 0,
                    User_DeletedTime: 0,
                    User_IsDeleted: 0
                }
            });

        if (!advisor) {
            return res.status(404).json({
                success: false,
                message: 'Financial advisor not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: advisor
        });
    } catch (error) {
        console.error('Error in getAdvisorById:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching financial advisor',
            error: error.message
        });
    }
};

/**
 * @function getAdvisorCategories
 * @description Get list of unique advisor categories
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with unique advisor categories
 */
export const getAdvisorCategories = async (req, res) => {
    try {
        const categories = await mongoose.connection.db
            .collection('User')
            .aggregate([
                { 
                    $match: { 
                        User_Role: 'financial-advisor',
                        User_IsDeleted: { $ne: true },
                        Uesr_Advisor_Category: { $exists: true, $ne: "" }
                    } 
                },
                {
                    $group: {
                        _id: "$Uesr_Advisor_Category"
                    }
                },
                {
                    $project: {
                        _id: 0,
                        category: "$_id"
                    }
                },
                {
                    $sort: { category: 1 }
                }
            ])
            .toArray();

        const uniqueCategories = categories.map(item => item.category);

        return res.status(200).json({
            success: true,
            data: {
                categories: uniqueCategories
            }
        });
    } catch (error) {
        console.error('Error in getAdvisorCategories:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching advisor categories',
            error: error.message
        });
    }
}; 