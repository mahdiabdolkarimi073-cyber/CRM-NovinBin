import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import type { Prisma } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function serializeData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'bigint') return Number(data);
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(serializeData);
  if (typeof data === 'object') {
    const result: any = {};
    for (const key of Object.keys(data)) {
      result[key] = serializeData(data[key]);
    }
    return result;
  }
  return data;
}

// Map model names to Prisma delegates
const MODEL_MAP: Record<string, any> = {
  customers: prisma.customer,
  leads: prisma.lead,
  opportunities: prisma.opportunity,
  tasks: prisma.task,
  task_comments: prisma.taskComment,
  task_assignees: prisma.taskAssignee,
  products: prisma.product,
  product_categories: prisma.productCategory,
  orders: prisma.order,
  order_items: prisma.orderItem,
  invoices: prisma.invoice,
  meetings: prisma.meeting,
  meeting_participants: prisma.meetingParticipant,
  meeting_assignments: prisma.meetingAssignment,
  tickets: prisma.ticket,
  notifications: prisma.notification,
  loyalty_transactions: prisma.loyaltyTransaction,
  profiles: prisma.profile,
  organizations: prisma.organization,
  branches: prisma.branch,
  departments: prisma.department,
  teams: prisma.team,
  team_members: prisma.teamMember,
  accounts: prisma.account,
  journal_entries: prisma.journalEntry,
  journal_lines: prisma.journalLine,
  fiscal_years: prisma.fiscalYear,
  fiscal_periods: prisma.fiscalPeriod,
  cost_centers: prisma.costCenter,
  bank_accounts: prisma.bankAccount,
  cash_funds: prisma.cashFund,
  fund_transfers: prisma.fundTransfer,
  cheques: prisma.cheque,
  payments: prisma.payment,
  expense_claims: prisma.expenseClaim,
  expense_claim_items: prisma.expenseClaimItem,
  warehouses: prisma.warehouse,
  stock_movements: prisma.stockMovement,
  suppliers: prisma.supplier,
  purchase_orders: prisma.purchaseOrder,
  employees: prisma.employee,
  attendance_records: prisma.attendanceRecord,
  leave_requests: prisma.leaveRequest,
  registration_requests: prisma.registrationRequest,
  daily_work_reports: prisma.dailyWorkReport,
  monthly_work_reports: prisma.monthlyWorkReport,
  work_report_images: prisma.workReportImage,
  customer_assignments: prisma.customerAssignment,
  staff_contracts: prisma.staffContract,
  pre_invoices: prisma.preInvoice,
  pre_invoice_items: prisma.preInvoiceItem,
  sales_returns: prisma.salesReturn,
  return_items: prisma.returnItem,
  receipts: prisma.receipt,
  call_logs: prisma.callLog,
  demos: prisma.demo,
  academy_students: prisma.academyStudent,
  academy_enrollments: prisma.academyEnrollment,
  page_permissions: prisma.pagePermission,
  user_manager: prisma.userManager,
  customer_chat_messages: prisma.customerChatMessage,
  subscription_plans: prisma.subscriptionPlan,
  modules: prisma.module,
  tenant_modules: prisma.tenantModule,
  subscriptions: prisma.subscription,
  usage_records: prisma.usageRecord,
  billing_invoices: prisma.billingInvoice,
  audit_logs: prisma.auditLog,
  stock_transfers: prisma.stockTransfer,
  customer_interactions: prisma.customerInteraction,
  customer_segments: prisma.customerSegment,
  customer_segment_members: prisma.customerSegmentMember,
  loyalty_rewards: prisma.loyaltyReward,
  loyalty_redemptions: prisma.loyaltyRedemption,
  demo_activities: prisma.demoActivity,
  approval_requests: prisma.approvalRequest,
  documents: prisma.document,
  knowledge_articles: prisma.knowledgeArticle,
  goals: prisma.goal,
  kpi_records: prisma.kpiRecord,
  personal_notes: prisma.personalNote,
  staff_chat_messages: prisma.staffChatMessage,
  my_customers: prisma.myCustomer,
  ticket_messages: prisma.ticketMessage,
  contact_parties: prisma.contactParty,
  contact_related_persons: prisma.contactRelatedPerson,
  contact_addresses: prisma.contactAddress,
  contact_phones: prisma.contactPhone,
  payment_announcements: prisma.paymentAnnouncement,
  withdrawal_announcements: prisma.withdrawalAnnouncement,
  my_cheques: prisma.myCheque,
  petty_cash_custodians: prisma.pettyCashCustodian,
  petty_cash_payments: prisma.pettyCashPayment,
  petty_cash_expenses: prisma.pettyCashExpense,
  petty_cash_expense_statements: prisma.pettyCashExpenseStatement,
  petty_cash_expense_statement_items: prisma.pettyCashExpenseStatementItem,
  petty_cash_merge_statements: prisma.pettyCashMergeStatement,
  petty_cash_merge_histories: prisma.pettyCashMergeHistory,
  document_issuances: prisma.documentIssuance,
  document_issuance_lines: prisma.documentIssuanceLine,
  document_issuance_histories: prisma.documentIssuanceHistory,
  contact_settlements: prisma.contactSettlement,
  contact_settlement_items: prisma.contactSettlementItem,
  contact_settlement_history: prisma.contactSettlementHistory,
  received_cheques: prisma.receivedCheque,
  received_cheque_operations: prisma.receivedChequeOperation,
  cheque_refunds: prisma.chequeRefund,
  cheque_refund_history: prisma.chequeRefundHistory,
  cheque_clearings: prisma.chequeClearing,
  cheque_clearing_history: prisma.chequeClearingHistory,
  card_readers: prisma.cardReader,
  card_reader_transactions: prisma.cardReaderTransaction,
  card_reader_settlements: prisma.cardReaderSettlement,
  card_reader_settlement_items: prisma.cardReaderSettlementItem,
  card_reader_settlement_history: prisma.cardReaderSettlementHistory,
  card_reader_history: prisma.cardReaderHistory,
  stock_takings: prisma.stockTaking,
  stock_taking_items: prisma.stockTakingItem,
  stock_taking_history: prisma.stockTakingHistory,
  service_purchase_invoices: prisma.servicePurchaseInvoice,
  service_purchase_invoice_items: prisma.servicePurchaseInvoiceItem,
  service_purchase_invoice_history: prisma.servicePurchaseInvoiceHistory,
  warehouse_receipts: prisma.warehouseReceipt,
  warehouse_receipt_items: prisma.warehouseReceiptItem,
  warehouse_receipt_history: prisma.warehouseReceiptHistory,
  financial_announcements: prisma.financialAnnouncement,
  financial_announcement_items: prisma.financialAnnouncementItem,
  financial_announcement_history: prisma.financialAnnouncementHistory,
  commissions: prisma.commission,
  commission_items: prisma.commissionItem,
  commission_adjustments: prisma.commissionAdjustment,
  commission_history: prisma.commissionHistory,
  commission_rules: prisma.commissionRule,
  customs_declarations: prisma.customsDeclaration,
  customs_declaration_items: prisma.customsDeclarationItem,
  customs_declaration_costs: prisma.customsDeclarationCost,
  customs_declaration_payments: prisma.customsDeclarationPayment,
  customs_declaration_history: prisma.customsDeclarationHistory,
  process_agents: prisma.processAgent,
  process_agent_roles: prisma.processAgentRole,
  process_agent_debts: prisma.processAgentDebt,
  process_agent_history: prisma.processAgentHistory,
  sales_invoices: prisma.salesInvoice,
  sales_invoice_items: prisma.salesInvoiceItem,
  sales_invoice_history: prisma.salesInvoiceHistory,
  lead_referrals: prisma.leadReferral,
};

