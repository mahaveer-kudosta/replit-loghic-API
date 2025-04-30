import mongoose from 'mongoose';
import { userModel } from '../schemas/user.schema'; // Adjust the path as necessary
import Company from '../models/companyModel.js'; // Adjust the path as necessary
import Post from '../models/postModel.js'; // Adjust the path as necessary

// Function to search companies by name
export const searchCompanies = async (req, res) => {
   const { Search_keyword: querySearch_keyword } = req.query; // Get the search term from query parameters
   const { Search_keyword: bodySearch_keyword } = req.body; // Get the search term from request body
   const Search_keyword = querySearch_keyword || bodySearch_keyword;
  
  // Check if the search keyword is less than 3 characters
  if (!Search_keyword || Search_keyword.length < 3) {
    return res.status(400).json({
      status: false,
      message: 'Search term must be at least 3 characters long',
      data: {},
    });
  }

  try {
    const companies = await Company.find({
      Company_Name: { $regex: Search_keyword, $options: 'i' } // Case-insensitive search
    });

    res.status(200).json({
      status: true,
      message: 'Companies fetched successfully',
      data: companies,
    });
  } catch (error) {
    console.error('Error searching companies:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};

// Function to search companies, posts, and users by name
export const searchAll = async (req, res) => {
  const { Search_keyword: querySearch_keyword } = req.query; // Get the search term from query parameters
  const { Search_keyword: bodySearch_keyword } = req.body; // Get the search term from request body
  const Search_keyword = querySearch_keyword || bodySearch_keyword;

  // Check if the search keyword is less than 3 characters
  if (!Search_keyword || Search_keyword.length < 3) {
    return res.status(400).json({
      status: false,
      message: 'Search term must be at least 3 characters long',
      data: {},
    });
  }

  try {
    const companies = await Company.find({
        Company_Name: { $regex: Search_keyword, $options: 'i' }
    });

    const posts = await Post.find({
        Post_Title: { $regex: Search_keyword, $options: 'i' } // Assuming posts have a title field
    });

    const users = await userModel.find({
        User_Name: { $regex: Search_keyword, $options: 'i' }
    });

    res.status(200).json({
      status: true,
      message: 'Search results fetched successfully',
      data: {
        companies,
        posts,
        users,
      },
    });
  } catch (error) {
    console.error('Error searching all:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
}; 