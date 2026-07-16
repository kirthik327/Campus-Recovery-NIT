import express from 'express';
import QRCode from 'qrcode';
import path from 'path';
import { db } from '../database.js';
import { verifyToken, verifyAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { extractTextFromImage, matchImageSimilarity } from '../ai_service.js';

const router = express.Router();

// Get Items (Student Feed or Admin View)
router.get('/', verifyToken, async (req, res) => {
  const { type, category, location, search, status } = req.query;

  try {
    const query = {};

    // Filters
    if (type) query.type = type;
    if (category) query.category = category;
    if (location) query.location = location;

    // Status filtering based on role
    if (req.user.role === 'admin') {
      if (status) query.status = status;
    } else {
      // Students see approved items, or items they reported
      if (type === 'lost') {
        // Show all approved lost items, or those reported by me
        query.status = 'approved';
      } else {
        // Show approved found items
        query.status = 'approved';
      }
    }

    let items = await db.items.find(query);

    // Text Search Filter (client side or fallback query filter)
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(item => {
        return (
          item.title.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.location.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower) ||
          (item.ocrText && item.ocrText.toLowerCase().includes(searchLower))
        );
      });
    }

    res.json(items);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ message: 'Server error fetching items.' });
  }
});

// Get User's Own Reported Items
router.get('/my-items', verifyToken, async (req, res) => {
  try {
    const items = await db.items.find({ reportedBy: req.user.username });
    res.json(items);
  } catch (err) {
    console.error('Error fetching my items:', err);
    res.status(500).json({ message: 'Server error fetching items.' });
  }
});

// Get Single Item Details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const item = await db.items.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }
    res.json(item);
  } catch (err) {
    console.error('Error fetching item details:', err);
    res.status(500).json({ message: 'Server error fetching item.' });
  }
});

// Report Lost or Found Item (with images)
router.post('/', verifyToken, upload.array('images', 5), async (req, res) => {
  const { type, title, category, description, location, date } = req.body;

  if (!type || !title || !category || !location || !date) {
    return res.status(400).json({ message: 'Type, title, category, location, and date are required.' });
  }

  try {
    // Process image paths
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        // Store relative path so frontend can easily render it
        images.push(`/uploads/${file.filename}`);
      });
    }

    // All reported items (lost or found) are immediately active and visible to everyone
    const status = 'approved';

    // 1. Create item in DB first to get a unique ID
    const newItem = await db.items.create({
      type,
      title,
      category,
      description: description || '',
      location,
      date,
      status,
      images,
      reportedBy: req.user.username
    });

    const itemId = newItem._id || newItem.id;

    // 2. Perform OCR asynchronously on uploaded images if any
    let ocrTextCombined = '';
    if (images.length > 0) {
      for (const imgPath of images) {
        const absolutePath = path.resolve('.' + imgPath);
        const filename = path.basename(imgPath);
        try {
          const text = await extractTextFromImage(absolutePath, filename);
          if (text) {
            ocrTextCombined += text + '\n';
          }
        } catch (ocrErr) {
          console.warn(`OCR failed for image ${filename}:`, ocrErr);
        }
      }
    }

    // 3. Generate QR code (glowing or clean base64 data)
    let qrCode = '';
    if (type === 'found') {
      try {
        qrCode = await QRCode.toDataURL(JSON.stringify({
          itemId,
          title,
          category,
          location,
          date
        }));
      } catch (qrErr) {
        console.warn('QR Code generation failed:', qrErr);
      }
    }

    // Update item with OCR text and QR code
    const updatedItem = await db.items.findByIdAndUpdate(itemId, {
      ocrText: ocrTextCombined.trim(),
      qrCode
    });

    // 4. Smart Matching & Notifications
    // If a found item is reported (and approved), let's check for matching lost items.
    // If a lost item is reported, let's notify the student about matching found items.
    if (type === 'found' && status === 'approved') {
      triggerMatchingAlerts(updatedItem);
    }

    res.status(201).json(updatedItem);
  } catch (err) {
    console.error('Error reporting item:', err);
    res.status(500).json({ message: 'Server error reporting item.' });
  }
});

