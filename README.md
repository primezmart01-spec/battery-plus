# Chaudhary Battery And UPS F10 — E-Commerce Platform

A production-grade, full-stack e-commerce web application built for **Chaudhary Battery And UPS F10**, located in F-10 Markaz, Islamabad, Pakistan. The platform specializes in retail and wholesale of genuine automotive batteries, heavy-duty tall tubular solar batteries, and commercial UPS inverter power systems.

---

## ⚠️ Security Notice Regarding Secrets
> **WARNING:** If secrets (API keys, database URLs, JWT tokens, SMTP passwords) were previously committed to source control, rotate them immediately because deleting them from the latest code does not remove them from Git history.

---

## 1. Project Overview

- **Business Name:** Chaudhary Battery And UPS F10
- **Location:** Shop # 14-16, Ground Floor, Capital Trade Centre, F-10 Markaz, Islamabad, 44000, Pakistan
- **Phone / WhatsApp:** +92 51 2212345 / +92 300 5551234
- **Official Brands:** AGS (Atlas Battery Limited / GS Yuasa Japan), Daewoo (Korean Maintenance Free), Volta (Pakistan Accumulators Limited), Osaka (Tubo-Solar), Exide Pakistan Limited, Phoenix.
- **Key Offerings:** Car Batteries, Motorcycle Batteries, Tall Tubular Batteries, Solar Deep-Cycle, UPS Inverters, Commercial & Truck Batteries, Old Scrap Battery Trade-In Cash Rebates, and 45-Minute Roadside Battery Installation Van Dispatch in Islamabad.

---

## 2. Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Space Grotesk & Plus Jakarta Sans typography.
- **Backend:** Node.js, Express, TypeScript (`tsx`).
- **Database:** Normalized Relational SQLite engine (`sql.js`), ACID transaction locks, schema migrations, and high-frequency indices.
- **Authentication:** JWT tokens via secure HttpOnly cookies, bcryptjs password hashing (cost factor 12), single-use 15-minute cryptographically random password reset tokens, in-memory rate limiting.
- **Payments:** Payment abstraction layer supporting Cash on Delivery (COD), Direct Bank Transfer (Meezan Bank F-10 Markaz), and official Pakistani payment gateways (PayFast, JazzCash, EasyPaisa, Debit/Credit Card) with server-side HMAC-SHA256 webhook verification.
- **Invoices:** Printable and exportable official tax invoice and stamped warranty slip generator.

---

## 3. Database Architecture (38 Core Tables)

The database is fully normalized and includes:
1. `users` (RBAC accounts, passwords, status)
2. `roles` & `permissions` (Customer, Admin, Super Admin)
3. `addresses` (Multiple per user, default shipping & billing)
4. `brands` (AGS, Daewoo, Volta, Osaka, Exide, Phoenix + extensible)
5. `categories` (Car, UPS, Solar, Tubular, Commercial, Motorcycle, Dry)
6. `products` (Full technical specifications, Ah, CCA, plates, warranty)
7. `product_variants` (Ah options, dimensions, weights, variation pricing)
8. `product_images` (Gallery and primary image links)
9. `vehicles` & `vehicle_models` (Pakistani master vehicle fitment guide)
10. `product_compatibility` (OEM vehicle to battery mappings)
11. `carts` & `cart_items` (Server-authoritative cart with stock validation)
12. `wishlists` & `wishlist_items` (Strict user ownership)
13. `comparisons` & `comparison_items` (Side-by-side spec comparison)
14. `orders` & `order_items` (Snapshot of prices, specs, and warranty at purchase)
15. `order_addresses` (Immutable shipping and billing records)
16. `payments` & `payment_transactions` (Provider references, status, raw responses)
17. `coupons` & `coupon_usages` (Validated server-side, percentage & fixed)
18. `reviews` (Moderated, verified purchaser badges, star ratings)
19. `inventory` & `inventory_transactions` (Concurrency-locked stock with audit logs)
20. `shipping_zones` & `shipping_methods` (Islamabad free delivery, Rawalpindi, Nationwide)
21. `taxes`, `notifications`, `email_templates`, `order_status_history`
22. `audit_logs` (Immutable administrative audit trail)
23. `site_settings`, `pages`, and `banners` (Full CMS)

---

## 4. Environment Variables Configuration

Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

Required variables:
- `PORT`: Web server port (defaults to 3000)
- `NODE_ENV`: `development` or `production`
- `APP_URL`: Base application URL (e.g. `http://localhost:3000`)
- `JWT_SECRET`: Minimum 32-character cryptographically random secret
- `SESSION_SECRET`: Secret for secure cookie signing
- `ADMIN_EMAIL`: Initial super-admin email (e.g. `admin@chaudharybattery.pk`)
- `ADMIN_PASSWORD`: Secure initial password (configured securely via env without committing)
- `PAYMENT_PROVIDER`: `cod`, `payfast`, `jazzcash`, `easypaisa`, or `bank_transfer`
- `PAYMENT_WEBHOOK_SECRET`: HMAC secret for webhook validation
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: Transactional email credentials

---

## 5. Installation & Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run in development mode (starts Vite + Express server on port 3000)
npm run dev

# 3. Compile and check TypeScript types
npm run lint

# 4. Build for production
npm run build

# 5. Start production server
npm run start
```

---

## 6. Running Automated Tests

A comprehensive test suite is included in `test-suite.ts`:

```bash
npx tsx test-suite.ts
```

Tests verify:
- API server health
- Product search & auto-complete suggestions
- Vehicle compatibility model lookups
- Server-authoritative cart calculation (ignores client-side price tampering)
- Checkout COD order creation with order number generation
- Concurrency stock reservation and deduction
- IDOR protection on private customer order routes
- Live public order tracking by order reference
- Admin route authorization guard (rejects unauthenticated/unauthorized users)
- Admin login, role validation, and order management
- Payment webhook signature verification

---

## 7. Admin Panel Setup

1. The initial Administrator account is created on first boot using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.
2. Visit `/admin` in the browser.
3. Sign in with the administrator credentials.
4. From the admin dashboard, administrators can:
   - View live KPI sales, order status counts, and Islamabad sales trends.
   - Update order statuses (`Pending` → `Confirmed` → `Processing` → `Packed` → `Shipped` → `Delivered`).
   - Assign mobile van tracking references.
   - Adjust product inventory with mandatory audit reason logging.
   - Add new battery models and brand lines.
   - Manage promotional coupons and review moderation.
   - Inspect the security audit log.

---

## 8. Backup & Maintenance

- **Database Backup:** The database state is maintained in `data/chaudhary_battery.db`. To back up, take a snapshot of this file during off-peak hours.
- **Media Uploads:** Customer and product images are stored in `uploads/`. Ensure this folder is backed up to persistent block storage or an S3-compatible bucket.

---

© 2026 Chaudhary Battery And UPS F10. All Rights Reserved.
