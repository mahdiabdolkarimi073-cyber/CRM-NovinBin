// Field definitions for AI-assisted record creation across financial sections

export interface CreateField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'boolean';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  default?: any;
}

export interface CreateSchema {
  model: string;
  title: string;
  description: string;
  fields: CreateField[];
}

export const CREATE_SCHEMAS: Record<string, CreateSchema> = {
  pettyCash: {
    model: 'petty_cash_custodians',
    title: 'تنخواه‌دار جدید',
    description: 'ایجاد تنخواه‌دار جدید در سیستم',
    fields: [
      { key: 'code', label: 'کد تنخواه‌دار', type: 'text', placeholder: 'مثلاً: PC-001', required: true },
      { key: 'ceiling', label: 'سقف تنخواه (تومان)', type: 'number', placeholder: 'مثلاً: 5000000', required: true, default: 0 },
      { key: 'type', label: 'نوع تنخواه', type: 'select', options: [
        { value: 'fixed', label: 'ثابت' },
        { value: 'variable', label: 'متغیر' },
      ], default: 'fixed' },
      { key: 'startDate', label: 'تاریخ شروع', type: 'date', default: new Date().toISOString().slice(0, 10) },
      { key: 'active', label: 'فعال', type: 'boolean', default: true },
      { key: 'description', label: 'توضیحات', type: 'text', placeholder: 'توضیحات اختیاری' },
    ],
  },
  bankAccount: {
    model: 'bank_accounts',
    title: 'حساب بانکی جدید',
    description: 'ایجاد حساب بانکی جدید',
    fields: [
      { key: 'name', label: 'نام حساب', type: 'text', placeholder: 'مثلاً: حساب جاری اصلی', required: true },
      { key: 'bankName', label: 'نام بانک', type: 'text', placeholder: 'مثلاً: ملت', required: true },
      { key: 'accountNo', label: 'شماره حساب', type: 'text', placeholder: 'مثلاً: 1234567890', required: true },
      { key: 'balance', label: 'موجودی اولیه (تومان)', type: 'number', default: 0 },
      { key: 'cardNumber', label: 'شماره کارت', type: 'text', placeholder: '۱۶ رقم' },
      { key: 'iban', label: 'شماره شبا', type: 'text', placeholder: 'IR...' },
      { key: 'branchName', label: 'نام شعبه', type: 'text' },
      { key: 'accountType', label: 'نوع حساب', type: 'select', options: [
        { value: 'current', label: 'جاری' },
        { value: 'savings', label: 'پس‌انداز' },
      ], default: 'current' },
      { key: 'active', label: 'فعال', type: 'boolean', default: true },
    ],
  },
  invoice: {
    model: 'invoices',
    title: 'فاکتور جدید',
    description: 'ایجاد فاکتور جدید',
    fields: [
      { key: 'number', label: 'شماره فاکتور', type: 'text', placeholder: 'مثلاً: INV-001', required: true },
      { key: 'customerId', label: 'شناسه مشتری (UUID)', type: 'text', placeholder: 'شناسه مشتری' },
      { key: 'amount', label: 'مبلغ فاکتور (تومان)', type: 'number', required: true, default: 0 },
      { key: 'paid', label: 'مبلغ پرداخت‌شده (تومان)', type: 'number', default: 0 },
      { key: 'status', label: 'وضعیت', type: 'select', options: [
        { value: 'unpaid', label: 'پرداخت‌نشده' },
        { value: 'partial', label: 'پرداخت‌جزئی' },
        { value: 'paid', label: 'پرداخت‌شده' },
      ], default: 'unpaid' },
      { key: 'dueDate', label: 'تاریخ سررسید', type: 'date' },
      { key: 'notes', label: 'توضیحات', type: 'text' },
    ],
  },
  payment: {
    model: 'payments',
    title: 'پرداخت جدید',
    description: 'ثبت پرداخت جدید',
    fields: [
      { key: 'number', label: 'شماره پرداخت', type: 'text', placeholder: 'PAY-001', required: true },
      { key: 'customerId', label: 'شناسه مشتری (UUID)', type: 'text' },
      { key: 'amount', label: 'مبلغ (تومان)', type: 'number', required: true, default: 0 },
      { key: 'method', label: 'روش پرداخت', type: 'select', options: [
        { value: 'cash', label: 'نقدی' },
        { value: 'bank_transfer', label: 'انتقال بانکی' },
        { value: 'cheque', label: 'چک' },
        { value: 'card', label: 'کارت' },
      ], default: 'cash' },
      { key: 'status', label: 'وضعیت', type: 'select', options: [
        { value: 'completed', label: 'تکمیل‌شده' },
        { value: 'pending', label: 'در انتظار' },
      ], default: 'completed' },
      { key: 'description', label: 'توضیحات', type: 'text' },
    ],
  },
  receipt: {
    model: 'receipts',
    title: 'دریافت جدید',
    description: 'ثبت رسید جدید',
    fields: [
      { key: 'number', label: 'شماره رسید', type: 'text', placeholder: 'REC-001', required: true },
      { key: 'amount', label: 'مبلغ (تومان)', type: 'number', required: true, default: 0 },
      { key: 'receiptType', label: 'نوع رسید', type: 'select', options: [
        { value: 'cash', label: 'نقدی' },
        { value: 'bank', label: 'بانکی' },
        { value: 'cheque', label: 'چک' },
      ], default: 'cash' },
      { key: 'payerName', label: 'نام پرداخت‌کننده', type: 'text' },
      { key: 'description', label: 'توضیحات', type: 'text' },
    ],
  },
  receivedCheque: {
    model: 'received_cheques',
    title: 'چک دریافتی جدید',
    description: 'ثبت چک دریافتی جدید',
    fields: [
      { key: 'number', label: 'شماره سند', type: 'text', placeholder: 'RCH-001', required: true },
      { key: 'chequeNumber', label: 'شماره چک', type: 'text', required: true },
      { key: 'bankName', label: 'نام بانک', type: 'text', required: true },
      { key: 'amount', label: 'مبلغ چک (تومان)', type: 'number', required: true, default: 0 },
      { key: 'issueDate', label: 'تاریخ صدور', type: 'date', default: new Date().toISOString().slice(0, 10) },
      { key: 'dueDate', label: 'تاریخ سررسید', type: 'date', required: true },
      { key: 'issuerName', label: 'نام صادرکننده چک', type: 'text' },
      { key: 'status', label: 'وضعیت', type: 'select', options: [
        { value: 'received', label: 'دریافت‌شده' },
        { value: 'deposited', label: 'خوابانده‌شده' },
      ], default: 'received' },
      { key: 'description', label: 'توضیحات', type: 'text' },
    ],
  },
  cardReader: {
    model: 'card_readers',
    title: 'کارتخوان جدید',
    description: 'ثبت کارتخوان جدید',
    fields: [
      { key: 'number', label: 'شماره کارتخوان', type: 'text', placeholder: 'CR-001', required: true },
      { key: 'tid', label: 'TID', type: 'text', required: true },
      { key: 'mid', label: 'MID', type: 'text', required: true },
      { key: 'bankName', label: 'نام بانک', type: 'text', required: true },
      { key: 'owner', label: 'مالک', type: 'text' },
      { key: 'status', label: 'وضعیت', type: 'select', options: [
        { value: 'active', label: 'فعال' },
        { value: 'inactive', label: 'غیرفعال' },
      ], default: 'active' },
      { key: 'startDate', label: 'تاریخ شروع', type: 'date', default: new Date().toISOString().slice(0, 10) },
    ],
  },
  contactParty: {
    model: 'contact_parties',
    title: 'طرف حساب جدید',
    description: 'ایجاد طرف حساب جدید',
    fields: [
      { key: 'type', label: 'نوع', type: 'select', options: [
        { value: 'individual', label: 'حقیقی' },
        { value: 'company', label: 'حقوقی' },
      ], default: 'individual' },
      { key: 'detailType', label: 'نوع جزئی', type: 'select', options: [
        { value: 'detail', label: 'جزئی' },
        { value: 'customer', label: 'مشتری' },
        { value: 'supplier', label: 'تأمین‌کننده' },
      ], default: 'detail' },
      { key: 'firstName', label: 'نام', type: 'text' },
      { key: 'lastName', label: 'نام خانوادگی', type: 'text' },
      { key: 'companyName', label: 'نام شرکت', type: 'text' },
      { key: 'nationalId', label: 'کد ملی', type: 'text' },
      { key: 'phone', label: 'تلفن', type: 'text' },
      { key: 'notes', label: 'توضیحات', type: 'text' },
    ],
  },
  account: {
    model: 'accounts',
    title: 'حساب حسابداری جدید',
    description: 'ایجاد حساب جدید در چارت حساب‌ها',
    fields: [
      { key: 'code', label: 'کد حساب', type: 'text', placeholder: 'مثلاً: 1010', required: true },
      { key: 'name', label: 'نام حساب', type: 'text', required: true },
      { key: 'type', label: 'نوع حساب', type: 'select', options: [
        { value: 'asset', label: 'دارایی' },
        { value: 'liability', label: 'بدهی' },
        { value: 'equity', label: 'سرمایه' },
        { value: 'revenue', label: 'درآمد' },
        { value: 'expense', label: 'هزینه' },
      ], required: true },
      { key: 'balance', label: 'موجودی اولیه (تومان)', type: 'number', default: 0 },
      { key: 'nature', label: 'ماهیت', type: 'select', options: [
        { value: 'either', label: 'دو طرفه' },
        { value: 'debit', label: 'بدهکار' },
        { value: 'credit', label: 'بستانکار' },
      ], default: 'either' },
      { key: 'isGroup', label: 'گروهی', type: 'boolean', default: false },
      { key: 'active', label: 'فعال', type: 'boolean', default: true },
    ],
  },
  costCenter: {
    model: 'cost_centers',
    title: 'مرکز هزینه جدید',
    description: 'ایجاد مرکز هزینه جدید',
    fields: [
      { key: 'code', label: 'کد مرکز هزینه', type: 'text', required: true },
      { key: 'name', label: 'نام مرکز هزینه', type: 'text', required: true },
      { key: 'active', label: 'فعال', type: 'boolean', default: true },
    ],
  },
  fiscalYear: {
    model: 'fiscal_years',
    title: 'سال مالی جدید',
    description: 'ایجاد سال مالی جدید',
    fields: [
      { key: 'name', label: 'نام سال مالی', type: 'text', placeholder: 'مثلاً: ۱۴۰۴', required: true },
      { key: 'startDate', label: 'تاریخ شروع', type: 'date', required: true },
      { key: 'endDate', label: 'تاریخ پایان', type: 'date', required: true },
      { key: 'status', label: 'وضعیت', type: 'select', options: [
        { value: 'open', label: 'باز' },
        { value: 'closed', label: 'بسته' },
      ], default: 'open' },
    ],
  },
  cheque: {
    model: 'cheques',
    title: 'چک جدید',
    description: 'ثبت چک جدید',
    fields: [
      { key: 'type', label: 'نوع چک', type: 'select', options: [
        { value: 'received', label: 'دریافتی' },
        { value: 'issued', label: 'صادرفی' },
      ], required: true, default: 'received' },
      { key: 'number', label: 'شماره چک', type: 'text', required: true },
      { key: 'amount', label: 'مبلغ (تومان)', type: 'number', required: true, default: 0 },
      { key: 'dueDate', label: 'تاریخ سررسید', type: 'date', required: true },
      { key: 'bankName', label: 'نام بانک', type: 'text' },
      { key: 'status', label: 'وضعیت', type: 'select', options: [
        { value: 'pending', label: 'در انتظار' },
        { value: 'cleared', label: 'تسویه‌شده' },
        { value: 'bounced', label: 'برگشت‌خورده' },
      ], default: 'pending' },
      { key: 'notes', label: 'توضیحات', type: 'text' },
    ],
  },
  preInvoice: {
    model: 'pre_invoices',
    title: 'پیش‌فاکتور جدید',
    description: 'ایجاد پیش‌فاکتور جدید',
    fields: [
      { key: 'number', label: 'شماره پیش‌فاکتور', type: 'text', placeholder: 'PRE-001', required: true },
      { key: 'type', label: 'نوع', type: 'select', options: [
        { value: 'sales', label: 'فروش' },
        { value: 'purchase', label: 'خرید' },
      ], default: 'sales' },
      { key: 'customerId', label: 'شناسه مشتری (UUID)', type: 'text' },
      { key: 'finalAmount', label: 'مبلغ نهایی (تومان)', type: 'number', default: 0 },
      { key: 'status', label: 'وضعیت', type: 'select', options: [
        { value: 'draft', label: 'پیش‌نویس' },
        { value: 'confirmed', label: 'تأییدشده' },
      ], default: 'draft' },
    ],
  },
  paymentAnnouncement: {
    model: 'payment_announcements',
    title: 'اعلامیه پرداخت جدید',
    description: 'ایجاد اعلامیه پرداخت جدید',
    fields: [
      { key: 'type', label: 'نوع', type: 'select', options: [
        { value: 'payment', label: 'پرداخت' },
        { value: 'receipt', label: 'دریافت' },
      ], default: 'payment' },
      { key: 'counterparty', label: 'طرف حساب', type: 'text', required: true },
      { key: 'amount', label: 'مبلغ (تومان)', type: 'number', required: true, default: 0 },
      { key: 'date', label: 'تاریخ', type: 'date', default: new Date().toISOString().slice(0, 10) },
      { key: 'description', label: 'توضیحات', type: 'text' },
      { key: 'status', label: 'وضعیت', type: 'select', options: [
        { value: 'draft', label: 'پیش‌نویس' },
        { value: 'confirmed', label: 'تأییدشده' },
      ], default: 'draft' },
    ],
  },
};

export const CREATE_SECTIONS = Object.keys(CREATE_SCHEMAS).map((key) => ({
  key,
  title: CREATE_SCHEMAS[key].title,
  description: CREATE_SCHEMAS[key].description,
}));
