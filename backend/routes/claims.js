import express from 'express';
import { db } from '../database.js';
import { verifyAdmin, verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get All Claims (Admin only)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const claims = await db.claims.find();
    
    // Attach item details to each claim
    const populatedClaims = await Promise.all(
      claims.map(async (claim) => {
        const item = await db.items.findById(claim.itemId);
        return {
          ...claim,
          item: item ? {
            title: item.title,
            category: item.category,
            location: item.location,
            date: item.date,
            status: item.status,
            reportedBy: item.reportedBy,
            images: item.images
          } : null
        };
      })
    );

    res.json(populatedClaims);
  } catch (err) {
    console.error('Error fetching claims:', err);
    res.status(500).json({ message: 'Server error fetching claims.' });
  }
});

// Get User's Own Claims (Student)
router.get('/my-claims', verifyToken, async (req, res) => {
  try {
    const claims = await db.claims.find({ claimantId: req.user.id });
    
    // Attach item details to each claim
    const populatedClaims = await Promise.all(
      claims.map(async (claim) => {
        const item = await db.items.findById(claim.itemId);
        return {
          ...claim,
          item: item ? {
            title: item.title,
            category: item.category,
            location: item.location,
            date: item.date,
            status: item.status,
            images: item.images
          } : null
        };
      })
    );

    res.json(populatedClaims);
  } catch (err) {
    console.error('Error fetching user claims:', err);
    res.status(500).json({ message: 'Server error fetching claims.' });
  }
});

// Approve or Reject Claim (Admin only)
router.put('/:id/status', verifyAdmin, async (req, res) => {
  const { status } = req.body; // 'approved' or 'rejected'
  const claimId = req.params.id;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be "approved" or "rejected".' });
  }

  try {
    const claim = await db.claims.findById(claimId);
    if (!claim) {
      return res.status(404).json({ message: 'Claim not found.' });
    }

    if (claim.status !== 'pending') {
      return res.status(400).json({ message: 'This claim has already been processed.' });
    }

    const updatedClaim = await db.claims.findByIdAndUpdate(claimId, { status });

    const item = await db.items.findById(claim.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Associated item not found.' });
    }

    if (status === 'approved') {
      // 1. Mark item as returned and update claimant
      await db.items.findByIdAndUpdate(claim.itemId, {
        status: 'returned',
        claimedBy: claim.claimantName
      });

      // 2. Automatically reject all other pending claims for this item
      const otherClaims = await db.claims.find({ itemId: claim.itemId, status: 'pending' });
      for (const otherClaim of otherClaims) {
        const otherId = otherClaim._id || otherClaim.id;
        const currentId = claim._id || claim.id;
        if (otherId !== currentId) {
          await db.claims.findByIdAndUpdate(otherId, { status: 'rejected' });
          
          // Notify the other claimants of rejection
          await db.notifications.create({
            userId: otherClaim.claimantId,
            message: `Your claim request for item "${item.title}" was rejected as the item has been returned to another owner.`
          });
        }
      }

      // 3. Notify the approved claimant
      await db.notifications.create({
        userId: claim.claimantId,
        message: `Congratulations! Your claim request for item "${item.title}" has been APPROVED. Please visit the college office to collect it.`
      });
    } else {
      // Notify claimant of rejection
      await db.notifications.create({
        userId: claim.claimantId,
        message: `Your claim request for item "${item.title}" was rejected by the admin. Please contact the college office if you believe this is a mistake.`
      });
    }

    res.json({ message: `Claim successfully ${status}.`, claim: updatedClaim });
  } catch (err) {
    console.error('Error processing claim:', err);
    res.status(500).json({ message: 'Server error processing claim.' });
  }
});

export default router;
