import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { query, queryOne, run, transaction, withLock } from '../db.js';
import {
  authenticateOptional,
  requireAuth,
  requireAdmin,
  AuthenticatedRequest,
  logAuditAction,
  createRateLimiter
} from '../middleware/auth.middleware.js';
import { PaymentGatewayService } from '../services/payment.service.js';
import { sendEmail, generateOrderConfirmationEmail } from '../services/email.service.js';

const router = Router();

// Rate limiter for checkout submissions
const checkoutLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxAttempts: 5,
  message: 'Multiple checkout attempts detected. Please wait 1 minute.'
});

const checkoutSchema = z.object({
  customerName: z.string().min(2, 'Name is required').max(100),
  customerEmail: z.string().email('Valid email required').toLowerCase().trim(),
  customerPhone: z.string().min(10, 'Valid Pakistani phone number required').max(20),
  shippingAddress: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(10),
    addressLine1: z.string().min(5),
    addressLine2: z.string().optional(),
    city: z.string().min(2),
    province: z.string().min(2),
    postalCode: z.string().optional()
  }),
  billingAddress: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(10),
    addressLine1: z.string().min(5),
    addressLine2: z.string().optional(),
    city: z.string().min(2),
    province: z.string().min(2),
    postalCode: z.string().optional()
  }).optional(),
  billingSameAsShipping: z.boolean().default(true),
  shippingMethodId: z.string().optional(),
  paymentMethod: z.enum(['cod', 'payfast', 'card', 'jazzcash', 'easypaisa', 'bank_transfer']),
  transactionReference: z.string().optional(),
  bankDetails: z.object({
    senderBank: z.string().optional(),
    senderAccountTitle: z.string().optional(),
    transactionReference: z.string().optional()
  }).optional(),
  couponCode: z.string().optional(),
  shippingNotes: z.string().max(500).optional(),
  oldBatteryTradeIn: z.boolean().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().optional(),
    quantity: z.number().int().min(1).max(50)
  })).min(1, 'Cart cannot be empty')
});

