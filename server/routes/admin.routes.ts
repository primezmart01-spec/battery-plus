import { Router, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run, transaction } from '../db.js';
import { requireAdmin, AuthenticatedRequest, logAuditAction } from '../middleware/auth.middleware.js';
import { sendEmail } from '../services/email.service.js';

const router = Router();

// Require admin for all routes in this file
router.use(requireAdmin);

// Dashboard Statistics & Analytics
router.get('/dashboard', (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = Date.now();
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    // Sales metrics
    const totalSalesRow = queryOne<any>('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = "paid";');
    const todaySalesRow = queryOne<any>('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = "paid" AND created_at >= ?;', [startOfToday]);
    const monthSalesRow = queryOne<any>('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = "paid" AND created_at >= ?;', [startOfMonth]);

    // Orders metrics
    const totalOrdersRow = queryOne<any>('SELECT COUNT(*) as count FROM orders;');
    const pendingOrdersRow = queryOne<any>('SELECT COUNT(*) as count FROM orders WHERE order_status = "pending";');
    const processingOrdersRow = queryOne<any>('SELECT COUNT(*) as count FROM orders WHERE order_status = "processing" OR order_status = "confirmed";');
    const completedOrdersRow = queryOne<any>('SELECT COUNT(*) as count FROM orders WHERE order_status = "delivered";');
    const cancelledOrdersRow = queryOne<any>('SELECT COUNT(*) as count FROM orders WHERE order_status = "cancelled";');

    // Customers metrics
    const totalCustomersRow = queryOne<any>('SELECT COUNT(*) as count FROM users WHERE role = "customer";');

    // Inventory alerts
    const lowStockRow = queryOne<any>('SELECT COUNT(*) as count FROM products WHERE stock_quantity <= low_stock_threshold AND stock_quantity > 0;');
    const outOfStockRow = queryOne<any>('SELECT COUNT(*) as count FROM products WHERE stock_quantity <= 0;');

    // Recent orders
    const recentOrders = query(`
      SELECT id, order_number, customer_name, customer_email, total_amount, payment_method, payment_status, order_status, created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 6;
    `);

    // Top selling brands
    const topBrands = query(`
      SELECT b.name, COUNT(oi.id) as units_sold, COALESCE(SUM(oi.subtotal_price), 0) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN brands b ON p.brand_id = b.id
      GROUP BY b.id
      ORDER BY revenue DESC
      LIMIT 5;
    `);

    // Top products
    const topProducts = query(`
      SELECT p.id, p.name, p.sku, b.name as brand_name, COUNT(oi.id) as times_ordered, SUM(oi.quantity) as total_qty
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN brands b ON p.brand_id = b.id
      GROUP BY p.id
      ORDER BY total_qty DESC
      LIMIT 5;
    `);

    // Simulated 7-day sales breakdown
    const salesChart = [
      { day: 'Mon', revenue: 142000, orders: 7 },
      { day: 'Tue', revenue: 185000, orders: 9 },
      { day: 'Wed', revenue: 120000, orders: 6 },
      { day: 'Thu', revenue: 215000, orders: 11 },
      { day: 'Fri', revenue: 260000, orders: 14 },
      { day: 'Sat', revenue: 310000, orders: 16 },
      { day: 'Sun', revenue: 195000, orders: 10 }
    ];

    res.json({
      success: true,
      stats: {
        totalRevenue: totalSalesRow?.total || 0,
        todayRevenue: todaySalesRow?.total || 0,
        monthRevenue: monthSalesRow?.total || 0,
        totalOrders: totalOrdersRow?.count || 0,
        pendingOrders: pendingOrdersRow?.count || 0,
        processingOrders: processingOrdersRow?.count || 0,
        completedOrders: completedOrdersRow?.count || 0,
        cancelledOrders: cancelledOrdersRow?.count || 0,
        totalCustomers: totalCustomersRow?.count || 0,
        lowStockCount: lowStockRow?.count || 0,
        outOfStockCount: outOfStockRow?.count || 0
      },
      recentOrders,
      topBrands,
      topProducts,
      salesChart
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Dashboard error' });
  }
});

// Orders Management
router.get('/orders', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, paymentStatus, search, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];

    if (status && status !== 'all') {
      conditions.push('order_status = ?');
      params.push(status);
    }

    if (paymentStatus && paymentStatus !== 'all') {
      conditions.push('payment_status = ?');
      params.push(paymentStatus);
    }

    if (search) {
      const term = `%${search.toString().trim().toLowerCase()}%`;
      conditions.push('(LOWER(order_number) LIKE ? OR LOWER(customer_name) LIKE ? OR LOWER(customer_email) LIKE ? OR customer_phone LIKE ?)');
      params.push(term, term, term, term);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const totalCount = queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM orders ${where};`, params)?.count || 0;

    const orders = query(
      `SELECT *,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = orders.id) as item_count
       FROM orders
       ${where}
       ORDER BY created_at DESC
       LIMIT ${limitNum} OFFSET ${offset};`,
      params
    );

    const detailedOrders = orders.map((o: any) => {
      const items = query('SELECT * FROM order_items WHERE order_id = ?;', [o.id]);
      const addresses = query('SELECT * FROM order_addresses WHERE order_id = ?;', [o.id]);
      const timeline = query('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC;', [o.id]);
      const payment = queryOne('SELECT * FROM payments WHERE order_id = ?;', [o.id]);

      return {
        ...o,
        items,
        shipping_address: addresses.find((a: any) => a.type === 'shipping') || null,
        billing_address: addresses.find((a: any) => a.type === 'billing') || null,
        shippingAddress: addresses.find((a: any) => a.type === 'shipping') || null,
        billingAddress: addresses.find((a: any) => a.type === 'billing') || null,
        timeline,
        payment
      };
    });

    res.json({
      success: true,
      orders: detailedOrders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// Update Order Status / Tracking Number / Notes
router.put('/orders/:id/status', (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const { orderStatus, paymentStatus, trackingNumber, notes } = req.body;
    const order = queryOne<any>('SELECT * FROM orders WHERE id = ?;', [orderId]);

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const now = Date.now();
    const newOrderStatus = orderStatus && orderStatus.trim() ? orderStatus.trim() : order.order_status;
    const newPaymentStatus = paymentStatus && paymentStatus.trim() ? paymentStatus.trim() : order.payment_status;
    const newTrackingNumber = trackingNumber !== undefined && trackingNumber !== null ? trackingNumber.trim() : order.tracking_number;

    transaction(() => {
      run(
        `UPDATE orders SET
          order_status = ?,
          payment_status = ?,
          tracking_number = ?,
          updated_at = ?
         WHERE id = ?;`,
        [newOrderStatus, newPaymentStatus, newTrackingNumber, now, orderId]
      );

      // Record in order status timeline
      const noteText = notes || `Status updated to ${newOrderStatus}${newTrackingNumber ? ` (Tracking: ${newTrackingNumber})` : ''}`;
      run(
        `INSERT INTO order_status_history (id, order_id, status, notes, changed_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [`osh_${now}_${Math.random().toString(36).substring(2, 6)}`, orderId, newOrderStatus, noteText, req.user?.email || 'admin', now]
      );

      // Create notification for user if applicable
      if (order.user_id) {
        run(
          `INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
           VALUES (?, ?, 'order', ?, ?, ?, 0, ?);`,
          [
            `notif_${now}_${Math.random().toString(36).substring(2, 6)}`,
            order.user_id,
            `Order #${order.order_number} Updated`,
            `Your order #${order.order_number} status has been updated to ${newOrderStatus.toUpperCase()}.${newTrackingNumber ? ` Tracking ID: ${newTrackingNumber}` : ''}`,
            `/account`,
            now
          ]
        );
      }
    });

    logAuditAction(req.adminId, req.user?.email, 'update_order_status', 'order', orderId, req.ip || 'unknown', `Order #${order.order_number} status changed to ${orderStatus || order.order_status}`);

    // If order was marked shipped or delivered, send transactional update
    if (orderStatus && orderStatus !== order.order_status) {
      sendEmail({
        to: order.customer_email,
        subject: `Order Update #${order.order_number}: ${orderStatus.toUpperCase()}`,
        html: `<p>Your order #${order.order_number} has been updated to <strong>${orderStatus.toUpperCase()}</strong>.<br/>${trackingNumber ? `Tracking Reference: <strong>${trackingNumber}</strong>` : ''}</p>`,
        userId: order.user_id,
        orderId
      }).catch(console.error);
    }

    res.json({ success: true, message: 'Order updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update order' });
  }
});

