import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run, transaction } from '../db.js';
import {
  authenticateOptional,
  requireAuth,
  AuthenticatedRequest
} from '../middleware/auth.middleware.js';

const router = Router();

// ==================== CART (Server-Authoritative) ====================

// Helper to get or create cart with multi-layer persistence (User, Cookie, Header)
function getCartId(req: AuthenticatedRequest, res: Response): string {
  const userId = req.user?.id;
  let sessionId = req.headers['x-session-id']?.toString() || (req.body?.sessionId ? String(req.body.sessionId) : '');

  // Read cookie fallback if header not present
  if (!sessionId && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const c of cookies) {
      const [key, val] = c.trim().split('=');
      if (key === 'cbf10_session') {
        sessionId = decodeURIComponent(val);
        break;
      }
    }
  }

  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  // Set cookie and response header
  res.cookie('cbf10_session', sessionId, {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    path: '/'
  });
  res.setHeader('X-Session-Id', sessionId);

  const now = Date.now();
  let cart: any = null;

  if (userId) {
    cart = queryOne('SELECT id FROM carts WHERE user_id = ?;', [userId]);
    if (!cart) {
      // Check if guest cart exists with this session to claim
      const guestCart = queryOne<any>('SELECT id FROM carts WHERE session_id = ?;', [sessionId]);
      if (guestCart) {
        run('UPDATE carts SET user_id = ?, updated_at = ? WHERE id = ?;', [userId, now, guestCart.id]);
        return guestCart.id;
      }

      const cartId = `cart_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      run('INSERT INTO carts (id, user_id, session_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?);', [cartId, userId, sessionId, now, now]);
      return cartId;
    }
    // Also merge any items from guest cart with this session
    const guestCart = queryOne<any>('SELECT id FROM carts WHERE session_id = ? AND id != ?;', [sessionId, cart.id]);
    if (guestCart) {
      const guestItems = query<any>('SELECT * FROM cart_items WHERE cart_id = ?;', [guestCart.id]);
      for (const gi of guestItems) {
        const exist = queryOne<any>('SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ?;', [cart.id, gi.product_id]);
        if (exist) {
          run('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?;', [gi.quantity, exist.id]);
        } else {
          run('UPDATE cart_items SET cart_id = ? WHERE id = ?;', [cart.id, gi.id]);
        }
      }
      run('DELETE FROM carts WHERE id = ?;', [guestCart.id]);
    }
    return cart.id;
  } else {
    cart = queryOne('SELECT id FROM carts WHERE session_id = ?;', [sessionId]);
    if (!cart) {
      const cartId = `cart_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      run('INSERT INTO carts (id, user_id, session_id, created_at, updated_at) VALUES (?, NULL, ?, ?, ?);', [cartId, sessionId, now, now]);
      return cartId;
    }
    return cart.id;
  }
}

// Authoritative cart calculator
function getAuthoritativeCartData(cartId: string) {
  const rawItems = query(`
    SELECT 
      ci.id as item_id,
      ci.quantity,
      p.id as product_id,
      p.name as product_name,
      p.slug as product_slug,
      p.sku,
      p.price,
      p.sale_price,
      p.stock_quantity,
      p.warranty_months,
      p.voltage,
      p.ah_capacity,
      COALESCE(b.name, 'Chaudhary Battery') as brand_name,
      pv.id as variant_id,
      pv.title as variant_title,
      pv.price as variant_price,
      pv.sale_price as variant_sale_price,
      pv.stock_quantity as variant_stock,
      COALESCE((SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.display_order ASC LIMIT 1), '/uploads/battery_ags_gl65.jpg') as image_url
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN product_variants pv ON ci.variant_id = pv.id
    WHERE ci.cart_id = ?;
  `, [cartId]);

  let subtotal = 0;
  const items = rawItems.map((item: any) => {
    const effectivePrice = item.variant_id
      ? (item.variant_sale_price && item.variant_sale_price > 0 ? item.variant_sale_price : item.variant_price)
      : (item.sale_price && item.sale_price > 0 ? item.sale_price : item.price);

    const maxStock = item.variant_id ? item.variant_stock : item.stock_quantity;
    const quantity = Math.max(1, Math.min(item.quantity, maxStock > 0 ? maxStock : 1));
    const itemSubtotal = effectivePrice * quantity;
    subtotal += itemSubtotal;

    return {
      id: item.item_id,
      productId: item.product_id,
      productName: item.product_name,
      productSlug: item.product_slug,
      sku: item.sku,
      brandName: item.brand_name,
      variantId: item.variant_id,
      variantTitle: item.variant_title,
      unitPrice: effectivePrice,
      originalPrice: item.variant_id ? item.variant_price : item.price,
      quantity,
      maxStock,
      isOutOfStock: maxStock <= 0,
      subtotal: itemSubtotal,
      warrantyMonths: item.warranty_months,
      ahCapacity: item.ah_capacity,
      voltage: item.voltage,
      imageUrl: item.image_url
    };
  });

  return {
    id: cartId,
    items,
    totalItems: items.reduce((acc: number, it: any) => acc + it.quantity, 0),
    subtotal
  };
}

