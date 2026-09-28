import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run } from '../db.js';
import { authenticateOptional, createRateLimiter, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { sendEmail } from '../services/email.service.js';

const router = Router();

// Contact Form Limiter
const contactLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxAttempts: 3,
  message: 'Too many messages sent. Please wait a moment.'
});

// Banners for Homepage Carousel
router.get('/banners', (req: Request, res: Response) => {
  const banners = query('SELECT * FROM banners WHERE is_active = 1 ORDER BY display_order ASC;');
  res.json({ success: true, banners });
});

// Public Site Settings (Contact, Social, Address, WhatsApp)
router.get('/settings/public', (req: Request, res: Response) => {
  const settings = query('SELECT key, value FROM site_settings WHERE key NOT LIKE "%secret%" AND key NOT LIKE "%password%" AND key NOT LIKE "%key%";');
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  res.json({ success: true, settings: map });
});

// CMS Page by Slug
router.get('/pages/:slug', (req: Request, res: Response) => {
  const page = queryOne('SELECT * FROM pages WHERE slug = ? AND is_published = 1;', [req.params.slug]);
  if (!page) {
    res.status(404).json({ success: false, error: 'Page not found' });
    return;
  }
  res.json({ success: true, page });
});

// Contact Us Form Submission
router.post('/contact', contactLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, phone, message, vehicleOrBattery } = req.body;
    if (!name || !email || !message) {
      res.status(400).json({ success: false, error: 'Name, email, and message are required.' });
      return;
    }

    const businessEmail = 'sales@chaudharybattery.pk';
    await sendEmail({
      to: businessEmail,
      subject: `New Customer Inquiry from ${name} (${phone || 'No phone'})`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
        <p><strong>Vehicle / Battery Model:</strong> ${vehicleOrBattery || 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <blockquote style="background: #f1f5f9; padding: 12px;">${message}</blockquote>
      `
    });

    res.json({
      success: true,
      message: 'Thank you! Your message has been sent to our F-10 Markaz team. We will call or WhatsApp you shortly.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to send message. Please call our shop directly.' });
  }
});

// Submit Product Review
router.post('/reviews', authenticateOptional, createRateLimiter({ windowMs: 60 * 1000, maxAttempts: 5, message: 'Review limit reached.' }), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, rating, title, comment, customerName } = req.body;
    const userId = req.user?.id || null;

    if (!productId || !rating || !title || !comment) {
      res.status(400).json({ success: false, error: 'All review fields are required.' });
      return;
    }

    const numRating = Math.max(1, Math.min(5, parseInt(rating) || 5));
    const displayName = customerName || (req.user ? `${req.user.first_name} ${req.user.last_name}` : 'Customer');

    // Check if verified purchaser
    let isVerified = 0;
    if (userId) {
      const purchaseCheck = queryOne(
        `SELECT 1 FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         WHERE o.user_id = ? AND oi.product_id = ? AND o.order_status = 'delivered' LIMIT 1;`,
        [userId, productId]
      );
      if (purchaseCheck) isVerified = 1;
    }

    const reviewId = `rev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = Date.now();

    run(
      `INSERT INTO reviews (id, product_id, user_id, customer_name, rating, title, comment, is_verified_purchase, status, is_featured, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', 0, ?, ?);`,
      [reviewId, productId, userId, displayName, numRating, title, comment, isVerified, now, now]
    );

    res.status(201).json({ success: true, message: 'Review submitted and published!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to submit review' });
  }
});

export default router;
