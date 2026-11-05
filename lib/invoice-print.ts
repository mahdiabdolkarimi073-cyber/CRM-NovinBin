import { formatJalali, formatJalaliDateTime, formatToman, toPersianDigits } from '@/lib/format';

export interface PrintableInvoice {
  internalNumber: string;
  invoiceNumber?: string | null;
  saleDate: string;
  registeredDate?: string;
  customerName?: string | null;
  saleType?: string;
  agentName?: string | null;
  sellerName?: string | null;
  warehouseId?: string | null;
  subtotal?: number;
  totalDiscount?: number;
  totalTax?: number;
  finalAmount?: number;
  paidAmount?: number;
  balanceDue?: number;
  description?: string | null;
}

export interface PrintableItem {
  productName?: string | null;
  qty: number | string;
  unit?: string | null;
  unitPrice: number | string;
  discountAmount?: number | string;
  taxAmount?: number | string;
  finalPrice: number | string;
}

/**
 * قالب اختصاصی چاپ فیش حرارتی ۸۰ میلی‌متری
 * بهینه‌سازی شده دقیقاً برای پرینترهای حرارتی BIXOLON سری SRP-350II / SRP-350III
 */
export function generateThermalReceiptHTML(
  invoice: PrintableInvoice,
  items: PrintableItem[],
  customerName: string,
  warehouseName?: string,
  printerModel: string = 'BIXOLON SRP-350II'
): string {
  const rows = items
    .map(
      (item, i) => `
      <tr class="item-row">
        <td class="col-num">${toPersianDigits(i + 1)}</td>
        <td class="col-desc">
          <div class="prod-title">${item.productName || '—'}</div>
          <div class="prod-detail">${toPersianDigits(item.qty)} ${item.unit || 'عدد'} × ${formatToman(Number(item.unitPrice))}</div>
        </td>
        <td class="col-price">${formatToman(Number(item.finalPrice))}</td>
      </tr>`
    )
    .join('');

  const saleTypeLabel =
    invoice.saleType === 'cash'
      ? 'نقدی'
      : invoice.saleType === 'credit'
      ? 'اعتباری'
      : invoice.saleType === 'installment'
      ? 'اقساطی'
      : 'عادی';

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فیش ${invoice.internalNumber} - ${printerModel}</title>
  <style>
    @font-face {
      font-family: 'Vazir';
      src: url('/fonts/Vazir.woff2') format('woff2');
      font-weight: normal;
      font-display: swap;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    @page {
      size: 80mm auto;
      margin: 0;
    }

    body {
      font-family: Vazir, Tahoma, 'Segoe UI', Arial, sans-serif;
      background: #fff;
      color: #000;
      width: 78mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 6px 8px;
      font-size: 11px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .header {
      text-align: center;
      padding-bottom: 6px;
      border-bottom: 1px dashed #000;
      margin-bottom: 6px;
    }

    .shop-title {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: -0.2px;
      margin-bottom: 2px;
    }

    .receipt-subtitle {
      font-size: 10px;
      color: #222;
      margin-bottom: 4px;
    }

    .meta-grid {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 10px;
      text-align: right;
      padding: 4px 0;
      border-bottom: 1px dashed #000;
      margin-bottom: 6px;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
    }

    .meta-row .label { font-weight: bold; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
    }

    th {
      border-bottom: 1px solid #000;
      padding: 4px 2px;
      font-size: 10px;
      font-weight: bold;
      text-align: right;
    }

    td {
      padding: 4px 2px;
      vertical-align: top;
      font-size: 10.5px;
    }

    .col-num { width: 14px; text-align: center; color: #444; font-size: 9px; }
    .col-desc { text-align: right; }
    .col-price { width: 68px; text-align: left; font-weight: bold; white-space: nowrap; }

    .prod-title { font-weight: bold; font-size: 11px; }
    .prod-detail { font-size: 9.5px; color: #333; margin-top: 1px; }

    .item-row {
      border-bottom: 0.5px solid #ddd;
    }

    .summary-box {
      border-top: 1px dashed #000;
      padding-top: 6px;
      margin-top: 4px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      font-size: 10.5px;
    }

    .final-total {
      display: flex;
      justify-content: space-between;
      border: 1.5px solid #000;
      border-radius: 4px;
      padding: 6px 8px;
      margin: 6px 0;
      font-size: 13px;
      font-weight: 900;
      background: #f4f4f4;
    }

    .footer {
      text-align: center;
      padding-top: 8px;
      border-top: 1px dashed #000;
      margin-top: 6px;
      font-size: 9.5px;
    }

    .device-badge {
      font-size: 8.5px;
      color: #666;
      margin-top: 4px;
      font-family: monospace;
      direction: ltr;
    }

    .barcode-box {
      margin: 6px auto;
      text-align: center;
      font-family: monospace;
      letter-spacing: 2px;
      font-size: 12px;
      font-weight: bold;
      border: 1px solid #000;
      padding: 4px;
      display: inline-block;
    }

    @media print {
      body {
        width: 76mm;
        margin: 0;
        padding: 1mm 2mm;
      }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="shop-title">فاکتور فروش کالا و خدمات</div>
    <div class="receipt-subtitle">سیستم مدیریت نوین‌بین</div>
    <div class="barcode-box">* ${invoice.internalNumber} *</div>
  </div>

  <div class="meta-grid">
    <div class="meta-row">
      <span class="label">شماره داخلی:</span>
      <span>${invoice.internalNumber}</span>
    </div>
    ${invoice.invoiceNumber ? `
    <div class="meta-row">
      <span class="label">شماره فاکتور:</span>
      <span>${invoice.invoiceNumber}</span>
    </div>` : ''}
    <div class="meta-row">
      <span class="label">تاریخ و زمان:</span>
      <span>${formatJalaliDateTime(invoice.saleDate || new Date().toISOString())}</span>
    </div>
    <div class="meta-row">
      <span class="label">مشتری:</span>
      <span>${customerName || 'مشتری آزاد / متفرقه'}</span>
    </div>
    ${invoice.sellerName ? `
    <div class="meta-row">
      <span class="label">فروشنده/صندوقدار:</span>
      <span>${invoice.sellerName}</span>
    </div>` : ''}
    <div class="meta-row">
      <span class="label">نوع فروش:</span>
      <span>${saleTypeLabel}</span>
    </div>
    ${warehouseName ? `
    <div class="meta-row">
      <span class="label">انبار مبدأ:</span>
      <span>${warehouseName}</span>
    </div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th class="col-num">#</th>
        <th class="col-desc">شرح کالا</th>
        <th class="col-price">مبلغ (تومان)</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="3" style="text-align:center;padding:8px;">قلمی ثبت نشده</td></tr>'}
    </tbody>
  </table>

  <div class="summary-box">
    <div class="summary-row">
      <span>جمع اقلام:</span>
      <span>${formatToman(Number(invoice.subtotal) || 0)} تومان</span>
    </div>
    ${Number(invoice.totalDiscount) > 0 ? `
    <div class="summary-row" style="color:#b91c1c;">
      <span>تخفیف:</span>
      <span>-${formatToman(Number(invoice.totalDiscount))} تومان</span>
    </div>` : ''}
    ${Number(invoice.totalTax) > 0 ? `
    <div class="summary-row">
      <span>مالیات بر ارزش افزوده:</span>
      <span>+${formatToman(Number(invoice.totalTax))} تومان</span>
    </div>` : ''}

    <div class="final-total">
      <span>مبلغ قابل پرداخت:</span>
      <span>${formatToman(Number(invoice.finalAmount) || 0)} تومان</span>
    </div>

    ${Number(invoice.paidAmount) > 0 ? `
    <div class="summary-row">
      <span>دریافتی:</span>
      <span>${formatToman(Number(invoice.paidAmount))} تومان</span>
    </div>` : ''}
    ${Number(invoice.balanceDue) > 0 ? `
    <div class="summary-row" style="font-weight:bold;">
      <span>مانده بدهی:</span>
      <span>${formatToman(Number(invoice.balanceDue))} تومان</span>
    </div>` : ''}
  </div>

  ${invoice.description ? `
  <div style="font-size:9.5px;padding:4px 0;border-top:1px dashed #bbb;margin-top:4px;">
    <strong>توضیحات: </strong>${invoice.description}
  </div>` : ''}

  <div class="footer">
    <div>از خرید شما متشکریم</div>
    <div class="device-badge">[ Printer: ${printerModel} - 80mm Thermal ]</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`;
}

/**
 * قالب استاندارد چاپ فاکتور در اندازه A4 / A5
 */
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
        <td style="text-align:center;padding:8px;border:1px solid #ddd;">${toPersianDigits(i + 1)}</td>
        <td style="padding:8px;border:1px solid #ddd;font-weight:500;">${item.productName || '—'}</td>
        <td style="text-align:center;padding:8px;border:1px solid #ddd;">${toPersianDigits(item.qty)} ${item.unit || ''}</td>
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
        <td style="text-align:left;font-weight:bold;">${formatToman(Number(invoice.subtotal) || 0)} تومان</td>
      </tr>
      <tr>
        <td style="text-align:left;color:#667085;">تخفیف:</td>
        <td style="text-align:left;color:#ef4444;">${formatToman(Number(invoice.totalDiscount) || 0)} تومان</td>
      </tr>
      <tr>
        <td style="text-align:left;color:#667085;">مالیات:</td>
        <td style="text-align:left;color:#f59e0b;">${formatToman(Number(invoice.totalTax) || 0)} تومان</td>
      </tr>
      <tr class="total-row">
        <td style="text-align:left;">مبلغ نهایی:</td>
        <td style="text-align:left;">${formatToman(Number(invoice.finalAmount) || 0)} تومان</td>
      </tr>
      <tr>
        <td style="text-align:left;color:#667085;">پرداخت شده:</td>
        <td style="text-align:left;color:#16a34a;">${formatToman(Number(invoice.paidAmount) || 0)} تومان</td>
      </tr>
      <tr>
        <td style="text-align:left;color:#667085;">مانده:</td>
        <td style="text-align:left;color:#f59e0b;">${formatToman(Number(invoice.balanceDue) || 0)} تومان</td>
      </tr>
    </table>
  </div>

  ${invoice.description ? `<div style="margin-bottom:20px;padding:12px;background:#f8fafc;border-radius:8px;"><strong style="color:#667085;font-size:12px;">توضیحات: </strong><span style="font-size:12px;color:#344054;">${invoice.description}</span></div>` : ''}

  <div class="footer">
    <div>این فاکتور توسط سیستم CRM نوین‌بین تولید شده است.</div>
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
