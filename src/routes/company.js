import express from 'express';
import { getCompanies, getCompanybyId, getCompanybySymbol, getCompanyMarketOverview, getTrendingCompanies, getTopGainers, getTopLosers, getCoinPriceDetails, getPriceComparisonCompanies, getUserCoinWatchlist, coinAddorRemoveWatchlist, coinAddorRemoveFollow, getUserCoinFollow } from '../controllers/companyController.js';
import passport from 'passport';

const router = express.Router();

// Optional authentication middleware
const optionalAuth = (req, res, next) => {
  if (!req.headers.authorization) {
    return next();
  }

  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next();
    }
    
    if (user) {
    //   console.log('User authenticated:', user);
      req.user = user;
    } else {
    //   console.log('No user found or invalid token');
    }
    next();
  })(req, res, next);
};
// Public routes with optional authentication

// GET route to fetch companies
router.get('/getCompanies', optionalAuth, getCompanies);
// GET route to fetch company by id
router.get('/getCompanybyId', optionalAuth, getCompanybyId);
// GET route to fetch company by symbol
router.get('/getCompanybySymbol', optionalAuth, getCompanybySymbol);
// GET route to fetch company market overview
router.get('/getCompanyMarketOverview', optionalAuth, getCompanyMarketOverview);
// GET route to fetch trending companies
router.get('/getTrendingCompanies', optionalAuth, getTrendingCompanies);
// GET route to fetch top gainers
router.get('/getTopGainers', optionalAuth, getTopGainers);
// GET route to fetch top losers
router.get('/getTopLosers', optionalAuth, getTopLosers);
// GET route to fetch coin price details
router.get('/getCoinPriceDetails', optionalAuth, getCoinPriceDetails);
// GET route to fetch price comparison companies
router.get('/getPriceComparisonCompanies', optionalAuth, getPriceComparisonCompanies);

// Protected routes (authentication required)
// GET route to fetch user coin watchlist
router.get('/getUserCoinWatchlist', passport.authenticate('jwt', { session: false }), getUserCoinWatchlist);
// POST route to add or remove coin from watchlist
router.post('/coinAddorRemoveWatchlist', passport.authenticate('jwt', { session: false }), coinAddorRemoveWatchlist);
// POST route to add or remove coin from follow
router.post('/coinAddorRemoveFollow', passport.authenticate('jwt', { session: false }), coinAddorRemoveFollow);
// GET route to fetch user coin follow
router.get('/getUserCoinFollow', passport.authenticate('jwt', { session: false }), getUserCoinFollow);

export default router; 