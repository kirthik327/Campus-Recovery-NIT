import express from 'express';
import { db } from '../database.js';
import { verifyToken } from '../middleware/auth.js';
import { runChatbotResponse, matchImageSimilarity } from '../ai_service.js';

const router = express.Router();

// Chatbot Interface
router.post('/chat', verifyToken, async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ message: 'Message content is required.' });
  }

  try {
    // Fetch all active approved found items to search within
    const foundItems = await db.items.find({ type: 'found', status: 'approved' });
    
    // Get response from chatbot service
    const chatbotResult = await runChatbotResponse(message, foundItems);
    
    // Fetch the full details of any suggested matched items
    const suggestedItems = [];
    if (chatbotResult.matchIds && chatbotResult.matchIds.length > 0) {
      for (const id of chatbotResult.matchIds) {
        const matchedItem = await db.items.findById(id);
        if (matchedItem) {
          suggestedItems.push(matchedItem);
        }
      }
    }

    res.json({
      reply: chatbotResult.reply,
      suggestedItems
    });
  } catch (err) {
    console.error('Chatbot route error:', err);
    res.status(500).json({ message: 'Server error processing chatbot response.' });
  }
});

// Image Matching Search for a specific reported item
router.get('/match/:itemId', verifyToken, async (req, res) => {
  const { itemId } = req.params;

  try {
    const targetItem = await db.items.findById(itemId);
    if (!targetItem) {
      return res.status(404).json({ message: 'Target item not found.' });
    }

    // Determine candidate list:
    // If target is lost -> match against approved found items
    // If target is found -> match against approved lost items
    const candidateType = targetItem.type === 'lost' ? 'found' : 'lost';
    const candidates = await db.items.find({ type: candidateType, status: 'approved' });

    if (candidates.length === 0) {
      return res.json([]);
    }

    // If the target has no images, we will do text-based match scores
    if (!targetItem.images || targetItem.images.length === 0) {
      // Return metadata-based ranked matches
      const textMatches = candidates.map(cand => {
        let score = 0.1;
        if (cand.category === targetItem.category) score += 0.4;
        
        // title matching
        const targetTitle = targetItem.title.toLowerCase();
        const candTitle = cand.title.toLowerCase();
        if (targetTitle.includes(candTitle) || candTitle.includes(targetTitle)) {
          score += 0.3;
        }

        return { item: cand, score: Math.min(score, 0.95) };
      }).sort((a, b) => b.score - a.score);

      return res.json(textMatches.filter(m => m.score > 0.2));
    }

    // Prepare candidate images for python matcher
    // Format: Array of { id, image }
    const candidateImages = candidates
      .filter(c => c.images && c.images.length > 0)
      .map(c => ({
        id: c._id || c.id,
        image: c.images[0]
      }));

    if (candidateImages.length === 0) {
      return res.json([]);
    }

    // Call similarity matcher
    // We pass the first image of the target item
    const targetImgPath = '.' + targetItem.images[0];
    const matchScores = await matchImageSimilarity(targetImgPath, candidateImages);

    // Map scores back to full item records
    const scoredMatches = matchScores
      .map(scoreRecord => {
        const itemObj = candidates.find(c => (c._id || c.id) === scoreRecord.id);
        return {
          item: itemObj,
          score: scoreRecord.score
        };
      })
      .filter(match => match.item !== undefined)
      .sort((a, b) => b.score - a.score);

    res.json(scoredMatches);
  } catch (err) {
    console.error('Image matching route error:', err);
    res.status(500).json({ message: 'Server error triggering matching service.' });
  }
});

export default router;