// Create Order / Checkout
router.post('/checkout', authenticateOptional, checkoutLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = checkoutSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ success: false, error: parse.error.issues[0]?.message || 'Invalid checkout payload' });
      return;
    }

    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      billingAddress,
      billingSameAsShipping,
      paymentMethod,
      transactionReference,
      couponCode,
      shippingNotes,
      oldBatteryTradeIn,
      items: clientItems
    } = parse.data;

    // Enforce that order can ONLY be placed if the user has an account
    let userId = req.user?.id || null;
    if (!userId) {
      const existing = queryOne<any>('SELECT id, email, first_name, last_name, role FROM users WHERE email = ?;', [customerEmail.toLowerCase().trim()]);
      if (existing) {
        userId = existing.id;
      } else {
        res.status(401).json({
          success: false,
          requireAccount: true,
          error: 'An account is required to place an order. Please create an account or sign in to proceed.'
        });
        return;
      }
    }

    // Concurrency Lock: Prevent simultaneous stock depletion race conditions (Section 74)
    const orderResult = await withLock(async () => {
      // 1. Authoritative price retrieval and stock validation from database
      let subtotal = 0;
      const verifiedItems: any[] = [];

      for (const item of clientItems) {
        const product = queryOne<any>(
          'SELECT id, name, sku, price, sale_price, stock_quantity, warranty_months, voltage, ah_capacity FROM products WHERE id = ? AND status = "published";',
          [item.productId]
        );

        if (!product) {
          throw new Error(`Product is no longer available.`);
        }

        let unitPrice = product.sale_price && product.sale_price > 0 ? product.sale_price : product.price;
        let sku = product.sku;
        let title = product.name;
        let stock = product.stock_quantity;
        let ahCapacity = product.ah_capacity;

        if (item.variantId) {
          const variant = queryOne<any>(
            'SELECT id, sku, title, price, sale_price, stock_quantity, ah_capacity FROM product_variants WHERE id = ? AND product_id = ?;',
            [item.variantId, item.productId]
          );
          if (!variant) {
            throw new Error(`Product variant is unavailable.`);
          }
          unitPrice = variant.sale_price && variant.sale_price > 0 ? variant.sale_price : variant.price;
          sku = variant.sku;
          title = `${product.name} - ${variant.title}`;
          stock = variant.stock_quantity;
          if (variant.ah_capacity) ahCapacity = variant.ah_capacity;
        }

        // Validate stock
        if (stock < item.quantity) {
          throw new Error(`Insufficient stock for "${title}". Only ${stock} left.`);
        }

        // Image snapshot
        const primaryImg = queryOne<any>(
          'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY is_primary DESC LIMIT 1;',
          [item.productId]
        );

        const itemSubtotal = unitPrice * item.quantity;
        subtotal += itemSubtotal;

        verifiedItems.push({
          productId: item.productId,
          variantId: item.variantId || null,
          title,
          sku,
          voltage: product.voltage,
          ahCapacity,
          warrantyMonths: product.warranty_months,
          unitPrice,
          quantity: item.quantity,
          subtotalPrice: itemSubtotal,
          imageUrl: primaryImg?.image_url || ''
        });
      }

      // 2. Shipping calculation based on city
      let shippingAmount = 0;
      const city = shippingAddress.city.toLowerCase();
      const isIslamabad = city.includes('islamabad') || city.includes('f-10') || city.includes('f-11') || city.includes('g-10') || city.includes('g-11') || city.includes('e-11');
      const isRawalpindi = city.includes('rawalpindi') || city.includes('rwp');

      if (isIslamabad) {
        shippingAmount = 0; // Free in Islamabad
      } else if (isRawalpindi) {
        shippingAmount = subtotal >= 30000 ? 0 : 500;
      } else {
        shippingAmount = subtotal >= 100000 ? 0 : 1500;
      }

      // 3. Coupon calculation (server-authoritative)
      let discountAmount = 0;
      let appliedCoupon: any = null;

      if (couponCode) {
        const coupon = queryOne<any>(
          'SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1;',
          [couponCode.trim()]
        );

        if (coupon) {
          const now = Date.now();
          if (now >= coupon.start_date && now <= coupon.end_date) {
            if (subtotal >= coupon.min_order_amount) {
              if (coupon.discount_type === 'percentage') {
                discountAmount = (subtotal * coupon.discount_value) / 100;
                if (coupon.max_discount && discountAmount > coupon.max_discount) {
                  discountAmount = coupon.max_discount;
                }
              } else {
                discountAmount = coupon.discount_value;
              }
              appliedCoupon = coupon;
            }
          }
        }
      }

      // 4. Old battery scrap trade-in rebate (Optional Pakistani market feature)
      if (oldBatteryTradeIn) {
        discountAmount += 500;
      }

      // Final calculations
      const taxAmount = 0; // Inclusive for automotive lead-acid in retail
      const grandTotal = Math.max(0, subtotal + shippingAmount + taxAmount - discountAmount);

      const orderId = `ord_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const now = Date.now();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `CBF10-${new Date().getFullYear()}-${randomSuffix}`;
      
      // Auto-generate Courier Tracking ID for every new order
      const trackingNumber = `TRK-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      // Format Client Bank / Payment Details
      let formattedTxRef = transactionReference || '';
      const bankDet = (req.body as any).bankDetails;
      if (bankDet) {
        const parts: string[] = [];
        if (bankDet.senderBank) parts.push(`Bank/Provider: ${bankDet.senderBank}`);
        if (bankDet.senderAccountTitle) parts.push(`Account Title: ${bankDet.senderAccountTitle}`);
        if (bankDet.transactionReference) parts.push(`Ref/TRX: ${bankDet.transactionReference}`);
        if (parts.length > 0) formattedTxRef = parts.join(' | ');
      }
      if (!formattedTxRef) {
        if (paymentMethod === 'cod') {
          formattedTxRef = 'Cash on Delivery (Pay cash directly to technician upon installation)';
        } else {
          formattedTxRef = `${paymentMethod.toUpperCase()} Online Payment`;
        }
      }

      const initialPaymentStatus = (paymentMethod === 'card' || paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa') ? 'paid' : 'pending';
      const initialOrderStatus = initialPaymentStatus === 'paid' ? 'processing' : 'pending';

      // Ensure transaction_reference column exists
      try { run('ALTER TABLE orders ADD COLUMN transaction_reference TEXT;'); } catch (_) {}

      // Database Transaction for Atomicity (Section 72)
      return transaction(() => {
        // Insert order with auto-generated tracking number and client bank details
        run(
          `INSERT INTO orders (
            id, order_number, user_id, customer_name, customer_email, customer_phone,
            subtotal, discount, shipping_amount, tax_amount, total_amount, coupon_code,
            payment_method, payment_status, order_status, shipping_notes, tracking_number, transaction_reference, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            orderId, orderNumber, userId, customerName, customerEmail, customerPhone,
            subtotal, discountAmount, shippingAmount, taxAmount, grandTotal, appliedCoupon ? appliedCoupon.code : null,
            paymentMethod, initialPaymentStatus, initialOrderStatus, shippingNotes || '', trackingNumber, formattedTxRef, now, now
          ]
        );

        // Record in Payments Table
        const payId = `pay_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        run(
          `INSERT INTO payments (id, order_id, amount, currency, provider, payment_method, status, transaction_reference, raw_response, created_at, updated_at)
           VALUES (?, ?, ?, 'PKR', ?, ?, ?, ?, ?, ?, ?);`,
          [payId, orderId, grandTotal, paymentMethod, paymentMethod, initialPaymentStatus, formattedTxRef, JSON.stringify(bankDet || {}), now, now]
        );

        // Deduct inventory & record order items snapshot
        for (const it of verifiedItems) {
          const orderItemId = `oi_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
          run(
            `INSERT INTO order_items (
              id, order_id, product_id, variant_id, product_title, sku, ah_capacity,
              voltage, warranty_months, unit_price, quantity, subtotal_price, product_image, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              orderItemId, orderId, it.productId, it.variantId, it.title, it.sku,
              it.ahCapacity, it.voltage, it.warrantyMonths, it.unitPrice, it.quantity,
              it.subtotalPrice, it.imageUrl, now
            ]
          );

          // Update stock safely
          if (it.variantId) {
            run('UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ?;', [it.quantity, it.variantId]);
          }
          run('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?;', [it.quantity, it.productId]);
          run('UPDATE inventory SET current_stock = current_stock - ?, updated_at = ? WHERE product_id = ?;', [it.quantity, now, it.productId]);

          // Inventory transaction log
          run(
            `INSERT INTO inventory_transactions (id, product_id, variant_id, quantity_before, quantity_changed, quantity_after, reason, created_at)
             VALUES (?, ?, ?, 0, ?, 0, ?, ?);`,
            [`itx_${now}_${crypto.randomBytes(3).toString('hex')}`, it.productId, it.variantId, -it.quantity, `Order placed: #${orderNumber}`, now]
          );
        }

        // Insert addresses
        run(
          `INSERT INTO order_addresses (id, order_id, type, full_name, phone, address_line1, address_line2, city, province, postal_code, created_at)
           VALUES (?, ?, 'shipping', ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            `oa_ship_${orderId}`, orderId, shippingAddress.fullName, shippingAddress.phone,
            shippingAddress.addressLine1, shippingAddress.addressLine2 || '', shippingAddress.city,
            shippingAddress.province, shippingAddress.postalCode || '', now
          ]
        );

        const bill = billingSameAsShipping || !billingAddress ? shippingAddress : billingAddress;
        run(
          `INSERT INTO order_addresses (id, order_id, type, full_name, phone, address_line1, address_line2, city, province, postal_code, created_at)
           VALUES (?, ?, 'billing', ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            `oa_bill_${orderId}`, orderId, bill.fullName, bill.phone,
            bill.addressLine1, bill.addressLine2 || '', bill.city,
            bill.province, bill.postalCode || '', now
          ]
        );

        // Record coupon usage
        if (appliedCoupon) {
          run('UPDATE coupons SET times_used = times_used + 1 WHERE id = ?;', [appliedCoupon.id]);
          run(
            'INSERT INTO coupon_usages (id, coupon_id, user_id, order_id, created_at) VALUES (?, ?, ?, ?, ?);',
            [`cpu_${now}_${crypto.randomBytes(3).toString('hex')}`, appliedCoupon.id, userId, orderId, now]
          );
        }

        // Timeline status history
        run(
          `INSERT INTO order_status_history (id, order_id, status, notes, changed_by, created_at)
           VALUES (?, ?, 'pending', 'Order placed by customer', 'customer', ?);`,
          [`osh_${now}_${crypto.randomBytes(3).toString('hex')}`, orderId, now]
        );

        // Clear user cart
        if (userId) {
          const userCart = queryOne<any>('SELECT id FROM carts WHERE user_id = ?;', [userId]);
          if (userCart) {
            run('DELETE FROM cart_items WHERE cart_id = ?;', [userCart.id]);
          }
        }

        return {
          orderId,
          orderNumber,
          trackingNumber,
          totalAmount: grandTotal,
          items: verifiedItems,
          order: {
            id: orderId,
            order_number: orderNumber,
            tracking_number: trackingNumber,
            transaction_reference: formattedTxRef,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            subtotal,
            discount: discountAmount,
            shipping_amount: shippingAmount,
            tax_amount: taxAmount,
            total_amount: grandTotal,
            payment_method: paymentMethod,
            payment_status: initialPaymentStatus
          }
        };
      });
    });

    // Process payment abstraction layer
    const paymentResult = await PaymentGatewayService.createPaymentTransaction({
      id: orderResult.orderId,
      orderNumber: orderResult.orderNumber,
      totalAmount: orderResult.totalAmount,
      paymentMethod,
      customerEmail,
      customerPhone
    });

    // Send confirmation email
    const { subject, html } = generateOrderConfirmationEmail(orderResult.order, orderResult.items);
    await sendEmail({
      to: customerEmail,
      subject,
      html,
      userId: userId || undefined,
      orderId: orderResult.orderId
    });

    res.status(201).json({
      success: true,
      orderId: orderResult.orderId,
      orderNumber: orderResult.orderNumber,
      paymentResult,
      message: 'Order created successfully.'
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Checkout failed' });
  }
});

