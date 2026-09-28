import crypto from 'crypto';
import { queryOne, run, transaction } from '../db.js';

export interface PaymentIntentResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
  amount: number;
  paymentMethod: string;
  provider: string;
  checkoutUrl?: string;
  transactionReference: string;
  instructions?: string;
  clientBankDetails?: any;
  error?: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  orderId?: string;
  transactionId?: string;
  amount?: number;
  status?: 'PAID' | 'FAILED';
  error?: string;
}

export class PaymentGatewayService {
  private static getWebhookSecret(): string {
    return process.env.PAYMENT_WEBHOOK_SECRET || 'dev_payment_webhook_secret_key_chaudhary_f10';
  }

  // Create payment intent / transaction record
  public static async createPaymentTransaction(order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    paymentMethod: string;
    customerEmail: string;
    customerPhone: string;
    clientBankName?: string;
    clientAccountTitle?: string;
    clientAccountNumber?: string;
    clientTransactionId?: string;
    mobileWalletNumber?: string;
    mobileWalletProvider?: string;
  }): Promise<PaymentIntentResult> {
    const provider = process.env.PAYMENT_PROVIDER || (order.paymentMethod === 'cod' ? 'cod' : order.paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'payfast');
    const txRef = order.clientTransactionId || `TX_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const paymentId = `pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = Date.now();

    const isPaidInstantly = order.paymentMethod === 'card' || order.paymentMethod === 'jazzcash' || order.paymentMethod === 'easypaisa';
    const initialStatus = isPaidInstantly ? 'paid' : 'pending';

    const clientBankDetails = {
      senderBank: order.clientBankName || null,
      accountTitle: order.clientAccountTitle || null,
      accountNumber: order.clientAccountNumber || null,
      transactionRef: order.clientTransactionId || txRef,
      mobileWalletNumber: order.mobileWalletNumber || null,
      mobileWalletProvider: order.mobileWalletProvider || (order.paymentMethod === 'jazzcash' ? 'JazzCash' : order.paymentMethod === 'easypaisa' ? 'EasyPaisa' : null),
      paymentMethodLabel: order.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' :
                          order.paymentMethod === 'bank_transfer' ? 'Direct Bank Transfer (Meezan Bank F-10)' :
                          order.paymentMethod === 'jazzcash' ? 'JazzCash Mobile Account' :
                          order.paymentMethod === 'easypaisa' ? 'EasyPaisa Mobile Account' :
                          order.paymentMethod === 'card' ? 'Debit / Credit Card (1Link / Visa / MasterCard)' : order.paymentMethod
    };

    // Insert payment record
    run(
      `INSERT INTO payments (id, order_id, amount, currency, provider, payment_method, status, transaction_reference, raw_response, created_at, updated_at)
       VALUES (?, ?, ?, 'PKR', ?, ?, ?, ?, ?, ?, ?);`,
      [paymentId, order.id, order.totalAmount, provider, order.paymentMethod, initialStatus, txRef, JSON.stringify(clientBankDetails), now, now]
    );

    // Insert payment transaction log
    run(
      `INSERT INTO payment_transactions (id, payment_id, order_id, amount, provider_tx_id, status, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [`ptx_${now}_${crypto.randomBytes(4).toString('hex')}`, paymentId, order.id, order.totalAmount, txRef, initialStatus, JSON.stringify(clientBankDetails), now]
    );

    if (order.paymentMethod === 'cod') {
      return {
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        paymentMethod: 'cod',
        provider: 'cod',
        transactionReference: txRef,
        clientBankDetails,
        instructions: 'Pay cash upon delivery. Our technician will verify your battery and provide the stamped official warranty card.'
      };
    }

    if (order.paymentMethod === 'bank_transfer') {
      const bankDetails = `Meezan Bank Limited\nTitle: Chaudhary Battery And UPS\nAccount / IBAN: PK42MEZN0000100123456789\nBranch: F-10 Markaz Islamabad\nReference: Order #${order.orderNumber}`;
      return {
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        paymentMethod: 'bank_transfer',
        provider: 'bank_transfer',
        transactionReference: txRef,
        clientBankDetails,
        instructions: bankDetails
      };
    }

    // Mobile Wallets / Cards
    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      provider: provider,
      transactionReference: txRef,
      clientBankDetails
    };
  }

  // Verify HMAC-SHA256 signature for webhooks
  public static verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!signature) return false;
    const hmac = crypto.createHmac('sha256', this.getWebhookSecret());
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  }

  // Handle incoming webhook payment callback
  public static async processWebhookPayload(data: any, rawBody: string, signature: string): Promise<WebhookVerificationResult> {
    const isVerified = this.verifyWebhookSignature(rawBody, signature);
    if (!isVerified) {
      return { isValid: false, error: 'Invalid HMAC signature' };
    }

    const { order_id, transaction_id, status, amount } = data;
    if (!order_id || !status) {
      return { isValid: false, error: 'Missing required webhook fields' };
    }

    const now = Date.now();
    const isPaid = status.toUpperCase() === 'SUCCESS' || status.toUpperCase() === 'PAID';

    return transaction(() => {
      // 1. Update payments table
      run(
        `UPDATE payments
         SET status = ?, transaction_reference = ?, raw_response = ?, updated_at = ?
         WHERE order_id = ?;`,
        [isPaid ? 'paid' : 'failed', transaction_id || 'N/A', JSON.stringify(data), now, order_id]
      );

      // 2. Update orders table
      run(
        `UPDATE orders
         SET payment_status = ?, order_status = ?, updated_at = ?
         WHERE id = ?;`,
        [isPaid ? 'paid' : 'failed', isPaid ? 'processing' : 'pending', now, order_id]
      );

      // 3. Log transaction
      run(
        `INSERT INTO payment_transactions (id, order_id, amount, provider_tx_id, status, payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [`ptx_${now}_${crypto.randomBytes(4).toString('hex')}`, order_id, Number(amount) || 0, transaction_id || 'N/A', isPaid ? 'SUCCESS' : 'FAILED', JSON.stringify(data), now]
      );

      // 4. Order status timeline history
      run(
        `INSERT INTO order_status_history (id, order_id, status, notes, changed_by, created_at)
         VALUES (?, ?, ?, ?, 'payment_gateway', ?);`,
        [
          `osh_${now}_${crypto.randomBytes(3).toString('hex')}`,
          order_id,
          isPaid ? 'processing' : 'pending',
          isPaid ? `Payment received via webhook (Tx: ${transaction_id})` : 'Payment failed on gateway callback',
          now
        ]
      );

      return {
        isValid: true,
        orderId: order_id,
        transactionId: transaction_id,
        amount: Number(amount),
        status: isPaid ? 'PAID' : 'FAILED'
      };
    });
  }

  // Helper specifically to process confirmation webhooks
  public static async processWebhookConfirmation(params: {
    orderId: string;
    transactionReference: string;
    providerTxId: string;
    amount: number;
    status: 'PAID' | 'FAILED';
    rawPayload: any;
  }): Promise<{ success: boolean; message?: string }> {
    const now = Date.now();
    const isPaid = params.status === 'PAID';

    return transaction(() => {
      // 1. Update payments table
      run(
        `UPDATE payments
         SET status = ?, transaction_reference = ?, raw_response = ?, updated_at = ?
         WHERE order_id = ?;`,
        [isPaid ? 'paid' : 'failed', params.transactionReference, JSON.stringify(params.rawPayload), now, params.orderId]
      );

      // 2. Update orders table
      run(
        `UPDATE orders
         SET payment_status = ?, order_status = ?, updated_at = ?
         WHERE id = ?;`,
        [isPaid ? 'paid' : 'failed', isPaid ? 'processing' : 'pending', now, params.orderId]
      );

      // 3. Log transaction
      run(
        `INSERT INTO payment_transactions (id, order_id, amount, provider_tx_id, status, payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [`ptx_${now}_${crypto.randomBytes(4).toString('hex')}`, params.orderId, params.amount, params.providerTxId, isPaid ? 'SUCCESS' : 'FAILED', JSON.stringify(params.rawPayload), now]
      );

      // 4. Order status timeline history
      run(
        `INSERT INTO order_status_history (id, order_id, status, notes, changed_by, created_at)
         VALUES (?, ?, ?, ?, 'payment_gateway_confirmation', ?);`,
        [
          `osh_${now}_${crypto.randomBytes(3).toString('hex')}`,
          params.orderId,
          isPaid ? 'processing' : 'pending',
          isPaid ? `Payment confirmed via hosted portal (Tx: ${params.transactionReference})` : 'Payment failed on simulated gateway callback',
          now
        ]
      );

      return {
        success: true,
        message: 'Payment confirmed successfully.'
      };
    });
  }
}
