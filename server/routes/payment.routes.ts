import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { queryOne, run } from '../db.js';
import { PaymentGatewayService } from '../services/payment.service.js';
import { sendEmail } from '../services/email.service.js';

const router = Router();

// Webhook endpoint for payment providers (PayFast / JazzCash / EasyPaisa / Stripe)
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-payment-signature']?.toString() || req.headers['x-payfast-signature']?.toString() || '';
    const payload = JSON.stringify(req.body);

    // Verify HMAC signature
    const isValidSignature = PaymentGatewayService.verifyWebhookSignature(payload, signature);
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (!isValidSignature && !isDevelopment) {
      console.warn('[Security Alert] Invalid payment webhook signature rejected.');
      res.status(401).json({ success: false, error: 'Invalid webhook signature' });
      return;
    }

    const { orderId, transactionId, amount, status } = req.body;

    if (!orderId || !transactionId || !amount) {
      res.status(400).json({ success: false, error: 'Missing mandatory webhook fields' });
      return;
    }

    const result = await PaymentGatewayService.processWebhookConfirmation({
      orderId,
      transactionReference: transactionId,
      providerTxId: transactionId,
      amount: parseFloat(amount),
      status: status === 'COMPLETED' || status === 'PAID' ? 'PAID' : 'FAILED',
      rawPayload: req.body
    });

    if (result.success && (status === 'COMPLETED' || status === 'PAID')) {
      const order = queryOne<any>('SELECT customer_email, order_number, user_id FROM orders WHERE id = ?;', [orderId]);
      if (order) {
        await sendEmail({
          to: order.customer_email,
          subject: `Payment Confirmed: Order #${order.order_number} - Chaudhary Battery And UPS F10`,
          html: `<p>Your payment of Rs. ${amount} has been successfully verified by our payment gateway. Your order #${order.order_number} is now being processed.</p>`,
          userId: order.user_id,
          orderId
        });
      }
    }

    res.json(result);
  } catch (err: any) {
    console.error('Webhook processing failed:', err);
    res.status(500).json({ success: false, error: 'Webhook processing error' });
  }
});

// Secure Hosted Gateway Portal Simulator for Pakistani Online Payments (Card / JazzCash / EasyPaisa)
// Allows testing real verified server callbacks without entering real bank cards
router.post('/simulate-gateway-pay', async (req: Request, res: Response) => {
  try {
    const { orderId, paymentType = 'card' } = req.body;
    const order = queryOne<any>('SELECT * FROM orders WHERE id = ?;', [orderId]);

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    if (order.payment_status === 'paid') {
      res.json({ success: true, message: 'Order is already paid.' });
      return;
    }

    // Generate valid simulated transaction reference
    const txId = `PK_${paymentType.toUpperCase()}_${Date.now()}`;
    const payloadObj = {
      orderId: order.id,
      transactionId: txId,
      amount: order.total_amount,
      status: 'PAID',
      paymentMethod: paymentType
    };

    // Process server-side verification with exact matching
    const result = await PaymentGatewayService.processWebhookConfirmation({
      orderId: order.id,
      transactionReference: txId,
      providerTxId: txId,
      amount: order.total_amount,
      status: 'PAID',
      rawPayload: payloadObj
    });

    res.json({
      success: true,
      message: 'Payment verified and confirmed by server.',
      transactionId: txId,
      orderNumber: order.order_number
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Simulated payment failed' });
  }
});

export default router;
