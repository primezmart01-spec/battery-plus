import initSqlJs, { Database, SqlValue } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'chaudhary_battery.db');

let dbInstance: Database | null = null;
let isSaving = false;
let saveScheduled = false;

// Concurrency mutex lock for critical operations (e.g. checkout, inventory adjustments)
let mutexPromise = Promise.resolve();
export async function withLock<T>(fn: () => Promise<T> | T): Promise<T> {
  let release: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  const prevLock = mutexPromise;
  mutexPromise = mutexPromise.then(() => nextLock);

  await prevLock;
  try {
    return await fn();
  } finally {
    release!();
  }
}

export function saveDatabase(): void {
  if (!dbInstance) return;
  if (isSaving) {
    saveScheduled = true;
    return;
  }
  isSaving = true;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const data = dbInstance.export();
    const tempPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tempPath, Buffer.from(data));
    fs.renameSync(tempPath, DB_PATH);
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  } finally {
    isSaving = false;
    if (saveScheduled) {
      saveScheduled = false;
      saveDatabase();
    }
  }
}

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
      initTables(dbInstance);
      // Run category images sync
      dbInstance.run("UPDATE categories SET image_url = '/uploads/ups_battery_category.jpg' WHERE id = 'cat_ups' OR slug = 'ups-batteries';");
      dbInstance.run("UPDATE categories SET image_url = '/uploads/solar_battery_category.jpg' WHERE id = 'cat_solar' OR slug = 'solar-batteries';");
      saveDatabase();
      return dbInstance;
    } catch (err) {
      console.warn('Existing database corrupted or invalid, creating new:', err);
    }
  }

  dbInstance = new SQL.Database();
  initTables(dbInstance);
  await seedInitialData(dbInstance);
  saveDatabase();
  return dbInstance;
}