// Inventory Management
router.get('/inventory', (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = query(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.battery_type,
        p.ah_capacity,
        p.voltage,
        p.stock_quantity as current_stock,
        p.low_stock_threshold,
        b.name as brand_name,
        c.name as category_name
      FROM products p
      JOIN brands b ON p.brand_id = b.id
      JOIN categories c ON p.category_id = c.id
      ORDER BY p.stock_quantity ASC;
    `);

    const logHistory = query(`
      SELECT it.*, p.name as product_name, p.sku
      FROM inventory_transactions it
      JOIN products p ON it.product_id = p.id
      ORDER BY it.created_at DESC
      LIMIT 20;
    `);

    res.json({ success: true, items, logHistory });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch inventory' });
  }
});

// Adjust Inventory
router.post('/inventory/adjust', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, quantityChange, reason } = req.body;
    const delta = parseInt(quantityChange);
    if (isNaN(delta) || delta === 0) {
      res.status(400).json({ success: false, error: 'Valid non-zero quantity change required' });
      return;
    }

    const product = queryOne<any>('SELECT id, name, stock_quantity FROM products WHERE id = ?;', [productId]);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const newStock = Math.max(0, product.stock_quantity + delta);
    const now = Date.now();

    transaction(() => {
      run('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?;', [newStock, now, productId]);
      run('UPDATE inventory SET current_stock = ?, updated_at = ? WHERE product_id = ?;', [newStock, now, productId]);

      run(
        `INSERT INTO inventory_transactions (id, product_id, quantity_before, quantity_changed, quantity_after, reason, admin_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [`itx_${now}_${crypto.randomBytes(3).toString('hex')}`, productId, product.stock_quantity, delta, newStock, reason || 'Manual stock adjustment', req.adminId, now]
      );
    });

    logAuditAction(req.adminId, req.user?.email, 'adjust_inventory', 'product', productId, req.ip || 'unknown', `Adjusted stock for ${product.name} from ${product.stock_quantity} to ${newStock} (${reason})`);

    res.json({ success: true, message: 'Stock adjusted successfully', currentStock: newStock });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to adjust stock' });
  }
});

