import React, { useRef } from 'react';
import { X, Printer, Download, ShieldCheck, Zap } from 'lucide-react';
import { Order } from '../../types';

interface InvoiceModalProps {
  order: Order;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadInvoice = () => {
    const htmlContent = printRef.current?.innerHTML || '';
    const fullDocument = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Invoice_${order.order_number}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print { body { padding: 0; } }
            body { font-family: system-ui, -apple-system, sans-serif; background: #fff; padding: 24px; color: #1e293b; }
          </style>
        </head>
        <body>
          <div style="max-w: 800px; margin: 0 auto;">
            ${htmlContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;
    const blob = new Blob([fullDocument], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${order.order_number}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const address = order.shippingAddress || order.shipping_address;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Controls */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">Official Tax Invoice & Warranty Slip</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={handleDownloadInvoice}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download File</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Sheet */}
        <div ref={printRef} className="p-8 overflow-y-auto print:p-0 text-slate-800 text-xs">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 bg-blue-600 text-white rounded flex items-center justify-center font-black text-sm">
                  ⚡
                </div>
                <span className="font-black text-lg text-slate-900 tracking-tight">CHAUDHARY BATTERY AND UPS</span>
              </div>
              <p className="text-slate-500 max-w-sm text-[11px] leading-relaxed">
                Shop # 14-16, Ground Floor, Capital Trade Centre, F-10 Markaz, Islamabad, 44000, Pakistan<br/>
                Phone: +92 51 2212345 · WhatsApp: +92 300 5551234 · sales@chaudharybattery.pk<br/>
                <strong>NTN:</strong> 7321094-1 · <strong>STRN:</strong> 3277876123409
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-900 border border-slate-300 font-extrabold text-sm uppercase rounded-lg mb-2">
                ORIGINAL TAX INVOICE
              </span>
              <div className="font-mono text-sm font-bold text-slate-900">
                #{order.order_number}
              </div>
              <div className="text-slate-500 text-[11px]">
                Date: {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Customer & Order Metadata */}
          <div className="grid grid-cols-2 gap-6 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider block mb-1">
                Billed & Shipped To:
              </span>
              <div className="font-bold text-slate-900 text-sm">{order.customer_name}</div>
              <div className="text-slate-600 font-mono">{order.customer_phone}</div>
              <div className="text-slate-600">{order.customer_email}</div>
              {address && (
                <div className="text-slate-700 mt-1 font-medium">
                  {address.address_line1 || address.addressLine1 || 'F-10 Area'}, {address.city || 'Islamabad'}, {address.province || 'ICT'}
                </div>
              )}
              {order.shipping_notes && (
                <div className="text-slate-500 text-[10px] mt-1 italic">
                  Note: {order.shipping_notes}
                </div>
              )}
            </div>

            <div className="space-y-1 text-right">
              <div>
                <span className="text-slate-500">Payment Method:</span>{' '}
                <span className="font-bold text-slate-900 uppercase">{order.payment_method}</span>
              </div>
              {(order.transaction_reference || order.transactionReference) && (
                <div className="text-[10px] text-slate-700 bg-slate-100 p-1.5 rounded border border-slate-200 mt-1 font-mono text-left">
                  <strong>Client Bank/TRX Detail:</strong><br/>
                  {order.transaction_reference || order.transactionReference}
                </div>
              )}
              <div>
                <span className="text-slate-500">Payment Status:</span>{' '}
                <span className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {order.payment_status}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Order Status:</span>{' '}
                <span className="font-bold text-slate-900 uppercase">{order.order_status}</span>
              </div>
              {order.tracking_number && (
                <div>
                  <span className="text-slate-500">Courier Tracking ID:</span>{' '}
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{order.tracking_number}</span>
                </div>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <table className="w-full text-left border-collapse mb-6">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 rounded-l-lg">Item Description</th>
                <th className="py-2.5 px-3">Specs</th>
                <th className="py-2.5 px-3">Warranty</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right rounded-r-lg">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(order.items && order.items.length > 0) ? (
                order.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {it.product_title || it.title || 'Automotive Lead-Acid Battery'}
                      <div className="text-[10px] text-slate-400 font-mono">SKU: {it.sku}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                      {it.ah_capacity ? `${it.ah_capacity}Ah` : '-'} · {it.voltage || '12V'}
                    </td>
                    <td className="py-3 px-3 text-emerald-700 font-bold text-[11px]">
                      {it.warranty_months ? `${it.warranty_months} Months` : '12 Months Official'}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">{it.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono">Rs. {Number(it.unit_price).toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      Rs. {Number(it.subtotal_price || (it.unit_price * it.quantity)).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400">
                    Battery order line item: Rs. {Number(order.total_amount).toLocaleString()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Calculations Summary */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-2 border-t border-slate-200 pt-3">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-bold text-slate-900">Rs. {Number(order.subtotal || order.total_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Doorstep Delivery:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {Number(order.shipping_amount) === 0 ? 'FREE (Islamabad)' : `Rs. ${Number(order.shipping_amount).toLocaleString()}`}
                </span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount / Coupon {order.coupon_code ? `(${order.coupon_code})` : ''}:</span>
                  <span className="font-mono font-bold">- Rs. {Number(order.discount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 border-t-2 border-slate-900 pt-2">
                <span>Total Payable:</span>
                <span className="font-mono text-slate-900 text-base">
                  Rs. {Number(order.total_amount).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Warranty & Dealer Stamp Footer */}
          <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-6 text-[10px] text-slate-500">
            <div>
              <div className="font-bold text-slate-800 mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>OFFICIAL WARRANTY TERMS</span>
              </div>
              <p className="leading-relaxed">
                This invoice serves as the official purchase receipt and warranty claim entitlement across all authorized manufacturer claim centers in Pakistan (Atlas Battery, Daewoo, Volta, Osaka, Exide, Phoenix). Physical company warranty card must be retained with this invoice.
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center flex flex-col justify-between h-24">
              <span className="text-[9px] text-slate-400 font-mono uppercase">Authorized Dealer Verification Stamp</span>
              <div className="text-[11px] font-black text-slate-900 uppercase">
                CHAUDHARY BATTERY AND UPS · F-10 MARKAZ ISLAMABAD
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
