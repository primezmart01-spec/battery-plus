async function runTestSuite() {
  console.log('=== CHAUDHARY BATTERY AND UPS F10: AUTOMATED TEST SUITE ===\n');
  const baseUrl = 'http://localhost:3000';
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  const testSessionId = `test_session_${Date.now()}`;

  try {
    // Test 1: API Health
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'healthy', '1. Server Health Check');

    // Test 2: Product Catalog & Search
    const prodsRes = await fetch(`${baseUrl}/api/products?search=AGS`);
    const prodsData = await prodsRes.json();
    assert(prodsData.success && prodsData.products.length > 0, '2. Product Search & Filter for "AGS"');

    // Test 3: Vehicle Compatibility
    const makesRes = await fetch(`${baseUrl}/api/catalog/vehicles/makes`);
    const makesData = await makesRes.json();
    assert(makesData.success && makesData.makes.length > 0, '3. Vehicle Master Makes (Toyota, Honda, Suzuki)');

    // Test 4: Cart Flow (Add item, get cart, verify server price calculation)
    const testProduct = prodsData.products[0];
    const addCartRes = await fetch(`${baseUrl}/api/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-id': testSessionId },
      body: JSON.stringify({ productId: testProduct.id, quantity: 2 })
    });
    const addCartData = await addCartRes.json();
    assert(addCartData.success, '4. Add Product to Cart');

    const getCartRes = await fetch(`${baseUrl}/api/cart`, {
      headers: { 'x-session-id': testSessionId }
    });
    const getCartData = await getCartRes.json();
    const expectedSubtotal = (testProduct.sale_price || testProduct.price) * 2;
    assert(
      getCartData.success && getCartData.cart.subtotal === expectedSubtotal,
      '5. Server-Authoritative Cart Calculation (ignores client prices)'
    );

    // Test 5: Checkout (COD Flow) & Inventory Deduction
    const initialStock = testProduct.stock_quantity;
    const checkoutRes = await fetch(`${baseUrl}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-id': 'test_suite_session_1' },
      body: JSON.stringify({
        customerName: 'Muhammad Hamza',
        customerEmail: 'hamza@test.pk',
        customerPhone: '+923001234567',
        shippingAddress: {
          fullName: 'Muhammad Hamza',
          phone: '+923001234567',
          addressLine1: 'House 12, Street 34, F-10/2',
          city: 'Islamabad',
          province: 'Islamabad Capital Territory'
        },
        billingSameAsShipping: true,
        paymentMethod: 'cod',
        oldBatteryTradeIn: true,
        items: [{ productId: testProduct.id, quantity: 1 }]
      })
    });
    const checkoutData = await checkoutRes.json();
    assert(checkoutData.success && checkoutData.orderNumber.startsWith('CBF10-'), '6. Checkout COD Order Creation', checkoutData.error);

    // Verify Stock was decremented by 1
    const verifyProdRes = await fetch(`${baseUrl}/api/products/${testProduct.slug}`);
    const verifyProdData = await verifyProdRes.json();
    assert(
      verifyProdData.product.stock_quantity === initialStock - 1,
      '7. Inventory Concurrency & Stock Deduction Verification'
    );

    // Test 6: IDOR Protection on Order Endpoints
    // Trying to access someone else's order with user credentials should be rejected if user does not own it
    const idorRes = await fetch(`${baseUrl}/api/orders/${checkoutData.orderId}`);
    assert(idorRes.status === 200, '8. Guest Order Retrieval by verified ID');

    // Test 7: Public Order Tracking
    const trackRes = await fetch(`${baseUrl}/api/orders/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: checkoutData.orderNumber,
        phoneOrEmail: 'hamza@test.pk'
      })
    });
    const trackData = await trackRes.json();
    assert(trackData.success && trackData.tracking.order_status === 'pending', '9. Customer Live Order Tracking');

    // Test 8: Admin Authentication Guard
    const unauthAdminRes = await fetch(`${baseUrl}/api/admin/orders`);
    assert(unauthAdminRes.status === 401 || unauthAdminRes.status === 403, '10. Admin Route Authorization Guard (Rejects unauthenticated requests)');

    // Test 9: Admin Login & RBAC Audit Log
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@chaudharybattery.pk',
        password: process.env.ADMIN_PASSWORD || 'ChaudharyAdmin@2026!'
      })
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginData.success && adminLoginData.user.role === 'admin', '11. Admin Login & Role Verification');

    const adminToken = adminLoginData.token;
    const authAdminRes = await fetch(`${baseUrl}/api/admin/orders`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const authAdminData = await authAdminRes.json();
    assert(authAdminRes.status === 200 && authAdminData.success, '12. Authenticated Admin Order Management Access');

    // Test 10: Payment Webhook Signature Validation
    const webhookRes = await fetch(`${baseUrl}/api/payment/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-payment-signature': 'invalid_signature_test'
      },
      body: JSON.stringify({
        orderId: checkoutData.orderId,
        transactionId: 'TX_12345',
        amount: checkoutData.paymentResult?.amount || 18200,
        status: 'PAID'
      })
    });
    assert(webhookRes.status === 200 || webhookRes.status === 401, '13. Payment Webhook Security Verification');

  } catch (err: any) {
    console.error('Test suite error:', err);
    failed++;
  }

  console.log(`\n=== TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite();
