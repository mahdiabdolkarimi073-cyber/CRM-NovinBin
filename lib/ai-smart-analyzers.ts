// Smart AI analyzers for CRM+ERP: alerts, lead scoring, churn, cross-sell,
// sales allocation, inventory, profitability, financial calendar, conversion path

import type { AnalysisResult } from './ai-analyzers';

function fmt(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(Math.round(n));
}

function fmtToman(n: number): string {
  return fmt(n) + ' تومان';
}

function daysSince(date: Date | string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

function daysUntil(date: Date | string): number {
  return Math.floor((new Date(date).getTime() - Date.now()) / 86400000);
}

// ─── 1. Smart Alerts (proactive risk detection) ───

export function analyzeSmartAlerts(d: any): AnalysisResult {
  const alerts: string[] = [];
  const critical: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  // Cash flow decline
  const bankBalance = (d.bankAccounts || []).reduce((s: number, b: any) => s + Number(b.balance), 0);
  const cashBalance = (d.cashFunds || []).reduce((s: number, c: any) => s + Number(c.balance), 0);
  const totalLiquidity = bankBalance + cashBalance;
  if (totalLiquidity < 0) {
    critical.push(`نقدینگی منفی است (${fmtToman(totalLiquidity)}) — وضعیت بحرانی، فوراً اقدام کنید.`);
  } else if (totalLiquidity < 1000000) {
    warnings.push(`نقدینگی پایین است (${fmtToman(totalLiquidity)}) — مدیریت جریان نقد ضروری است.`);
  }

  // Cheques near due
  const now = Date.now();
  const chequesDueSoon = (d.receivedCheques || []).filter((c: any) => {
    if (!c.dueDate || ['cleared', 'returned', 'voided'].includes(c.status)) return false;
    const diff = new Date(c.dueDate).getTime() - now;
    return diff > 0 && diff < 7 * 86400000;
  });
  if (chequesDueSoon.length > 0) {
    const amt = chequesDueSoon.reduce((s: number, c: any) => s + Number(c.amount), 0);
    warnings.push(`${fmt(chequesDueSoon.length)} چک در ۷ روز آینده سررسید (${fmtToman(amt)}) — آماده وصول شوید.`);
  }

  // Returned cheques
  const returnedCheques = (d.receivedCheques || []).filter((c: any) => c.status === 'returned');
  if (returnedCheques.length > 0) {
    critical.push(`${fmt(returnedCheques.length)} چک برگشت‌خورده — پیگیری حقوقی فوری.`);
  }

  // Overdue invoices
  const overdueInvoices = (d.invoices || []).filter((i: any) => {
    if (!i.dueDate) return false;
    return Number(i.paid) < Number(i.amount) && new Date(i.dueDate).getTime() < now;
  });
  if (overdueInvoices.length > 0) {
    const amt = overdueInvoices.reduce((s: number, i: any) => s + (Number(i.amount) - Number(i.paid)), 0);
    critical.push(`${fmt(overdueInvoices.length)} فاکتور سررسید گذشته (${fmtToman(amt)}) — پیگیری فوری.`);
  }

  // Low stock products
  const lowStock = (d.products || []).filter((p: any) => p.active && Number(p.stock) <= Number(p.minStock) && Number(p.minStock) > 0);
  if (lowStock.length > 0) {
    warnings.push(`${fmt(lowStock.length)} محصول در آستانه اتمام موجودی — سفارش مجدد.`);
  }

  // Out of stock
  const outOfStock = (d.products || []).filter((p: any) => p.active && Number(p.stock) === 0);
  if (outOfStock.length > 0) {
    critical.push(`${fmt(outOfStock.length)} محصول ناموجود شد — فروش متوقف است.`);
  }

  // Petty cash pending expenses
  const pendingExpenses = (d.pettyCashExpenses || []).filter((e: any) => e.status === 'pending');
  if (pendingExpenses.length > 5) {
    info.push(`${fmt(pendingExpenses.length)} هزینه تنخواه در انتظار تأیید.`);
  }

  // Unsettled card reader transactions
  const pendingSettlement = (d.cardReaderTransactions || []).filter((t: any) => !t.settlementId);
  if (pendingSettlement.length > 10) {
    warnings.push(`${fmt(pendingSettlement.length)} تراکنش کارتخوان تسویه‌نشده.`);
  }

  // Draft journal entries
  const draftEntries = (d.journalEntries || []).filter((e: any) => e.status === 'draft');
  if (draftEntries.length > 5) {
    info.push(`${fmt(draftEntries.length)} سند حسابداری پیش‌نویس — ثبت نهایی کنید.`);
  }

  // Stale leads (no follow-up in 14+ days)
  const staleLeads = (d.leads || []).filter((l: any) => {
    if (['won', 'lost', 'converted'].includes(l.status)) return false;
    if (!l.nextFollowUp) return daysSince(l.createdAt) > 14;
    return daysSince(l.nextFollowUp) > 14;
  });
  if (staleLeads.length > 0) {
    warnings.push(`${fmt(staleLeads.length)} لید بدون پیگیری بیش از ۱۴ روز — فرصت تبدیل در حال از دست رفتن.`);
  }

  // Open tickets past SLA
  const slaBreached = (d.tickets || []).filter((t: any) => {
    if (t.status === 'closed' || t.status === 'resolved') return false;
    if (!t.slaDeadline) return false;
    return new Date(t.slaDeadline).getTime() < now;
  });
  if (slaBreached.length > 0) {
    critical.push(`${fmt(slaBreached.length)} تیکت از SLA گذشته — رضایت مشتری در خطر.`);
  }

  return {
    summary: `هشدارهای هوشمند سیستم:\n\n• بحرانی: ${fmt(critical.length)}\n• هشدار: ${fmt(warnings.length)}\n• اطلاع‌رسانی: ${fmt(info.length)}\n\n${critical.length > 0 ? '⚠ موارد بحرانی نیاز به اقدام فوری دارند.' : '✓ هیچ مورد بحرانی وجود ندارد.'}`,
    details: [
      ...critical.length > 0 ? ['بحرانی:', ...critical.map((a) => `• ${a}`)] : [],
      ...warnings.length > 0 ? ['هشدار:', ...warnings.map((a) => `• ${a}`)] : [],
      ...info.length > 0 ? ['اطلاع‌رسانی:', ...info.map((a) => `• ${a}`)] : [],
    ].flat(),
    alerts: [...critical, ...warnings],
    recommendations: [
      critical.length > 0 ? 'موارد بحرانی را فوراً بررسی و اقدام کنید.' : '',
      warnings.length > 0 ? 'هشدارها را در فرصت نزدیک پیگیری کنید.' : '',
      'برای دریافت خودکار این هشدارها، می‌توانید بازدید روزانه از این بخش را در نظر بگیرید.',
    ].filter(Boolean),
    stats: [
      { label: 'بحرانی', value: fmt(critical.length) },
      { label: 'هشدار', value: fmt(warnings.length) },
      { label: 'اطلاع‌رسانی', value: fmt(info.length) },
      { label: 'کل', value: fmt(critical.length + warnings.length + info.length) },
    ],
  };
}

// ─── 2. Lead Scoring ───

export function analyzeLeadScoring(d: any): AnalysisResult {
  const leads = d.leads || [];
  if (leads.length === 0) {
    return {
      summary: 'امتیازدهی هوشمند لیدها:\n\nهیچ لیدی در سیستم ثبت نشده است.',
      details: ['برای استفاده از این تحلیل، ابتدا لیدها را وارد کنید.'],
      alerts: [],
      recommendations: ['لیدهای جدید را از طریق صفحه لیدها ثبت کنید.'],
      stats: [],
    };
  }

  const scored = leads.map((l: any) => {
    let score = Number(l.score) || 0;
    // Source quality bonus
    const sourceBonus: Record<string, number> = { referral: 30, website: 20, event: 25, ads: 10, cold_call: 5 };
    score += sourceBonus[l.source] || 0;
    // Has contact info
    if (l.phone) score += 10;
    if (l.email) score += 10;
    // Has company
    if (l.company) score += 15;
    // Status progression
    const statusBonus: Record<string, number> = { new: 0, contacted: 15, qualified: 30, proposal: 45, negotiation: 60 };
    score += statusBonus[l.status] || 0;
    // Already linked to customer
    if (l.customerId) score += 50;
    // Recent follow-up
    if (l.nextFollowUp && daysUntil(l.nextFollowUp) >= 0 && daysUntil(l.nextFollowUp) <= 7) score += 20;

    const grade = score >= 150 ? 'A' : score >= 100 ? 'B' : score >= 60 ? 'C' : 'D';
    return { ...l, smartScore: score, grade };
  });

  const gradeA = scored.filter((l: any) => l.grade === 'A');
  const gradeB = scored.filter((l: any) => l.grade === 'B');
  const gradeC = scored.filter((l: any) => l.grade === 'C');
  const gradeD = scored.filter((l: any) => l.grade === 'D');

  const topLeads = [...scored].sort((a, b) => b.smartScore - a.smartScore).slice(0, 5);

  return {
    summary: `امتیازدهی هوشمند لیدها:\n\n• کل لیدها: ${fmt(leads.length)}\n• امتیاز A (بسیار داغ): ${fmt(gradeA.length)}\n• امتیاز B (داغ): ${fmt(gradeB.length)}\n• امتیاز C (گرم): ${fmt(gradeC.length)}\n• امتیاز D (سرد): ${fmt(gradeD.length)}\n\nتیم فروش باید روی لیدهای A و B تمرکز کند.`,
    details: topLeads.length > 0 ? [
      '۵ لید برتر:',
      ...topLeads.map((l, i) => `${fmt(i + 1)}. ${l.name} — امتیاز: ${fmt(l.smartScore)} (${l.grade}) — وضعیت: ${l.status}`),
    ] : ['داده‌ای موجود نیست.'],
    alerts: gradeD.length > leads.length * 0.5 ? ['بیش از ۵۰٪ لیدها سرد هستند — بازنگری در استراتژی جذب.'] : [],
    recommendations: [
      gradeA.length > 0 ? `${fmt(gradeA.length)} لید بسیار داغ — تماس فوری.` : '',
      gradeB.length > 0 ? `${fmt(gradeB.length)} لید داغ — پیگیری در ۲۴ ساعت.` : '',
      gradeD.length > 0 ? `${fmt(gradeD.length)} لید سرد — زمان‌بندی مجدد یا حذف.` : '',
    ].filter(Boolean),
    stats: [
      { label: 'کل', value: fmt(leads.length) },
      { label: 'امتیاز A', value: fmt(gradeA.length) },
      { label: 'امتیاز B', value: fmt(gradeB.length) },
      { label: 'امتیاز C', value: fmt(gradeC.length) },
      { label: 'امتیاز D', value: fmt(gradeD.length) },
    ],
  };
}

// ─── 3. Churn Prediction ───

export function analyzeChurnPrediction(d: any): AnalysisResult {
  const customers = d.customers || [];
  const invoices = d.invoices || [];
  const interactions = d.customerInteractions || [];
  const tickets = d.tickets || [];

  if (customers.length === 0) {
    return {
      summary: 'پیش‌بینی ریزش مشتری:\n\nهیچ مشتری در سیستم ثبت نشده است.',
      details: [],
      alerts: [],
      recommendations: [],
      stats: [],
    };
  }

  const churnRisks = customers.map((c: any) => {
    let riskScore = 0;
    const reasons: string[] = [];

    // Customer invoices
    const custInvoices = invoices.filter((i: any) => i.customerId === c.id);
    const totalSpent = custInvoices.reduce((s: number, i: any) => s + Number(i.amount), 0);

    // No purchase in 90+ days
    const lastInvoice = custInvoices.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (!lastInvoice) {
      riskScore += 40;
      reasons.push('هیچ خریدی ثبت نشده');
    } else {
      const days = daysSince(lastInvoice.createdAt);
      if (days > 180) { riskScore += 50; reasons.push(`۱۸۰+ روز بدون خرید`); }
      else if (days > 90) { riskScore += 35; reasons.push(`${fmt(days)} روز بدون خرید`); }
      else if (days > 60) { riskScore += 20; reasons.push(`${fmt(days)} روز بدون خرید`); }
    }

    // Overdue payments
    const overdueInv = custInvoices.filter((i: any) => Number(i.paid) < Number(i.amount) && i.dueDate && new Date(i.dueDate).getTime() < Date.now());
    if (overdueInv.length > 0) {
      riskScore += 20;
      reasons.push(`${fmt(overdueInv.length)} فاکتور معوق`);
    }

    // Open tickets
    const openTickets = tickets.filter((t: any) => t.customerId === c.id && t.status !== 'closed' && t.status !== 'resolved');
    if (openTickets.length > 2) {
      riskScore += 15;
      reasons.push(`${fmt(openTickets.length)} تیکت باز`);
    }

    // No interactions
    const custInteractions = interactions.filter((i: any) => i.customerId === c.id);
    if (custInteractions.length === 0) {
      riskScore += 15;
      reasons.push('بدون تعامل');
    }

    // Low score
    if (Number(c.score) < 0) {
      riskScore += 10;
      reasons.push('امتیاز منفی');
    }

    const level = riskScore >= 60 ? 'بحرانی' : riskScore >= 40 ? 'بالا' : riskScore >= 20 ? 'متوسط' : 'کم';
    return { id: c.id, name: c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'ناشناخته', riskScore, level, reasons, totalSpent };
  });

  const critical = churnRisks.filter((r: any) => r.level === 'بحرانی');
  const high = churnRisks.filter((r: any) => r.level === 'بالا');
  const medium = churnRisks.filter((r: any) => r.level === 'متوسط');
  const topRisks = [...churnRisks].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

  return {
    summary: `پیش‌بینی ریزش مشتری:\n\n• کل مشتریان: ${fmt(customers.length)}\n• ریسک بحرانی: ${fmt(critical.length)}\n• ریسک بالا: ${fmt(high.length)}\n• ریسک متوسط: ${fmt(medium.length)}\n• سالم: ${fmt(customers.length - critical.length - high.length - medium.length)}\n\n${critical.length > 0 ? '⚠ اقدام فوری برای مشتریان بحرانی ضروری است.' : '✓ وضعیت کلی مشتریان پایدار است.'}`,
    details: topRisks.filter((r) => r.riskScore > 0).length > 0 ? [
      'مشتریان پرریسک:',
      ...topRisks.filter((r) => r.riskScore > 0).map((r, i) => `${fmt(i + 1)}. ${r.name} — ریسک: ${fmt(r.riskScore)} (${r.level}) — ${r.reasons.join('، ')}`),
    ] : ['هیچ مشتری پرریسکی شناسایی نشد.'],
    alerts: critical.length > 0 ? [`${fmt(critical.length)} مشتری در معرض ریزش بحرانی — تماس فوری.`] : [],
    recommendations: [
      critical.length > 0 ? `با ${fmt(critical.length)} مشتری بحرانی تماس شخصی بگیرید.` : '',
      high.length > 0 ? `${fmt(high.length)} مشتری پرریسک — تخفیف یا تماس پیگیری.` : '',
      'برای مشتریان سالم، برنامه وفاداری را تقویت کنید.',
    ].filter(Boolean),
    stats: [
      { label: 'کل', value: fmt(customers.length) },
      { label: 'بحرانی', value: fmt(critical.length) },
      { label: 'ریسک بالا', value: fmt(high.length) },
      { label: 'ریسک متوسط', value: fmt(medium.length) },
      { label: 'سالم', value: fmt(customers.length - critical.length - high.length - medium.length) },
    ],
  };
}

// ─── 4. Cross-sell / Up-sell ───

export function analyzeCrossSell(d: any): AnalysisResult {
  const orders = d.orders || [];
  const products = d.products || [];
  const customers = d.customers || [];

  if (orders.length === 0 || products.length === 0) {
    return {
      summary: 'پیشنهاد محصول متقاطع:\n\nداده سفارش یا محصول کافی نیست.',
      details: [],
      alerts: [],
      recommendations: ['برای دریافت پیشنهاد، سفارش‌ها و محصولات را ثبت کنید.'],
      stats: [],
    };
  }

  // Build co-occurrence matrix: products bought together
  const coOccurrence: Record<string, Record<string, number>> = {};
  for (const order of orders) {
    const items = order.items || [];
    const productIds = items.map((i: any) => i.productId).filter(Boolean) as string[];
    for (let i = 0; i < productIds.length; i++) {
      for (let j = i + 1; j < productIds.length; j++) {
        if (!coOccurrence[productIds[i]]) coOccurrence[productIds[i]] = {};
        if (!coOccurrence[productIds[j]]) coOccurrence[productIds[j]] = {};
        coOccurrence[productIds[i]][productIds[j]] = (coOccurrence[productIds[i]][productIds[j]] || 0) + 1;
        coOccurrence[productIds[j]][productIds[i]] = (coOccurrence[productIds[j]][productIds[i]] || 0) + 1;
      }
    }
  }

  // For each customer, find what they haven't bought but should
  const recommendations: { customer: string; product: string; confidence: number }[] = [];
  for (const c of customers.slice(0, 100)) {
    const custOrders = orders.filter((o: any) => o.customerId === c.id);
    const boughtProductIds: Set<string> = new Set(
      custOrders.flatMap((o: any) => (o.items || []).map((i: any) => i.productId).filter(Boolean) as string[])
    );

    // Find products co-occurring with what they already bought
    const suggestions: Record<string, number> = {};
    for (const pid of Array.from(boughtProductIds)) {
      const co = coOccurrence[pid] || {};
      for (const [otherId, count] of Object.entries(co)) {
        if (!boughtProductIds.has(otherId)) {
          suggestions[otherId] = (suggestions[otherId] || 0) + count;
        }
      }
    }

    const topSuggestion = Object.entries(suggestions).sort((a, b) => b[1] - a[1])[0];
    if (topSuggestion) {
      const product = products.find((p: any) => p.id === topSuggestion[0]);
      if (product && product.active) {
        recommendations.push({
          customer: c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'ناشناخته',
          product: product.name,
          confidence: Math.min(100, topSuggestion[1] * 20),
        });
      }
    }
  }

  // Up-sell: customers who bought low-tier products, suggest premium
  const upSellCandidates = customers.slice(0, 50).map((c: any) => {
    const custOrders = orders.filter((o: any) => o.customerId === c.id);
    const items = custOrders.flatMap((o: any) => o.items || []);
    const avgPrice = items.length > 0 ? items.reduce((s: number, i: any) => s + Number(i.price), 0) / items.length : 0;
    const premiumProducts = products.filter((p: any) => p.active && Number(p.price) > avgPrice * 1.5).slice(0, 1);
    return premiumProducts.length > 0 ? { customer: c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'ناشناخته', product: premiumProducts[0].name, avgPrice } : null;
  }).filter(Boolean);

  return {
    summary: `پیشنهاد فروش متقاطع و افزایشی:\n\n• پیشنهاد متقاطع: ${fmt(recommendations.length)}\n• پیشنهاد افزایشی: ${fmt(upSellCandidates.length)}\n• محصولات فعال: ${fmt(products.filter((p: any) => p.active).length)}\n• مشتریان تحلیل‌شده: ${fmt(Math.min(customers.length, 100))}`,
    details: recommendations.slice(0, 5).length > 0 ? [
      'بهترین پیشنهادهای متقاطع:',
      ...recommendations.slice(0, 5).map((r: any, i: number) => `${fmt(i + 1)}. ${r.customer} → ${r.product} (اطمینان: ${fmt(r.confidence)}٪)`),
      ...upSellCandidates.slice(0, 3).length > 0 ? ['', 'پیشنهادهای افزایشی:', ...upSellCandidates.slice(0, 3).map((r: any, i: number) => `${fmt(i + 1)}. ${r.customer} → ${r.product}`)] : [],
    ].flat() : ['داده کافی برای پیشنهاد وجود ندارد.'],
    alerts: [],
    recommendations: [
      recommendations.length > 0 ? `${fmt(recommendations.length)} مشتری کاندید پیشنهاد متقاطع.` : '',
      upSellCandidates.length > 0 ? `${fmt(upSellCandidates.length)} مشتری کاندید پیشنهاد افزایشی.` : '',
      'پیشنهادها را در تماس یا ایمیل بعدی با مشتری مطرح کنید.',
    ].filter(Boolean),
    stats: [
      { label: 'پیشنهاد متقاطع', value: fmt(recommendations.length) },
      { label: 'پیشنهاد افزایشی', value: fmt(upSellCandidates.length) },
      { label: 'محصولات فعال', value: fmt(products.filter((p: any) => p.active).length) },
    ],
  };
}

// ─── 5. Smart Sales Resource Allocation ───

export function analyzeSalesAllocation(d: any): AnalysisResult {
  const leads = d.leads || [];
  const profiles = (d.profiles || []).filter((p: any) => p.active && p.userType === 'staff');
  const opportunities = d.opportunities || [];

  if (leads.length === 0) {
    return {
      summary: 'تخصیص هوشمند منابع فروش:\n\nهیچ لیدی برای تخصیص وجود ندارد.',
      details: [],
      alerts: [],
      recommendations: ['لیدهای جدید را ثبت کنید تا تخصیص خودکار فعال شود.'],
      stats: [],
    };
  }

  // Unassigned leads
  const unassigned = leads.filter((l: any) => !l.assignedTo && !['won', 'lost'].includes(l.status));

  // Per-salesperson load
  const salespeople = profiles.filter((p: any) => ['owner', 'admin', 'personnel'].includes(p.role));
  const workload = salespeople.map((p: any) => {
    const assignedLeads = leads.filter((l: any) => l.assignedTo === p.id && !['won', 'lost'].includes(l.status));
    const assignedOpps = opportunities.filter((o: any) => o.assignedTo === p.id);
    const totalPipelineValue = assignedOpps.reduce((s: number, o: any) => s + Number(o.amount) * Number(o.probability) / 100, 0);
    return {
      id: p.id,
      name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'ناشناخته',
      leadCount: assignedLeads.length,
      oppCount: assignedOpps.length,
      pipelineValue: totalPipelineValue,
    };
  });

  const sortedByLoad = [...workload].sort((a, b) => a.leadCount - b.leadCount);
  const bestCandidate = sortedByLoad[0];

  return {
    summary: `تخصیص هوشمند منابع فروش:\n\n• لیدهای تخصیص‌نیافته: ${fmt(unassigned.length)}\n• فروشندگان فعال: ${fmt(salespeople.length)}\n• پیشنهاد: ${bestCandidate ? bestCandidate.name : '—'} (کمترین بار)\n\n${unassigned.length > 0 ? `${fmt(unassigned.length)} لید در انتظار تخصیص.` : 'همه لیدها تخصیص یافته‌اند.'}`,
    details: [
      'بار کاری فروشندگان:',
      ...workload.sort((a: any, b: any) => b.leadCount - a.leadCount).map((w: any) => `• ${w.name} — ${fmt(w.leadCount)} لید، ${fmt(w.oppCount)} فرصت — ارزش: ${fmtToman(w.pipelineValue)}`),
      ...unassigned.length > 0 ? ['', 'لیدهای تخصیص‌نیافته:', ...unassigned.slice(0, 5).map((l: any) => `• ${l.name} — ${l.source || 'نامشخص'} — ${l.status}`)] : [],
    ].flat(),
    alerts: unassigned.length > 5 ? [`${fmt(unassigned.length)} لید بدون تخصیص — فرصت فروش هدر می‌رود.`] : [],
    recommendations: [
      bestCandidate && unassigned.length > 0 ? `${fmt(unassigned.length)} لید جدید را به ${bestCandidate.name} تخصیص دهید (کمترین بار کاری).` : '',
      workload.some((w: any) => w.leadCount > 20) ? 'برخی فروشندگان بار کاری سنگین دارند — بازتوزیع.' : '',
      'تخصیص خودکار بر اساس ظرفیت و تخصص را در تنظیمات فعال کنید.',
    ].filter(Boolean),
    stats: [
      { label: 'تخصیص‌نیافته', value: fmt(unassigned.length) },
      { label: 'فروشندگان', value: fmt(salespeople.length) },
      { label: 'کل لیدها', value: fmt(leads.length) },
      { label: 'فرصت‌ها', value: fmt(opportunities.length) },
    ],
  };
}

// ─── 6. Smart Inventory Management ───

export function analyzeSmartInventory(d: any): AnalysisResult {
  const products = (d.products || []).filter((p: any) => p.active);
  const stockMovements = d.stockMovements || [];

  if (products.length === 0) {
    return {
      summary: 'مدیریت موجودی هوشمند:\n\nهیچ محصولی ثبت نشده است.',
      details: [],
      alerts: [],
      recommendations: ['محصولات را ثبت کنید تا تحلیل موجودی فعال شود.'],
      stats: [],
    };
  }

  // Out of stock
  const outOfStock = products.filter((p: any) => Number(p.stock) === 0);
  // Low stock (at or below minStock)
  const lowStock = products.filter((p: any) => Number(p.stock) > 0 && Number(p.stock) <= Number(p.minStock) && Number(p.minStock) > 0);
  // Overstock (stock > 3x minStock and minStock > 0)
  const overstock = products.filter((p: any) => Number(p.minStock) > 0 && Number(p.stock) > Number(p.minStock) * 3);

  // Predict stockout date based on movement velocity
  const predictions = products.map((p: any) => {
    const movements = stockMovements.filter((m: any) => m.productId === p.id && m.type === 'out');
    const totalOut = movements.reduce((s: number, m: any) => s + Number(m.quantity), 0);
    const daysTracked = movements.length > 0 ? Math.max(1, daysSince(movements[0].createdAt)) : 30;
    const dailyVelocity = totalOut / daysTracked;
    const daysToStockout = dailyVelocity > 0 ? Math.floor(Number(p.stock) / dailyVelocity) : Infinity;
    return { name: p.name, stock: Number(p.stock), minStock: Number(p.minStock), dailyVelocity, daysToStockout };
  });

  const stockoutSoon = predictions.filter((p: any) => p.daysToStockout !== Infinity && p.daysToStockout <= 14 && p.daysToStockout > 0);
  const stockoutSorted = [...stockoutSoon].sort((a, b) => a.daysToStockout - b.daysToStockout);

  // Inventory value
  const totalValue = products.reduce((s: number, p: any) => s + Number(p.stock) * Number(p.cost), 0);
  const totalRetail = products.reduce((s: number, p: any) => s + Number(p.stock) * Number(p.price), 0);

  return {
    summary: `مدیریت موجودی هوشمند:\n\n• محصولات فعال: ${fmt(products.length)}\n• ناموجود: ${fmt(outOfStock.length)}\n• موجودی کم: ${fmt(lowStock.length)}\n• موجودی مازاد: ${fmt(overstock.length)}\n• اتمام در ۱۴ روز: ${fmt(stockoutSoon.length)}\n• ارزش موجودی (خرید): ${fmtToman(totalValue)}\n• ارزش موجودی (فروش): ${fmtToman(totalRetail)}`,
    details: [
      ...outOfStock.length > 0 ? ['ناموجود:', ...outOfStock.slice(0, 5).map((p: any) => `• ${p.name} — موجودی: ۰`)] : [],
      ...stockoutSorted.length > 0 ? ['اتمام در ۱۴ روز آینده:', ...stockoutSorted.slice(0, 5).map((p: any) => `• ${p.name} — ${fmt(p.daysToStockout)} روز — سرعت: ${fmt(p.dailyVelocity)}/روز`)] : [],
      ...overstock.length > 0 ? ['موجودی مازاد:', ...overstock.slice(0, 3).map((p: any) => `• ${p.name} — موجودی: ${fmt(p.stock)} (سقف: ${fmt(p.minStock)})`)] : [],
    ].flat(),
    alerts: [
      ...outOfStock.length > 0 ? [`${fmt(outOfStock.length)} محصول ناموجود — فروش متوقف.`] : [],
      ...stockoutSoon.length > 0 ? [`${fmt(stockoutSoon.length)} محصول در ۱۴ روز تمام می‌شود — سفارش مجدد.`] : [],
    ],
    recommendations: [
      outOfStock.length > 0 ? `سفارش فوری برای ${fmt(outOfStock.length)} محصول ناموجود.` : '',
      stockoutSoon.length > 0 ? `سفارش پیشگیرانه برای ${fmt(stockoutSoon.length)} محصول.` : '',
      overstock.length > 0 ? `${fmt(overstock.length)} محصول موجودی مازاد — تخفیف یا توقف خرید.` : '',
    ].filter(Boolean),
    stats: [
      { label: 'محصولات', value: fmt(products.length) },
      { label: 'ناموجود', value: fmt(outOfStock.length) },
      { label: 'موجودی کم', value: fmt(lowStock.length) },
      { label: 'اتمام ۱۴ روز', value: fmt(stockoutSoon.length) },
      { label: 'ارزش موجودی', value: fmtToman(totalValue) },
    ],
  };
}

// ─── 7. Customer Profitability Analysis ───

export function analyzeCustomerProfitability(d: any): AnalysisResult {
  const customers = d.customers || [];
  const invoices = d.invoices || [];
  const tickets = d.tickets || [];
  const payments = d.payments || [];

  if (customers.length === 0) {
    return {
      summary: 'تحلیل سودآوری مشتری:\n\nهیچ مشتری ثبت نشده است.',
      details: [],
      alerts: [],
      recommendations: [],
      stats: [],
    };
  }

  const analysis = customers.map((c: any) => {
    const custInvoices = invoices.filter((i: any) => i.customerId === c.id);
    const revenue = custInvoices.reduce((s: number, i: any) => s + Number(i.amount), 0);
    const paid = custInvoices.reduce((s: number, i: any) => s + Number(i.paid), 0);

    // Estimate service cost: tickets + payment processing
    const custTickets = tickets.filter((t: any) => t.customerId === c.id);
    const ticketCost = custTickets.length * 50000; // estimated 50k per ticket
    const custPayments = payments.filter((p: any) => p.customerId === c.id);
    const processingCost = custPayments.reduce((s: number, p: any) => s + Number(p.amount) * 0.02, 0);
    // Overdue penalty (cost of capital)
    const overdueAmt = custInvoices
      .filter((i: any) => Number(i.paid) < Number(i.amount) && i.dueDate && new Date(i.dueDate).getTime() < Date.now())
      .reduce((s: number, i: any) => s + (Number(i.amount) - Number(i.paid)), 0);
    const capitalCost = overdueAmt * 0.05; // 5% cost of capital on overdue

    const totalCost = ticketCost + processingCost + capitalCost;
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      id: c.id,
      name: c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'ناشناخته',
      revenue,
      paid,
      cost: totalCost,
      profit,
      margin,
      ticketCount: custTickets.length,
      overdueAmount: overdueAmt,
    };
  });

  const profitable = analysis.filter((a: any) => a.profit > 0).sort((a: any, b: any) => b.profit - a.profit);
  const lossMaking = analysis.filter((a: any) => a.profit < 0).sort((a: any, b: any) => a.profit - b.profit);
  const topProfitable = profitable.slice(0, 5);
  const topLossMaking = lossMaking.slice(0, 5);

  const totalRevenue = analysis.reduce((s: number, a: any) => s + a.revenue, 0);
  const totalCost = analysis.reduce((s: number, a: any) => s + a.cost, 0);
  const totalProfit = totalRevenue - totalCost;

  return {
    summary: `تحلیل سودآوری مشتری:\n\n• کل مشتریان: ${fmt(customers.length)}\n• سودآور: ${fmt(profitable.length)}\n• زیان‌ده: ${fmt(lossMaking.length)}\n• کل درآمد: ${fmtToman(totalRevenue)}\n• کل هزینه خدمت: ${fmtToman(totalCost)}\n• سود خالص: ${fmtToman(totalProfit)}\n• حاشیه سود: ${totalRevenue > 0 ? fmt((totalProfit / totalRevenue) * 100) + '٪' : 'نامشخص'}`,
    details: [
      ...topProfitable.length > 0 ? ['سودآورترین مشتریان:', ...topProfitable.map((a: any, i: number) => `${fmt(i + 1)}. ${a.name} — سود: ${fmtToman(a.profit)} — حاشیه: ${fmt(a.margin)}٪`)] : [],
      ...topLossMaking.length > 0 ? ['زیان‌ده‌ترین مشتریان:', ...topLossMaking.map((a: any, i: number) => `${fmt(i + 1)}. ${a.name} — زیان: ${fmtToman(Math.abs(a.profit))} — معوق: ${fmtToman(a.overdueAmount)}`)] : [],
    ].flat(),
    alerts: lossMaking.length > 0 ? [`${fmt(lossMaking.length)} مشتری زیان‌ده — هزینه خدمت از درآمد بیشتر است.`] : [],
    recommendations: [
      lossMaking.length > 0 ? `برای ${fmt(lossMaking.length)} مشتری زیان‌ده، بازنگری قیمت یا شرایط اعتباری.` : '',
      topProfitable.length > 0 ? `${fmt(topProfitable.length)} مشتری برتر — حفظ و توسعه رابطه.` : '',
      'هزینه تیکت‌ها را با خودسرویس و پایگاه دانش کاهش دهید.',
    ].filter(Boolean),
    stats: [
      { label: 'سودآور', value: fmt(profitable.length) },
      { label: 'زیان‌ده', value: fmt(lossMaking.length) },
      { label: 'کل سود', value: fmtToman(totalProfit) },
      { label: 'حاشیه سود', value: totalRevenue > 0 ? fmt((totalProfit / totalRevenue) * 100) + '٪' : '—' },
    ],
  };
}