// Customer Management
router.get('/customers', (req: AuthenticatedRequest, res: Response) => {
  try {
    const customers = query(`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.phone, u.status, u.role, u.created_at,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id OR LOWER(o.customer_email) = LOWER(u.email)) as orders_count,
        COALESCE((SELECT SUM(o.total_amount) FROM orders o WHERE o.user_id = u.id OR LOWER(o.customer_email) = LOWER(u.email)), 0) as total_spent,
        (SELECT MAX(o.created_at) FROM orders o WHERE o.user_id = u.id OR LOWER(o.customer_email) = LOWER(u.email)) as last_order_date
      FROM users u
      ORDER BY u.created_at DESC;
    `);

    res.json({ success: true, customers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch customers' });
  }
});

// Toggle Customer Status
router.put('/customers/:id/status', (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.params.id;
    const { status } = req.body;
    if (!['active', 'disabled'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid status' });
      return;
    }

    run('UPDATE users SET status = ?, updated_at = ? WHERE id = ?;', [status, Date.now(), customerId]);
    logAuditAction(req.adminId, req.user?.email, 'toggle_customer_status', 'user', customerId, req.ip || 'unknown', `Set customer status to ${status}`);

    res.json({ success: true, message: `Customer account ${status}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update customer status' });
  }
});

// Coupons Management
router.get('/coupons', (req: AuthenticatedRequest, res: Response) => {
  const coupons = query('SELECT * FROM coupons ORDER BY created_at DESC;');
  res.json({ success: true, coupons });
});

router.post('/coupons', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, description, discountType, discountValue, minOrderAmount = 0, maxDiscount, usageLimit, startDate, endDate } = req.body;
    const id = `coup_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = Date.now();

    run(
      `INSERT INTO coupons (id, code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, times_used, start_date, end_date, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1, ?, ?);`,
      [
        id, code.toUpperCase().trim(), description || '', discountType, parseFloat(discountValue),
        parseFloat(minOrderAmount), maxDiscount ? parseFloat(maxDiscount) : null,
        usageLimit ? parseInt(usageLimit) : null,
        new Date(startDate).getTime() || now,
        new Date(endDate).getTime() || (now + 30 * 86400000),
        now, now
      ]
    );

    logAuditAction(req.adminId, req.user?.email, 'create_coupon', 'coupon', id, req.ip || 'unknown', `Created coupon: ${code}`);
    res.status(201).json({ success: true, message: 'Coupon created' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create coupon' });
  }
});

router.delete('/coupons/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    run('DELETE FROM coupons WHERE id = ?;', [req.params.id]);
    logAuditAction(req.adminId, req.user?.email, 'delete_coupon', 'coupon', req.params.id, req.ip || 'unknown', `Deleted coupon ${req.params.id}`);
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete coupon' });
  }
});

// Reviews Moderation
router.get('/reviews', (req: AuthenticatedRequest, res: Response) => {
  const reviews = query(`
    SELECT r.*, p.name as product_name, p.slug as product_slug
    FROM reviews r
    JOIN products p ON r.product_id = p.id
    ORDER BY r.created_at DESC;
  `);
  res.json({ success: true, reviews });
});

router.put('/reviews/:id/status', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    run('UPDATE reviews SET status = ?, updated_at = ? WHERE id = ?;', [status, Date.now(), req.params.id]);
    res.json({ success: true, message: `Review ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update review status' });
  }
});

// Audit Logs
router.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  const logs = query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100;');
  res.json({ success: true, logs });
});

// Site Settings
router.get('/settings', (req: AuthenticatedRequest, res: Response) => {
  const settings = query('SELECT * FROM site_settings;');
  const settingsMap: Record<string, string> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }
  res.json({ success: true, settings: settingsMap });
});

router.put('/settings', (req: AuthenticatedRequest, res: Response) => {
  try {
    const updates = req.body;
    const now = Date.now();

    transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          run(
            `INSERT INTO site_settings (id, key, value, group_name, updated_at)
             VALUES (?, ?, ?, 'general', ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
            [`set_${key}`, key, String(value), now]
          );
        }
      }
    });

    logAuditAction(req.adminId, req.user?.email, 'update_settings', 'settings', 'all', req.ip || 'unknown', 'Updated store configuration');
    res.json({ success: true, message: 'Settings saved' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to save settings' });
  }
});

// Order Invoice Data Endpoint
router.get('/orders/:id/invoice', (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const order = queryOne<any>('SELECT * FROM orders WHERE id = ?;', [orderId]);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const items = query('SELECT * FROM order_items WHERE order_id = ?;', [orderId]);
    const addresses = query('SELECT * FROM order_addresses WHERE order_id = ?;', [orderId]);
    const settings = query('SELECT key, value FROM site_settings WHERE group_name = "general";');
    const settingsMap: Record<string, string> = {};
    for (const s of settings) settingsMap[s.key] = s.value;

    res.json({
      success: true,
      invoice: {
        business: {
          name: settingsMap.business_name || 'Chaudhary Battery And UPS F10',
          address: settingsMap.business_address || 'Shop # 14-16, Capital Trade Centre, F-10 Markaz, Islamabad',
          phone: settingsMap.business_phone || '+92 51 2212345',
          whatsapp: settingsMap.business_whatsapp || '+92 300 5551234',
          email: settingsMap.business_email || 'sales@chaudharybattery.pk',
          ntn: 'NTN: 7321094-1 / STRN: 3277876123409'
        },
        order,
        items,
        shippingAddress: addresses.find((a: any) => a.type === 'shipping'),
        billingAddress: addresses.find((a: any) => a.type === 'billing')
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Invoice generation error' });
  }
});

export default router;
