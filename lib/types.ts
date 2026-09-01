// Core type definitions for the نوین بین CRM+ERP platform
// All fields use camelCase to match Prisma model output

export type UserTier = 'staff' | 'customer';
export type StaffRole = 'owner' | 'super_admin' | 'admin' | 'personnel';
export type CustomerType = 'individual' | 'company';
export type LeadStatus = 'new' | 'contacted' | 'serious' | 'converted' | 'lost';

export interface Organization {
  id: string;
  name: string;
  code: string;
  plan: string;
  ownerId: string | null;
  active: boolean;
  maxUsers: number;
  subscriptionStatus: string;
  renewalDate: string | null;
  settings: any;
  createdAt: string;
}

export interface Profile {
  id: string;
  userType: UserTier;
  role: StaffRole;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  position: string | null;
  departmentId: string | null;
  customerId: string | null;
  assignedPages: string[] | null;
  birthDate: string | null;
  lastSeenAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  type: CustomerType;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  nationalId: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  birthDate: string | null;
  socialLinks: any;
  score: number;
  level: string;
  walletBalance: number;
  loyaltyPoints: number;
  source: string | null;
  assignedTo: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  source: string | null;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  status: LeadStatus;
  score: number;
  assignedTo: string | null;
  customerId: string | null;
  notes: string | null;
  nextFollowUp: string | null;
  createdBy: string;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  title: string;
  customerId: string | null;
  leadId: string | null;
  stage: string;
  amount: number;
  probability: number;
  expectedClose: string | null;
  assignedTo: string | null;
  description: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  type: string;
  sku: string | null;
  barcode: string | null;
  categoryId: string | null;
  brand: string | null;
  price: number;
  cost: number;
  taxRate: number;
  discount: number;
  stock: number;
  minStock: number;
  unit: string | null;
  weight: number;
  imageUrl: string | null;
  description: string | null;
  active: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  number: string | null;
  customerId: string | null;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  name: string;
  qty: number;
  price: number;
  discount: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string | null;
  orderId: string | null;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  amount: number;
  paid: number;
  status: string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  assignedTo: string | null;
  teamId: string | null;
  customerId: string | null;
  dueDate: string | null;
  referredDate: string | null;
  completedAt: string | null;
  checklist: any;
  attachments: any;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  task_comments?: TaskComment[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  profileId: string;
  content: string;
  createdAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  topic: string | null;
  date: string;
  endTime: string | null;
  location: string | null;
  onlineLink: string | null;
  agenda: string | null;
  notes: string | null;
  minutes: string | null;
  outcome: string | null;
  createdBy: string;
  createdAt: string;
  meeting_participants?: { profileId: string }[];
}

export interface Ticket {
  id: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  customerId: string | null;
  assignedTo: string | null;
  channel: string;
  slaDeadline: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderType: 'staff' | 'customer';
  senderId: string | null;
  content: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  attachmentSize: number;
  readAt: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  profileId: string;
  title: string;
  body: string;
  type: string;
  priority: string;
  read: boolean;
  readAt: string | null;
  link: string | null;
  createdAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  points: number;
  type: 'earn' | 'spend';
  description: string | null;
  createdAt: string;
}

// ============ FINANCE / ACCOUNTING ============

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  balance: number;
  openingBalance: number;
  isGroup: boolean;
  costCenterId: string | null;
  description: string | null;
  active: boolean;
  nature: 'debit' | 'credit' | 'either';
  level: number;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  number: string;
  date: string;
  description: string | null;
  status: 'draft' | 'posted' | 'reversed';
  fiscalYearId: string | null;
  periodId: string | null;
  costCenterId: string | null;
  reversedBy: string | null;
  referenceType: string;
  referenceId: string | null;
  createdBy: string;
  createdAt: string;
  journalLines?: JournalLine[];
}

export interface JournalLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  debit: number;
  credit: number;
  description: string | null;
  costCenterId: string | null;
}

export interface FiscalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed';
  closedBy: string | null;
  closedAt: string | null;
  createdAt: string;
  fiscalPeriods?: FiscalPeriod[];
}

