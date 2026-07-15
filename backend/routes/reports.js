import express from 'express';
import { db } from '../database.js';
import { verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get Admin Analytics Dashboard Summary
router.get('/analytics', verifyAdmin, async (req, res) => {
  try {
    const allItems = await db.items.find({});
    const allClaims = await db.claims.find({});
    
    // Total Counts
    const lostItems = allItems.filter(item => item.type === 'lost');
    const foundItems = allItems.filter(item => item.type === 'found');

    const totalLost = lostItems.length;
    const totalFound = foundItems.length;
    
    // Status Summaries
    const pendingApprovals = allItems.filter(item => item.status === 'pending').length;
    const activeClaims = allClaims.filter(claim => claim.status === 'pending').length;
    const itemsReturned = allItems.filter(item => item.status === 'returned').length;

    // Category Distribution
    const categoryStats = {};
    allItems.forEach(item => {
      const cat = item.category || 'Other';
      categoryStats[cat] = (categoryStats[cat] || 0) + 1;
    });

    const categoriesBreakdown = Object.keys(categoryStats).map(key => ({
      category: key,
      count: categoryStats[key]
    }));

    // Location Distribution
    const locationStats = {};
    allItems.forEach(item => {
      const loc = item.location || 'Unknown';
      locationStats[loc] = (locationStats[loc] || 0) + 1;
    });

    const locationsBreakdown = Object.keys(locationStats).map(key => ({
      location: key,
      count: locationStats[key]
    }));

    // Recent activity timeline (latest 8 items and claims)
    const recentActivity = [];

    // Push items to timeline
    allItems.slice(0, 10).forEach(item => {
      recentActivity.push({
        type: 'item_report',
        title: `${item.type === 'lost' ? 'Lost' : 'Found'} Item reported: "${item.title}"`,
        time: item.createdAt,
        user: item.reportedBy,
        badge: item.type === 'lost' ? 'lost' : 'found'
      });
    });

    // Push claims to timeline
    allClaims.slice(0, 10).forEach(claim => {
      recentActivity.push({
        type: 'claim_submission',
        title: `Claim request submitted for item`,
        time: claim.createdAt,
        user: claim.claimantName,
        badge: 'claim'
      });
    });

    // Sort combined timeline by date desc
    recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({
      summary: {
        totalLost,
        totalFound,
        pendingApprovals,
        activeClaims,
        itemsReturned
      },
      categories: categoriesBreakdown,
      locations: locationsBreakdown,
      recentActivity: recentActivity.slice(0, 8)
    });

  } catch (err) {
    console.error('Error fetching analytics reports:', err);
    res.status(500).json({ message: 'Server error generating analytics report.' });
  }
});

export default router;
