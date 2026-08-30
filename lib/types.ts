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
