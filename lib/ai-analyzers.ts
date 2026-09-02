// Financial analysis engine for the AI assistant

export interface AnalysisResult {
  summary: string;
  details: string[];
  alerts: string[];
  recommendations: string[];
  stats: { label: string; value: string }[];
}

function fmt(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(Math.round(n));
}

function fmtToman(n: number): string {
  return fmt(n) + ' تومان';
}

export function analyzeOverview(d: any): AnalysisResult {
  const totalAssets = d.accounts.filter((a: any) => a.type === 'asset').reduce((s: number, a: any) => s + Number(a.balance), 0);
  const totalLiabilities = d.accounts.filter((a: any) => a.type === 'liability').reduce((s: number, a: any) => s + Number(a.balance), 0);
  const totalEquity = d.accounts.filter((a: any) => a.type === 'equity').reduce((s: number, a: any) => s + Number(a.balance), 0);
  const totalRevenue = d.accounts.filter((a: any) => a.type === 'revenue').reduce((s: number, a: any) => s + Number(a.balance), 0);
  const totalExpenses = d.accounts.filter((a: any) => a.type === 'expense').reduce((s: number, a: any) => s + Number(a.balance), 0);
  const netProfit = totalRevenue - totalExpenses;
  const bankBalance = d.bankAccounts.reduce((s: number, b: any) => s + Number(b.balance), 0);
  const cashBalance = d.cashFunds.reduce((s: number, c: any) => s + Number(c.balance), 0);
  const totalInvoices = d.invoices.reduce((s: number, i: any) => s + Number(i.amount), 0);
  const totalPaid = d.invoices.reduce((s: number, i: any) => s + Number(i.paid), 0);
  const totalUnpaid = totalInvoices - totalPaid;
  const totalReceipts = d.receipts.reduce((s: number, r: any) => s + Number(r.amount), 0);
  const totalPayments = d.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const netCash = totalReceipts - totalPayments;
  const balanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1;

  return {
    summary: `وضعیت کلی مالی سازمان:\n\n• کل دارایی‌ها: ${fmtToman(totalAssets)}\n• کل بدهی‌ها: ${fmtToman(totalLiabilities)}\n• کل سرمایه: ${fmtToman(totalEquity)}\n• درآمد کل: ${fmtToman(totalRevenue)}\n• هزینه کل: ${fmtToman(totalExpenses)}\n• سود/زیان خالص: ${fmtToman(netProfit)}\n• موجودی بانکی: ${fmtToman(bankBalance)}\n• موجودی نقدی: ${fmtToman(cashBalance)}\n• کل فاکتورها: ${fmtToman(totalInvoices)}\n• مطالبات (پرداخت‌نشده): ${fmtToman(totalUnpaid)}\n• خالص جریان نقد: ${fmtToman(netCash)}\n• وضعیت ترازنامه: ${balanced ? 'متوازن ✓' : 'نامتوازن ✗'}`,
    details: [
      `تعداد کل حساب‌های حسابداری: ${d.accounts.length}`,
      `تعداد اسناد حسابداری: ${d.journalEntries.length} سند`,
      `تعداد حساب‌های بانکی: ${d.bankAccounts.length}`,
      `تعداد صندوق‌های نقدی: ${d.cashFunds.length}`,
      `تعداد فاکتورها: ${d.invoices.length}`,
      `تعداد پرداخت‌ها: ${d.payments.length}`,
      `تعداد رسیدها: ${d.receipts.length}`,
      `تعداد طرف‌های حساب: ${d.contactParties.length}`,
      `تعداد چک‌های دریافتی: ${d.receivedCheques.length}`,
      `تعداد کارتخوان‌ها: ${d.cardReaders.length}`,
    ],
    alerts: balanced ? [] : ['ترازنامه نامتوازن است — دارایی با بدهی+سرمایه برابر نیست. لطفاً بررسی کنید.'],
    recommendations: [
      netProfit < 0 ? 'سازمان در زیان است — کاهش هزینه‌ها و افزایش درآمد توصیه می‌شود.' : 'سازمان سودآور است — برای رشد، سرمایه‌گذاری در بخش‌های سودآور را در نظر بگیرید.',
      totalUnpaid > totalInvoices * 0.3 ? 'بخش زیادی از فاکتورها پرداخت نشده — پیگیری مطالبات ضروری است.' : 'وضعیت وصول مطالبات مناسب است.',
      netCash < 0 ? 'جریان نقد منفی است — مدیریت ورودی و خروجی وجه نیاز به توجه دارد.' : 'جریان نقد مثبت است.',
    ],
    stats: [
      { label: 'کل دارایی‌ها', value: fmtToman(totalAssets) },
      { label: 'کل بدهی‌ها', value: fmtToman(totalLiabilities) },
      { label: 'سود خالص', value: fmtToman(netProfit) },
      { label: 'موجودی نقد', value: fmtToman(bankBalance + cashBalance) },
      { label: 'مطالبات', value: fmtToman(totalUnpaid) },
      { label: 'جریان نقد', value: fmtToman(netCash) },
    ],
  };
}