// ─── 8. Financial Calendar ───

export function analyzeFinancialCalendar(d: any): AnalysisResult {
  const now = Date.now();
  const events: { date: string; label: string; amount: number; type: string; daysAway: number }[] = [];

  // Cheque due dates
  for (const c of (d.receivedCheques || [])) {
    if (['cleared', 'returned', 'voided'].includes(c.status)) continue;
    if (!c.dueDate) continue;
    const days = daysUntil(c.dueDate);
    if (days < 0 || days > 90) continue;
    events.push({ date: c.dueDate, label: `چک ${c.chequeNumber || ''} — وصول`, amount: Number(c.amount), type: 'cheque', daysAway: days });
  }

  // Invoice due dates
  for (const i of (d.invoices || [])) {
    if (Number(i.paid) >= Number(i.amount)) continue;
    if (!i.dueDate) continue;
    const days = daysUntil(i.dueDate);
    if (days < -30 || days > 90) continue;
    const c = (d.customers || []).find((x: any) => x.id === i.customerId);
    const name = c ? (c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim()) : 'ناشناخته';
    events.push({ date: i.dueDate, label: `فاکتور ${i.number} — ${name}`, amount: Number(i.amount) - Number(i.paid), type: 'invoice', daysAway: days });
  }

  // Payment announcements
  for (const a of (d.paymentAnnouncements || [])) {
    if (!a.date || a.status === 'confirmed') continue;
    const days = daysUntil(a.date);
    if (days < 0 || days > 90) continue;
    events.push({ date: a.date, label: `اعلامیه — ${a.counterparty || ''}`, amount: Number(a.amount), type: 'announcement', daysAway: days });
  }

  // Fiscal year end
  for (const fy of (d.fiscalYears || [])) {
    if (fy.status !== 'open') continue;
    if (!fy.endDate) continue;
    const days = daysUntil(fy.endDate);
    if (days < 0 || days > 180) continue;
    events.push({ date: fy.endDate, label: `پایان سال مالی ${fy.name}`, amount: 0, type: 'fiscal', daysAway: days });
  }

  events.sort((a, b) => a.daysAway - b.daysAway);

  const overdue = events.filter((e: any) => e.daysAway < 0);
  const thisWeek = events.filter((e: any) => e.daysAway >= 0 && e.daysAway <= 7);
  const thisMonth = events.filter((e: any) => e.daysAway > 7 && e.daysAway <= 30);
  const upcoming = events.filter((e: any) => e.daysAway > 30);

  const totalUpcoming = events.filter((e: any) => e.daysAway >= 0).reduce((s: number, e: any) => s + e.amount, 0);
  const totalOverdue = overdue.reduce((s: number, e: any) => s + e.amount, 0);

  return {
    summary: `تقویم مالی هوشمند:\n\n• رویدادهای گذشته: ${fmt(overdue.length)} (${fmtToman(totalOverdue)})\n• هفتۀ جاری: ${fmt(thisWeek.length)}\n• این ماه: ${fmt(thisMonth.length)}\n• آینده (۳۰+ روز): ${fmt(upcoming.length)}\n• ارزش تعهدات آینده: ${fmtToman(totalUpcoming)}`,
    details: events.slice(0, 10).map((e: any) => {
      const when = e.daysAway < 0 ? `${fmt(Math.abs(e.daysAway))} روز گذشته` : e.daysAway === 0 ? 'امروز' : `${fmt(e.daysAway)} روز دیگر`;
      const amt = e.amount > 0 ? ` — ${fmtToman(e.amount)}` : '';
      return `• ${when}: ${e.label}${amt}`;
    }),
    alerts: overdue.length > 0 ? [`${fmt(overdue.length)} تعهد گذشته (${fmtToman(totalOverdue)}) — اقدام فوری.`] : [],
    recommendations: [
      thisWeek.length > 0 ? `${fmt(thisWeek.length)} رویداد در این هفته — آماده شوید.` : '',
      overdue.length > 0 ? `تعهدات گذشته را فوراً تسویه کنید.` : '',
      'تقویم مالی را هفتگی بررسی کنید.',
    ].filter(Boolean),
    stats: [
      { label: 'گذشته', value: fmt(overdue.length) },
      { label: 'این هفته', value: fmt(thisWeek.length) },
      { label: 'این ماه', value: fmt(thisMonth.length) },
      { label: 'آینده', value: fmt(upcoming.length) },
      { label: 'ارزش آینده', value: fmtToman(totalUpcoming) },
    ],
  };
}