// Get Cart with server-verified prices & current stock
router.get('/cart', authenticateOptional, (req: AuthenticatedRequest, res: Response) => {
  try {
    const cartId = getCartId(req, res);
    const cartData = getAuthoritativeCartData(cartId);
    res.json({
      success: true,
      cart: cartData
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve cart' });
  }
});

// Add Item to Cart
router.post('/cart/items', authenticateOptional, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;
    if (!productId) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }

    const cartId = getCartId(req, res);
    const qty = Math.max(1, parseInt(quantity) || 1);

    // Validate product stock in database (accept both ID and slug)
    const product = queryOne<any>(
      'SELECT id, name, stock_quantity, status FROM products WHERE (id = ? OR slug = ?);',
      [String(productId).trim(), String(productId).trim()]
    );
    if (!product || product.status !== 'published') {
      res.status(404).json({ success: false, error: 'Product is unavailable' });
      return;
    }

    if (variantId) {
      const variant = queryOne<any>('SELECT id, stock_quantity FROM product_variants WHERE id = ? AND product_id = ?;', [variantId, product.id]);
      if (!variant || variant.stock_quantity <= 0) {
        res.status(400).json({ success: false, error: 'Selected variation is out of stock' });
        return;
      }
    } else if (product.stock_quantity <= 0) {
      res.status(400).json({ success: false, error: 'Product is out of stock' });
      return;
    }

    const now = Date.now();

    transaction(() => {
      // Check if item already in cart
      let existing: any = null;
      if (variantId) {
        existing = queryOne<any>(
          'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_id = ?;',
          [cartId, product.id, variantId]
        );
      } else {
        existing = queryOne<any>(
          'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND (variant_id IS NULL OR variant_id = "");',
          [cartId, product.id]
        );
      }

      if (existing) {
        run('UPDATE cart_items SET quantity = quantity + ?, updated_at = ? WHERE id = ?;', [qty, now, existing.id]);
      } else {
        const itemId = `ci_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        run(
          'INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
          [itemId, cartId, product.id, variantId || null, qty, now, now]
        );
      }
    });

    const cartData = getAuthoritativeCartData(cartId);
    res.json({
      success: true,
      message: `${product.name} added to cart!`,
      cart: cartData,
      lastAddedName: product.name
    });
  } catch (err: any) {
    console.error('Error adding to cart:', err);
    res.status(500).json({ success: false, error: 'Failed to add item to cart' });
  }
});

// Update Cart Item Quantity
router.put('/cart/items/:id', authenticateOptional, (req: AuthenticatedRequest, res: Response) => {
  try {
    const itemId = req.params.id;
    const quantity = Math.max(1, parseInt(req.body.quantity) || 1);
    const cartId = getCartId(req, res);

    // Verify item belongs to this cart
    const item = queryOne('SELECT id FROM cart_items WHERE id = ? AND cart_id = ?;', [itemId, cartId]);
    if (!item) {
      res.status(404).json({ success: false, error: 'Cart item not found' });
      return;
    }

    run('UPDATE cart_items SET quantity = ?, updated_at = ? WHERE id = ?;', [quantity, Date.now(), itemId]);
    const cartData = getAuthoritativeCartData(cartId);
    res.json({ success: true, message: 'Quantity updated', cart: cartData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update quantity' });
  }
});

// Remove Cart Item
router.delete('/cart/items/:id', authenticateOptional, (req: AuthenticatedRequest, res: Response) => {
  try {
    const itemId = req.params.id;
    const cartId = getCartId(req, res);
    run('DELETE FROM cart_items WHERE id = ? AND cart_id = ?;', [itemId, cartId]);
    const cartData = getAuthoritativeCartData(cartId);
    res.json({ success: true, message: 'Item removed from cart', cart: cartData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to remove item' });
  }
});

// Clear Entire Cart
router.delete('/cart', authenticateOptional, (req: AuthenticatedRequest, res: Response) => {
  try {
    const cartId = getCartId(req, res);
    run('DELETE FROM cart_items WHERE cart_id = ?;', [cartId]);
    const cartData = getAuthoritativeCartData(cartId);
    res.json({ success: true, message: 'Cart cleared', cart: cartData });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to clear cart' });
  }
});

// ==================== WISHLIST (Strict IDOR & Per-User) ====================
router.get('/wishlist', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const items = query(`
      SELECT 
        p.id, p.name, p.slug, p.sku, p.price, p.sale_price, p.stock_quantity,
        p.warranty_months, p.voltage, p.ah_capacity, b.name as brand_name,
        (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC LIMIT 1) as image_url
      FROM wishlist_items wi
      JOIN wishlists w ON wi.wishlist_id = w.id
      JOIN products p ON wi.product_id = p.id
      JOIN brands b ON p.brand_id = b.id
      WHERE w.user_id = ?
      ORDER BY wi.created_at DESC;
    `, [userId]);

    res.json({ success: true, items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve wishlist' });
  }
});

router.post('/wishlist/toggle', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId } = req.body;
    const userId = req.user!.id;
    const now = Date.now();

    let wishlist = queryOne<{ id: string }>('SELECT id FROM wishlists WHERE user_id = ?;', [userId]);
    if (!wishlist) {
      const wid = `wl_${userId}`;
      run('INSERT INTO wishlists (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?);', [wid, userId, now, now]);
      wishlist = { id: wid };
    }

    const existing = queryOne('SELECT id FROM wishlist_items WHERE wishlist_id = ? AND product_id = ?;', [wishlist.id, productId]);

    if (existing) {
      run('DELETE FROM wishlist_items WHERE wishlist_id = ? AND product_id = ?;', [wishlist.id, productId]);
      res.json({ success: true, added: false, message: 'Removed from wishlist' });
    } else {
      const itemId = `wi_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      run('INSERT INTO wishlist_items (id, wishlist_id, product_id, created_at) VALUES (?, ?, ?, ?);', [itemId, wishlist.id, productId, now]);
      res.json({ success: true, added: true, message: 'Added to wishlist' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update wishlist' });
  }
});

// ==================== COMPARISON ====================
router.get('/compare', (req: Request, res: Response) => {
  try {
    const productIds = req.query.ids?.toString().split(',').filter(Boolean) || [];
    if (productIds.length === 0) {
      res.json({ success: true, products: [] });
      return;
    }

    const placeholders = productIds.map(() => '?').join(',');
    const products = query(`
      SELECT 
        p.*,
        b.name as brand_name,
        c.name as category_name,
        (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC LIMIT 1) as primary_image
      FROM products p
      JOIN brands b ON p.brand_id = b.id
      JOIN categories c ON p.category_id = c.id
      WHERE p.id IN (${placeholders});
    `, productIds).map((p: any) => ({
      ...p,
      features: p.features ? JSON.parse(p.features) : []
    }));

    res.json({ success: true, products });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve comparison' });
  }
});

export default router;