export interface FiscalPeriod {
  id: string;
  fiscalYearId: string;
  name: string;
  periodNumber: number;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed';
  createdAt: string;
}

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  managerId: string | null;
  active: boolean;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountNo: string;
  balance: number;
  branchName: string | null;
  cardNumber: string | null;
  iban: string | null;
  active: boolean;
  createdAt: string;
}

export interface CashFund {
  id: string;
  name: string;
  type: 'cash' | 'register';
  balance: number;
  managerId: string | null;
  location: string | null;
  active: boolean;
  createdAt: string;
}

export interface FundTransfer {
  id: string;
  number: string;
  fromType: string;
  fromId: string;
  toType: string;
  toId: string;
  amount: number;
  date: string;
  description: string | null;
  reference: string | null;
  createdBy: string;
  createdAt: string;
}

export interface Cheque {
  id: string;
  type: string;
  number: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: string;
  bankName: string | null;
  bankAccountId: string | null;
  cashFundId: string | null;
  customerId: string | null;
  payee: string | null;
  clearedDate: string | null;
  referenceType: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  number: string;
  customerId: string | null;
  invoiceId: string | null;
  amount: number;
  method: string;
  cashMethod: string | null;
  bankName: string | null;
  chequeNumber: string | null;
  branchCode: string | null;
  trackingNumber: string | null;
  reminder: string | null;
  payerType: string | null;
  payerName: string | null;
  receivedDate: string | null;
  reference: string | null;
  bankAccountId: string | null;
  cashFundId: string | null;
  chequeId: string | null;
  date: string;
  status: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
}

export interface ExpenseClaim {
  id: string;
  number: string;
  employeeId: string;
  title: string;
  totalAmount: number;
  status: string;
  costCenterId: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  paymentDate: string | null;
  cashFundId: string | null;
  bankAccountId: string | null;
  createdBy: string;
  createdAt: string;
  expenseClaimItems?: ExpenseClaimItem[];
}

export interface ExpenseClaimItem {
  id: string;
  expenseClaimId: string;
  accountId: string | null;
  description: string | null;
  amount: number;
  date: string;
}

// ============ CRM EXPANSION TYPES ============

export interface RegistrationRequest {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  phone: string | null;
  birthDate: string | null;
  address: string | null;
  postalCode: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  authUserId: string | null;
  customerId: string | null;
  createdAt: string;
}

export interface DailyWorkReport {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  project: string | null;
  status: string;
  duration: string | null;
  details: string | null;
  reportDate: string;
  createdAt: string;
}

export interface MonthlyWorkReport {
  id: string;
  profileId: string;
  fullName: string;
  nationalId: string;
  startDate: string;
  endDate: string;
  description: string | null;
  status: string;
  createdAt: string;
  images?: { id: string; imageUrl: string }[];
}

export interface CustomerAssignment {
  id: string;
  customerId: string;
  assignedTo: string;
  assignedBy: string;
  createdAt: string;
}