function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string }; 
  } catch {
    return null;
  }
}

function cleanWhere(where: any): any {
  return where;
}

const MODEL_PAGE: Record<string, string> = {
  customers: '/dashboard/customers', leads: '/dashboard/leads', opportunities: '/dashboard/pipeline',
  tasks: '/dashboard/tasks',
  task_assignees: '/dashboard/tasks', products: '/dashboard/products', product_categories: '/dashboard/products',
  orders: '/dashboard/orders', invoices: '/dashboard/invoices', meetings: '/dashboard/meetings',
  tickets: '/dashboard/tickets', notifications: '/dashboard/notifications', profiles: '/dashboard/users',
  organizations: '/dashboard/organization', accounts: '/dashboard/accounting', journal_entries: '/dashboard/accounting',
  bank_accounts: '/dashboard/bank-accounts', cash_funds: '/dashboard/accounting', cheques: '/dashboard/accounting',
  payments: '/dashboard/payments', expense_claims: '/dashboard/hr', employees: '/dashboard/hr',
  attendance_records: '/dashboard/hr', leave_requests: '/dashboard/hr', registration_requests: '/dashboard/registration-approval',
  daily_work_reports: '/dashboard/work-reports/daily', monthly_work_reports: '/dashboard/work-reports/monthly',
  customer_assignments: '/dashboard/customer-assignment', staff_contracts: '/dashboard/contracts',
  pre_invoices: '/dashboard/pre-invoices', sales_returns: '/dashboard/returns', receipts: '/dashboard/receipts',
  call_logs: '/dashboard/calls', demos: '/dashboard/demos', academy_students: '/dashboard/finance-academy',
  customer_chat_messages: '/dashboard/customers-chat', page_permissions: '/dashboard/users', user_manager: '/dashboard/users',
  stock_transfers: '/dashboard/stock-transfers', customer_interactions: '/dashboard/customer-interactions',
  customer_segments: '/dashboard/customer-segments', loyalty_rewards: '/dashboard/loyalty-rewards',
  loyalty_transactions: '/dashboard/loyalty', demo_activities: '/dashboard/demo-activities',
  my_customers: '/dashboard/my-customers',
  ticket_messages: '/dashboard/tickets',
  contact_parties: '/dashboard/contact-parties',
  payment_announcements: '/dashboard/payment-announcements',
  petty_cash_custodians: '/dashboard/petty-cash',
  petty_cash_payments: '/dashboard/petty-cash',
  petty_cash_expenses: '/dashboard/petty-cash',
  petty_cash_expense_statements: '/dashboard/petty-cash',
  petty_cash_expense_statement_items: '/dashboard/petty-cash',
  petty_cash_merge_statements: '/dashboard/petty-cash-merge',
  petty_cash_merge_histories: '/dashboard/petty-cash-merge',
  document_issuances: '/dashboard/document-issuance',
  document_issuance_lines: '/dashboard/document-issuance',
  document_issuance_histories: '/dashboard/document-issuance',
  contact_settlements: '/dashboard/contact-settlements',
  contact_settlement_items: '/dashboard/contact-settlements',
  contact_settlement_history: '/dashboard/contact-settlements',
  received_cheques: '/dashboard/received-cheques',
  received_cheque_operations: '/dashboard/received-cheques',
  cheque_refunds: '/dashboard/cheque-refunds',
  cheque_refund_history: '/dashboard/cheque-refunds',
  cheque_clearings: '/dashboard/cheque-clearings',
  cheque_clearing_history: '/dashboard/cheque-clearings',
  card_readers: '/dashboard/card-readers',
  card_reader_transactions: '/dashboard/card-readers',
  card_reader_settlements: '/dashboard/card-reader-settlements',
  card_reader_settlement_items: '/dashboard/card-reader-settlements',
  card_reader_settlement_history: '/dashboard/card-reader-settlements',
  card_reader_history: '/dashboard/card-readers',
  stock_takings: '/dashboard/stock-taking',
  stock_taking_items: '/dashboard/stock-taking',
  stock_taking_history: '/dashboard/stock-taking',
  service_purchase_invoices: '/dashboard/service-purchase-invoices',
  service_purchase_invoice_items: '/dashboard/service-purchase-invoices',
  service_purchase_invoice_history: '/dashboard/service-purchase-invoices',
  warehouse_receipts: '/dashboard/warehouse-receipts',
  warehouse_receipt_items: '/dashboard/warehouse-receipts',
  warehouse_receipt_history: '/dashboard/warehouse-receipts',
  financial_announcements: '/dashboard/financial-announcements',
  financial_announcement_items: '/dashboard/financial-announcements',
  financial_announcement_history: '/dashboard/financial-announcements',
  commissions: '/dashboard/commissions',
  commission_items: '/dashboard/commissions',
  commission_adjustments: '/dashboard/commissions',
  commission_history: '/dashboard/commissions',
  commission_rules: '/dashboard/commissions',
  customs_declarations: '/dashboard/customs-declarations',
  customs_declaration_items: '/dashboard/customs-declarations',
  customs_declaration_costs: '/dashboard/customs-declarations',
  customs_declaration_payments: '/dashboard/customs-declarations',
  customs_declaration_history: '/dashboard/customs-declarations',
  process_agents: '/dashboard/process-agents',
  process_agent_roles: '/dashboard/process-agents',
  process_agent_debts: '/dashboard/process-agents',
  process_agent_history: '/dashboard/process-agents',
  sales_invoices: '/dashboard/sales-invoices',
  sales_invoice_items: '/dashboard/sales-invoices',
  sales_invoice_history: '/dashboard/sales-invoices',
  lead_referrals: '/dashboard/leads',
};