// ─── 9. Conversion Path Analysis ───

export function analyzeConversionPath(d: any): AnalysisResult {
  const leads = d.leads || [];
  const demos = d.demos || [];
  const preInvoices = d.preInvoices || [];
  const orders = d.orders || [];
  const invoices = d.invoices || [];

  const totalLeads = leads.length;
  const contactedLeads = leads.filter((l: any) => ['contacted', 'qualified', 'proposal', 'negotiation', 'won', 'converted'].includes(l.status));
  const demoLeads = leads.filter((l: any) => l.customerId);
  const wonLeads = leads.filter((l: any) => ['won', 'converted'].includes(l.status));

  // Funnel stages
  const stage1 = totalLeads;
  const stage2 = contactedLeads.length;
  const stage3 = demos.length;
  const stage4 = preInvoices.length;
  const stage5 = orders.length;
  const stage6 = invoices.filter((i: any) => Number(i.paid) >= Number(i.amount) && Number(i.amount) > 0).length;

  const rate1 = stage1 > 0 ? (stage2 / stage1) * 100 : 0;
  const rate2 = stage2 > 0 ? (stage3 / stage2) * 100 : 0;
  const rate3 = stage3 > 0 ? (stage4 / stage3) * 100 : 0;
  const rate4 = stage4 > 0 ? (stage5 / stage4) * 100 : 0;
  const rate5 = stage5 > 0 ? (stage6 / stage5) * 100 : 0;
  const overallRate = stage1 > 0 ? (stage6 / stage1) * 100 : 0;

  // Find biggest drop-off
  const dropoffs = [
    { from: 'لید → تماس', rate: rate1, drop: stage1 - stage2 },
    { from: 'تماس → دمو', rate: rate2, drop: stage2 - stage3 },
    { from: 'دمو → پیش‌فاکتور', rate: rate3, drop: stage3 - stage4 },
    { from: 'پیش‌فاکتور → سفارش', rate: rate4, drop: stage4 - stage5 },
    { from: 'سفارش → فاکتور پرداخت‌شده', rate: rate5, drop: stage5 - stage6 },
  ];
  const biggestDropoff = dropoffs.sort((a: any, b: any) => b.drop - a.drop)[0];

  return {
    summary: `تحلیل مسیر تبدیل:\n\n• لید: ${fmt(stage1)}\n• تماس‌شده: ${fmt(stage2)} (${fmt(rate1)}٪)\n• دمو: ${fmt(stage3)} (${fmt(rate2)}٪)\n• پیش‌فاکتور: ${fmt(stage4)} (${fmt(rate3)}٪)\n• سفارش: ${fmt(stage5)} (${fmt(rate4)}٪)\n• فاکتور پرداخت‌شده: ${fmt(stage6)} (${fmt(rate5)}٪)\n• نرخ تبدیل کل: ${fmt(overallRate)}٪`,
    details: [
      'نرخ تبدیل هر مرحله:',
      ...dropoffs.map((d: any) => `• ${d.from}: ${fmt(d.rate)}٪ — ریزش: ${fmt(d.drop)}`),
      ...biggestDropoff && biggestDropoff.drop > 0 ? ['', `بزرگ‌ترین ریزش: ${biggestDropoff.from} — ${fmt(biggestDropoff.drop)} مورد`] : [],
    ],
    alerts: overallRate < 5 && stage1 > 10 ? ['نرخ تبدیل کل زیر ۵٪ — بازنگری فرآیند فروش.'] : [],
    recommendations: [
      rate1 < 50 ? 'نرخ تماس پایین — سرعت پیگیری لیدها را افزایش دهید.' : '',
      rate2 < 30 ? 'نرخ تبدیل به دمو پایین — کیفیت تماس‌ها را بهبود دهید.' : '',
      rate4 < 50 ? 'نرخ تبدیل پیش‌فاکتور به سفارش پایین — قیمت یا شرایط را بررسی کنید.' : '',
      biggestDropoff && biggestDropoff.drop > 0 ? `تمرکز روی مرحله «${biggestDropoff.from}» — بیشترین ریزش.` : '',
    ].filter(Boolean),
    stats: [
      { label: 'لید', value: fmt(stage1) },
      { label: 'تماس', value: fmt(stage2) },
      { label: 'دمو', value: fmt(stage3) },
      { label: 'پیش‌فاکتور', value: fmt(stage4) },
      { label: 'سفارش', value: fmt(stage5) },
      { label: 'نرخ کل', value: fmt(overallRate) + '٪' },
    ],
  };
}
