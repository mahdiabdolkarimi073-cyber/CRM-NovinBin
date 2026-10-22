import { formatJalali, formatToman } from '@/lib/format';

interface PrintableInvoice {
  internalNumber: string;
  invoiceNumber?: string | null;
  saleDate: string;
  registeredDate?: string;
  customerName?: string | null;
  saleType?: string;
  agentName?: string | null;
  warehouseId?: string | null;
  subtotal?: number;
  totalDiscount?: number;
  totalTax?: number;
  finalAmount?: number;
  paidAmount?: number;
  balanceDue?: number;
  description?: string | null;
}

interface PrintableItem {
  productName?: string | null;
  qty: number | string;
  unit?: string | null;
  unitPrice: number | string;
  discountAmount?: number | string;
  taxAmount?: number | string;
  finalPrice: number | string;
}

export function generateInvoicePrintHTML(
  invoice: PrintableInvoice,
  items: PrintableItem[],
  customerName: string,
  warehouseName?: string,
): string {
  const rows = items
    .map(
      (item, i) => `
      <tr>
        <td style="text-align:center;padding:8px;border:1px solid #ddd;">${i + 1}</td>
        <td style="padding:8px;border:1px solid #ddd;">${item.productName || '—'}</td>
        <td style="text-align:center;padding:8px;border:1px solid #ddd;">${item.qty} ${item.unit || ''}</td>
        <td style="text-align:center;padding:8px;border:1px solid #ddd;">${formatToman(Number(item.unitPrice))}</td>
        <td style="text-align:center;padding:8px;border:1px solid #ddd;">${formatToman(Number(item.discountAmount) || 0)}</td>
        <td style="text-align:center;padding:8px;border:1px solid #ddd;">${formatToman(Number(item.taxAmount) || 0)}</td>
        <td style="text-align:center;padding:8px;border:1px solid #ddd;font-weight:bold;">${formatToman(Number(item.finalPrice))}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فاکتور فروش ${invoice.internalNumber}</title>
  <style>
    @font-face {
      font-family: 'Vazir';
      src: url('/fonts/Vazir.woff2') format('woff2');
      font-weight: normal;
      font-display: swap;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Vazir, Tahoma, Arial, sans-serif;
      background: #fff;
      color: #1d2939;
      padding: 24px;
      font-size: 13px;
    }
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #3155e7;
    }
    .invoice-header h1 {
      font-size: 22px;
      color: #3155e7;
    }
    .invoice-header .meta {
      text-align: left;
      font-size: 12px;
      color: #667085;
    }
    .invoice-header .meta div { margin-bottom: 4px; }
    .invoice-info {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .info-box {
      flex: 1;
      min-width: 180px;
      padding: 12px;
      border-radius: 8px;
      background: #f8fafc;
    }
    .info-box .label { font-size: 11px; color: #667085; margin-bottom: 4px; }
    .info-box .value { font-size: 13px; font-weight: bold; color: #1d2939; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #3155e7;
      color: #fff;
      padding: 10px 8px;
      font-size: 12px;
      border: 1px solid #3155e7;
    }
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
    }
    .totals table { width: 320px; }
    .totals td { padding: 8px 12px; font-size: 13px; }
    .totals .total-row td {
      font-size: 16px;
      font-weight: bold;
      border-top: 2px solid #3155e7;
      color: #3155e7;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e7ecf3;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #98a2b3;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="invoice-header">
    <div>
      <h1>فاکتور فروش</h1>
      <div style="margin-top:4px;color:#667085;font-size:13px;">شماره داخلی: ${invoice.internalNumber}</div>
    </div>
    <div class="meta">
      <div>شماره فاکتور: ${invoice.invoiceNumber || '—'}</div>
      <div>تاریخ فروش: ${formatJalali(invoice.saleDate)}</div>
      <div>تاریخ ثبت: ${invoice.registeredDate ? formatJalali(invoice.registeredDate) : '—'}</div>
    </div>
  </div>

  <div class="invoice-info">
    <div class="info-box">
      <div class="label">مشتری</div>
      <div class="value">${customerName}</div>
    </div>
    <div class="info-box">
      <div class="label">نوع فروش</div>
      <div class="value">${invoice.saleType === 'cash' ? 'نقدی' : invoice.saleType === 'credit' ? 'اعتباری' : invoice.saleType === 'installment' ? 'قسطی' : 'ترکیبی'}</div>
    </div>
    <div class="info-box">
      <div class="label">عامل</div>
      <div class="value">${invoice.agentName || '—'}</div>
    </div>
    <div class="info-box">
      <div class="label">انبار</div>
      <div class="value">${warehouseName || '—'}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px;">#</th>
        <th>محصول / خدمت</th>
        <th style="width:80px;">تعداد</th>
        <th style="width:100px;">قیمت واحد</th>
        <th style="width:90px;">تخفیف</th>
        <th style="width:80px;">مالیات</th>
        <th style="width:110px;">مبلغ نهایی</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="7" style="text-align:center;padding:16px;color:#999;">قلمی ثبت نشده است</td></tr>'}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td style="text-align:left;color:#667085;">جمع کل:</td>
        <td style="text-align:left;font-weight:bold;">${formatToman(Number(invoice.subtotal) || 0)}</td>
      </tr>
      <tr>
        <td style="text-align:left;color:#667085;">تخفیف:</td>
        <td style="text-align:left;color:#ef4444;">${formatToman(Number(invoice.totalDiscount) || 0)}</td>
      </tr>
      <tr>
        <td style="text-align:left;color:#667085;">مالیات:</td>
        <td style="text-align:left;color:#f59e0b;">${formatToman(Number(invoice.totalTax) || 0)}</td>
      </tr>
      <tr class="total-row">
        <td style="text-align:left;">مبلغ نهایی:</td>
        <td style="text-align:left;">${formatToman(Number(invoice.finalAmount) || 0)} تومان</td>
      </tr>
      <tr>
        <td style="text-align:left;color:#667085;">پرداخت شده:</td>
        <td style="text-align:left;color:#16a34a;">${formatToman(Number(invoice.paidAmount) || 0)}</td>
      </tr>
      <tr>
        <td style="text-align:left;color:#667085;">مانده:</td>
        <td style="text-align:left;color:#f59e0b;">${formatToman(Number(invoice.balanceDue) || 0)}</td>
      </tr>
    </table>
  </div>

  ${invoice.description ? `<div style="margin-bottom:20px;padding:12px;background:#f8fafc;border-radius:8px;"><strong style="color:#667085;font-size:12px;">توضیحات: </strong><span style="font-size:12px;color:#344054;">${invoice.description}</span></div>` : ''}

  <div class="footer">
    <div>این فاکتور توسط سیستم تولید شده است.</div>
    <div>تاریخ چاپ: ${formatJalali(new Date().toISOString())}</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;
}
