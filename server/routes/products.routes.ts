import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run, transaction } from '../db.js';
import { requireAdmin, AuthenticatedRequest, logAuditAction } from '../middleware/auth.middleware.js';

const router = Router();

// Public Product Listing with powerful filters and SEO search
router.get('/', (req: Request, res: Response) => {
  try {
    const {
      brand,
      category,
      type,
      voltage,
      minPrice,
      maxPrice,
      minAh,
      maxAh,
      inStock,
      featured,
      bestseller,
      newArrival,
      search,
      vehicleModelId,
      sort = 'featured',
      page = '1',
      limit = '12'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 12));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = ["p.status = 'published'"];
    const params: any[] = [];

    if (brand) {
      conditions.push('(b.slug = ? OR b.id = ?)');
      params.push(brand, brand);
    }

    if (category) {
      conditions.push('(c.slug = ? OR c.id = ?)');
      params.push(category, category);
    }

    if (type) {
      conditions.push('p.battery_type = ?');
      params.push(type);
    }

    if (voltage) {
      conditions.push('p.voltage = ?');
      params.push(voltage);
    }

    if (minPrice) {
      conditions.push('(CASE WHEN p.sale_price IS NOT NULL AND p.sale_price > 0 THEN p.sale_price ELSE p.price END) >= ?');
      params.push(parseFloat(minPrice as string));
    }

    if (maxPrice) {
      conditions.push('(CASE WHEN p.sale_price IS NOT NULL AND p.sale_price > 0 THEN p.sale_price ELSE p.price END) <= ?');
      params.push(parseFloat(maxPrice as string));
    }

    if (minAh) {
      conditions.push('p.ah_capacity >= ?');
      params.push(parseInt(minAh as string));
    }

    if (maxAh) {
      conditions.push('p.ah_capacity <= ?');
      params.push(parseInt(maxAh as string));
    }

    if (inStock === 'true' || inStock === '1') {
      conditions.push('p.stock_quantity > 0');
    }

    if (featured === 'true' || featured === '1') {
      conditions.push('p.is_featured = 1');
    }

    if (bestseller === 'true' || bestseller === '1') {
      conditions.push('p.is_bestseller = 1');
    }

    if (newArrival === 'true' || newArrival === '1') {
      conditions.push('p.is_new_arrival = 1');
    }

    if (vehicleModelId) {
      conditions.push('EXISTS (SELECT 1 FROM product_compatibility pc WHERE pc.product_id = p.id AND pc.vehicle_model_id = ?)');
      params.push(vehicleModelId);
    }

    if (search && typeof search === 'string') {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push('(LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ? OR LOWER(b.name) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(p.short_desc) LIKE ?)');
      params.push(term, term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sorting
    let orderBy = 'ORDER BY p.is_featured DESC, p.created_at DESC';
    switch (sort) {
      case 'price_asc':
        orderBy = 'ORDER BY (CASE WHEN p.sale_price IS NOT NULL AND p.sale_price > 0 THEN p.sale_price ELSE p.price END) ASC';
        break;
      case 'price_desc':
        orderBy = 'ORDER BY (CASE WHEN p.sale_price IS NOT NULL AND p.sale_price > 0 THEN p.sale_price ELSE p.price END) DESC';
        break;
      case 'bestseller':
        orderBy = 'ORDER BY p.is_bestseller DESC, p.created_at DESC';
        break;
      case 'latest':
        orderBy = 'ORDER BY p.created_at DESC';
        break;
      case 'rating':
        orderBy = 'ORDER BY avg_rating DESC, p.created_at DESC';
        break;
      case 'alpha':
        orderBy = 'ORDER BY p.name ASC';
        break;
    }

    // Count query
    const countSql = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      JOIN brands b ON p.brand_id = b.id
      JOIN categories c ON p.category_id = c.id
      ${whereClause};
    `;
    const countRes = queryOne<{ total: number }>(countSql, params);
    const total = countRes?.total || 0;

    // Items query with primary image and ratings
    const sql = `
      SELECT 
        p.*,
        b.name as brand_name,
        b.slug as brand_slug,
        c.name as category_name,
        c.slug as category_slug,
        (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.display_order ASC LIMIT 1) as primary_image,
        COALESCE((SELECT AVG(rating) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved'), 5.0) as avg_rating,
        COALESCE((SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved'), 0) as reviews_count
      FROM products p
      JOIN brands b ON p.brand_id = b.id
      JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ${orderBy}
      LIMIT ${limitNum} OFFSET ${offset};
    `;

    const products = query(sql, params).map((p: any) => ({
      ...p,
      features: p.features ? JSON.parse(p.features) : [],
      avg_rating: Number(Number(p.avg_rating).toFixed(1))
    }));

    res.json({
      success: true,
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// Search suggestions for header search bar
router.get('/search-suggestions', (req: Request, res: Response) => {
  try {
    const q = req.query.q?.toString().trim().toLowerCase();
    if (!q || q.length < 2) {
      res.json({
        success: true,
        suggestions: [],
        popular: ['AGS GL-65', 'Daewoo DLS-65', 'Volta TS-1800', 'Exide NS-40', 'Osaka Tubo-Solar', 'Corolla Battery', 'Alto 660cc Battery']
      });
      return;
    }

    const term = `%${q}%`;
    const products = query(
      `SELECT p.id, p.name, p.slug, p.sku, p.price, p.sale_price, b.name as brand_name,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id LIMIT 1) as image_url
       FROM products p
       JOIN brands b ON p.brand_id = b.id
       WHERE LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ? OR LOWER(b.name) LIKE ?
       LIMIT 6;`,
      [term, term, term]
    );

    const brands = query('SELECT name, slug FROM brands WHERE LOWER(name) LIKE ? LIMIT 3;', [term]);

    res.json({
      success: true,
      products,
      brands
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Search suggestion error' });
  }
});

// Single Product Details (by Slug or ID)
router.get('/:slugOrId', (req: Request, res: Response) => {
  try {
    const param = req.params.slugOrId;
    const p = queryOne<any>(
      `SELECT 
        p.*,
        b.name as brand_name,
        b.slug as brand_slug,
        b.logo_url as brand_logo,
        c.name as category_name,
        c.slug as category_slug
       FROM products p
       JOIN brands b ON p.brand_id = b.id
       JOIN categories c ON p.category_id = c.id
       WHERE p.slug = ? OR p.id = ?;`,
      [param, param]
    );

    if (!p) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    // Images
    const images = query('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order ASC;', [p.id]);

    // Variants
    const variants = query('SELECT * FROM product_variants WHERE product_id = ? AND status = "active";', [p.id]);

    // Compatible vehicles
    const compatibleVehicles = query(
      `SELECT vm.id, vm.model_name, vm.start_year, vm.end_year, vm.engine, v.make
       FROM product_compatibility pc
       JOIN vehicle_models vm ON pc.vehicle_model_id = vm.id
       JOIN vehicles v ON vm.vehicle_id = v.id
       WHERE pc.product_id = ?;`,
      [p.id]
    );

    // Reviews
    const reviews = query(
      'SELECT id, customer_name, rating, title, comment, is_verified_purchase, created_at FROM reviews WHERE product_id = ? AND status = "approved" ORDER BY created_at DESC;',
      [p.id]
    );

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
      : 5.0;

    // Related products (same brand or category)
    const related = query(
      `SELECT p.id, p.name, p.slug, p.sku, p.price, p.sale_price, p.ah_capacity, p.voltage, b.name as brand_name,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id LIMIT 1) as primary_image
       FROM products p
       JOIN brands b ON p.brand_id = b.id
       WHERE (p.category_id = ? OR p.brand_id = ?) AND p.id != ? AND p.status = 'published'
       LIMIT 4;`,
      [p.category_id, p.brand_id, p.id]
    );

    res.json({
      success: true,
      product: {
        ...p,
        features: p.features ? JSON.parse(p.features) : [],
        images,
        variants,
        compatibleVehicles,
        reviews,
        avgRating: Number(avgRating.toFixed(1)),
        reviewsCount: reviews.length,
        related
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch product details' });
  }
});

// Admin: Create Product
router.post('/', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      slug,
      brandId,
      categoryId,
      sku,
      price,
      salePrice,
      stockQuantity,
      batteryType,
      voltage = '12V',
      ahCapacity,
      cca,
      plates,
      dimensions,
      weight,
      warrantyMonths = 12,
      manufacturer,
      shortDesc,
      description,
      features,
      deliveryInfo,
      returnInfo,
      images = [],
      variants = [],
      isFeatured = 0,
      isBestseller = 0,
      isNewArrival = 0
    } = req.body;

    const productId = `prod_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const cleanSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const now = Date.now();

    transaction(() => {
      run(
        `INSERT INTO products (
          id, name, slug, brand_id, category_id, sku, price, sale_price, stock_quantity,
          is_featured, is_bestseller, is_new_arrival, status, battery_type, voltage,
          ah_capacity, cca, plates, dimensions, weight, warranty_months, manufacturer,
          short_desc, description, features, delivery_info, return_info, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          productId, name, cleanSlug, brandId, categoryId, sku, price, salePrice || null, stockQuantity || 0,
          isFeatured ? 1 : 0, isBestseller ? 1 : 0, isNewArrival ? 1 : 0, batteryType, voltage,
          ahCapacity, cca || null, plates || null, dimensions || '', weight || null, warrantyMonths,
          manufacturer || '', shortDesc || '', description || '', JSON.stringify(features || []),
          deliveryInfo || '', returnInfo || '', now, now
        ]
      );

      // Inventory
      run(
        'INSERT INTO inventory (id, product_id, current_stock, reserved_stock, low_stock_threshold, updated_at) VALUES (?, ?, ?, 0, 5, ?);',
        [`inv_${productId}`, productId, stockQuantity || 0, now]
      );

      // Images
      if (Array.isArray(images)) {
        images.forEach((img: any, idx: number) => {
          const imgUrl = typeof img === 'string' ? img : img.image_url;
          run(
            'INSERT INTO product_images (id, product_id, image_url, alt_text, display_order, is_primary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
            [`img_${productId}_${idx}`, productId, imgUrl, `${name} image ${idx + 1}`, idx, idx === 0 ? 1 : 0, now]
          );
        });
      }

      // Variants
      if (Array.isArray(variants)) {
        variants.forEach((v: any, idx: number) => {
          run(
            `INSERT INTO product_variants (id, product_id, sku, title, ah_capacity, price, sale_price, stock_quantity, warranty_months, weight, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?);`,
            [`var_${productId}_${idx}`, productId, v.sku, v.title, v.ah_capacity, v.price, v.sale_price || null, v.stock_quantity || 0, v.warranty_months || 12, v.weight || null, now, now]
          );
        });
      }
    });

    logAuditAction(req.adminId, req.user?.email, 'create_product', 'product', productId, req.ip || 'unknown', `Created product: ${name}`);

    res.status(201).json({ success: true, productId, message: 'Product created successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create product' });
  }
});

// Admin: Update Product
router.put('/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = req.params.id;
    const {
      name,
      slug,
      brandId,
      categoryId,
      sku,
      price,
      salePrice,
      stockQuantity,
      batteryType,
      voltage,
      ahCapacity,
      cca,
      plates,
      dimensions,
      weight,
      warrantyMonths,
      manufacturer,
      shortDesc,
      description,
      features,
      images,
      isFeatured,
      isBestseller,
      isNewArrival,
      status
    } = req.body;

    const now = Date.now();

    transaction(() => {
      run(
        `UPDATE products SET
          name = ?, slug = ?, brand_id = ?, category_id = ?, sku = ?, price = ?, sale_price = ?,
          stock_quantity = ?, battery_type = ?, voltage = ?, ah_capacity = ?, cca = ?, plates = ?,
          dimensions = ?, weight = ?, warranty_months = ?, manufacturer = ?, short_desc = ?,
          description = ?, features = ?, is_featured = ?, is_bestseller = ?, is_new_arrival = ?,
          status = ?, updated_at = ?
         WHERE id = ?;`,
        [
          name, slug, brandId, categoryId, sku, price, salePrice || null,
          stockQuantity, batteryType, voltage, ahCapacity, cca || null, plates || null,
          dimensions, weight || null, warrantyMonths, manufacturer, shortDesc,
          description, JSON.stringify(features || []), isFeatured ? 1 : 0, isBestseller ? 1 : 0, isNewArrival ? 1 : 0,
          status || 'published', now, productId
        ]
      );

      // Update images
      if (Array.isArray(images)) {
        run('DELETE FROM product_images WHERE product_id = ?;', [productId]);
        images.forEach((img: any, idx: number) => {
          const imgUrl = typeof img === 'string' ? img : img.image_url;
          if (imgUrl) {
            run(
              'INSERT INTO product_images (id, product_id, image_url, alt_text, display_order, is_primary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
              [`img_${productId}_${idx}_${Date.now()}`, productId, imgUrl, `${name} image ${idx + 1}`, idx, idx === 0 ? 1 : 0, now]
            );
          }
        });
      }

      // Update inventory table
      run('UPDATE inventory SET current_stock = ?, updated_at = ? WHERE product_id = ?;', [stockQuantity, now, productId]);
    });

    logAuditAction(req.adminId, req.user?.email, 'update_product', 'product', productId, req.ip || 'unknown', `Updated product: ${name}`);

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

// Admin: Delete Product
router.delete('/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = req.params.id;
    run('DELETE FROM products WHERE id = ?;', [productId]);
    logAuditAction(req.adminId, req.user?.email, 'delete_product', 'product', productId, req.ip || 'unknown', `Deleted product: ${productId}`);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

export default router;