export interface StaffContract {
  id: string;
  profileId: string;
  fullName: string;
  contractType: 'monthly' | 'project' | 'hourly';
  startDate: string;
  endDate: string | null;
  salary: number;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export interface PreInvoice {
  id: string;
  number: string;
  type: 'sales' | 'purchase';
  customerId: string | null;
  supplierName: string | null;
  priceList: string;
  seller: string | null;
  issueDate: string;
  expiryDate: string | null;
  totalDiscount: number;
  totalTax: number;
  totalDuty: number;
  shipping: number;
  finalAmount: number;
  notes: string | null;
  status: string;
  createdBy: string;
  createdAt: string;
  preInvoiceItems?: PreInvoiceItem[];
}

export interface PreInvoiceItem {
  id: string;
  preInvoiceId: string;
  rowNumber: number;
  productId: string | null;
  productCode: string | null;
  productName: string;
  unit: string | null;
  qty: number;
  unitPrice: number;
  discountPct: number;
  discountAmount: number;
  taxPct: number;
  taxAmount: number;
  dutyPct: number;
  dutyAmount: number;
  finalPrice: number;
  description: string | null;
}

export interface SalesReturn {
  id: string;
  number: string;
  type: 'sales' | 'purchase';
  customerId: string | null;
  supplierName: string | null;
  priceList: string;
  seller: string | null;
  issueDate: string;
  returnReason: string | null;
  isRequestable: boolean;
  accountHolder: string | null;
  accountInfo: string | null;
  totalDiscount: number;
  totalTax: number;
  totalDuty: number;
  finalAmount: number;
  notes: string | null;
  status: string;
  createdBy: string;
  createdAt: string;
  returnItems?: ReturnItem[];
}

export interface ReturnItem {
  id: string;
  returnId: string;
  rowNumber: number;
  productId: string | null;
  productCode: string | null;
  productName: string;
  unit: string | null;
  qty: number;
  unitPrice: number;
  discountPct: number;
  discountAmount: number;
  taxPct: number;
  taxAmount: number;
  dutyPct: number;
  dutyAmount: number;
  serial: string | null;
  finalPrice: number;
  description: string | null;
}

export interface Receipt {
  id: string;
  number: string;
  relatedInvoiceId: string | null;
  amount: number;
  depositTo: string | null;
  receiptType: string;
  cashMethod: string | null;
  bankName: string | null;
  chequeNumber: string | null;
  branchCode: string | null;
  trackingNumber: string | null;
  receivedDate: string;
  reminder: string | null;
  payerType: string | null;
  payerId: string | null;
  payerName: string | null;
  notes: string | null;
  receiptImageUrl: string | null;
  manualNumber: string | null;
  createdBy: string;
  createdAt: string;
}

export interface CallLog {
  id: string;
  customerId: string | null;
  phoneNumber: string;
  direction: string;
  status: string;
  durationSeconds: number;
  callDate: string;
  recordingUrl: string | null;
  notes: string | null;
  handledBy: string | null;
  createdAt: string;
}

export interface Demo {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  plan: string;
  status: string;
  startDate: string;
  expiryDate: string;
  createdBy: string | null;
  createdAt: string;
}

export interface AcademyStudent {
  id: string;
  fullName: string;
  nationalId: string | null;
  phone: string | null;
  email: string | null;
  createdBy: string;
  createdAt: string;
}

export interface AcademyEnrollment {
  id: string;
  studentId: string;
  courseName: string;
  fee: number;
  paymentType: string;
  paymentStatus: string;
  installmentCount: number;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export interface PagePermission {
  id: string;
  profileId: string;
  pagePath: string;
  granted: boolean;
  grantedBy: string;
  createdAt: string;
}

export interface UserManager {
  id: string;
  userId: string;
  managerId: string;
  createdAt: string;
}

export interface CustomerChatMessage {
  id: string;
  customerId: string;
  senderType: string;
  senderId: string | null;
  content: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  isReport: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface MeetingAssignment {
  id: string;
  meetingId: string;
  assignedTo: string;
  contactName: string;
  createdBy: string;
  createdAt: string;
}

// ============ PERSONAL NOTES & STAFF CHAT ============

export interface PersonalNote {
  id: string;
  profileId: string;
  title: string;
  content: string | null;
  color: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  readAt: string | null;
  createdAt: string;
}

// ============ PERSONAL CUSTOMERS ============

export interface MyCustomer {
  id: string;
  profileId: string;
  type: CustomerType;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  nationalId: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============ CONTACT PARTY (طرف حساب) ============

export interface ContactParty {
  id: string;
  type: 'individual' | 'company';
  detailType: 'detail' | 'supplier' | 'customer';
  firstName: string | null;
  lastName: string | null;
  detailedType: string | null;
  detailedCode: string | null;
  nationalId: string | null;
  birthDate: string | null;
  passportNumber: string | null;
  companyName: string | null;
  nationalCompanyId: string | null;
  registrationNo: string | null;
  economicCode: string | null;
  registrationDate: string | null;
  companyType: string | null;
  ceoName: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  website: string | null;
  supplierBalance: number;
  supplierIdentity: string | null;
  discountPercent: number;
  customerGroupId: string | null;
  customerBalance: number;
  periodBalance: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  relatedPersons?: ContactRelatedPerson[];
  addresses?: ContactAddress[];
  phones?: ContactPhone[];
}

export interface ContactRelatedPerson {
  id: string;
  contactId: string;
  name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
}

export interface ContactAddress {
  id: string;
  contactId: string;
  type: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;
  title: string | null;
  branchCode: string | null;
  createdAt: string;
}

export interface ContactPhone {
  id: string;
  contactId: string;
  phone: string;
  createdAt: string;
}

// ============ BANK ACCOUNT (حساب بانکی) ============

export interface BankAccount {
  id: string;
  orgId: string | null;
  name: string;
  bankName: string;
  accountNo: string;
  balance: number;
  branchName: string | null;
  cardNumber: string | null;
  iban: string | null;
  active: boolean;
  accountNumber: string;
  accountType: string;
  detailTitle: string | null;
  detailCode: string | null;
  openingDate: string | null;
  expiryDate: string | null;
  cardHolderName: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============ PAYMENT ANNOUNCEMENTS (اعلامیه‌های پرداخت) ============

export interface PaymentAnnouncement {
  id: string;
  orgId: string | null;
  type: string;
  counterparty: string;
  counterpartyId: string | null;
  date: string;
  bankAccountId: string | null;
  bankFee: number;
  amount: number;
  description: string | null;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  bankAccount?: BankAccount | null;
  withdrawals?: WithdrawalAnnouncement[];
  cheques?: MyCheque[];
}

export interface WithdrawalAnnouncement {
  id: string;
  orgId: string | null;
  paymentAnnouncementId: string;
  transferNumber: string;
  date: string;
  amount: number;
  bankAccountId: string | null;
  bankFee: number;
  description: string | null;
  createdBy: string;
  createdAt: string;
  bankAccount?: BankAccount | null;
}

export interface MyCheque {
  id: string;
  orgId: string | null;
  paymentAnnouncementId: string;
  bankAccountId: string | null;
  chequeNumber: string;
  sayadiNumber: string | null;
  amount: number;
  date: string;
  type: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  status: string; // issued | in_clearing | cleared | returned | voided | reversed
  dueDate: string | null;
  payee: string | null;
  clearedAmount: number;
  clearedDate: string | null;
  previousStatus: string | null;
  updatedAt: string;
  bankAccount?: BankAccount | null;
}

// ============ PETTY CASH (تنخواه‌دار) ============

export interface PettyCashCustodian {
  id: string;
  orgId: string | null;
  code: string;
  contactPartyId: string | null;
  profileId: string | null;
  accountId: string | null;
  ceiling: number;
  type: string;
  startDate: string;
  active: boolean;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  contactParty?: ContactParty | null;
  profile?: Profile | null;
  account?: Account | null;
  payments?: PettyCashPayment[];
  expenses?: PettyCashExpense[];
}

export interface PettyCashPayment {
  id: string;
  orgId: string | null;
  custodianId: string;
  bankAccountId: string | null;
  amount: number;
  date: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  bankAccount?: BankAccount | null;
}

export interface PettyCashExpense {
  id: string;
  orgId: string | null;
  custodianId: string;
  number: string;
  date: string;
  expenseType: string;
  amount: number;
  description: string | null;
  attachmentUrl: string | null;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdBy: string;
  createdAt: string;
  mergeStatementId: string | null;
  mergeStatus: string;
}

// ============ PETTY CASH EXPENSE STATEMENT (صورت هزینه تنخواه) ============

export interface PettyCashExpenseStatement {
  id: string;
  orgId: string | null;
  number: string;
  custodianId: string;
  fiscalYearId: string | null;
  costCenterId: string | null;
  date: string;
  description: string | null;
  totalAmount: number;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  postedToAccounting: boolean;
  settledAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  custodian?: PettyCashCustodian | null;
  fiscalYear?: FiscalYear | null;
  costCenter?: CostCenter | null;
  items?: PettyCashExpenseStatementItem[];
}

export interface PettyCashExpenseStatementItem {
  id: string;
  statementId: string;
  date: string;
  expenseType: string;
  accountId: string | null;
  amount: number;
  description: string | null;
  costCenterId: string | null;
  vendorName: string | null;
  invoiceNumber: string | null;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
  account?: Account | null;
  costCenter?: CostCenter | null;
  documents?: PettyCashExpenseDocument[];
}

export interface PettyCashExpenseDocument {
  id: string;
  itemId: string;
  documentType: string;
  documentNumber: string | null;
  documentDate: string | null;
  amount: number;
  attachmentUrl: string | null;
  attachmentName: string | null;
  status: string;
  createdAt: string;
}

// ============ PETTY CASH MERGE STATEMENT (صورت ادغام اسناد) ============

export interface PettyCashMergeStatement {
  id: string;
  orgId: string | null;
  number: string;
  custodianId: string;
  fiscalYearId: string | null;
  costCenterId: string | null;
  date: string;
  description: string | null;
  totalAmount: number;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  postedToAccounting: boolean;
  settledAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  custodian?: PettyCashCustodian | null;
  fiscalYear?: FiscalYear | null;
  costCenter?: CostCenter | null;
  expenses?: PettyCashExpense[];
  history?: PettyCashMergeHistory[];
}

export interface PettyCashMergeHistory {
  id: string;
  orgId: string | null;
  mergeStatementId: string;
  action: string;
  actionBy: string;
  actionAt: string;
  details: any;
  fromStatus: string | null;
  toStatus: string | null;
}

// ============ DOCUMENT ISSUANCE (صدور اسناد) ============

export interface DocumentIssuance {
  id: string;
  orgId: string | null;
  number: string;
  documentType: string;
  referenceType: string;
  referenceId: string;
  fiscalYearId: string | null;
  costCenterId: string | null;
  operationDate: string;
  documentDate: string;
  issueDate: string;
  description: string | null;
  totalDebit: number;
  totalCredit: number;
  status: string;
  issuedBy: string | null;
  issuedAt: string | null;
  finalizedBy: string | null;
  finalizedAt: string | null;
  voidedBy: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  amendedFromId: string | null;
  priority: string | null;
  assignedTo: string | null;
  lockedBy: string | null;
  lockedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  fiscalYear?: FiscalYear | null;
  costCenter?: CostCenter | null;
  lines?: DocumentIssuanceLine[];
  history?: DocumentIssuanceHistory[];
}

export interface DocumentIssuanceLine {
  id: string;
  documentIssuanceId: string;
  accountId: string;
  accountRole: string;
  debit: number;
  credit: number;
  description: string | null;
  costCenterId: string | null;
  referenceLineId: string | null;
  account?: Account | null;
  costCenter?: CostCenter | null;
}

export interface DocumentIssuanceHistory {
  id: string;
  documentIssuanceId: string;
  action: string;
  actionBy: string;
  actionAt: string;
  fromStatus: string | null;
  toStatus: string | null;
  details: any;
}

// ============ CONTACT SETTLEMENT (تسویه حساب طرف مقابل) ============

export interface ContactSettlement {
  id: string;
  orgId: string | null;
  number: string;
  contactPartyId: string;
  settlementType: string; // full | partial | multi_document | from_payment | from_receipt | setoff | adjustment
  settlementDate: string;
  fiscalYearId: string | null;
  costCenterId: string | null;
  totalAmount: number;
  totalDebit: number;
  totalCredit: number;
  fundType: string | null; // cash | bank | setoff | none
  bankAccountId: string | null;
  cashFundId: string | null;
  description: string | null;
  status: string; // draft | pending_approval | approved | finalized | voided | cancelled
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  finalizedBy: string | null;
  finalizedAt: string | null;
  voidedBy: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  amendedFromId: string | null;
  journalEntryId: string | null;
  createdAt: string;
  updatedAt: string;
  items?: ContactSettlementItem[];
  history?: ContactSettlementHistory[];
}

export interface ContactSettlementItem {
  id: string;
  orgId: string | null;
  settlementId: string;
  itemType: string; // invoice | debt | credit | receipt | payment | prepayment | on_account | cheque_receivable | cheque_payable | other
  referenceType: string | null;
  referenceId: string | null;
  referenceNumber: string | null;
  originalAmount: number;
  paidAmount: number;
  settledAmount: number;
  discount: number;
  tax: number;
  fee: number;
  adjustments: number;
  balance: number;
  allocationAmount: number;
  itemStatus: string; // open | partial | settled | closed | voided
  description: string | null;
  createdAt: string;
}

export interface ContactSettlementHistory {
  id: string;
  orgId: string | null;
  settlementId: string;
  action: string;
  actionBy: string;
  actionAt: string;
  fromStatus: string | null;
  toStatus: string | null;
  details: any;
  reason: string | null;
  createdAt: string;
}

// ============ RECEIVED CHEQUES (چک دریافتی — عملیاتی) ============

export interface ReceivedCheque {
  id: string;
  orgId: string | null;
  number: string;
  chequeNumber: string;
  sayadiNumber: string | null;
  bankName: string;
  branchName: string | null;
  issuerAccountNo: string | null;
  amount: number;
  issueDate: string;
  dueDate: string;
  issuerPartyId: string | null;
  issuerName: string | null;
  receiverName: string | null;
  subject: string | null;
  bankAccountId: string | null;
  cashFundId: string | null;
  storageLocation: string | null;
  status: string; // received | in_custody | pending_due | deposited | cleared | returned | refunded | voided | transferred
  description: string | null;
  createdBy: string;
  journalEntryId: string | null;
  createdAt: string;
  updatedAt: string;
  operations?: ReceivedChequeOperation[];
}

export interface ReceivedChequeOperation {
  id: string;
  orgId: string | null;
  chequeId: string;
  operationType: string; // receive | deposit | clear | return | refund | transfer | void | amend | status_change
  fromStatus: string | null;
  toStatus: string | null;
  operationDate: string;
  operationBy: string;
  bankAccountId: string | null;
  cashFundId: string | null;
  counterpartyId: string | null;
  counterpartyName: string | null;
  previousLocation: string | null;
  newLocation: string | null;
  reason: string | null;
  journalEntryId: string | null;
  details: any;
  createdAt: string;
}

// ============ CHEQUE REFUND (استرداد چک) ============

export interface ChequeRefund {
  id: string;
  orgId: string | null;
  number: string;
  chequeId: string;
  recipientPartyId: string | null;
  recipientName: string | null;
  refundDate: string;
  amount: number;
  reason: string | null;
  description: string | null;
  status: string; // draft | pending_approval | approved | rejected | finalized | cancelled | voided
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  finalizedBy: string | null;
  finalizedAt: string | null;
  journalEntryId: string | null;
  originalJournalEntryId: string | null;
  previousChequeStatus: string | null;
  voidedBy: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  accountingPosted: boolean;
  balanceAdjusted: boolean;
  settlementsChecked: boolean;
  createdAt: string;
  updatedAt: string;
  history?: ChequeRefundHistory[];
}

export interface ChequeRefundHistory {
  id: string;
  orgId: string | null;
  refundId: string;
  action: string; // created | submitted | approved | rejected | finalized | cancelled | voided | status_changed
  actionBy: string;
  actionAt: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  details: any;
  createdAt: string;
}

// ============ CHEQUE CLEARING (وصول چک پرداختی) ============

export interface ChequeClearing {
  id: string;
  orgId: string | null;
  number: string;
  chequeId: string;
  chequeNumber: string | null;
  bankName: string | null;
  chequeAmount: number;
  clearingDate: string;
  bankAccountId: string | null;
  bankAccountName: string | null;
  amount: number;
  isPartial: boolean;
  remainingAmount: number;
  payee: string | null;
  counterpartyId: string | null;
  counterpartyName: string | null;
  description: string | null;
  reason: string | null;
  status: string; // draft | pending_approval | approved | rejected | finalized | cancelled | reversed
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  finalizedBy: string | null;
  finalizedAt: string | null;
  journalEntryId: string | null;
  previousChequeStatus: string | null;
  reversedBy: string | null;
  reversedAt: string | null;
  reverseReason: string | null;
  reverseJournalEntryId: string | null;
  accountingPosted: boolean;
  obligationClosed: boolean;
  fiscalPeriodChecked: boolean;
  bankAccountActiveChecked: boolean;
  dueDateChecked: boolean;
  createdAt: string;
  updatedAt: string;
  history?: ChequeClearingHistory[];
}

export interface ChequeClearingHistory {
  id: string;
  orgId: string | null;
  clearingId: string;
  action: string; // created | submitted | approved | rejected | finalized | cancelled | reversed | status_changed
  actionBy: string;
  actionAt: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  amount: number | null;
  journalEntryId: string | null;
  details: any;
  createdAt: string;
}

// ============ CARD READERS (کارتخوان — عملیاتی) ============

export interface CardReader {
  id: string;
  orgId: string | null;
  number: string;
  tid: string;
  mid: string;
  bankName: string;
  branchName: string | null;
  bankAccountId: string | null;
  owner: string | null;
  status: string; // active | inactive | blocked
  startDate: string;
  endDate: string | null;
  description: string | null;
  settlementAccountId: string | null;
  bankAccountTargetId: string | null;
  commissionAccountId: string | null;
  discrepancyAccountId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  transactions?: CardReaderTransaction[];
  settlements?: CardReaderSettlement[];
  history?: CardReaderHistory[];
}

export interface CardReaderTransaction {
  id: string;
  orgId: string | null;
  number: string;
  cardReaderId: string;
  transactionDate: string;
  amount: number;
  tid: string | null;
  mid: string | null;
  trackingNumber: string | null;
  referenceNumber: string | null;
  transactionType: string; // purchase | refund | reversal | adjustment
  status: string; // registered | confirmed | pending_settlement | settled | failed | returned | discrepancy | cancelled
  bankAccountId: string | null;
  commissionAmount: number;
  deductions: number;
  netAmount: number;
  settlementId: string | null;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  cardReader?: CardReader;
  settlement?: CardReaderSettlement | null;
  settlementItems?: CardReaderSettlementItem[];
}

export interface CardReaderSettlement {
  id: string;
  orgId: string | null;
  number: string;
  cardReaderId: string;
  settlementDate: string;
  bankAccountId: string | null;
  grossAmount: number;
  commissionAmount: number;
  deductions: number;
  netAmount: number;
  settledAmount: number;
  discrepancyAmount: number;
  discrepancyType: string | null;
  discrepancyNote: string | null;
  status: string; // draft | pending_approval | approved | finalized | cancelled | voided
  isPartial: boolean;
  remainingAmount: number;
  fiscalYearId: string | null;
  costCenterId: string | null;
  journalEntryId: string | null;
  accountingPosted: boolean;
  closedAt: string | null;
  description: string | null;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  finalizedBy: string | null;
  finalizedAt: string | null;
  voidedBy: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
  cardReader?: CardReader;
  items?: CardReaderSettlementItem[];
  history?: CardReaderSettlementHistory[];
  transactions?: CardReaderTransaction[];
}

export interface CardReaderSettlementItem {
  id: string;
  orgId: string | null;
  settlementId: string;
  transactionId: string;
  grossAmount: number;
  commissionAmount: number;
  deductions: number;
  netAmount: number;
  settledAmount: number;
  discrepancyAmount: number;
  discrepancyNote: string | null;
  itemStatus: string; // open | partial | settled | discrepancy | voided
  createdAt: string;
  transaction?: CardReaderTransaction;
}

export interface CardReaderSettlementHistory {
  id: string;
  orgId: string | null;
  settlementId: string;
  action: string;
  actionBy: string;
  actionAt: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  details: any;
  createdAt: string;
}

export interface CardReaderHistory {
  id: string;
  orgId: string | null;
  cardReaderId: string;
  action: string;
  actionBy: string;
  actionAt: string;
  fromStatus: string | null;
  toStatus: string | null;
  amount: number | null;
  journalEntryId: string | null;
  reason: string | null;
  details: any;
  createdAt: string;
}