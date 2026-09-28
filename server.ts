import express from 'express';
import path from 'path';
import fs from 'fs';
import { getDb } from './server/db.js';
import { securityHeadersMiddleware, errorHandlerMiddleware } from './server/middleware/security.middleware.js';

import authRoutes from './server/routes/auth.routes.js';
import productsRoutes from './server/routes/products.routes.js';
import catalogRoutes from './server/routes/catalog.routes.js';
import userActivityRoutes from './server/routes/user-activity.routes.js';
import ordersRoutes from './server/routes/orders.routes.js';
import paymentRoutes from './server/routes/payment.routes.js';
import adminRoutes from './server/routes/admin.routes.js';
import cmsRoutes from './server/routes/cms.routes.js';
import uploadRoutes from './server/routes/upload.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Body parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Custom Security Headers & Request Correlation IDs
app.use(securityHeadersMiddleware);

// Static uploads directory
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// SEO: robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /account
Disallow: /checkout
Disallow: /api/

Sitemap: ${process.env.APP_URL || 'http://localhost:3000'}/sitemap.xml
`);
});

// SEO: sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>
  <url><loc>${baseUrl}/shop</loc><priority>0.9</priority><changefreq>daily</changefreq></url>
  <url><loc>${baseUrl}/category/car-batteries</loc><priority>0.8</priority></url>
  <url><loc>${baseUrl}/category/ups-batteries</loc><priority>0.8</priority></url>
  <url><loc>${baseUrl}/category/solar-batteries</loc><priority>0.8</priority></url>
  <url><loc>${baseUrl}/category/tubular-batteries</loc><priority>0.8</priority></url>
  <url><loc>${baseUrl}/brand/ags</loc><priority>0.8</priority></url>
  <url><loc>${baseUrl}/brand/daewoo</loc><priority>0.8</priority></url>
  <url><loc>${baseUrl}/brand/volta</loc><priority>0.8</priority></url>
  <url><loc>${baseUrl}/brand/osaka</loc><priority>0.8</priority></url>
  <url><loc>${baseUrl}/brand/exide</loc><priority>0.8</priority></url>
  <url><loc>${baseUrl}/brand/phoenix</loc><priority>0.8</priority></url>
  <url><loc>${baseUrl}/about</loc><priority>0.6</priority></url>
  <url><loc>${baseUrl}/contact</loc><priority>0.7</priority></url>
</urlset>`;
  res.type('application/xml');
  res.send(xml);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api', userActivityRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Chaudhary Battery And UPS F10 API'
  });
});

// Error handling middleware
app.use(errorHandlerMiddleware);

async function startServer() {
  try {
    // Initialize database
    await getDb();
    console.log('Database initialized successfully with seeded Pakistani battery catalog.');

    if (!isProd) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distDir = path.resolve(process.cwd(), 'dist');
      app.use(express.static(distDir));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }

    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Chaudhary Battery And UPS server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('Server failed to start:', err);
    process.exit(1);
  }
}

startServer();