export function analyzeInvoices(d: any): AnalysisResult {
  const invoices = d.invoices;
  const total = invoices.reduce((s: number, i: any) => s + Number(i.amount), 0);
  const totalPaid = invoices.reduce((s: number, i: any) => s + Number(i.paid), 0);
  const totalUnpaid = total - totalPaid;
  const paid = invoices.filter((i: any) => Number(i.paid) >= Number(i.amount) && Number(i.amount) > 0);
  const partial = invoices.filter((i: any) => Number(i.paid) > 0 && Number(i.paid) < Number(i.amount));
  const unpaid = invoices.filter((i: any) => Number(i.paid) === 0);
  const avg = invoices.length > 0 ? total / invoices.length : 0;
  const byCustomer: Record<string, number> = {};
  for (const inv of invoices) {
    if (inv.customerId) byCustomer[inv.customerId] = (byCustomer[inv.customerId] || 0) + Number(inv.amount);
  }
  const topCustomers = Object.entries(byCustomer)
    .map(([cid, amt]) => {
      const c = d.customers.find((x: any) => x.id === cid);
      const name = c ? (c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim()) : 'ناشناخته';
      return { name, amount: amt };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const now = Date.now();
  const overdue = invoices.filter((i: any) => {
    if (!i.dueDate) return false;
    return Number(i.paid) < Number(i.amount) && new Date(i.dueDate).getTime() < now;
  });
  const overdueAmount = overdue.reduce((s: number, i: any) => s + (Number(i.amount) - Number(i.paid)), 0);

  return {
    summary: `تحلیل فاکتورها:\n\n• تعداد کل: ${fmt(invoices.length)}\n• مبلغ کل: ${fmtToman(total)}\n• پرداخت‌شده: ${fmtToman(totalPaid)}\n• پرداخت‌نشده: ${fmtToman(totalUnpaid)}\n• میانگین هر فاکتور: ${fmtToman(avg)}\n• پرداخت‌شده کامل: ${fmt(paid.length)}\n• پرداخت‌جزئی: ${fmt(partial.length)}\n• پرداخت‌نشده: ${fmt(unpaid.length)}\n• سررسید گذشته: ${fmt(overdue.length)} (${fmtToman(overdueAmount)})`,
    details: topCustomers.length > 0 ? [
      '۵ مشتری برتر:',
      ...topCustomers.map((c, i) => `${fmt(i + 1)}. ${c.name} — ${fmtToman(c.amount)}`),
    ] : ['داده‌ای موجود نیست.'],
    alerts: overdue.length > 0 ? [`${fmt(overdue.length)} فاکتور سررسید گذشته (${fmtToman(overdueAmount)}) — پیگیری فوری.`] : [],
    recommendations: [
      unpaid.length > invoices.length * 0.3 ? 'بیش از ۳۰٪ فاکتورها پرداخت‌نشده — پیگیری جدی.' : 'وضعیت وصول مناسب.',
      partial.length > 0 ? `${fmt(partial.length)} فاکتور پرداخت‌جزئی — تسویه نهایی کنید.` : '',
    ].filter(Boolean),
    stats: [
      { label: 'تعداد', value: fmt(invoices.length) },
      { label: 'مبلغ کل', value: fmtToman(total) },
      { label: 'پرداخت‌شده', value: fmtToman(totalPaid) },
      { label: 'مطالبات', value: fmtToman(totalUnpaid) },
      { label: 'معوق', value: fmt(overdue.length) },
      { label: 'میانگین', value: fmtToman(avg) },
    ],
  };
}

export function analyzePayments(d: any): AnalysisResult {
  const payments = d.payments;
  const receipts = d.receipts;
  const totalPayments = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const totalReceipts = receipts.reduce((s: number, r: any) => s + Number(r.amount), 0);
  const netCash = totalReceipts - totalPayments;
  const byMethod: Record<string, number> = {};
  for (const p of payments) {
    const m = p.method || 'نامشخص';
    byMethod[m] = (byMethod[m] || 0) + Number(p.amount);
  }
  const pending = payments.filter((p: any) => p.status !== 'completed');
  const pendingAmount = pending.reduce((s: number, p: any) => s + Number(p.amount), 0);

  return {
    summary: `تحلیل پرداخت‌ها و دریافت‌ها:\n\n• کل پرداخت‌ها: ${fmtToman(totalPayments)} (${fmt(payments.length)})\n• کل دریافت‌ها: ${fmtToman(totalReceipts)} (${fmt(receipts.length)})\n• خالص جریان نقد: ${fmtToman(netCash)}\n• پرداخت‌های معلق: ${fmt(pending.length)} (${fmtToman(pendingAmount)})`,
    details: [
      'پرداخت‌ها بر اساس روش:',
      ...Object.entries(byMethod).map(([m, a]) => `• ${m}: ${fmtToman(a)}`),
    ],
    alerts: pending.length > 0 ? [`${fmt(pending.length)} پرداخت در وضعیت غیرتکمیل.`] : [],
    recommendations: [
      netCash < 0 ? 'خروجی وجه بیشتر از ورودی — مدیریت جریان نقد.' : 'ورودی بیشتر از خروجی — وضعیت مناسب.',
      pending.length > 5 ? 'پرداخت‌های معلق زیاد — بررسی و تسویه.' : '',
    ].filter(Boolean),
    stats: [
      { label: 'کل پرداخت', value: fmtToman(totalPayments) },
      { label: 'کل دریافت', value: fmtToman(totalReceipts) },
      { label: 'خالص نقد', value: fmtToman(netCash) },
      { label: 'معلق', value: fmt(pending.length) },
    ],
  };
}

export function analyzeCheques(d: any): AnalysisResult {
  const received = d.receivedCheques;
  const totalReceived = received.reduce((s: number, c: any) => s + Number(c.amount), 0);
  const cleared = received.filter((c: any) => c.status === 'cleared');
  const pending = received.filter((c: any) => ['received', 'in_custody', 'pending_due', 'deposited'].includes(c.status));
  const returned = received.filter((c: any) => c.status === 'returned');
  const pendingAmount = pending.reduce((s: number, c: any) => s + Number(c.amount), 0);
  const now = Date.now();
  const dueSoon = received.filter((c: any) => {
    if (!c.dueDate) return false;
    const diff = new Date(c.dueDate).getTime() - now;
    return diff > 0 && diff < 7 * 86400000 && !['cleared', 'returned', 'voided'].includes(c.status);
  });

  return {
    summary: `تحلیل چک‌های دریافتی:\n\n• تعداد کل: ${fmt(received.length)}\n• مبلغ کل: ${fmtToman(totalReceived)}\n• تسویه‌شده: ${fmt(cleared.length)}\n• در جریان: ${fmt(pending.length)} (${fmtToman(pendingAmount)})\n• برگشت‌خورده: ${fmt(returned.length)}\n• سررسید نزدیک (۷ روز): ${fmt(dueSoon.length)}`,
    details: dueSoon.length > 0 ? [
      'چک‌های سررسید نزدیک:',
      ...dueSoon.slice(0, 5).map((c: any) => `• ${c.chequeNumber} — ${fmtToman(Number(c.amount))} — سررسید: ${new Date(c.dueDate).toLocaleDateString('fa-IR')}`),
    ] : ['چک سررسید نزدیکی موجود نیست.'],
    alerts: [
      returned.length > 0 ? `${fmt(returned.length)} چک برگشت‌خورده — پیگیری حقوقی.` : '',
      dueSoon.length > 0 ? `${fmt(dueSoon.length)} چک در ۷ روز آینده سررسید — آماده وصول شوید.` : '',
    ].filter(Boolean),
    recommendations: [
      pending.length > 10 ? 'چک‌های در جریان زیاد — تسویه سریع‌تر.' : '',
      returned.length > 0 ? 'برای چک‌های برگشتی اقدام قانونی کنید.' : '',
    ].filter(Boolean),
    stats: [
      { label: 'کل چک‌ها', value: fmt(received.length) },
      { label: 'مبلغ کل', value: fmtToman(totalReceived) },
      { label: 'تسویه‌شده', value: fmt(cleared.length) },
      { label: 'در جریان', value: fmtToman(pendingAmount) },
      { label: 'برگشتی', value: fmt(returned.length) },
    ],
  };
}

export function analyzeBankAccounts(d: any): AnalysisResult {
  const banks = d.bankAccounts;
  const funds = d.cashFunds;
  const transfers = d.fundTransfers;
  const totalBank = banks.reduce((s: number, b: any) => s + Number(b.balance), 0);
  const totalCash = funds.reduce((s: number, f: any) => s + Number(f.balance), 0);
  const totalLiquidity = totalBank + totalCash;
  const activeBanks = banks.filter((b: any) => b.active);
  const inactiveBanks = banks.filter((b: any) => !b.active);
  const totalTransfers = transfers.reduce((s: number, t: any) => s + Number(t.amount), 0);

  return {
    summary: `تحلیل حساب‌های بانکی و خزانه‌داری:\n\n• حساب‌های بانکی: ${fmt(banks.length)} (فعال: ${fmt(activeBanks.length)})\n• صندوق‌های نقدی: ${fmt(funds.length)}\n• موجودی بانکی: ${fmtToman(totalBank)}\n• موجودی نقدی: ${fmtToman(totalCash)}\n• کل نقدینگی: ${fmtToman(totalLiquidity)}\n• انتقال‌های وجه: ${fmt(transfers.length)} (${fmtToman(totalTransfers)})`,
    details: [
      'حساب‌های بانکی:',
      ...banks.map((b: any) => `• ${b.name} — ${b.bankName} — ${fmtToman(Number(b.balance))} ${b.active ? '' : '(غیرفعال)'}`),
      'صندوق‌های نقدی:',
      ...funds.map((f: any) => `• ${f.name} — ${fmtToman(Number(f.balance))} ${f.location ? '— ' + f.location : ''}`),
    ],
    alerts: inactiveBanks.length > 0 ? [`${fmt(inactiveBanks.length)} حساب بانکی غیرفعال.`] : [],
    recommendations: [
      totalLiquidity < 0 ? 'نقدینگی منفی — وضعیت بحرانی.' : 'نقدینگی مثبت.',
      banks.length > 0 && totalBank / banks.length < 1000000 ? 'میانگین موجودی حساب‌ها پایین — تمرکز وجه.' : '',
    ].filter(Boolean),
    stats: [
      { label: 'موجودی بانکی', value: fmtToman(totalBank) },
      { label: 'موجودی نقدی', value: fmtToman(totalCash) },
      { label: 'کل نقدینگی', value: fmtToman(totalLiquidity) },
      { label: 'انتقال‌ها', value: fmt(transfers.length) },
    ],
  };
}

export function analyzePettyCash(d: any): AnalysisResult {
  const custodians = d.pettyCashCustodians;
  const expenses = d.pettyCashExpenses;
  const statements = d.pettyCashExpenseStatements;
  const merges = d.pettyCashMergeStatements;
  const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalStatements = statements.reduce((s: number, st: any) => s + Number(st.totalAmount), 0);
  const totalMerges = merges.reduce((s: number, m: any) => s + Number(m.totalAmount), 0);
  const pendingExpenses = expenses.filter((e: any) => e.status === 'pending');

  return {
    summary: `تحلیل تنخواه‌دار:\n\n• تنخواه‌دارها: ${fmt(custodians.length)}\n• هزینه‌ها: ${fmt(expenses.length)} (${fmtToman(totalExpenses)})\n• در انتظار تأیید: ${fmt(pendingExpenses.length)}\n• صورت‌های هزینه: ${fmt(statements.length)} (${fmtToman(totalStatements)})\n• صورت‌های ادغام: ${fmt(merges.length)} (${fmtToman(totalMerges)})`,
    details: custodians.length > 0 ? [
      'تنخواه‌دارها:',
      ...custodians.map((c: any) => `• کد: ${c.code} — سقف: ${fmtToman(Number(c.ceiling))} — فعال: ${c.active ? 'بله' : 'خیر'}`),
    ] : ['تنخواه‌داری ثبت نشده.'],
    alerts: pendingExpenses.length > 5 ? [`${fmt(pendingExpenses.length)} هزینه در انتظار تأیید.`] : [],
    recommendations: [
      pendingExpenses.length > 0 ? 'هزینه‌های در انتظار را بررسی کنید.' : '',
      totalExpenses > 0 ? 'مجموع هزینه‌ها را با سقف مقایسه کنید.' : '',
    ].filter(Boolean),
    stats: [
      { label: 'تنخواه‌دار', value: fmt(custodians.length) },
      { label: 'کل هزینه', value: fmtToman(totalExpenses) },
      { label: 'در انتظار', value: fmt(pendingExpenses.length) },
      { label: 'صورت هزینه', value: fmt(statements.length) },
    ],
  };
}

export function analyzeCardReaders(d: any): AnalysisResult {
  const readers = d.cardReaders;
  const transactions = d.cardReaderTransactions;
  const settlements = d.cardReaderSettlements;
  const totalTransactions = transactions.reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalNet = transactions.reduce((s: number, t: any) => s + Number(t.netAmount), 0);
  const totalCommission = transactions.reduce((s: number, t: any) => s + Number(t.commissionAmount), 0);
  const pendingSettlement = transactions.filter((t: any) => !t.settlementId);
  const pendingAmount = pendingSettlement.reduce((s: number, t: any) => s + Number(t.amount), 0);
  const activeReaders = readers.filter((r: any) => r.status === 'active');

  return {
    summary: `تحلیل کارتخوان‌ها:\n\n• کارتخوان‌ها: ${fmt(readers.length)} (فعال: ${fmt(activeReaders.length)})\n• تراکنش‌ها: ${fmt(transactions.length)}\n• مبلغ کل: ${fmtToman(totalTransactions)}\n• مبلغ خالص: ${fmtToman(totalNet)}\n• کمیسیون: ${fmtToman(totalCommission)}\n• تسویه‌ها: ${fmt(settlements.length)}\n• تسویه‌نشده: ${fmt(pendingSettlement.length)} (${fmtToman(pendingAmount)})`,
    details: readers.length > 0 ? [
      'کارتخوان‌ها:',
      ...readers.map((r: any) => `• ${r.bankName} — TID: ${r.tid} — ${r.status}`),
    ] : ['کارتخوانی ثبت نشده.'],
    alerts: pendingSettlement.length > 10 ? [`${fmt(pendingSettlement.length)} تراکنش تسویه‌نشده.`] : [],
    recommendations: [
      pendingAmount > 0 ? `تراکنش‌های تسویه‌نشده (${fmtToman(pendingAmount)}) را تسویه کنید.` : '',
      totalCommission > totalTransactions * 0.03 ? 'کمیسیون بالای ۳٪ — مذاکره برای کاهش نرخ.' : '',
    ].filter(Boolean),
    stats: [
      { label: 'کارتخوان', value: fmt(readers.length) },
      { label: 'تراکنش', value: fmt(transactions.length) },
      { label: 'مبلغ کل', value: fmtToman(totalTransactions) },
      { label: 'کمیسیون', value: fmtToman(totalCommission) },
      { label: 'تسویه‌نشده', value: fmt(pendingSettlement.length) },
    ],
  };
}

export function analyzeReceivables(d: any): AnalysisResult {
  const invoices = d.invoices;
  const payments = d.payments;
  const now = Date.now();
  const receivables = invoices
    .filter((i: any) => Number(i.paid) < Number(i.amount))
    .map((i: any) => {
      const due = i.dueDate ? new Date(i.dueDate).getTime() : null;
      const daysOverdue = due ? Math.max(0, Math.floor((now - due) / 86400000)) : 0;
      const c = d.customers.find((x: any) => x.id === i.customerId);
      const name = c ? (c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim()) : 'ناشناخته';
      return { id: i.id, number: i.number, name, amount: Number(i.amount) - Number(i.paid), daysOverdue, dueDate: i.dueDate };
    });
  const totalReceivables = receivables.reduce((s: number, r: any) => s + r.amount, 0);
  const overdue = receivables.filter((r: any) => r.daysOverdue > 0);
  const overdueAmount = overdue.reduce((s: number, r: any) => s + r.amount, 0);
  const highRisk = receivables.filter((r: any) => r.daysOverdue > 30);
  const highRiskAmount = highRisk.reduce((s: number, r: any) => s + r.amount, 0);
  const payables = payments.filter((p: any) => p.status !== 'completed');
  const totalPayables = payables.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const net = totalReceivables - totalPayables;

  return {
    summary: `تحلیل مطالبات و بدهی‌ها:\n\n• کل مطالبات: ${fmtToman(totalReceivables)} (${fmt(receivables.length)})\n• معوق: ${fmtToman(overdueAmount)} (${fmt(overdue.length)})\n• پرریسک (+۳۰ روز): ${fmtToman(highRiskAmount)} (${fmt(highRisk.length)})\n• کل بدهی‌ها: ${fmtToman(totalPayables)} (${fmt(payables.length)})\n• وضعیت خالص: ${fmtToman(net)}`,
    details: overdue.length > 0 ? [
      'بزرگ‌ترین مطالبات معوق:',
      ...overdue.sort((a: any, b: any) => b.amount - a.amount).slice(0, 5).map((r: any) => `• ${r.name} — ${fmtToman(r.amount)} — ${fmt(r.daysOverdue)} روز تأخیر`),
    ] : ['مطالبات معوقی وجود ندارد.'],
    alerts: [
      highRisk.length > 0 ? `${fmt(highRisk.length)} فاکتور +۳۰ روز تأخیر (${fmtToman(highRiskAmount)}) — ریسک بالا.` : '',
      overdue.length > receivables.length * 0.5 && receivables.length > 0 ? 'بیش از ۵۰٪ مطالبات معوق — بازنگری سیاست اعتباری.' : '',
    ].filter(Boolean),
    recommendations: [
      highRisk.length > 0 ? 'برای مطالبات پرریسک اقدام قانونی یا تسویه با تخفیف.' : '',
      net < 0 ? 'بدهی‌ها بیشتر — مدیریت جریان نقد.' : 'مطالبات بیشتر — وضعیت مناسب.',
    ].filter(Boolean),
    stats: [
      { label: 'مطالبات', value: fmtToman(totalReceivables) },
      { label: 'معوق', value: fmtToman(overdueAmount) },
      { label: 'پرریسک', value: fmtToman(highRiskAmount) },
      { label: 'بدهی‌ها', value: fmtToman(totalPayables) },
      { label: 'خالص', value: fmtToman(net) },
    ],
  };
}

export function analyzeAccounting(d: any): AnalysisResult {
  const accounts = d.accounts;
  const entries = d.journalEntries;
  const posted = entries.filter((e: any) => e.status === 'posted');
  const drafts = entries.filter((e: any) => e.status === 'draft');
  const reversed = entries.filter((e: any) => e.status === 'reversed');
  const accountMap = new Map<string, { code: string; name: string; type: string; debit: number; credit: number }>();
  for (const a of accounts) {
    accountMap.set(a.id, { code: a.code, name: a.name, type: a.type, debit: 0, credit: 0 });
  }
  for (const je of posted) {
    for (const line of je.lines || []) {
      const acc = accountMap.get(line.accountId);
      if (acc) {
        acc.debit += Number(line.debit);
        acc.credit += Number(line.credit);
      }
    }
  }
  const trialBalance = Array.from(accountMap.values()).filter((a) => a.debit > 0 || a.credit > 0);
  const totalDebit = trialBalance.reduce((s, a) => s + a.debit, 0);
  const totalCredit = trialBalance.reduce((s, a) => s + a.credit, 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 1;
  const byType: Record<string, { count: number; balance: number }> = {};
  for (const a of accounts) {
    if (!byType[a.type]) byType[a.type] = { count: 0, balance: 0 };
    byType[a.type].count++;
    byType[a.type].balance += Number(a.balance);
  }
  const typeLabels: Record<string, string> = { asset: 'دارایی', liability: 'بدهی', equity: 'سرمایه', revenue: 'درآمد', expense: 'هزینه' };

  return {
    summary: `تحلیل حسابداری:\n\n• حساب‌ها: ${fmt(accounts.length)}\n• اسناد ثبت‌شده: ${fmt(posted.length)}\n• پیش‌نویس: ${fmt(drafts.length)}\n• برگشت‌خورده: ${fmt(reversed.length)}\n• جمع بدهکار: ${fmtToman(totalDebit)}\n• جمع بستانکار: ${fmtToman(totalCredit)}\n• تراز: ${balanced ? 'متوازن ✓' : 'نامتوازن ✗'}`,
    details: [
      'حساب‌ها بر اساس نوع:',
      ...Object.entries(byType).map(([t, v]) => `• ${typeLabels[t] || t}: ${fmt(v.count)} حساب — ${fmtToman(v.balance)}`),
    ],
    alerts: [
      drafts.length > 0 ? `${fmt(drafts.length)} سند پیش‌نویس — ثبت نهایی کنید.` : '',
      !balanced ? 'تراز آزمایشی نامتوازن — بررسی اسناد.' : '',
    ].filter(Boolean),
    recommendations: [
      drafts.length > 5 ? 'اسناد پیش‌نویس زیاد — ثبت نهایی یا حذف.' : '',
      balanced ? 'تراز متوازن — وضعیت سالم.' : '',
    ].filter(Boolean),
    stats: [
      { label: 'حساب‌ها', value: fmt(accounts.length) },
      { label: 'اسناد', value: fmt(posted.length) },
      { label: 'جمع بدهکار', value: fmtToman(totalDebit) },
      { label: 'جمع بستانکار', value: fmtToman(totalCredit) },
    ],
  };
}

export function analyzeContactParties(d: any): AnalysisResult {
  const parties = d.contactParties;
  const settlements = d.contactSettlements;
  const customers = parties.filter((p: any) => p.detailType === 'customer');
  const suppliers = parties.filter((p: any) => p.detailType === 'supplier');
  const totalCustomerBalance = parties.reduce((s: number, p: any) => s + Number(p.customerBalance || 0), 0);
  const totalSupplierBalance = parties.reduce((s: number, p: any) => s + Number(p.supplierBalance || 0), 0);
  const pendingSettlements = settlements.filter((s: any) => s.status === 'draft' || s.status === 'pending_approval');
  const finalizedSettlements = settlements.filter((s: any) => s.status === 'finalized' || s.status === 'approved');

  return {
    summary: `تحلیل طرف‌های حساب:\n\n• کل: ${fmt(parties.length)}\n• مشتریان: ${fmt(customers.length)}\n• تأمین‌کنندگان: ${fmt(suppliers.length)}\n• مانده مشتری: ${fmtToman(totalCustomerBalance)}\n• مانده تأمین‌کننده: ${fmtToman(totalSupplierBalance)}\n• تسویه در انتظار: ${fmt(pendingSettlements.length)}\n• تسویه نهایی: ${fmt(finalizedSettlements.length)}`,
    details: [
      `تسویه‌های در انتظار: ${fmt(pendingSettlements.length)}`,
      `تسویه‌های نهایی: ${fmt(finalizedSettlements.length)}`,
    ],
    alerts: pendingSettlements.length > 0 ? [`${fmt(pendingSettlements.length)} تسویه در انتظار.`] : [],
    recommendations: [
      pendingSettlements.length > 0 ? 'تسویه‌های در انتظار را نهایی کنید.' : '',
      totalSupplierBalance > totalCustomerBalance ? 'مانده تأمین‌کنندگان بیشتر — مدیریت بدهی.' : '',
    ].filter(Boolean),
    stats: [
      { label: 'طرف حساب', value: fmt(parties.length) },
      { label: 'مانده مشتری', value: fmtToman(totalCustomerBalance) },
      { label: 'مانده تأمین‌کننده', value: fmtToman(totalSupplierBalance) },
      { label: 'تسویه در انتظار', value: fmt(pendingSettlements.length) },
    ],
  };
}

export function analyzeDocumentIssuance(d: any): AnalysisResult {
  const docs = d.documentIssuances;
  const draft = docs.filter((x: any) => x.status === 'draft');
  const issued = docs.filter((x: any) => x.status === 'issued');
  const finalized = docs.filter((x: any) => x.status === 'finalized');
  const voided = docs.filter((x: any) => x.status === 'voided');
  const totalDebit = docs.reduce((s: number, x: any) => s + Number(x.totalDebit), 0);
  const totalCredit = docs.reduce((s: number, x: any) => s + Number(x.totalCredit), 0);

  return {
    summary: `تحلیل صدور اسناد:\n\n• کل: ${fmt(docs.length)}\n• پیش‌نویس: ${fmt(draft.length)}\n• صادرشده: ${fmt(issued.length)}\n• نهایی‌شده: ${fmt(finalized.length)}\n• باطل‌شده: ${fmt(voided.length)}\n• مجموع بدهکار: ${fmtToman(totalDebit)}\n• مجموع بستانکار: ${fmtToman(totalCredit)}`,
    details: [
      `پیش‌نویس: ${fmt(draft.length)}`,
      `صادرشده: ${fmt(issued.length)}`,
      `نهایی‌شده: ${fmt(finalized.length)}`,
    ],
    alerts: draft.length > 5 ? [`${fmt(draft.length)} سند پیش‌نویس.`] : [],
    recommendations: [
      draft.length > 0 ? 'اسناد پیش‌نویس را نهایی کنید.' : '',
      finalized.length > 0 ? `${fmt(finalized.length)} سند نهایی‌شده.` : '',
    ].filter(Boolean),
    stats: [
      { label: 'کل اسناد', value: fmt(docs.length) },
      { label: 'پیش‌نویس', value: fmt(draft.length) },
      { label: 'نهایی‌شده', value: fmt(finalized.length) },
      { label: 'مجموع', value: fmtToman(totalDebit) },
    ],
  };
}

export function analyzePaymentAnnouncements(d: any): AnalysisResult {
  const announcements = d.paymentAnnouncements;
  const total = announcements.reduce((s: number, a: any) => s + Number(a.amount), 0);
  const byStatus: Record<string, number> = {};
  for (const a of announcements) {
    byStatus[a.status] = (byStatus[a.status] || 0) + Number(a.amount);
  }

  return {
    summary: `تحلیل اعلامیه‌های پرداخت:\n\n• تعداد: ${fmt(announcements.length)}\n• مبلغ کل: ${fmtToman(total)}`,
    details: Object.entries(byStatus).map(([s, a]) => `• ${s}: ${fmtToman(a)}`),
    alerts: [],
    recommendations: announcements.length === 0 ? ['اعلامیه‌ای ثبت نشده.'] : [],
    stats: [
      { label: 'تعداد', value: fmt(announcements.length) },
      { label: 'مبلغ', value: fmtToman(total) },
    ],
  };
}

export function analyzePreInvoices(d: any): AnalysisResult {
  const preInvoices = d.preInvoices;
  const returns = d.salesReturns;
  const totalPre = preInvoices.reduce((s: number, p: any) => s + Number(p.finalAmount), 0);
  const totalReturns = returns.reduce((s: number, r: any) => s + Number(r.finalAmount), 0);
  const draftPre = preInvoices.filter((p: any) => p.status === 'draft');
  const confirmedPre = preInvoices.filter((p: any) => p.status === 'confirmed' || p.status === 'approved');

  return {
    summary: `تحلیل پیش‌فاکتور و مرجوعی:\n\n• پیش‌فاکتور: ${fmt(preInvoices.length)} (${fmtToman(totalPre)})\n• پیش‌نویس: ${fmt(draftPre.length)}\n• تأییدشده: ${fmt(confirmedPre.length)}\n• مرجوعی: ${fmt(returns.length)} (${fmtToman(totalReturns)})`,
    details: [
      `نرخ مرجوعی: ${preInvoices.length > 0 ? fmt((returns.length / preInvoices.length) * 100) + '٪' : 'نامشخص'}`,
    ],
    alerts: returns.length > preInvoices.length * 0.1 && preInvoices.length > 10 ? ['نرخ مرجوعی بالای ۱۰٪ — بررسی کیفیت.'] : [],
    recommendations: [
      draftPre.length > 0 ? `${fmt(draftPre.length)} پیش‌فاکتور پیش‌نویس — تبدیل به نهایی.` : '',
      totalReturns > totalPre * 0.05 ? 'مبلغ مرجوعی بالا — کنترل کیفیت.' : '',
    ].filter(Boolean),
    stats: [
      { label: 'پیش‌فاکتور', value: fmt(preInvoices.length) },
      { label: 'مبلغ', value: fmtToman(totalPre) },
      { label: 'مرجوعی', value: fmt(returns.length) },
      { label: 'مبلغ مرجوعی', value: fmtToman(totalReturns) },
    ],
  };
}

import {
  analyzeSmartAlerts, analyzeLeadScoring, analyzeChurnPrediction,
  analyzeCrossSell, analyzeSalesAllocation, analyzeSmartInventory,
  analyzeCustomerProfitability, analyzeFinancialCalendar, analyzeConversionPath,
} from './ai-smart-analyzers';

export const ANALYZERS: Record<string, (d: any) => AnalysisResult> = {
  overview: analyzeOverview,
  invoices: analyzeInvoices,
  payments: analyzePayments,
  cheques: analyzeCheques,
  banks: analyzeBankAccounts,
  pettyCash: analyzePettyCash,
  cardReaders: analyzeCardReaders,
  receivables: analyzeReceivables,
  accounting: analyzeAccounting,
  contactParties: analyzeContactParties,
  documentIssuance: analyzeDocumentIssuance,
  paymentAnnouncements: analyzePaymentAnnouncements,
  preInvoices: analyzePreInvoices,
  smartAlerts: analyzeSmartAlerts,
  leadScoring: analyzeLeadScoring,
  churnPrediction: analyzeChurnPrediction,
  crossSell: analyzeCrossSell,
  salesAllocation: analyzeSalesAllocation,
  smartInventory: analyzeSmartInventory,
  customerProfitability: analyzeCustomerProfitability,
  financialCalendar: analyzeFinancialCalendar,
  conversionPath: analyzeConversionPath,
};

export const SECTION_LABELS: Record<string, string> = {
  overview: 'نمای کلی مالی',
  invoices: 'فاکتورها و فروش',
  payments: 'پرداخت‌ها و دریافت‌ها',
  cheques: 'چک‌های دریافتی',
  banks: 'حساب‌های بانکی و خزانه‌داری',
  pettyCash: 'تنخواه‌دار',
  cardReaders: 'کارتخوان‌ها',
  receivables: 'مطالبات و بدهی‌ها',
  accounting: 'حسابداری و اسناد',
  contactParties: 'طرف‌های حساب و تسویه',
  documentIssuance: 'صدور اسناد',
  paymentAnnouncements: 'اعلامیه‌های پرداخت',
  preInvoices: 'پیش‌فاکتور و مرجوعی',
  smartAlerts: 'هشدارهای هوشمند',
  leadScoring: 'امتیازدهی لیدها',
  churnPrediction: 'پیش‌بینی ریزش مشتری',
  crossSell: 'پیشنهاد فروش متقاطع',
  salesAllocation: 'تخصیص منابع فروش',
  smartInventory: 'مدیریت موجودی هوشمند',
  customerProfitability: 'سودآوری مشتری',
  financialCalendar: 'تقویم مالی',
  conversionPath: 'مسیر تبدیل',
};

export const INTENT_KEYWORDS: Record<string, string[]> = {
  overview: ['overview', 'خلاصه', 'وضعیت', 'کلی', 'عمومی', 'سلام', 'سلامت', 'چطور', 'چطوره', 'report', 'گزارش', 'داشبورد', 'dashboard'],
  invoices: ['invoice', 'فاکتور', 'فروش', 'sales', 'فاکتورها'],
  payments: ['payment', 'پرداخت', 'دریافت', 'receipt', 'نقد', 'cash', 'جریان'],
  cheques: ['cheque', 'check', 'چک', 'چک‌های دریافتی'],
  banks: ['bank', 'بانک', 'حساب بانکی', 'خزانه', 'صندوق', 'cash fund', 'موجودی'],
  pettyCash: ['petty', 'تنخواه', 'petty cash'],
  cardReaders: ['card', 'کارتخوان', 'pos', 'ترمینال'],
  receivables: ['receivable', 'مطالبات', 'بدهی', 'debt', 'payable', 'معوق', 'سررسید'],
  accounting: ['account', 'حسابداری', 'سند', 'journal', 'تراز', 'trial balance', 'دفتر'],
  contactParties: ['contact', 'طرف حساب', 'تسویه', 'settlement', 'counterparty'],
  documentIssuance: ['document', 'سند', 'صدور', 'issuance'],
  paymentAnnouncements: ['announcement', 'اعلامیه', 'پرداخت'],
  preInvoices: ['pre-invoice', 'پیش‌فاکتور', 'مرجوعی', 'return', 'پیش فاکتور'],
  smartAlerts: ['alert', 'هشدار', 'warning', 'risk', 'ریسک', 'خطر', 'بحرانی', 'proactive'],
  leadScoring: ['lead score', 'امتیاز لید', 'امتیازدهی', 'scoring', 'داغ', 'سرد', 'گرید'],
  churnPrediction: ['churn', 'ریزش', 'از دست دادن', 'lost customer', 'مشتری از دست', 'at risk'],
  crossSell: ['cross sell', 'فروش متقاطع', 'up sell', 'افزایشی', 'پیشنهاد محصول', 'cross-sell'],
  salesAllocation: ['allocation', 'تخصیص', 'assign', 'منابع فروش', 'workload', 'بار کاری'],
  smartInventory: ['inventory', 'موجودی', 'stock', 'انبار', 'reorder', 'سفارش مجدد', 'اتمام'],
  customerProfitability: ['profitability', 'سودآوری', 'profit per customer', 'زیان‌ده', 'حاشیه سود'],
  financialCalendar: ['calendar', 'تقویم', 'سررسید', 'due', 'تعهد', 'commitment', 'رویداد مالی'],
  conversionPath: ['conversion', 'تبدیل', 'funnel', 'قیف', 'مسیر', 'drop off', 'ریزش فروش', 'conversion rate'],
};

export function detectIntent(message: string): string {
  const lower = message.toLowerCase();
  let bestMatch = 'overview';
  let bestScore = 0;
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) score += kw.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = intent;
    }
  }
  return bestMatch;
}
