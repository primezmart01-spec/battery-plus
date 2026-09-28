import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { requireAdmin, AuthenticatedRequest } from '../middleware/auth.middleware.js';

const router = Router();
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage with safe randomized filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `img_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, safeName);
  }
});

// File filter: strict MIME type & extension validation (Section 57)
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB maximum
  },
  fileFilter: (req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMime.includes(file.mimetype) && allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only JPEG, PNG, WEBP, and GIF images are allowed.'));
    }
  }
});

router.post('/', requireAdmin, upload.single('image'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No image file uploaded' });
    return;
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    url: fileUrl,
    filename: req.file.filename,
    size: req.file.size
  });
});

export default router;