// Submit a Claim Request
router.post('/:id/claim', verifyToken, async (req, res) => {
  const { proofDescription, contact } = req.body;
  const itemId = req.params.id;

  if (!proofDescription || !contact) {
    return res.status(400).json({ message: 'Proof description and contact number are required.' });
  }

  try {
    const item = await db.items.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    if (item.type !== 'found') {
      return res.status(400).json({ message: 'Claims can only be submitted for found items.' });
    }

    if (item.status !== 'approved') {
      return res.status(400).json({ message: 'This item is not open for claims at this time.' });
    }

    // Create the claim
    const claim = await db.claims.create({
      itemId,
      claimantId: req.user.id,
      claimantName: req.user.username,
      claimantContact: contact,
      proofDescription
    });

    // Notify Admin
    await db.notifications.create({
      userId: 'admin',
      message: `New claim submitted by student "${req.user.username}" for found item "${item.title}".`
    });

    res.status(201).json({ message: 'Claim request submitted successfully.', claim });
  } catch (err) {
    console.error('Error claiming item:', err);
    res.status(500).json({ message: 'Server error claiming item.' });
  }
});

// Approve or Reject an Item (Admin only)
router.put('/:id/status', verifyAdmin, async (req, res) => {
  const { status } = req.body; // 'approved' or 'rejected'
  const itemId = req.params.id;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be "approved" or "rejected".' });
  }

  try {
    const item = await db.items.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    const updatedItem = await db.items.findByIdAndUpdate(itemId, { status });

    // Send notification to the reporter
    const user = await db.users.findOne({ username: item.reportedBy });
    if (user) {
      await db.notifications.create({
        userId: user._id || user.id,
        message: `Your reported ${item.type} item "${item.title}" has been ${status} by the admin.`
      });
    }

    // If a found item is approved, scan for matches
    if (item.type === 'found' && status === 'approved') {
      triggerMatchingAlerts(updatedItem);
    }

    res.json({ message: `Item successfully ${status}.`, item: updatedItem });
  } catch (err) {
    console.error('Error updating item status:', err);
    res.status(500).json({ message: 'Server error updating item.' });
  }
});

// Mark Item as Returned directly (Admin only)
router.put('/:id/return', verifyAdmin, async (req, res) => {
  const { claimedBy } = req.body; // username of claimant
  const itemId = req.params.id;

  try {
    const item = await db.items.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    const updatedItem = await db.items.findByIdAndUpdate(itemId, {
      status: 'returned',
      claimedBy: claimedBy || 'Unknown Student'
    });

    res.json({ message: 'Item marked as returned to owner.', item: updatedItem });
  } catch (err) {
    console.error('Error marking item returned:', err);
    res.status(500).json({ message: 'Server error marking item returned.' });
  }
});

// Delete an Item (Admin or Original Reporter only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const item = await db.items.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    // Permission check: admin OR original reporter
    if (req.user.role !== 'admin' && item.reportedBy !== req.user.username) {
      return res.status(403).json({ message: 'Unauthorized to delete this item.' });
    }

    const result = await db.items.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Item not found.' });
    }
    res.json({ message: 'Item deleted successfully.' });
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ message: 'Server error deleting item.' });
  }
});

// Helper for Auto Notification Alerts on Matches
async function triggerMatchingAlerts(foundItem) {
  try {
    // Fetch all active lost items
    const lostItems = await db.items.find({ type: 'lost', status: 'approved' });
    
    for (const lost of lostItems) {
      let isMatch = false;
      
      // Category & Title matching
      const foundTitle = foundItem.title.toLowerCase();
      const lostTitle = lost.title.toLowerCase();
      
      const foundWords = foundTitle.split(' ').filter(w => w.length > 3);
      const lostWords = lostTitle.split(' ').filter(w => w.length > 3);
      
      // If titles share keywords
      const commonWords = foundWords.filter(w => lostWords.includes(w));
      
      if (lost.category === foundItem.category && (commonWords.length > 0 || foundTitle.includes(lostTitle) || lostTitle.includes(foundTitle))) {
        isMatch = true;
      }
      
      // Also match OCR text (e.g. ID card roll number match)
      if (foundItem.ocrText && lost.title) {
        const cleanTitle = lost.title.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase();
        if (foundItem.ocrText.toLowerCase().includes(cleanTitle)) {
          isMatch = true;
        }
      }

      if (isMatch) {
        // Find the user who lost the item to notify them
        const user = await db.users.findOne({ username: lost.reportedBy });
        if (user) {
          await db.notifications.create({
            userId: user._id || user.id,
            message: `Smart Match Alert: A found item "${foundItem.title}" resembles your lost item report for "${lost.title}". Check details and submit a claim!`
          });
        }
      }
    }
  } catch (err) {
    console.warn('Smart notification matcher failed:', err);
  }
}

export default router;