// Get User Orders (Protected with IDOR validation)
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const userId = req.user!.id;
    const userEmail = (req.user!.email || '').toLowerCase().trim();
    const rawOrders = query(
      `SELECT o.*,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as total_items
       FROM orders o
       WHERE o.user_id = ? OR LOWER(o.customer_email) = ?
       ORDER BY o.created_at DESC;`,
      [userId, userEmail]
    );

    const orders = rawOrders.map(o => {
      const items = query('SELECT * FROM order_items WHERE order_id = ?;', [o.id]);
      const shippingAddress = queryOne('SELECT * FROM order_addresses WHERE order_id = ? AND type = "shipping";', [o.id]);
      return {
        ...o,
        items,
        shippingAddress
      };
    });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve orders' });
  }
});

// Single Order Details with IDOR Check (Section 50)
router.get('/:idOrNumber', authenticateOptional, (req: AuthenticatedRequest, res: Response) => {
  try {
    const param = req.params.idOrNumber;
    const order = queryOne<any>(
      'SELECT * FROM orders WHERE id = ? OR order_number = ?;',
      [param, param]
    );

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    // IDOR verification: If user is authenticated and order has user_id, check ownership
    const isOwner = req.user && req.user.id === order.user_id;
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');
    
    // For guest order tracking, user must match order number / phone lookup
    if (order.user_id && !isOwner && !isAdmin) {
      res.status(403).json({ success: false, error: 'Unauthorized: You do not have permission to view this order' });
      return;
    }

    const items = query('SELECT * FROM order_items WHERE order_id = ?;', [order.id]);
    const addresses = query('SELECT * FROM order_addresses WHERE order_id = ?;', [order.id]);
    const timeline = query('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC;', [order.id]);
    const payment = queryOne('SELECT * FROM payments WHERE order_id = ?;', [order.id]);

    res.json({
      success: true,
      order: {
        ...order,
        items,
        shippingAddress: addresses.find((a: any) => a.type === 'shipping'),
        billingAddress: addresses.find((a: any) => a.type === 'billing'),
        timeline,
        payment
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch order details' });
  }
});

// Customer Public Order Tracking (by Order Number OR Tracking Number + optional Phone/Email)
router.post('/track', (req: Request, res: Response) => {
  try {
    const { orderNumber, trackingNumber, phoneOrEmail } = req.body;
    const identifier = (orderNumber || trackingNumber || '').toString().trim();

    if (!identifier) {
      res.status(400).json({ success: false, error: 'Please enter your Order Number (e.g. CBF10-2026-XXXX) or Tracking ID.' });
      return;
    }

    let order: any = null;
    const cleanInput = (phoneOrEmail || '').toString().trim().toLowerCase();

    if (cleanInput) {
      order = queryOne<any>(
        `SELECT id, order_number, customer_name, customer_email, customer_phone, total_amount, payment_status, order_status, tracking_number, shipping_notes, created_at, updated_at
         FROM orders
         WHERE (UPPER(order_number) = UPPER(?) OR UPPER(tracking_number) = UPPER(?))
           AND (LOWER(customer_email) = ? OR customer_phone LIKE ?);`,
        [identifier, identifier, cleanInput, `%${cleanInput.replace(/\D/g, '')}%`]
      );
    } else {
      order = queryOne<any>(
        `SELECT id, order_number, customer_name, customer_email, customer_phone, total_amount, payment_status, order_status, tracking_number, shipping_notes, created_at, updated_at
         FROM orders
         WHERE UPPER(order_number) = UPPER(?) OR UPPER(tracking_number) = UPPER(?);`,
        [identifier, identifier]
      );
    }

    if (!order) {
      res.status(404).json({ success: false, error: `No active order found with identifier "${identifier}". Please check your order number or tracking ID.` });
      return;
    }

    const timeline = query('SELECT status, notes, created_at FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC;', [order.id]);
    const items = query('SELECT product_title, sku, ah_capacity, quantity, unit_price, subtotal_price, product_image FROM order_items WHERE order_id = ?;', [order.id]);
    const shippingAddress = queryOne('SELECT full_name, phone, address_line1, address_line2, city, province FROM order_addresses WHERE order_id = ? AND type = "shipping";', [order.id]);

    res.json({
      success: true,
      tracking: {
        ...order,
        items,
        shippingAddress,
        timeline
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Order tracking failed' });
  }
});

router.get('/track/:identifier', (req: Request, res: Response) => {
  try {
    const identifier = req.params.identifier.trim();
    const order = queryOne<any>(
      `SELECT id, order_number, customer_name, customer_email, customer_phone, total_amount, payment_status, order_status, tracking_number, shipping_notes, created_at, updated_at
       FROM orders
       WHERE UPPER(order_number) = UPPER(?) OR UPPER(tracking_number) = UPPER(?);`,
      [identifier, identifier]
    );

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const timeline = query('SELECT status, notes, created_at FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC;', [order.id]);
    const items = query('SELECT product_title, sku, ah_capacity, quantity, unit_price, subtotal_price, product_image FROM order_items WHERE order_id = ?;', [order.id]);
    const shippingAddress = queryOne('SELECT full_name, phone, address_line1, address_line2, city, province FROM order_addresses WHERE order_id = ? AND type = "shipping";', [order.id]);

    res.json({
      success: true,
      tracking: {
        ...order,
        items,
        shippingAddress,
        timeline
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Order tracking failed' });
  }
});

export default router;
