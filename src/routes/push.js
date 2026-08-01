const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { sendPushNotification } = require('../lib/push');
const prisma = require('../lib/prisma');

const router = Router();

// Get public key for client
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { endpoint, p256dh, auth } = req.body;
    
    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ error: 'Missing subscription parameters' });
    }

    // Check if subscription already exists
    let subscription = await prisma.pushSubscription.findFirst({
      where: { 
        usuarioId: req.user.id_usuario,
        endpoint: endpoint
      }
    });

    if (subscription) {
      // Update existing
      subscription = await prisma.pushSubscription.update({
        where: { id: subscription.id },
        data: { p256dh, auth }
      });
    } else {
      // Create new
      subscription = await prisma.pushSubscription.create({
        data: {
          endpoint,
          p256dh,
          auth,
          usuario: { connect: { id_usuario: req.user.id_usuario } }
        }
      });
    }

    res.json({ success: true, subscriptionId: subscription.id });
  } catch (error) {
    console.error('Error in push subscribe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unsubscribe
router.delete('/unsubscribe', authenticate, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        usuarioId: req.user.id_usuario,
        endpoint: endpoint
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error in push unsubscribe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;