const SHARED_MODELS = new Set([
  'profiles', 'user_manager', 'customers', 'notifications',
  'personal_notes', 'staff_chat_messages', 'my_customers', 'ticket_messages',
  'task_assignees', 'lead_referrals',
]);

async function canAccess(auth: { userId: string }, model: string): Promise<boolean> {
  const page = MODEL_PAGE[model];
  if (!page) return true;
  const profile = await prisma.profile.findUnique({ where: { id: auth.userId }, select: { userType: true, role: true, active: true, assignedPages: true, customerId: true } });
  if (!profile?.active) return false;
  if (profile.role === 'owner' || profile.role === 'super_admin' || profile.role === 'admin') return true;
  if (model === 'customer_chat_messages' && profile.userType === 'customer' && profile.customerId) return true;
  if (SHARED_MODELS.has(model)) return true;
  const pages = profile.assignedPages;
  if (pages && Array.isArray(pages) && pages.includes(page)) return true;
  const perm = await prisma.pagePermission.findFirst({ where: { profileId: auth.userId, pagePath: page } });
  return !!perm;
}

// GET /api/data?model=customers&filter=...
export async function GET(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const model = searchParams.get('model');
  if (!model || !MODEL_MAP[model]) {
    return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
  }

  const whereStr = searchParams.get('where');
  if (!(await canAccess(auth, model))) return NextResponse.json({ error: 'دسترسی به این بخش برای شما فعال نیست' }, { status: 403 });
  let where = whereStr ? JSON.parse(whereStr) : {};
  if (model === 'customer_chat_messages') {
    const fullProfile = await prisma.profile.findUnique({ where: { id: auth.userId }, select: { userType: true, customerId: true, role: true } });
    if (fullProfile?.userType === 'customer' && fullProfile.customerId) {
      where = { ...where, customerId: fullProfile.customerId };
    }
  }
  if (model === 'personal_notes') {
    where = { ...where, profileId: auth.userId };
  }
  if (model === 'staff_chat_messages') {
    where = { ...where, OR: [{ senderId: auth.userId }, { receiverId: auth.userId }] };
  }
  if (model === 'my_customers') {
    const fullProfile = await prisma.profile.findUnique({ where: { id: auth.userId }, select: { role: true } });
    if (fullProfile?.role !== 'super_admin' && fullProfile?.role !== 'owner') {
      where = { ...where, profileId: auth.userId };
    }
  }
  if (model === 'meetings' || model === 'meeting_assignments' || model === 'notifications') {
    const fullProfile = await prisma.profile.findUnique({ where: { id: auth.userId }, select: { role: true } });
    const canSeeAll = fullProfile?.role === 'admin' || fullProfile?.role === 'super_admin' || fullProfile?.role === 'owner';
    if (!canSeeAll && model === 'meetings') {
      where = { ...where, assignments: { some: { assignedTo: auth.userId } } };
    }
    if (!canSeeAll && model === 'meeting_assignments') {
      where = { ...where, assignedTo: auth.userId };
    }
    if (!canSeeAll && model === 'notifications') {
      where = { ...where, profileId: auth.userId };
    }
  }
  const includeStr = searchParams.get('include');
  const include = includeStr ? JSON.parse(includeStr) : undefined;
  const orderByStr = searchParams.get('orderBy');
  const orderBy = orderByStr ? JSON.parse(orderByStr) : undefined;
  const takeStr = searchParams.get('take');
  const take = takeStr ? parseInt(takeStr) : undefined;

  try {
    const records = await MODEL_MAP[model].findMany({ where, include, orderBy, take });
    return NextResponse.json({ data: serializeData(records) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/data  { model, data, include? }
export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { model, data, include } = body;
  if (!(await canAccess(auth, model))) return NextResponse.json({ error: 'دسترسی به این بخش برای شما فعال نیست' }, { status: 403 });
  if (!model || !MODEL_MAP[model]) {
    return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
  }

  let postData = data;
  if (model === 'customer_chat_messages') {
    const fullProfile = await prisma.profile.findUnique({ where: { id: auth.userId }, select: { userType: true, customerId: true, role: true } });
    if (fullProfile?.userType === 'customer' && fullProfile.customerId) {
      postData = { ...data, customerId: fullProfile.customerId, senderType: 'customer', senderId: auth.userId };
    }
  }
  if (model === 'personal_notes') {
    postData = { ...data, profileId: auth.userId };
  }
  if (model === 'staff_chat_messages') {
    postData = { ...data, senderId: auth.userId };
  }
  if (model === 'ticket_messages') {
    postData = { ...data, senderId: auth.userId, senderType: 'staff' };
  }
  if (model === 'my_customers') {
    const fullProfile = await prisma.profile.findUnique({ where: { id: auth.userId }, select: { role: true } });
    if (fullProfile?.role !== 'super_admin' && fullProfile?.role !== 'owner') {
      postData = { ...data, profileId: auth.userId };
    } else {
      postData = { ...data, profileId: data.profileId || auth.userId };
    }
  }

  try {
    const record = await MODEL_MAP[model].create({ data: postData, include });

    if (model === 'staff_chat_messages' && postData.receiverId) {
      try {
        const sender = await prisma.profile.findUnique({
          where: { id: auth.userId },
          select: { firstName: true, lastName: true },
        });
        const senderName = [sender?.firstName, sender?.lastName].filter(Boolean).join(' ') || 'کاربر';
        await prisma.notification.create({
          data: {
            profileId: postData.receiverId,
            title: `پیام جدید از ${senderName}`,
            body: postData.content ? String(postData.content).slice(0, 120) : 'فایل پیوست',
            type: 'chat',
            priority: 'normal',
            link: '/dashboard/staff-chat',
          },
        });
      } catch {}
    }

    // Notify super-admins when a daily work report is created
    if (model === 'daily_work_reports' && postData.profileId) {
      try {
        const author = await prisma.profile.findUnique({
          where: { id: postData.profileId },
          select: { firstName: true, lastName: true },
        });
        const authorName = [author?.firstName, author?.lastName].filter(Boolean).join(' ') || 'کاربر';
        const superAdmins = await prisma.profile.findMany({
          where: { role: { in: ['super_admin', 'owner'] }, active: true, id: { not: postData.profileId } },
          select: { id: true },
        });
        if (superAdmins.length > 0) {
          await prisma.notification.createMany({
            data: superAdmins.map((sa) => ({
              profileId: sa.id,
              title: `گزارش روزانه جدید از ${authorName}`,
              body: postData.title ? String(postData.title).slice(0, 120) : null,
              type: 'report',
              priority: 'normal',
              link: `/dashboard/work-reports/daily/view/${record.id}`,
            })),
          });
        }
      } catch {}
    }

    // Notify super-admins when a monthly work report is created
    if (model === 'monthly_work_reports' && postData.profileId) {
      try {
        const author = await prisma.profile.findUnique({
          where: { id: postData.profileId },
          select: { firstName: true, lastName: true },
        });
        const authorName = [author?.firstName, author?.lastName].filter(Boolean).join(' ') || 'کاربر';
        const superAdmins = await prisma.profile.findMany({
          where: { role: { in: ['super_admin', 'owner'] }, active: true, id: { not: postData.profileId } },
          select: { id: true },
        });
        if (superAdmins.length > 0) {
          await prisma.notification.createMany({
            data: superAdmins.map((sa) => ({
              profileId: sa.id,
              title: `گزارش ماهانه جدید از ${authorName}`,
              body: postData.fullName ? `صورت وضعیت پروژه - ${String(postData.fullName).slice(0, 120)}` : null,
              type: 'report',
              priority: 'normal',
              link: `/dashboard/work-reports/view/${record.id}`,
            })),
          });
        }
      } catch {}
    }

    // Auto-copy notifications to all super-admins
    if (model === 'notifications' && postData.profileId) {
      try {
        const superAdmins = await prisma.profile.findMany({
          where: { role: { in: ['super_admin', 'owner'] }, active: true, id: { not: postData.profileId } },
          select: { id: true },
        });
        if (superAdmins.length > 0) {
          await prisma.notification.createMany({
            data: superAdmins.map((sa) => ({
              profileId: sa.id,
              title: `[سوپرادمین] ${postData.title || ''}`,
              body: postData.body || null,
              type: postData.type || 'info',
              priority: postData.priority || 'normal',
              link: postData.link || null,
            })),
          });
        }
      } catch {}
    }

    return NextResponse.json({ data: serializeData(record) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/data  { model, where, data, include? }
export async function PATCH(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { model, where, data, include } = body;
  if (!(await canAccess(auth, model))) return NextResponse.json({ error: 'دسترسی به این بخش برای شما فعال نیست' }, { status: 403 });
  if (!model || !MODEL_MAP[model]) {
    return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
  }

  try {
    // Task edit permissions
    if (model === 'tasks') {
      const actor = await prisma.profile.findUnique({ where: { id: auth.userId }, select: { role: true } });
      const isSuperAdminRole = actor?.role === 'super_admin' || actor?.role === 'owner';
      if (!actor) {
        return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 403 });
      }
      if (!isSuperAdminRole) {
        // Non-super-admin: only allowed to change status (drag-and-drop)
        const isStatusOnlyUpdate = Object.keys(data).every((k) => k === 'status' || k === 'completedAt');
        if (!isStatusOnlyUpdate) {
          return NextResponse.json({ error: 'فقط سوپرادمین می‌تواند وظیفه را ویرایش کند' }, { status: 403 });
        }
        // Check the current task state
        const currentTask = await prisma.task.findUnique({ where: { id: where.id }, select: { status: true, createdBy: true, assignedTo: true } });
        if (!currentTask) {
          return NextResponse.json({ error: 'وظیفه یافت نشد' }, { status: 404 });
        }
        // Once completed, only super admin can move it
        if (currentTask.status === 'completed' && data.status !== 'completed') {
          return NextResponse.json({ error: 'تنها سوپرادمین می‌تواند وظیفه تکمیل‌شده را جابجا کند' }, { status: 403 });
        }
        // Only the creator or assignee can change status
        if (currentTask.createdBy !== auth.userId && currentTask.assignedTo !== auth.userId) {
          return NextResponse.json({ error: 'فقط ایجادکننده یا مسئول وظیفه می‌تواند وضعیت را تغییر دهد' }, { status: 403 });
        }
      }
    }
    // Personal notes: enforce ownership
    if (model === 'personal_notes') {
      const existing = await prisma.personalNote.findFirst({ where: { id: where.id, profileId: auth.userId } });
      if (!existing) {
        return NextResponse.json({ error: 'این یادداشت متعلق به شما نیست' }, { status: 403 });
      }
    }
    const record = await MODEL_MAP[model].update({ where, data, include });

    // Notify super-admins when a daily work report is edited
    if (model === 'daily_work_reports') {
      try {
        const report = record as any;
        const author = await prisma.profile.findUnique({
          where: { id: report.profileId },
          select: { firstName: true, lastName: true },
        });
        const authorName = [author?.firstName, author?.lastName].filter(Boolean).join(' ') || 'کاربر';
        const superAdmins = await prisma.profile.findMany({
          where: { role: { in: ['super_admin', 'owner'] }, active: true, id: { not: report.profileId } },
          select: { id: true },
        });
        if (superAdmins.length > 0) {
          await prisma.notification.createMany({
            data: superAdmins.map((sa) => ({
              profileId: sa.id,
              title: `ویرایش گزارش روزانه توسط ${authorName}`,
              body: report.title ? String(report.title).slice(0, 120) : null,
              type: 'report',
              priority: 'normal',
              link: `/dashboard/work-reports/daily/view/${report.id}`,
            })),
          });
        }
      } catch {}
    }

    return NextResponse.json({ data: serializeData(record) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/data  { model, where }
export async function DELETE(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { model, where } = body;
  if (!(await canAccess(auth, model))) return NextResponse.json({ error: 'دسترسی به این بخش برای شما فعال نیست' }, { status: 403 });
  if (!model || !MODEL_MAP[model]) {
    return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
  }

  try {
    // Only super_admin / owner can delete tasks
    if (model === 'tasks') {
      const actor = await prisma.profile.findUnique({ where: { id: auth.userId }, select: { role: true } });
      if (!actor || (actor.role !== 'super_admin' && actor.role !== 'owner')) {
        return NextResponse.json({ error: 'فقط سوپرادمین می‌تواند وظیفه را حذف کند' }, { status: 403 });
      }
    }
    // Personal notes: enforce ownership
    if (model === 'personal_notes') {
      const existing = await prisma.personalNote.findFirst({ where: { id: where.id, profileId: auth.userId } });
      if (!existing) {
        return NextResponse.json({ error: 'این یادداشت متعلق به شما نیست' }, { status: 403 });
      }
    }
    await MODEL_MAP[model].delete({ where });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