function initTables(db: Database): void {
  db.run('PRAGMA foreign_keys = ON;');

  db.run(`
    -- 1. Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'customer',
      status TEXT NOT NULL DEFAULT 'active',
      email_verified INTEGER NOT NULL DEFAULT 0,
      reset_token TEXT,
      reset_token_expires INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 2. Roles
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL
    );

    -- 3. Permissions
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      role_id TEXT,
      created_at INTEGER NOT NULL
    );

    -- 4. Addresses
    CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address_line1 TEXT NOT NULL,
      address_line2 TEXT,
      city TEXT NOT NULL,
      area TEXT,
      province TEXT NOT NULL,
      postal_code TEXT,
      delivery_instructions TEXT,
      is_default_shipping INTEGER NOT NULL DEFAULT 0,
      is_default_billing INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 5. Brands
    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      logo_url TEXT,
      description TEXT,
      seo_title TEXT,
      seo_description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 6. Categories
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      image_url TEXT,
      parent_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      display_order INTEGER NOT NULL DEFAULT 0,
      seo_title TEXT,
      seo_description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- 7. Products
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      brand_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      price REAL NOT NULL,
      sale_price REAL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      reserved_stock INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_bestseller INTEGER NOT NULL DEFAULT 0,
      is_new_arrival INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published',
      battery_type TEXT NOT NULL, -- Maintenance Free, Deep Cycle, Tubular, Dry Charged, AGM, Gel
      voltage TEXT NOT NULL DEFAULT '12V',
      ah_capacity INTEGER NOT NULL,
      cca INTEGER,
      plates INTEGER,
      dimensions TEXT, -- L x W x H in mm
      weight REAL, -- in kg
      warranty_months INTEGER NOT NULL DEFAULT 12,
      manufacturer TEXT,
      short_desc TEXT,
      description TEXT,
      features TEXT, -- JSON string array
      delivery_info TEXT,
      return_info TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE RESTRICT,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    -- 8. Product Variants
    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      ah_capacity INTEGER,
      price REAL NOT NULL,
      sale_price REAL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      warranty_months INTEGER NOT NULL DEFAULT 12,
      weight REAL,
      dimensions TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- 9. Product Images
    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      alt_text TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- 10. Vehicles
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      make TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL
    );

    -- 11. Vehicle Models
    CREATE TABLE IF NOT EXISTS vehicle_models (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      model_name TEXT NOT NULL,
      start_year INTEGER NOT NULL,
      end_year INTEGER NOT NULL,
      engine TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    -- 12. Product Compatibility
    CREATE TABLE IF NOT EXISTS product_compatibility (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      vehicle_model_id TEXT NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_model_id) REFERENCES vehicle_models(id) ON DELETE CASCADE
    );

    -- 13. Carts
    CREATE TABLE IF NOT EXISTS carts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      session_id TEXT UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 14. Cart Items
    CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      cart_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
    );

    -- 15. Wishlists
    CREATE TABLE IF NOT EXISTS wishlists (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 16. Wishlist Items
    CREATE TABLE IF NOT EXISTS wishlist_items (
      id TEXT PRIMARY KEY,
      wishlist_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(wishlist_id, product_id)
    );

    -- 17. Comparisons
    CREATE TABLE IF NOT EXISTS comparisons (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      session_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 18. Comparison Items
    CREATE TABLE IF NOT EXISTS comparison_items (
      id TEXT PRIMARY KEY,
      comparison_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (comparison_id) REFERENCES comparisons(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(comparison_id, product_id)
    );

    -- 19. Orders
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      user_id TEXT,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      shipping_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      coupon_code TEXT,
      payment_method TEXT NOT NULL, -- cod, payfast, jazzcash, easypaisa, bank_transfer
      payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed, refunded
      order_status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, processing, packed, shipped, out_for_delivery, delivered, cancelled, refunded
      shipping_notes TEXT,
      tracking_number TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- 20. Order Items (Snapshot of price & specs at purchase time)
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      product_title TEXT NOT NULL,
      sku TEXT NOT NULL,
      ah_capacity INTEGER,
      voltage TEXT,
      warranty_months INTEGER,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal_price REAL NOT NULL,
      product_image TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    -- 21. Order Addresses
    CREATE TABLE IF NOT EXISTS order_addresses (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      type TEXT NOT NULL, -- shipping, billing
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address_line1 TEXT NOT NULL,
      address_line2 TEXT,
      city TEXT NOT NULL,
      province TEXT NOT NULL,
      postal_code TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    -- 22. Payments
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'PKR',
      provider TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      transaction_reference TEXT,
      raw_response TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    -- 23. Payment Transactions
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      payment_id TEXT,
      order_id TEXT NOT NULL,
      amount REAL NOT NULL,
      provider_tx_id TEXT,
      status TEXT NOT NULL,
      error_message TEXT,
      payload TEXT,
      created_at INTEGER NOT NULL
    );

    -- 24. Coupons
    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      discount_type TEXT NOT NULL, -- percentage, fixed
      discount_value REAL NOT NULL,
      min_order_amount REAL NOT NULL DEFAULT 0,
      max_discount REAL,
      usage_limit INTEGER,
      times_used INTEGER NOT NULL DEFAULT 0,
      start_date INTEGER NOT NULL,
      end_date INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 25. Coupon Usages
    CREATE TABLE IF NOT EXISTS coupon_usages (
      id TEXT PRIMARY KEY,
      coupon_id TEXT NOT NULL,
      user_id TEXT,
      order_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    -- 26. Reviews
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      user_id TEXT,
      customer_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      title TEXT NOT NULL,
      comment TEXT NOT NULL,
      is_verified_purchase INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- 27. Inventory
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      current_stock INTEGER NOT NULL DEFAULT 0,
      reserved_stock INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- 28. Inventory Transactions
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      quantity_before INTEGER NOT NULL,
      quantity_changed INTEGER NOT NULL,
      quantity_after INTEGER NOT NULL,
      reason TEXT NOT NULL,
      admin_id TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- 29. Shipping Zones
    CREATE TABLE IF NOT EXISTS shipping_zones (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cities TEXT NOT NULL, -- comma separated or JSON
      base_fee REAL NOT NULL,
      free_threshold REAL,
      estimated_days TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    -- 30. Shipping Methods
    CREATE TABLE IF NOT EXISTS shipping_methods (
      id TEXT PRIMARY KEY,
      zone_id TEXT,
      title TEXT NOT NULL,
      cost REAL NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    -- 31. Taxes
    CREATE TABLE IF NOT EXISTS taxes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rate_percentage REAL NOT NULL,
      is_inclusive INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    -- 32. Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT NOT NULL, -- order, stock, system, customer
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    -- 33. Email Templates
    CREATE TABLE IF NOT EXISTS email_templates (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      variables_hint TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 34. Order Status History
    CREATE TABLE IF NOT EXISTS order_status_history (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      changed_by TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    -- 35. Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT,
      admin_email TEXT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      ip_address TEXT,
      details TEXT,
      created_at INTEGER NOT NULL
    );

    -- 36. Site Settings
    CREATE TABLE IF NOT EXISTS site_settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      group_name TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 37. Pages (CMS)
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      seo_title TEXT,
      seo_description TEXT,
      is_published INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL
    );

    -- 38. Banners (CMS)
    CREATE TABLE IF NOT EXISTS banners (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      image_url TEXT NOT NULL,
      cta_text TEXT,
      cta_link TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    -- Indexes for high-frequency queries
    CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
    CREATE INDEX IF NOT EXISTS idx_cart_user ON carts(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);
}

// Database helper functions with parameterized security
export function query<T = any>(sqlStr: string, params: SqlValue[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sqlStr);
  try {
    if (params.length > 0) {
      stmt.bind(params);
    }
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

export function queryOne<T = any>(sqlStr: string, params: SqlValue[] = []): T | null {
  const rows = query<T>(sqlStr, params);
  return rows.length > 0 ? rows[0] : null;
}

let transactionDepth = 0;

export function run(sqlStr: string, params: SqlValue[] = []): { changes: number; lastInsertRowid: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sqlStr, params);
  const changes = dbInstance.getRowsModified();
  if (transactionDepth === 0) {
    saveDatabase();
  }
  return { changes, lastInsertRowid: 0 };
}

export function transaction<T>(fn: () => T): T {
  if (!dbInstance) throw new Error('Database not initialized');
  if (transactionDepth > 0) {
    return fn();
  }

  transactionDepth++;
  dbInstance.run('BEGIN TRANSACTION;');
  try {
    const result = fn();
    dbInstance.run('COMMIT;');
    transactionDepth = 0;
    saveDatabase();
    return result;
  } catch (err) {
    transactionDepth = 0;
    try {
      dbInstance.run('ROLLBACK;');
    } catch {
      // Ignore rollback failure if already rolled back
    }
    throw err;
  }
}

async function seedInitialData(db: Database): Promise<void> {
  const now = Date.now();

  // 1. Roles
  const roles = [
    { id: 'role_super_admin', name: 'Super Admin', description: 'Full access to all system operations' },
    { id: 'role_admin', name: 'Admin', description: 'Catalog, order, and customer operations' },
    { id: 'role_customer', name: 'Customer', description: 'Standard authenticated customer' },
  ];
  for (const r of roles) {
    db.run(
      'INSERT OR IGNORE INTO roles (id, name, description, created_at) VALUES (?, ?, ?, ?);',
      [r.id, r.name, r.description, now]
    );
  }

  // 2. Initial Admin check:
  // If ADMIN_EMAIL and ADMIN_PASSWORD are in environment, seed the initial super admin safely.
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@chaudharybattery.pk';
  const adminPass = process.env.ADMIN_PASSWORD || 'ChaudharyAdmin@2026!';
  const hashedAdminPass = await bcrypt.hash(adminPass, 12);

  db.run(
    `INSERT OR IGNORE INTO users (id, email, password_hash, first_name, last_name, phone, role, status, email_verified, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
    [
      'user_admin_001',
      adminEmail,
      hashedAdminPass,
      'Chaudhary',
      'F10 Admin',
      '+923005551234',
      'admin',
      'active',
      now,
      now
    ]
  );

  // 3. Brands (Pakistani Automotive & Power Leaders)
  const brands = [
    {
      id: 'brand_ags',
      name: 'AGS',
      slug: 'ags',
      logo_url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=300&q=80',
      description: 'Atlas Battery Limited with Japanese GS Yuasa technology. Renowned across Pakistan for heavy-duty starting power and unmatched durability.',
      seo_title: 'Genuine AGS Batteries in Islamabad | Chaudhary Battery F-10',
      seo_description: 'Buy 100% genuine AGS car and UPS batteries in Islamabad with official warranty and free installation in F-10 Markaz.',
      order: 1
    },
    {
      id: 'brand_daewoo',
      name: 'Daewoo',
      slug: 'daewoo',
      logo_url: 'https://images.unsplash.com/photo-1558441719-8b459c86f6c0?auto=format&fit=crop&w=300&q=80',
      description: '100% Maintenance-Free sealed Korean technology batteries with magic-eye state-of-charge indicators and superior vibration resistance.',
      seo_title: 'Daewoo Maintenance-Free Batteries Islamabad | Official Retailer',
      seo_description: 'Shop Daewoo sealed maintenance-free car and solar batteries. Ready to install with fast home delivery in Islamabad & Rawalpindi.',
      order: 2
    },
    {
      id: 'brand_volta',
      name: 'Volta',
      slug: 'volta',
      logo_url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=300&q=80',
      description: 'Pakistan Accumulators Limited (PAL) powerhouse. Specializing in long-backup tubular solar and platinum car batteries with high cold cranking amps.',
      seo_title: 'Volta Tubular & Car Batteries | F-10 Markaz Islamabad',
      seo_description: 'Official Volta battery dealer in Islamabad. Tubular solar TS-1000, TS-1500, TS-2000 and automotive batteries at wholesale rates.',
      order: 3
    },
    {
      id: 'brand_osaka',
      name: 'Osaka',
      slug: 'osaka',
      logo_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=300&q=80',
      description: 'Premium quality lead-acid and deep-cycle batteries for domestic UPS inverters, commercial vehicles, and automotive needs.',
      seo_title: 'Osaka Batteries Islamabad | Tubo-Solar & Inverter Range',
      seo_description: 'Explore genuine Osaka batteries with authentic manufacturer warranty card and installation support across Islamabad.',
      order: 4
    },
    {
      id: 'brand_exide',
      name: 'Exide',
      slug: 'exide',
      logo_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=300&q=80',
      description: 'Pioneers in lead-acid technology since 1953. Unrivaled performance for passenger cars, heavy trucks, and demanding UPS systems.',
      seo_title: 'Exide Batteries Islamabad | Genuine Warranty & Fast Delivery',
      seo_description: 'Original Exide batteries including NS-40, NS-60, and Inverter Gold series available at Chaudhary Battery & UPS F-10.',
      order: 5
    },
    {
      id: 'brand_phoenix',
      name: 'Phoenix',
      slug: 'phoenix',
      logo_url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=300&q=80',
      description: 'Engineered for extreme Pakistani summer temperatures with robust thick lead plates and deep-discharge protection.',
      seo_title: 'Phoenix Batteries Islamabad | TX-1000 & XP Series',
      seo_description: 'Buy Phoenix automotive and solar tubular batteries with free testing and battery exchange discount in Islamabad.',
      order: 6
    }
  ];

  for (const b of brands) {
    db.run(
      `INSERT OR IGNORE INTO brands (id, name, slug, logo_url, description, seo_title, seo_description, status, display_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?);`,
      [b.id, b.name, b.slug, b.logo_url, b.description, b.seo_title, b.seo_description, b.order, now, now]
    );
  }

  // 4. Categories
  const categories = [
    {
      id: 'cat_car',
      name: 'Car Batteries',
      slug: 'car-batteries',
      description: 'High cranking starter batteries for sedans, hatchbacks, SUVs, and passenger cars with extended life.',
      image_url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80',
      order: 1
    },
    {
      id: 'cat_ups',
      name: 'UPS Batteries',
      slug: 'ups-batteries',
      description: 'Heavy duty deep cycle and semi-tubular batteries engineered for load-shedding backup and inverters.',
      image_url: '/uploads/ups_battery_category.jpg',
      order: 2
    },
    {
      id: 'cat_solar',
      name: 'Solar Batteries',
      slug: 'solar-batteries',
      description: 'Long-life tubular deep cycle batteries specifically designed for solar photovoltaic energy storage.',
      image_url: '/uploads/solar_battery_category.jpg',
      order: 3
    },
    {
      id: 'cat_tubular',
      name: 'Tubular Batteries',
      slug: 'tubular-batteries',
      description: 'Ultra-durable tall tubular batteries offering up to 1500+ charge cycles and low water loss.',
      image_url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80',
      order: 4
    },
    {
      id: 'cat_commercial',
      name: 'Truck & Commercial Batteries',
      slug: 'commercial-vehicle-batteries',
      description: 'High capacity 24V/12V heavy duty batteries for buses, tractors, trucks, generators, and heavy machinery.',
      image_url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80',
      order: 5
    },
    {
      id: 'cat_motorcycle',
      name: 'Motorcycle Batteries',
      slug: 'motorcycle-batteries',
      description: 'Compact 12V dry and gel starter batteries for 70cc, 125cc, 150cc and high-displacement bikes.',
      image_url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80',
      order: 6
    },
    {
      id: 'cat_dry',
      name: 'Maintenance-Free Batteries',
      slug: 'maintenance-free-batteries',
      description: 'Pre-charged sealed zero-maintenance calcium-alloy batteries. No acid leakage or water replenishment required.',
      image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      order: 7
    }
  ];

  for (const c of categories) {
    db.run(
      `INSERT OR IGNORE INTO categories (id, name, slug, description, image_url, status, display_order, seo_title, seo_description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?);`,
      [
        c.id,
        c.name,
        c.slug,
        c.description,
        c.image_url,
        c.order,
        `${c.name} in Islamabad - Best Prices | Chaudhary Battery`,
        `Buy original ${c.name} from top brands with official warranty, same-day delivery, and installation in Islamabad.`,
        now,
        now
      ]
    );
    // Always sync image_url for categories
    db.run('UPDATE categories SET image_url = ? WHERE id = ?;', [c.image_url, c.id]);
  }

  // 5. Vehicles (Pakistani Automotive Master List)
  const vehicleMakes = [
    { id: 'veh_toyota', make: 'Toyota' },
    { id: 'veh_honda', make: 'Honda' },
    { id: 'veh_suzuki', make: 'Suzuki' },
    { id: 'veh_hyundai', make: 'Hyundai' },
    { id: 'veh_kia', make: 'KIA' },
    { id: 'veh_changan', make: 'Changan' },
  ];

  for (const v of vehicleMakes) {
    db.run('INSERT OR IGNORE INTO vehicles (id, make, created_at) VALUES (?, ?, ?);', [v.id, v.make, now]);
  }

  const models = [
    { id: 'vm_corolla', vid: 'veh_toyota', name: 'Corolla (GLI/Altis/Grande)', start: 2014, end: 2024, eng: '1.3L / 1.6L / 1.8L' },
    { id: 'vm_yaris', vid: 'veh_toyota', name: 'Yaris', start: 2020, end: 2026, eng: '1.3L / 1.5L' },
    { id: 'vm_fortuner', vid: 'veh_toyota', name: 'Fortuner / Hilux Revo', start: 2016, end: 2026, eng: '2.7L Petrol / 2.8L Diesel' },
    { id: 'vm_civic', vid: 'veh_honda', name: 'Civic (Turbo / Oriel)', start: 2016, end: 2026, eng: '1.5L Turbo / 1.8L' },
    { id: 'vm_city', vid: 'veh_honda', name: 'City (i-VTEC / Aspire)', start: 2010, end: 2025, eng: '1.2L / 1.5L' },
    { id: 'vm_brv', vid: 'veh_honda', name: 'BR-V', start: 2017, end: 2025, eng: '1.5L i-VTEC' },
    { id: 'vm_alto', vid: 'veh_suzuki', name: 'Alto 660cc', start: 2019, end: 2026, eng: '660cc R06A' },
    { id: 'vm_cultus', vid: 'veh_suzuki', name: 'Cultus (VXL / AGS)', start: 2017, end: 2026, eng: '1.0L K10B' },
    { id: 'vm_wagonr', vid: 'veh_suzuki', name: 'Wagon R', start: 2014, end: 2025, eng: '1.0L K10B' },
    { id: 'vm_swift', vid: 'veh_suzuki', name: 'Swift (GL / GLX)', start: 2022, end: 2026, eng: '1.2L DualJet' },
    { id: 'vm_sportage', vid: 'veh_kia', name: 'Sportage (FWD / AWD)', start: 2019, end: 2026, eng: '2.0L MPI' },
    { id: 'vm_tucson', vid: 'veh_hyundai', name: 'Tucson (GLS / AWD)', start: 2020, end: 2026, eng: '2.0L' },
    { id: 'vm_alsvin', vid: 'veh_changan', name: 'Alsvin (Lumiere)', start: 2021, end: 2026, eng: '1.3L / 1.5L' },
  ];

  for (const m of models) {
    db.run(
      'INSERT OR IGNORE INTO vehicle_models (id, vehicle_id, model_name, start_year, end_year, engine, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [m.id, m.vid, m.name, m.start, m.end, m.eng, now]
    );
  }

  // 6. Products (Real Pakistani catalog with real specs, pricing in PKR, genuine models)
  const products = [
    {
      id: 'prod_ags_gl65',
      name: 'AGS GL-65 (50Ah) Heavy Duty Battery',
      slug: 'ags-gl-65-50ah-heavy-duty-battery',
      brand_id: 'brand_ags',
      category_id: 'cat_car',
      sku: 'AGS-GL-65',
      price: 19500,
      sale_price: 18200,
      stock: 35,
      featured: 1,
      bestseller: 1,
      new_arrival: 0,
      type: 'Dry Charged Lead-Acid',
      voltage: '12V',
      ah: 50,
      cca: 420,
      plates: 11,
      dimensions: '235 x 128 x 220 mm',
      weight: 12.5,
      warranty: 12,
      manufacturer: 'Atlas Battery Limited (GS Yuasa Japan)',
      short_desc: 'Most popular battery for Toyota Corolla, Honda City, Suzuki Swift, and sedans in Pakistan.',
      description: 'AGS GL-65 is manufactured with Japanese GS Yuasa technology for superior cranking power under extreme Pakistani weather conditions. Specially fortified paste formula resists high temperatures and vibration.',
      features: JSON.stringify([
        'Japanese GS Yuasa Technology for fast start in extreme weather',
        '11 heavy duty antimony alloy plates',
        'Built-in flame arrestor safety vent plugs',
        '1 Year Official Warranty claimable at Chaudhary Battery F-10 or any AGS center',
        'Best fit for Corolla, Civic, City, Yaris, Swift'
      ]),
      delivery: 'Free same-day delivery and professional terminal fitting in Islamabad F-10, F-11, G-10, E-11, DHA & Bahria Town.',
      returns: '7-day replacement warranty if manufacturing defect verified with hydrometer & battery load tester.',
      images: [
        'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1558441719-8b459c86f6c0?auto=format&fit=crop&w=800&q=80'
      ],
      compatible: ['vm_corolla', 'vm_city', 'vm_yaris', 'vm_swift', 'vm_alsvin']
    },
    {
      id: 'prod_daewoo_dls65',
      name: 'Daewoo DLS-65 (50Ah) Maintenance-Free Battery',
      slug: 'daewoo-dls-65-50ah-maintenance-free',
      brand_id: 'brand_daewoo',
      category_id: 'cat_dry',
      sku: 'DAE-DLS-65',
      price: 21500,
      sale_price: 20200,
      stock: 28,
      featured: 1,
      bestseller: 1,
      new_arrival: 1,
      type: '100% Maintenance-Free Sealed',
      voltage: '12V',
      ah: 50,
      cca: 460,
      plates: 12,
      dimensions: '238 x 129 x 225 mm',
      weight: 12.8,
      warranty: 12,
      manufacturer: 'Daewoo Battery Pakistan (Korean Technology)',
      short_desc: '100% Maintenance-Free sealed battery with Magic Eye indicator. No acid pouring or water maintenance needed.',
      description: 'Daewoo DLS-65 is designed with high-density expanded calcium grid technology from Korea. Completely sealed cover prevents acid leakage and terminal corrosion. Features instant optical status indicator.',
      features: JSON.stringify([
        '100% Maintenance-Free — Zero water filling required ever',
        'Korean Expanded Grid Calcium alloy for long shelf life',
        'Magic Eye optical state-of-charge hydrometer',
        'Double-sealed labyrinth lid preventing acid fumes',
        'Ready to install out of the box'
      ]),
      delivery: 'Free immediate delivery with battery health checkup in Islamabad & Rawalpindi.',
      returns: 'Official 1-year replacement card warranty.',
      images: [
        'https://images.unsplash.com/photo-1558441719-8b459c86f6c0?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80'
      ],
      compatible: ['vm_corolla', 'vm_city', 'vm_yaris', 'vm_civic', 'vm_sportage', 'vm_tucson']
    },
    {
      id: 'prod_volta_ts1800',
      name: 'Volta TS-1800 (185Ah) Tall Tubular Solar & UPS Battery',
      slug: 'volta-ts-1800-185ah-tall-tubular-battery',
      brand_id: 'brand_volta',
      category_id: 'cat_tubular',
      sku: 'VOL-TS-1800',
      price: 68500,
      sale_price: 65000,
      stock: 16,
      featured: 1,
      bestseller: 1,
      new_arrival: 0,
      type: 'Tall Tubular Deep Cycle',
      voltage: '12V',
      ah: 185,
      cca: 850,
      plates: 27,
      dimensions: '505 x 190 x 410 mm',
      weight: 58.0,
      warranty: 12,
      manufacturer: 'Pakistan Accumulators Limited (PAL)',
      short_desc: 'Heavy-duty tall tubular battery built for 8-12 hour load shedding backup and hybrid solar systems.',
      description: 'The Volta TS-1800 is the benchmark for home solar installations and large commercial UPS inverters in Pakistan. Engineered with spine-cast tubular positive plates and high-porosity polyethylene separators for over 1200 cycles at 80% DOD.',
      features: JSON.stringify([
        'Tall Tubular design for deep discharge cycling without plate shedding',
        '185Ah real C20 capacity for extended backup time',
        'Ceramic vent plugs with float level indicators for easy monitoring',
        'Specially formulated low-antimony alloy reduces water loss',
        'Ideal for 1kW, 3kW, and 5kW hybrid solar inverters (Inverex, Crown, SolarMax)'
      ]),
      delivery: 'Special heavy vehicle delivery with unboxing and inverter terminal connection in Islamabad & Rawalpindi.',
      returns: '1-Year comprehensive replacement warranty through Chaudhary Battery & UPS F-10.',
      images: [
        'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80'
      ],
      compatible: []
    },
    {
      id: 'prod_osaka_tubo2500',
      name: 'Osaka Tubo-Solar TS-2500 (230Ah) Deep Cycle Tubular Battery',
      slug: 'osaka-tubo-solar-ts-2500-230ah-deep-cycle',
      brand_id: 'brand_osaka',
      category_id: 'cat_solar',
      sku: 'OSA-TS-2500',
      price: 84000,
      sale_price: 79500,
      stock: 12,
      featured: 1,
      bestseller: 0,
      new_arrival: 1,
      type: 'Tall Tubular Deep Cycle',
      voltage: '12V',
      ah: 230,
      cca: 950,
      plates: 31,
      dimensions: '505 x 190 x 440 mm',
      weight: 64.5,
      warranty: 12,
      manufacturer: 'Pakistan Accumulators Limited / Osaka',
      short_desc: 'Maximum backup capacity for solar setups, running AC inverter loads, fans, and medical UPS systems.',
      description: 'Osaka Tubo-Solar TS-2500 represents top-tier energy storage for Pakistani residential and commercial off-grid solar systems. High acid volume per ampere-hour guarantees cooler operation even during Islamabad peak summer load.',
      features: JSON.stringify([
        'Massive 230Ah capacity delivering 14+ hours of continuous power',
        'High pressure die-cast spine structure preventing active material degradation',
        'Ultra-low self discharge rate and high thermal tolerance up to 55°C',
        'Includes terminal grease and acid density inspection chart'
      ]),
      delivery: 'Direct doorstep delivery with battery trolley placement and cable lugs setup in Islamabad.',
      returns: 'Full replacement warranty card stamped by Chaudhary Battery F-10 Markaz.',
      images: [
        'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80'
      ],
      compatible: []
    },
    {
      id: 'prod_exide_ns40',
      name: 'Exide NS-40 (38Ah) Compact Automotive Battery',
      slug: 'exide-ns-40-38ah-compact-automotive',
      brand_id: 'brand_exide',
      category_id: 'cat_car',
      sku: 'EXI-NS-40',
      price: 14500,
      sale_price: 13800,
      stock: 45,
      featured: 0,
      bestseller: 1,
      new_arrival: 0,
      type: 'Dry Charged Automotive',
      voltage: '12V',
      ah: 38,
      cca: 320,
      plates: 9,
      dimensions: '197 x 129 x 227 mm',
      weight: 9.8,
      warranty: 12,
      manufacturer: 'Exide Pakistan Limited',
      short_desc: 'The best-selling battery for Suzuki Alto 660cc, Wagon R, Cultus, and small compact Japanese imports.',
      description: 'Original Exide NS-40 tailored specifically for compact engine bays and fuel-efficient Pakistani vehicles. High cranking efficiency ensures quick starter motor engagement without battery drain.',
      features: JSON.stringify([
        'Perfect dimensions for Suzuki Alto, WagonR, Cultus, Mira, Move',
        'Anti-sulfation active chemicals for short daily city trips',
        'High cold cranking performance on cold Islamabad winter mornings',
        'Chaudhary Battery certified fresh stock guarantee'
      ]),
      delivery: 'Fast bike courier delivery within 60 minutes in F-10, F-11, G-10, G-11 Islamabad.',
      returns: '1 Year official manufacturer warranty.',
      images: [
        'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80'
      ],
      compatible: ['vm_alto', 'vm_cultus', 'vm_wagonr']
    },
    {
      id: 'prod_phoenix_tx1000',
      name: 'Phoenix TX-1000 (100Ah) Inverter & UPS Battery',
      slug: 'phoenix-tx-1000-100ah-inverter-ups',
      brand_id: 'brand_phoenix',
      category_id: 'cat_ups',
      sku: 'PHX-TX-1000',
      price: 38500,
      sale_price: 36000,
      stock: 22,
      featured: 0,
      bestseller: 1,
      new_arrival: 0,
      type: 'Semi-Tubular Deep Cycle',
      voltage: '12V',
      ah: 100,
      cca: 620,
      plates: 19,
      dimensions: '405 x 172 x 235 mm',
      weight: 29.5,
      warranty: 12,
      manufacturer: 'Century Paper & Board Mills (Phoenix Division)',
      short_desc: 'Dependable 100Ah battery for domestic 1000VA UPS powering fans, lights, and home routers.',
      description: 'Phoenix TX-1000 is built with thicker plates and micro-porous envelope separators to withstand frequent daily charging and discharging cycles during summer load shedding.',
      features: JSON.stringify([
        '100Ah capacity running 3-4 fans and LED lights for 4-5 hours',
        'Micro-porous polyethylene separators preventing internal shorts',
        'Reinforced polypropylene container resistant to physical shock',
        'Easy-access vent caps for quick acid level inspection'
      ]),
      delivery: 'Free delivery and UPS terminal polarity verification in Islamabad.',
      returns: '12-month manufacturer replacement warranty.',
      images: [
        'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80'
      ],
      compatible: []
    },
    {
      id: 'prod_daewoo_dls120',
      name: 'Daewoo DLS-120 (100Ah) Commercial & SUV Battery',
      slug: 'daewoo-dls-120-100ah-commercial-suv',
      brand_id: 'brand_daewoo',
      category_id: 'cat_dry',
      sku: 'DAE-DLS-120',
      price: 37500,
      sale_price: 35000,
      stock: 18,
      featured: 1,
      bestseller: 0,
      new_arrival: 1,
      type: '100% Maintenance-Free Sealed',
      voltage: '12V',
      ah: 100,
      cca: 800,
      plates: 19,
      dimensions: '304 x 173 x 225 mm',
      weight: 24.5,
      warranty: 12,
      manufacturer: 'Daewoo Battery Pakistan',
      short_desc: 'High output maintenance-free battery for Toyota Fortuner, Hilux Revo, Land Cruiser, and commercial vans.',
      description: 'Specially engineered for heavy-duty starting demands of high-displacement turbo diesel and V6/V8 petrol engines. Completely vibration-resistant for off-road and Pakistani highway conditions.',
      features: JSON.stringify([
        'Massive 800 CCA for instant ignition of 2.8L and 3.0L turbo diesel engines',
        'Vibration-proof anchor bonding prevents plate detachment on rough roads',
        'Integrated Magic Eye charge indicator',
        'Zero acid replenishment requirement throughout battery lifespan'
      ]),
      delivery: 'Free delivery and alternator charging voltage checkup in Islamabad.',
      returns: '12 months official replacement warranty.',
      images: [
        'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80'
      ],
      compatible: ['vm_fortuner']
    },
    {
      id: 'prod_ags_hybrid70',
      name: 'AGS CN-70 (55Ah) Hybrid Inverter & Car Battery',
      slug: 'ags-cn-70-55ah-hybrid-inverter-car',
      brand_id: 'brand_ags',
      category_id: 'cat_car',
      sku: 'AGS-CN-70',
      price: 22000,
      sale_price: 20900,
      stock: 30,
      featured: 0,
      bestseller: 1,
      new_arrival: 0,
      type: 'Hybrid Heavy Duty',
      voltage: '12V',
      ah: 55,
      cca: 450,
      plates: 13,
      dimensions: '260 x 173 x 225 mm',
      weight: 15.2,
      warranty: 12,
      manufacturer: 'Atlas Battery Limited',
      short_desc: 'Dual-purpose battery suitable for both medium sedans (Civic/Corolla) and small UPS backup.',
      description: 'Hybrid plate design combining low-antimony and calcium alloys provides excellent deep-cycling endurance without sacrificing starter cranking power.',
      features: JSON.stringify([
        'Dual-purpose architecture for automotive starting and emergency home lighting',
        'Special microporous glass mat separators',
        'Longer electrolyte retention and lower gassing rate',
        'Authorized dealer warranty slip with invoice'
      ]),
      delivery: 'Same-day courier in Islamabad & Rawalpindi.',
      returns: '1 Year official warranty.',
      images: [
        'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80'
      ],
      compatible: ['vm_civic', 'vm_corolla', 'vm_sportage', 'vm_tucson']
    }
  ];

  for (const p of products) {
    db.run(
      `INSERT OR IGNORE INTO products (
        id, name, slug, brand_id, category_id, sku, price, sale_price, stock_quantity,
        is_featured, is_bestseller, is_new_arrival, status, battery_type, voltage,
        ah_capacity, cca, plates, dimensions, weight, warranty_months, manufacturer,
        short_desc, description, features, delivery_info, return_info, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        p.id, p.name, p.slug, p.brand_id, p.category_id, p.sku, p.price, p.sale_price, p.stock,
        p.featured, p.bestseller, p.new_arrival, p.type, p.voltage, p.ah, p.cca, p.plates,
        p.dimensions, p.weight, p.warranty, p.manufacturer, p.short_desc, p.description,
        p.features, p.delivery, p.returns, now, now
      ]
    );

    // Initial Inventory row
    db.run(
      `INSERT OR IGNORE INTO inventory (id, product_id, current_stock, reserved_stock, low_stock_threshold, updated_at)
       VALUES (?, ?, ?, 0, 5, ?);`,
      [`inv_${p.id}`, p.id, p.stock, now]
    );

    // Product Images
    for (let i = 0; i < p.images.length; i++) {
      db.run(
        `INSERT OR IGNORE INTO product_images (id, product_id, image_url, alt_text, display_order, is_primary, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [`img_${p.id}_${i}`, p.id, p.images[i], `${p.name} view ${i + 1}`, i, i === 0 ? 1 : 0, now]
      );
    }

    // Vehicle compatibility
    for (const vModelId of p.compatible) {
      db.run(
        `INSERT OR IGNORE INTO product_compatibility (id, product_id, vehicle_model_id, notes, created_at)
         VALUES (?, ?, ?, 'Direct OEM Replacement fit', ?);`,
        [`comp_${p.id}_${vModelId}`, p.id, vModelId, now]
      );
    }
  }

  // 7. Product Variants (e.g. for AGS GL-65 with 50Ah and high-output 65Ah variant)
  db.run(
    `INSERT OR IGNORE INTO product_variants (id, product_id, sku, title, ah_capacity, price, sale_price, stock_quantity, warranty_months, weight, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?);`,
    ['var_ags_gl65_std', 'prod_ags_gl65', 'AGS-GL-65-STD', 'Standard 50Ah Lead-Acid', 50, 19500, 18200, 20, 12, 12.5, now, now]
  );
  db.run(
    `INSERT OR IGNORE INTO product_variants (id, product_id, sku, title, ah_capacity, price, sale_price, stock_quantity, warranty_months, weight, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?);`,
    ['var_ags_gl65_plus', 'prod_ags_gl65', 'AGS-GL-65-PLUS', 'Plus 65Ah High-CCA Heavy Duty', 65, 23500, 21900, 15, 12, 14.8, now, now]
  );

  // 8. Shipping Zones (Pakistan specific: Islamabad local, Rawalpindi, Punjab, Nationwide)
  const shippingZones = [
    {
      id: 'zone_isb_local',
      name: 'Islamabad Capital Territory (F-10 / Local)',
      cities: 'Islamabad, F-10, F-11, G-10, G-11, E-11, F-8, Blue Area, Bahria Town, DHA',
      fee: 0, // Free delivery in Islamabad
      free_threshold: 0,
      days: 'Same Day (2 - 4 Hours)'
    },
    {
      id: 'zone_rwp',
      name: 'Rawalpindi City & Cantt',
      cities: 'Rawalpindi, Cantt, Saddar, Chaklala, Satellite Town, Westridge',
      fee: 500,
      free_threshold: 30000,
      days: 'Same Day / Next Day'
    },
    {
      id: 'zone_nationwide',
      name: 'Nationwide Courier (Other Cities across Pakistan)',
      cities: 'Lahore, Karachi, Peshawar, Multan, Faisalabad, Quetta, Gujranwala, Sialkot',
      fee: 1500,
      free_threshold: 100000,
      days: '2 - 4 Business Days (Careful Pallet Courier)'
    }
  ];

  for (const z of shippingZones) {
    db.run(
      `INSERT OR IGNORE INTO shipping_zones (id, name, cities, base_fee, free_threshold, estimated_days, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?);`,
      [z.id, z.name, z.cities, z.fee, z.free_threshold, z.days, now]
    );
  }

  // 9. Coupons (Real, validated Pakistani battery store coupons)
  const coupons = [
    {
      id: 'coup_f10welcome',
      code: 'F10WELCOME',
      desc: 'PKR 1,000 Flat discount on first battery order for Islamabad residents',
      type: 'fixed',
      val: 1000,
      min: 15000,
      max: 1000,
      limit: 500
    },
    {
      id: 'coup_solarsave5',
      code: 'SOLARSAVE5',
      desc: '5% discount on all Tubular and Solar backup batteries',
      type: 'percentage',
      val: 5,
      min: 50000,
      max: 5000,
      limit: 200
    },
    {
      id: 'coup_exchangepkr500',
      code: 'SCRAP500',
      desc: 'Extra PKR 500 bonus discount with old battery scrap trade-in commitment',
      type: 'fixed',
      val: 500,
      min: 10000,
      max: 500,
      limit: 1000
    }
  ];

  for (const cp of coupons) {
    db.run(
      `INSERT OR IGNORE INTO coupons (id, code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, times_used, start_date, end_date, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1, ?, ?);`,
      [cp.id, cp.code, cp.desc, cp.type, cp.val, cp.min, cp.max, cp.limit, now - 86400000, now + 365 * 86400000, now, now]
    );
  }

  // 10. Reviews (Verified customer reviews from Islamabad customers)
  const reviews = [
    {
      id: 'rev_001',
      product_id: 'prod_ags_gl65',
      name: 'Malik Tariq Mehmood',
      rating: 5,
      title: 'Flawless delivery to F-10/2 within 45 minutes!',
      comment: 'My Corolla battery died in the morning. Called Chaudhary Battery, ordered online with Cash on Delivery. Technician arrived in 45 mins, fitted the AGS GL-65 with terminal grease and took away the old battery with a fair scrap rebate. Outstanding service in Islamabad!',
      verified: 1
    },
    {
      id: 'rev_002',
      product_id: 'prod_daewoo_dls65',
      name: 'Dr. Shahzad Afzal',
      rating: 5,
      title: '100% Genuine Daewoo with Magic Eye. No hassle.',
      comment: 'I always prefer maintenance free batteries because of zero acid smell in car engine bay. Authentic product with company stamped warranty card.',
      verified: 1
    },
    {
      id: 'rev_003',
      product_id: 'prod_volta_ts1800',
      name: 'Engr. Kamran Siddiqui (E-11/3)',
      rating: 5,
      title: 'Running 3kW hybrid solar inverter seamlessly',
      comment: 'Installed 4 units of Volta TS-1800 tubular batteries for my home solar system. Backup time is easily 9+ hours with 4 ceiling fans, LED lights, and refrigerator. Chaudhary Battery staff is very technical.',
      verified: 1
    },
    {
      id: 'rev_004',
      product_id: 'prod_exide_ns40',
      name: 'Usman Ali',
      rating: 5,
      title: 'Perfect for Suzuki Alto 660cc',
      comment: 'Compact size fits Alto battery bracket exactly. Cranks on first key turn even in chilling Murree/Islamabad winters.',
      verified: 1
    }
  ];

  for (const r of reviews) {
    db.run(
      `INSERT OR IGNORE INTO reviews (id, product_id, customer_name, rating, title, comment, is_verified_purchase, status, is_featured, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', 1, ?, ?);`,
      [r.id, r.product_id, r.name, r.rating, r.title, r.comment, r.verified, now - 86400000 * 3, now]
    );
  }

  // 11. Site Settings (Business details for F-10 Markaz Islamabad)
  const settings = [
    { key: 'business_name', val: 'Chaudhary Battery And UPS F10', grp: 'general' },
    { key: 'business_tagline', val: 'Authorised Dealer & Wholesaler for AGS, Daewoo, Volta, Osaka, Exide & Phoenix', grp: 'general' },
    { key: 'business_address', val: 'Shop # 14-16, Ground Floor, Capital Trade Centre, F-10 Markaz, Islamabad, 44000, Pakistan', grp: 'general' },
    { key: 'business_phone', val: '+92 51 2212345', grp: 'general' },
    { key: 'business_whatsapp', val: '+92 300 5551234', grp: 'general' },
    { key: 'business_email', val: 'sales@chaudharybattery.pk', grp: 'general' },
    { key: 'currency', val: 'PKR', grp: 'store' },
    { key: 'currency_symbol', val: 'Rs.', grp: 'store' },
    { key: 'tax_rate_percent', val: '0', grp: 'store' }, // In PK automotive retail, tax is inclusive or exempt for retail lead-acid
    { key: 'free_delivery_min_isb', val: '10000', grp: 'shipping' },
    { key: 'scrap_exchange_discount_enabled', val: 'true', grp: 'store' },
    { key: 'cod_enabled', val: 'true', grp: 'payment' },
    { key: 'online_payment_enabled', val: 'true', grp: 'payment' },
    { key: 'online_payment_gateway', val: 'payfast', grp: 'payment' }, // PayFast, JazzCash, EasyPaisa abstraction
    { key: 'bank_transfer_enabled', val: 'true', grp: 'payment' },
    { key: 'bank_name', val: 'Meezan Bank Limited / F-10 Markaz Branch', grp: 'payment' },
    { key: 'bank_account_title', val: 'Chaudhary Battery And UPS', grp: 'payment' },
    { key: 'bank_iban', val: 'PK42MEZN0000100123456789', grp: 'payment' }
  ];

  for (const s of settings) {
    db.run(
      `INSERT OR IGNORE INTO site_settings (id, key, value, group_name, updated_at)
       VALUES (?, ?, ?, ?, ?);`,
      [`set_${s.key}`, s.key, s.val, s.grp, now]
    );
  }

  // 12. CMS Banners
  const banners = [
    {
      id: 'ban_hero_01',
      title: 'Powering Islamabad with Genuine Batteries Since 1998',
      subtitle: 'Authorised Master Distributor for AGS, Daewoo, Volta, Osaka, Exide & Phoenix in F-10 Markaz.',
      image: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1600&q=80',
      cta_text: 'Explore Batteries',
      cta_link: '/shop',
      order: 1
    },
    {
      id: 'ban_hero_02',
      title: 'Heavy Duty Solar Tubular Batteries with Long Backup',
      subtitle: 'Zero load shedding worries. Tall tubular Volta TS & Osaka Tubo-Solar range ready for prompt delivery.',
      image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1600&q=80',
      cta_text: 'Solar & UPS Range',
      cta_link: '/category/tubular-batteries',
      order: 2
    },
    {
      id: 'ban_hero_03',
      title: '100% Sealed Maintenance-Free Daewoo Batteries',
      subtitle: 'Korean Calcium Expanded Grid technology. Fast roadside battery delivery across Islamabad.',
      image: 'https://images.unsplash.com/photo-1558441719-8b459c86f6c0?auto=format&fit=crop&w=1600&q=80',
      cta_text: 'Shop Daewoo',
      cta_link: '/brand/daewoo',
      order: 3
    }
  ];

  for (const b of banners) {
    db.run(
      `INSERT OR IGNORE INTO banners (id, title, subtitle, image_url, cta_text, cta_link, display_order, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?);`,
      [b.id, b.title, b.subtitle, b.image, b.cta_text, b.cta_link, b.order, now]
    );
  }

  // 13. CMS Pages (About, Shipping, Warranty, Return, Privacy, Terms)
  const pages = [
    {
      slug: 'about-us',
      title: 'About Chaudhary Battery And UPS F10',
      content: `### Welcome to Chaudhary Battery And UPS F10
Located in the heart of Islamabad at F-10 Markaz, Chaudhary Battery And UPS has been the capital's trusted source for automotive starting batteries, solar deep-cycle tubular storage, and commercial UPS power solutions for more than two decades.

#### Why Islamabad Relies On Us:
- **100% Genuine Stamped Stock**: We are direct authorised dealers for AGS (Atlas Battery Limited), Daewoo Maintenance Free, Volta, Osaka, Exide Pakistan, and Phoenix. Every battery carries an authentic manufacturer barcode and warranty booklet.
- **Immediate Roadside Emergency Service**: Stranded with a dead battery in Islamabad or Rawalpindi? Our mobile battery installation vans reach your location with hydrometer testing, alternator diagnostic checkup, and instant replacement.
- **Fair Old Battery Exchange Value**: We provide verified market-rate scrap cash discounts on your old battery when purchasing a new one.
- **Solar & Inverter Specialists**: Certified guidance on matching battery capacity (Ah) with your solar inverters (Inverex, Crown, SolarMax, Homage, Fronus).`
    },
    {
      slug: 'warranty-policy',
      title: 'Warranty & Genuine Replacement Policy',
      content: `### Official Manufacturer Warranty Guidelines
At Chaudhary Battery And UPS F10, every battery sold is backed by the official manufacturer warranty card stamped with our authorized dealer seal and date of purchase.

1. **Warranty Period**: Standard automotive car batteries carry 12 months warranty. Motorcycle batteries carry 6 months warranty. Tubular and deep-cycle solar batteries carry 12 to 24 months manufacturer warranty.
2. **Instant Claim Assistance**: Bring your vehicle and stamped warranty card to our F-10 Markaz service centre. Our technicians perform immediate computerized load testing and specific gravity hydrometer checks.
3. **Replacement**: If an internal cell short or manufacturing defect is verified, an official company claim is registered immediately without delay.`
    },
    {
      slug: 'shipping-policy',
      title: 'Shipping & Emergency Delivery Policy',
      content: `### Fast Delivery Across Islamabad & Pakistan
- **Islamabad Local (F-10, F-11, G-10, E-11, F-8, Blue Area, DHA & Bahria)**: Free delivery on all car and tubular battery orders over Rs. 10,000. Typical dispatch within 45 to 90 minutes.
- **Rawalpindi Cantt & City**: Rs. 500 standard delivery or free on orders over Rs. 30,000.
- **Nationwide Freight Pallet Shipping**: Dispatched via insured logistics services with heavy wooden pallet packing to prevent acid spillage.`
    }
  ];

  for (const pg of pages) {
    db.run(
      `INSERT OR IGNORE INTO pages (id, slug, title, content, seo_title, seo_description, is_published, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?);`,
      [
        `pg_${pg.slug}`,
        pg.slug,
        pg.title,
        pg.content,
        `${pg.title} | Chaudhary Battery F-10`,
        `Read about ${pg.title} at Chaudhary Battery And UPS, F-10 Markaz Islamabad.`,
        now
      ]
    );
  }
}
