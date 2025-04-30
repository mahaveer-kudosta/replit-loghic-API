import Company from '../models/companyModel.js'; // Adjust the path as necessary
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Controller function to get companies with pagination and share price data
export const getCompanies = async (req, res) => {
  const { page: queryPage, limit: queryLimit } = req.query; // Read page and limit from query string
  const { page: bodyPage = 1, limit: bodyLimit = 20 } = req.body; // Read page and limit from request body

  // Determine the final page and limit values
  const page = queryPage ? parseInt(queryPage, 10) : parseInt(bodyPage, 10);
  const limit = queryLimit ? parseInt(queryLimit, 10) : parseInt(bodyLimit, 10);
  const skip = (page - 1) * limit;

  const User_PublicID = req.user?.User_PublicID || '';

  try {
    const companies = await mongoose.connection.db
      .collection('Company')
      .aggregate([
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'CoinPrice',
            let: { symbol: "$Company_Symbol" },
            pipeline: [
              { 
                $match: { 
                  $expr: { $eq: ["$Coin_CompanyCode", "$$symbol"] }
                } 
              },
              { $sort: { Coin_Current_Price: 1 } }
            ],
            as: 'CoinPrice',
          },
        },
        // Add lookup for UserWatchlist
        {
          $lookup: {
            from: 'UserWatchlist',
            let: { companyId: "$Company_PublicID" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$UserWatchlist_CompanyID", "$$companyId"] },
                      { $eq: ["$UserWatchlist_UserID", User_PublicID] }
                    ]
                  }
                }
              }
            ],
            as: 'WatchlistData'
          }
        },
        // Add lookup for UserFollow
        {
          $lookup: {
            from: 'UserFollow',
            let: { companyId: "$Company_PublicID" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$UserFollow_CompanyID", "$$companyId"] },
                      { $eq: ["$UserFollow_UserID", User_PublicID] }
                    ]
                  }
                }
              }
            ],
            as: 'FollowData'
          }
        },
        {
          $project: {
            _id: 1,
            Company_PublicID: 1,
            Company_Name: 1,
            Company_Symbol: 1,
            Company_LogoURL: 1,
            Company_Status: 1,
            Company_MarketType: 1,
            Company_Categories: 1,
            CoinPrice: 1,
            isWatchlisted: { 
              $cond: [
                { $gt: [{ $size: "$WatchlistData" }, 0] },
                true,
                false
              ]
            },
            isFollowed: {
              $cond: [
                { $gt: [{ $size: "$FollowData" }, 0] },
                true,
                false
              ]
            }
          },
        }
      ])
      .toArray();

    // Count total companies
    const totalCompanies = await mongoose.connection.db
      .collection('Company')
      .countDocuments();

    res.status(200).json({
      status: true,
      message: 'Companies with share price data fetched successfully',
      data: {
        total: totalCompanies,
        page: page,
        limit: limit,
        companies: companies,
      },
    });
  } catch (error) {
    console.error('Error fetching companies with share price data:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};
// Controller function to get company by id
export const getCompanybyId = async (req, res) => {
  const { Company_PublicID: querySymbol } = req.query; // Read from query string
  const { Company_PublicID: bodySymbol } = req.body; // Read from request body

  const Company_PublicID = querySymbol || bodySymbol;

  if (!Company_PublicID) {
    return res.status(400).json({ status: false, message: 'Company_PublicID is required', data: {}});
  }

  try {
    // Get company details
    const company = await Company.findOne({ Company_PublicID }); // Find the company by Company_PublicID

    if (!company) {
      return res.status(404).json({ status: false, message: 'Company not found', data: {}});
    }

    // Get all posts for this company
    const companyPosts = await mongoose.connection.db
      .collection('Post')
      .find({
        Post_CompanyID: Company_PublicID,
        Post_Status: 'publish',
        Post_TypeUserOrCompany: 'rss_news'
      })
      .sort({ Post_CreatedDate: -1 })
      .toArray();

    // Get company data with coin price
    const companyData = await mongoose.connection.db
      .collection('Company')
      .aggregate([
        { 
          $match: { 
            Company_PublicID: Company_PublicID 
          }
        },
        {
          $lookup: {
            from: 'CoinPrice',
            localField: 'Company_Symbol',
            foreignField: 'Coin_CompanyCode',
            as: 'CoinPrice'
          }
        },
        {
          $unwind: { 
            path: '$CoinPrice',
            preserveNullAndEmptyArrays: true 
          }
        }
      ])
      .toArray();

    if (companyData && companyData.length > 0) {
      // Add posts to company data
      companyData[0].Company_Posts = companyPosts;
      res.status(200).json({ 
        status: true, 
        message: 'Company fetched successfully', 
        data: companyData[0]
      });
    } else {
      res.status(404).json({ 
        status: false, 
        message: 'Company data not found', 
        data: {}
      });
    }
  } catch (error) {
    console.error('Error fetching Company:', error);
    res.status(500).json({ status: false, message: 'Internal Server Error', data: {}});
  }
};
// Controller function to get company by symbol with share price data
export const getCompanybySymbol = async (req, res) => {
  const { Company_Symbol: querySymbol } = req.query; // Read from query string
  const { Company_Symbol: bodySymbol } = req.body; // Read from request body

  const Company_Symbol = querySymbol || bodySymbol;

  if (!Company_Symbol) {
    return res.status(400).json({
      status: false,
      message: 'Company_Symbol is required',
      data: {},
    });
  }

  try {
    const companyData = await mongoose.connection.db
      .collection('Company')
      .aggregate([
        { $match: { Company_Symbol } },
        {
          $lookup: {
            from: 'CoinPrice',
            localField: 'Company_Symbol',
            foreignField: 'Coin_CompanyCode',
            as: 'CoinPrice'
          }
        },
        {
          $unwind: { 
            path: '$CoinPrice',
            preserveNullAndEmptyArrays: true 
          }
        },
        {
          $lookup: {
            from: 'Post',
            let: { companyId: '$Company_PublicID' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$Post_CompanyID', '$$companyId'] },
                      { $eq: ['$Post_Status', 'publish'] },
                      { $eq: ['$Post_TypeUserOrCompany', 'rss_news'] }
                    ]
                  }
                }
              },
              { $sort: { Post_CreatedDate: -1 } }
            ],
            as: 'Company_Posts'
          }
        },
        {
          $lookup: {
            from: 'Company',
            let: { categories: { $split: ['$Company_Categories', ','] } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $ne: ['$Company_Symbol', Company_Symbol] },
                      { $in: ['$Company_Categories', '$$categories'] }
                    ]
                  }
                }
              },
              {
                $lookup: {
                  from: 'CoinPrice',
                  localField: 'Company_Symbol',
                  foreignField: 'Coin_CompanyCode',
                  as: 'CoinPrice'
                }
              },
              {
                $project: {
                  _id: 1,
                  Company_PublicID: 1,
                  Company_Name: 1,
                  Company_Symbol: 1,
                  Company_LogoURL: 1,
                  Coin_Sparkline_7d: '$CoinPrice.Coin_Sparkline_7d'
                }
              },
              { $limit: 3 }
            ],
            as: 'Related_Companies'
          }
        },
        {
          $project: {
            _id: 0,
            Company_PublicID: 1,
            Company_Name: 1,
            Company_Symbol: 1,
            Company_LogoURL: 1,
            Company_Status: 1,
            Company_MarketType: 1,
            Company_Categories: 1,
            Company_CoinSymbol: 1,
            CoinPrice: 1,
            Company_Posts: 1,
            Related_Companies: 1
          }
        }
      ])
      .toArray();

    if (!companyData || companyData.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Company not found',
        data: {},
      });
    }

    res.status(200).json({
      status: true,
      message: 'Company fetched successfully',
      data: companyData[0],
    });
  } catch (error) {
    console.error('Error fetching Company:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};
// Controller function to get company market overview
export const getCompanyMarketOverview = async (req, res) => {
  const { page: queryPage, limit: queryLimit } = req.query; // Read page and limit from query string
  const { page: bodyPage = 1, limit: bodyLimit = 10 } = req.body; // Read page and limit from request body

  // Determine the final page and limit values
  const page = queryPage ? parseInt(queryPage, 10) : bodyPage;
  const limit = queryLimit ? parseInt(queryLimit, 10) : bodyLimit;

  const skip = (page - 1) * limit;

  try {
    // Aggregate Companies with their latest Share Price
    const companies = await mongoose.connection.db
      .collection('Company')
      .aggregate([
        {
          $lookup: {
            from: 'CoinPrice',
            localField: 'Company_Symbol', // Match Company Symbol
            foreignField: 'Coin_CompanyCode', // Match with Coin Price
            as: 'CoinPrice',
          },
        },
        {
          $unwind: { path: '$CoinPrice', preserveNullAndEmptyArrays: true }, // Flatten market data
        },
        {
          $project: {
            _id: 0,
            Company_Name: 1,
            Company_Symbol: 1,
            Company_LogoURL: 1,
            Company_Status: 1,
            Company_MarketType	: 1,
            Current_Price: '$CoinPrice.Coin_Current_Price',
            PriceChangePercentage_24h: '$CoinPrice.Coin_PriceChangePercentage_24h',
          },
        },
        { $skip: skip },
        { $limit: limit },
      ])
      .toArray();

    // Count total companies
    const totalCompanies = await mongoose.connection.db
      .collection('Company')
      .countDocuments();

    res.status(200).json({
      status: true,
      message: 'Companies market overview fetched successfully',
      data: {
        total: totalCompanies,
        page: page,
        limit: limit,
        companies: companies,
      },
    });
  } catch (error) {
    console.error('Error fetching market overview:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};
// Controller function to get trending companies
export const getTrendingCompanies = async (req, res) => {
  const { page: queryPage, limit: queryLimit } = req.query; // Read page and limit from query string
  const { page: bodyPage = 1, limit: bodyLimit = 10 } = req.body; // Read page and limit from request body

  // Determine the final page and limit values
  const page = queryPage ? parseInt(queryPage, 10) : bodyPage;
  const limit = queryLimit ? parseInt(queryLimit, 10) : bodyLimit;

  const skip = (page - 1) * limit; // Calculate the number of documents to skip

  try {
    const trendingCompanies = await mongoose.connection.db
      .collection('TrendingCoins')
      .aggregate([
        {
          $sort: { 
            TrendingCoins_UpdatedDate: -1  // Sort by UpdatedDate in descending order
          }
        },
        {
          $lookup: {
            from: 'Company',
            let: { companyCode: "$TrendingCoins_CompanyCode" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$Company_Symbol", "$$companyCode"] }
                }
              }
            ],
            as: 'CompanyData'
          }
        },
        {
          $unwind: {
            path: '$CompanyData',
            preserveNullAndEmptyArrays: false // This will remove documents where no company was found
          }
        },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'CoinPrice',
            let: { companyCode: "$TrendingCoins_CompanyCode" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$Coin_CompanyCode", "$$companyCode"] }
                }
              },
              { $sort: { Coin_TradeDateTime: -1 } },
              { $limit: 1 }
            ],
            as: 'CoinPriceData'
          }
        },
        {
          $unwind: {
            path: '$CoinPriceData',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            Company_Name: '$CompanyData.Company_Name',
            Company_Symbol: '$CompanyData.Company_Symbol',
            Company_LogoURL: '$CompanyData.Company_LogoURL',
            Company_Status: '$CompanyData.Company_Status',
            Company_MarketType: '$CompanyData.Company_MarketType',
            Company_Categories: '$CompanyData.Company_Categories',
            Current_Price: '$CoinPriceData.Coin_Current_Price',
            PriceChangePercentage_24h: '$CoinPriceData.Coin_PriceChangePercentage_24h',
          }
        }
      ])
      .toArray();

    // Count total trending companies that have matching companies
    const totalTrendingCompanies = await mongoose.connection.db
      .collection('TrendingCoins')
      .aggregate([
        {
          $lookup: {
            from: 'Company',
            let: { companyCode: "$TrendingCoins_CompanyCode" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$Company_Symbol", "$$companyCode"] }
                }
              }
            ],
            as: 'CompanyData'
          }
        },
        {
          $match: {
            CompanyData: { $ne: [] } // Only count documents where company was found
          }
        },
        {
          $count: "total"
        }
      ])
      .toArray();

    const total = totalTrendingCompanies.length > 0 ? totalTrendingCompanies[0].total : 0;

    res.status(200).json({
      status: true,
      message: 'Trending companies fetched successfully',
      data: {
        total: total,
        page: page,
        limit: limit,
        companies: trendingCompanies,
      },
    });
  } catch (error) {
    console.error('Error fetching trending companies:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};
// Controller function to get top gainers companies
export const getTopGainers = async (req, res) => {
  const { page: queryPage, limit: queryLimit } = req.query; // Read page and limit from query string
  const { page: bodyPage = 1, limit: bodyLimit = 10 } = req.body; // Read page and limit from request body

  // Determine the final page and limit values
  const page = queryPage ? parseInt(queryPage, 10) : bodyPage;
  const limit = queryLimit ? parseInt(queryLimit, 10) : bodyLimit;
  const skip = (page - 1) * limit; // Calculate the number of documents to skip

  const User_PublicID = req.user?.User_PublicID || '';

  try {
    const topGainers = await mongoose.connection.db
      .collection('TopGainersCoins')
      .aggregate([
        {
          $sort: { 
            TopGainersCoins_UpdatedDate: -1
          }
        },
        {
          $lookup: {
            from: 'Company',
            let: { companyCode: "$TopGainersCoins_CompanyCode" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$Company_Symbol", "$$companyCode"] }
                }
              }
            ],
            as: 'CompanyData'
          }
        },
        {
          $unwind: {
            path: '$CompanyData',
            preserveNullAndEmptyArrays: false
          }
        },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'CoinPrice',
            let: { companyCode: "$TopGainersCoins_CompanyCode" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$Coin_CompanyCode", "$$companyCode"] }
                }
              },
              { $sort: { Coin_TradeDateTime: -1 } },
              { $limit: 1 }
            ],
            as: 'CoinPrice'
          }
        },
        // Add lookup for UserWatchlist
        {
          $lookup: {
            from: 'UserWatchlist',
            let: { companyId: "$CompanyData.Company_PublicID" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$UserWatchlist_CompanyID", "$$companyId"] },
                      { $eq: ["$UserWatchlist_UserID", User_PublicID] }
                    ]
                  }
                }
              }
            ],
            as: 'WatchlistData'
          }
        },
        // Add lookup for UserFollow
        {
          $lookup: {
            from: 'UserFollow',
            let: { companyId: "$CompanyData.Company_PublicID" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$UserFollow_CompanyID", "$$companyId"] },
                      { $eq: ["$UserFollow_UserID", User_PublicID] }
                    ]
                  }
                }
              }
            ],
            as: 'FollowData'
          }
        },
        {
          $project: {
            _id: 1,
            Company_PublicID: '$CompanyData.Company_PublicID',
            Company_Name: '$CompanyData.Company_Name',
            Company_Symbol: '$CompanyData.Company_Symbol',
            Company_LogoURL: '$CompanyData.Company_LogoURL',
            Company_Status: '$CompanyData.Company_Status',
            Company_MarketType: '$CompanyData.Company_MarketType',
            Company_Categories: '$CompanyData.Company_Categories',
            Current_Price: { $arrayElemAt: ['$CoinPrice.Coin_Current_Price', 0] },
            PriceChangePercentage_24h: { $arrayElemAt: ['$CoinPrice.Coin_PriceChangePercentage_24h', 0] },
            CoinPrice: 1,
            isWatchlisted: { 
              $cond: [
                { $gt: [{ $size: "$WatchlistData" }, 0] },
                true,
                false
              ]
            },
            isFollowed: {
              $cond: [
                { $gt: [{ $size: "$FollowData" }, 0] },
                true,
                false
              ]
            }
          }
        }
      ])
      .toArray();

    // Count total top gainers that have matching companies
    const totalTopGainers = await mongoose.connection.db
      .collection('TopGainersCoins')
      .aggregate([
        {
          $lookup: {
            from: 'Company',
            let: { companyCode: "$TopGainersCoins_CompanyCode" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$Company_Symbol", "$$companyCode"] }
                }
              }
            ],
            as: 'CompanyData'
          }
        },
        {
          $match: {
            CompanyData: { $ne: [] }
          }
        },
        {
          $count: "total"
        }
      ])
      .toArray();

    const total = totalTopGainers.length > 0 ? totalTopGainers[0].total : 0;

    res.status(200).json({
      status: true,
      message: 'Top gainers fetched successfully',
      data: {
        total: total,
        page: page,
        limit: limit,
        companies: topGainers,
      },
    });
  } catch (error) {
    console.error('Error fetching top gainers:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};
// Controller function to get top losers companies
export const getTopLosers = async (req, res) => {
  const { page: queryPage, limit: queryLimit } = req.query; // Read page and limit from query string
  const { page: bodyPage = 1, limit: bodyLimit = 10 } = req.body; // Read page and limit from request body

  // Determine the final page and limit values
  const page = queryPage ? parseInt(queryPage, 10) : bodyPage;
  const limit = queryLimit ? parseInt(queryLimit, 10) : bodyLimit;
  const skip = (page - 1) * limit; // Calculate the number of documents to skip

  const User_PublicID = req.user?.User_PublicID || '';

  try {
    const topLosers = await mongoose.connection.db
      .collection('TopLosersCoins')
      .aggregate([
        {
          $sort: { 
            TopLosersCoins_UpdatedDate: -1
          }
        },
        {
          $lookup: {
            from: 'Company',
            let: { companyCode: "$TopLosersCoins_CompanyCode" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$Company_Symbol", "$$companyCode"] }
                }
              }
            ],
            as: 'CompanyData'
          }
        },
        {
          $unwind: {
            path: '$CompanyData',
            preserveNullAndEmptyArrays: false
          }
        },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'CoinPrice',
            let: { companyCode: "$TopLosersCoins_CompanyCode" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$Coin_CompanyCode", "$$companyCode"] }
                }
              },
              { $sort: { Coin_TradeDateTime: -1 } },
              { $limit: 1 }
            ],
            as: 'CoinPrice'
          }
        },
        // Add lookup for UserWatchlist
        {
          $lookup: {
            from: 'UserWatchlist',
            let: { companyId: "$CompanyData.Company_PublicID" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$UserWatchlist_CompanyID", "$$companyId"] },
                      { $eq: ["$UserWatchlist_UserID", User_PublicID] }
                    ]
                  }
                }
              }
            ],
            as: 'WatchlistData'
          }
        },
        // Add lookup for UserFollow
        {
          $lookup: {
            from: 'UserFollow',
            let: { companyId: "$CompanyData.Company_PublicID" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$UserFollow_CompanyID", "$$companyId"] },
                      { $eq: ["$UserFollow_UserID", User_PublicID] }
                    ]
                  }
                }
              }
            ],
            as: 'FollowData'
          }
        },
        {
          $project: {
            _id: 1,
            Company_PublicID: '$CompanyData.Company_PublicID',
            Company_Name: '$CompanyData.Company_Name',
            Company_Symbol: '$CompanyData.Company_Symbol',
            Company_LogoURL: '$CompanyData.Company_LogoURL',
            Company_Status: '$CompanyData.Company_Status',
            Company_MarketType: '$CompanyData.Company_MarketType',
            Company_Categories: '$CompanyData.Company_Categories',
            Current_Price: { $arrayElemAt: ['$CoinPrice.Coin_Current_Price', 0] },
            PriceChangePercentage_24h: { $arrayElemAt: ['$CoinPrice.Coin_PriceChangePercentage_24h', 0] },
            CoinPrice: 1,
            isWatchlisted: { 
              $cond: [
                { $gt: [{ $size: "$WatchlistData" }, 0] },
                true,
                false
              ]
            },
            isFollowed: {
              $cond: [
                { $gt: [{ $size: "$FollowData" }, 0] },
                true,
                false
              ]
            }
          }
        }
      ])
      .toArray();

    // Count total top losers that have matching companies
    const totalTopLosers = await mongoose.connection.db
      .collection('TopLosersCoins')
      .aggregate([
        {
          $lookup: {
            from: 'Company',
            let: { companyCode: "$TopLosersCoins_CompanyCode" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$Company_Symbol", "$$companyCode"] }
                }
              }
            ],
            as: 'CompanyData'
          }
        },
        {
          $match: {
            CompanyData: { $ne: [] }
          }
        },
        {
          $count: "total"
        }
      ])
      .toArray();

    const total = totalTopLosers.length > 0 ? totalTopLosers[0].total : 0;

    res.status(200).json({
      status: true,
      message: 'Top losers fetched successfully',
      data: {
        total: total,
        page: page,
        limit: limit,
        companies: topLosers,
      },
    });
  } catch (error) {
    console.error('Error fetching top losers:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};
// Add this new function to your existing companyController.js
export const getCoinPriceDetails = async (req, res) => {
  const { Coin_CompanyCode: querySymbol } = req.query; // Read from query string
  const { Coin_CompanyCode: bodySymbol } = req.body; // Read from request body

  const Coin_CompanyCode = querySymbol || bodySymbol;

  if (!Coin_CompanyCode) {
    return res.status(400).json({
      status: false,
      message: 'Coin_CompanyCode is required',
      data: {},
    });
  }

  try {
    const coinDetails = await mongoose.connection.db
      .collection('Company')  // Start with Company collection
      .aggregate([
        { 
          $match: { 
            Company_Symbol: Coin_CompanyCode  // Match using Company_Symbol
          }
        },
        {
          $lookup: {
            from: 'CoinPrice',
            let: { symbol: "$Company_Symbol" },
            pipeline: [
              { 
                $match: { 
                  $expr: { $eq: ["$Coin_CompanyCode", "$$symbol"] }
                } 
              },
              { $sort: { Coin_TradeDateTime: -1 } },
              { $limit: 1 }
            ],
            as: 'coinPriceData'
          }
        },
        {
          $unwind: { 
            path: '$coinPriceData',
            preserveNullAndEmptyArrays: true 
          }
        },
        {
          $project: {
            _id: 0,
            Company_Name: 1,
            Company_Symbol: 1,
            Company_LogoURL: 1,
            Coin_Current_Price: "$coinPriceData.Coin_Current_Price",
            Coin_Price_24h: "$coinPriceData.Coin_Price_24h",
            Coin_PriceChangePercentage_24h: "$coinPriceData.Coin_PriceChangePercentage_24h",
            Coin_PriceChangePercentage_1h: "$coinPriceData.Coin_PriceChangePercentage_1h",
          }
        }
      ])
      .toArray();

    if (!coinDetails || coinDetails.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Coin details not found',
        data: {},
      });
    }

    res.status(200).json({
      status: true,
      message: 'Coin details fetched successfully',
      data: coinDetails[0]
    });

  } catch (error) {
    console.error('Error fetching coin details:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};
// Controller function to get price comparison companies by categories
export const getPriceComparisonCompanies = async (req, res) => {
  const { Company_Categories: queryCategories } = req.query; // Read from query string
  const { Company_Categories: bodyCategories } = req.body; // Read from request body

  const Company_Categories = queryCategories || bodyCategories;

  if (!Company_Categories) {
    return res.status(400).json({
      status: false,
      message: 'Company_Categories is required',
      data: {},
    });
  }

  try {
    const categories = Company_Categories.split(',').map(cat => cat.trim());

    const companies = await mongoose.connection.db
      .collection('Company')
      .aggregate([
        {
          $match: {
            Company_Categories: { $in: categories }
          }
        },
        {
          $lookup: {
            from: 'CoinPrice',
            localField: 'Company_Symbol',
            foreignField: 'Coin_CompanyCode',
            as: 'CoinPrice'
          }
        },
        {
          $project: {
            _id: 1,
            Company_PublicID: 1,
            Company_Name: 1,
            Company_Symbol: 1,
            Company_LogoURL: 1,
            Company_Categories: 1,
            Coin_Sparkline_7d: "$CoinPrice.Coin_Sparkline_7d",
          }
        }
      ])
      .toArray();

    res.status(200).json({
      status: true,
      message: 'Price comparison companies fetched successfully',
      data: companies
    });
  } catch (error) {
    console.error('Error fetching price comparison companies:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};
// Controller function to get user coin watchlist
export const getUserCoinWatchlist = async (req, res) => {
  // User is already authenticated by passport, we can access user details from req.user
  const User_PublicID = req.user.User_PublicID;
  const { page: queryPage, limit: queryLimit } = req.query; // Read page and limit from query string
  const { page: bodyPage = 1, limit: bodyLimit = 10 } = req.body; // Read page and limit from request body

  // Determine the final page and limit values
  const page = queryPage ? parseInt(queryPage, 10) : bodyPage;
  const limit = queryLimit ? parseInt(queryLimit, 10) : bodyLimit;

  const skip = (page - 1) * limit; // Calculate the number of documents to skip

  try {
    const watchlist = await mongoose.connection.db
      .collection('UserWatchlist')
      .aggregate([
        {
          $match: {
            UserWatchlist_UserID: User_PublicID
          }
        },
        {
          $sort: { 
            UserWatchlist_UpdatedDate: -1
          }
        },
        {
          $lookup: {
            from: 'Company',
            let: { companyId: "$UserWatchlist_CompanyID" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$Company_PublicID", "$$companyId"] }
                }
              }
            ],
            as: 'CompanyData'
          }
        },
        {
          $unwind: {
            path: '$CompanyData',
            preserveNullAndEmptyArrays: false
          }
        },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'CoinPrice',
            let: { companyCode: "$CompanyData.Company_Symbol" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$Coin_CompanyCode", "$$companyCode"] }
                }
              },
              { $sort: { Coin_TradeDateTime: -1 } },
              { $limit: 1 }
            ],
            as: 'CoinPrice'
          }
        },
        // Add lookup for UserFollow
        {
          $lookup: {
            from: 'UserFollow',
            let: { companyId: "$CompanyData.Company_PublicID" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$UserFollow_CompanyID", "$$companyId"] },
                      { $eq: ["$UserFollow_UserID", User_PublicID] }
                    ]
                  }
                }
              }
            ],
            as: 'FollowData'
          }
        },
        {
          $addFields: {
            isWatchlisted: true, // Since this is watchlist, all items are watchlisted
            isFollowed: {
              $cond: [
                { $gt: [{ $size: "$FollowData" }, 0] },
                true,
                false
              ]
            }
          }
        },
        {
          $project: {
            _id: 1,
            Company_PublicID: '$CompanyData.Company_PublicID',
            Company_Name: '$CompanyData.Company_Name',
            Company_Symbol: '$CompanyData.Company_Symbol',
            Company_LogoURL: '$CompanyData.Company_LogoURL',
            Company_Status: '$CompanyData.Company_Status',
            Company_MarketType: '$CompanyData.Company_MarketType',
            Company_Categories: '$CompanyData.Company_Categories',
            Current_Price: { $arrayElemAt: ['$CoinPrice.Coin_Current_Price', 0] },
            PriceChangePercentage_24h: { $arrayElemAt: ['$CoinPrice.Coin_PriceChangePercentage_24h', 0] },
            isWatchlisted: 1,
            isFollowed: 1,
            CoinPrice: 1
          }
        }
      ])
      .toArray();

    // Count total items
    const totalItems = await mongoose.connection.db
      .collection('UserWatchlist')
      .aggregate([
        {
          $match: {
            UserWatchlist_UserID: User_PublicID
          }
        },
        {
          $lookup: {
            from: 'Company',
            let: { companyId: "$UserWatchlist_CompanyID" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$Company_PublicID", "$$companyId"] }
                }
              }
            ],
            as: 'CompanyData'
          }
        },
        {
          $match: {
            CompanyData: { $ne: [] }
          }
        },
        {
          $count: "total"
        }
      ])
      .toArray();

    const total = totalItems.length > 0 ? totalItems[0].total : 0;

    res.status(200).json({
      status: true,
      message: 'User watchlist fetched successfully',
      data: {
        total: total,
        page: page,
        limit: limit,
        companies: watchlist,
      },
    });
  } catch (error) {
    console.error('Error fetching user watchlist:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};
// Controller function to toggle (add/remove) user watchlist item
export const coinAddorRemoveWatchlist = async (req, res) => {
  // User is already authenticated by passport, we can access user details from req.user
  const User_PublicID = req.user.User_PublicID;
  const { Company_PublicID: queryCompanyPublicID } = req.query; // Read from query string
  const { Company_PublicID: bodyCompanyPublicID } = req.body; // Read from request body

  const Company_PublicID = queryCompanyPublicID || bodyCompanyPublicID;

  if (!Company_PublicID) {
    return res.status(400).json({
      status: false,
      message: 'Company_PublicID is required',
      data: {},
    });
  }

  try {
    // First check if company exists
    const company = await mongoose.connection.db
      .collection('Company')
      .findOne({ Company_PublicID });

    if (!company) {
      return res.status(404).json({
        status: false,
        message: 'Company not found',
        data: {},
      });
    }

    // Check if item already exists in watchlist
    const existingItem = await mongoose.connection.db
      .collection('UserWatchlist')
      .findOne({
        UserWatchlist_UserID: User_PublicID,
        UserWatchlist_CompanyID: Company_PublicID
      });

    if (existingItem) {
      // Remove from watchlist - remove all duplicates if they exist
      await mongoose.connection.db
        .collection('UserWatchlist')
        .deleteMany({
          UserWatchlist_UserID: User_PublicID,
          UserWatchlist_CompanyID: Company_PublicID
        });

      return res.status(200).json({
        status: true,
        message: 'Company removed from watchlist successfully',
        data: {
          isAdded: false,
          Company_PublicID
        },
      });
    } else {
      // Before adding, ensure there are no duplicates
      await mongoose.connection.db
        .collection('UserWatchlist')
        .deleteMany({
          UserWatchlist_UserID: User_PublicID,
          UserWatchlist_CompanyID: Company_PublicID
        });

      // Add to watchlist
      const currentTime = new Date();
      await mongoose.connection.db
        .collection('UserWatchlist')
        .insertOne({
          UserWatchlist_UserID: User_PublicID,
          UserWatchlist_CompanyID: Company_PublicID,
          UserWatchlist_CompanySymbol: company.Company_Symbol,
          UserWatchlist_CreatedDate: currentTime,
          UserWatchlist_UpdatedDate: currentTime,
        });

      return res.status(200).json({
        status: true,
        message: 'Company added to watchlist successfully',
        data: {
          isAdded: true,
          Company_PublicID
        },
      });
    }
  } catch (error) {
    console.error('Error toggling watchlist item:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};
// Controller function to toggle (add/remove) user follow item
export const coinAddorRemoveFollow = async (req, res) => {
  // User is already authenticated by passport, we can access user details from req.user
  const User_PublicID = req.user.User_PublicID;
  const { Company_PublicID: queryCompanyPublicID } = req.query; // Read from query string
  const { Company_PublicID: bodyCompanyPublicID } = req.body; // Read from request body

  const Company_PublicID = queryCompanyPublicID || bodyCompanyPublicID;

  if (!Company_PublicID) {
    return res.status(400).json({
      status: false,
      message: 'Company_PublicID is required',
      data: {},
    });
  }

  try {
    // First check if company exists
    const company = await mongoose.connection.db
      .collection('Company')
      .findOne({ Company_PublicID });

    if (!company) {
      return res.status(404).json({
        status: false,
        message: 'Company not found',
        data: {},
      });
    }

    // Check if item already exists in follow list
    const existingItem = await mongoose.connection.db
      .collection('UserFollow')
      .findOne({
        UserFollow_UserID: User_PublicID,
        UserFollow_CompanyID: Company_PublicID
      });

    if (existingItem) {
      // Remove from follow list - remove all duplicates if they exist
      await mongoose.connection.db
        .collection('UserFollow')
        .deleteMany({
          UserFollow_UserID: User_PublicID,
          UserFollow_CompanyID: Company_PublicID
        });

      return res.status(200).json({
        status: true,
        message: 'Company unfollowed successfully',
        data: {
          isFollowed: false,
          Company_PublicID
        },
      });
    } else {
      // Before adding, ensure there are no duplicates
      await mongoose.connection.db
        .collection('UserFollow')
        .deleteMany({
          UserFollow_UserID: User_PublicID,
          UserFollow_CompanyID: Company_PublicID
        });

      // Add to follow list
      const currentTime = new Date();
      await mongoose.connection.db
        .collection('UserFollow')
        .insertOne({
          UserFollow_UserID: User_PublicID,
          UserFollow_CompanyID: Company_PublicID,
          UserFollow_CompanySymbol: company.Company_Symbol,
          UserFollow_CreatedDate: currentTime,
          UserFollow_UpdatedDate: currentTime,
        });

      return res.status(200).json({
        status: true,
        message: 'Company followed successfully',
        data: {
          isFollowed: true,
          Company_PublicID
        },
      });
    }
  } catch (error) {
    console.error('Error toggling follow status:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};
// Controller function to get user followed coins
export const getUserCoinFollow = async (req, res) => {
  // User is already authenticated by passport, we can access user details from req.user
  const User_PublicID = req.user.User_PublicID;

  const { page: queryPage, limit: queryLimit } = req.query; // Read page and limit from query string
  const { page: bodyPage = 1, limit: bodyLimit = 10 } = req.body; // Read page and limit from request body

  // Determine the final page and limit values
  const page = queryPage ? parseInt(queryPage, 10) : bodyPage;
  const limit = queryLimit ? parseInt(queryLimit, 10) : bodyLimit;

  const skip = (page - 1) * limit; // Calculate the number of documents to skip

  try {
    const followList = await mongoose.connection.db
      .collection('UserFollow')
      .aggregate([
        {
          $match: {
            UserFollow_UserID: User_PublicID
          }
        },
        {
          $sort: { 
            UserFollow_UpdatedDate: -1
          }
        },
        {
          $lookup: {
            from: 'Company',
            let: { companyId: "$UserFollow_CompanyID" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$Company_PublicID", "$$companyId"] }
                }
              }
            ],
            as: 'CompanyData'
          }
        },
        {
          $unwind: {
            path: '$CompanyData',
            preserveNullAndEmptyArrays: false
          }
        },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'CoinPrice',
            let: { companyCode: "$CompanyData.Company_Symbol" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$Coin_CompanyCode", "$$companyCode"] }
                }
              },
              { $sort: { Coin_TradeDateTime: -1 } },
              { $limit: 1 }
            ],
            as: 'CoinPrice'
          }
        },
        // Add lookup for UserWatchlist
        {
          $lookup: {
            from: 'UserWatchlist',
            let: { companyId: "$CompanyData.Company_PublicID" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$UserWatchlist_CompanyID", "$$companyId"] },
                      { $eq: ["$UserWatchlist_UserID", User_PublicID] }
                    ]
                  }
                }
              }
            ],
            as: 'WatchlistData'
          }
        },
        {
          $project: {
            _id: 1,
            User_PublicID: 1,
            Company_PublicID: 1,
            UserFollow_CreatedDate: 1,
            UserFollow_UpdatedDate: 1,
            Company_Name: '$CompanyData.Company_Name',
            Company_Symbol: '$CompanyData.Company_Symbol',
            Company_LogoURL: '$CompanyData.Company_LogoURL',
            Company_Status: '$CompanyData.Company_Status',
            Company_MarketType: '$CompanyData.Company_MarketType',
            Company_Categories: '$CompanyData.Company_Categories',
            Current_Price: { $arrayElemAt: ['$CoinPrice.Coin_Current_Price', 0] },
            PriceChangePercentage_24h: { $arrayElemAt: ['$CoinPrice.Coin_PriceChangePercentage_24h', 0] },
            CoinPrice: 1,
            isWatchlisted: { 
              $cond: [
                { $gt: [{ $size: "$WatchlistData" }, 0] },
                true,
                false
              ]
            },
            isFollowed: true // Since this is follow list, all items are followed
          }
        }
      ])
      .toArray();

    // Count total follow items for this user
    const totalFollow = await mongoose.connection.db
      .collection('UserFollow')
      .aggregate([
        {
          $match: {
            UserFollow_UserID: User_PublicID
          }
        },
        {
          $lookup: {
            from: 'Company',
            let: { companyId: "$UserFollow_CompanyID" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$Company_PublicID", "$$companyId"] }
                }
              }
            ],
            as: 'CompanyData'
          }
        },
        {
          $match: {
            CompanyData: { $ne: [] }
          }
        },
        {
          $count: "total"
        }
      ])
      .toArray();

    const total = totalFollow.length > 0 ? totalFollow[0].total : 0;

    res.status(200).json({
      status: true,
      message: 'User follow list fetched successfully',
      data: {
        total: total,
        page: page,
        limit: limit,
        companies: followList,
      },
    });
  } catch (error) {
    console.error('Error fetching user follow list:', error);
    res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      data: {},
    });
  }
};