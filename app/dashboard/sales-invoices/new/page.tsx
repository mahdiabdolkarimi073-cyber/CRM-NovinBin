'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowRight,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Lightbulb,
  Info,
  Hash,
  User,
  Calendar,
  Package,
  ScanLine,
  Printer,
  CheckCircle,
  Settings2,
  RefreshCw,
  Usb,
  Receipt,
} from 'lucide-react';
import { usePrinter, printInvoice } from '@/hooks/use-printer';
import { generateInvoicePrintHTML, generateThermalReceiptHTML } from '@/lib/invoice-print';
import { toast } from 'sonner';
import { formatToman, toEnglishDigits, parseNumber } from '@/lib/format';
import { fullName } from '@/lib/constants';
import type { Customer, ProcessAgent, Warehouse, Product, Profile } from '@/lib/types';

interface ItemRow {
  productId: string;
  productName: string;
  qty: string;
  unit: string;
  unitPrice: string;
  discountPct: string;
  discountAmount: string;
  taxPct: string;
  taxAmount: string;
  finalPrice: string;
}

const SALE_TYPES = [
  { value: 'cash', label: 'نقدی' },
  { value: 'credit', label: 'اعتباری' },
  { value: 'installment', label: 'قسطی' },
  { value: 'mixed', label: 'ترکیبی' },
];

const guideItems = [
  { icon: Hash, title: 'شماره‌گذاری', desc: 'شماره داخلی فاکتور به‌صورت خودکار تولید می‌شود.' },
  { icon: User, title: 'مشتری', desc: 'مشتری و عامل فروش را انتخاب کنید.' },
  { icon: Package, title: 'اقلام و اسکنر', desc: 'با اسکنر بارکد محصولات را اسکن کنید تا به‌صورت ردیف‌های مجزا اضافه شوند.' },
  { icon: Printer, title: 'چاپ فیش', desc: 'پشتیبانی مستقیم از چاپگر حرارتی BIXOLON SRP-350II و اندازه A4.' },
];

export default function NewSalesInvoicePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<ProcessAgent[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);

  // Form State
  const [internalNumber, setInternalNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [saleType, setSaleType] = useState('cash');
  const [sellerId, setSellerId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { productId: '', productName: '', qty: '1', unit: '', unitPrice: '0', discountPct: '0', discountAmount: '0', taxPct: '0', taxAmount: '0', finalPrice: '0' },
  ]);

  // Scanner state - enabled by default so scanner always works seamlessly
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [quickBarcode, setQuickBarcode] = useState('');
  const quickBarcodeInputRef = useRef<HTMLInputElement>(null);

  // Printer state & dialogs
  const [lastCreatedInvoice, setLastCreatedInvoice] = useState<any>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');
  const [printing, setPrinting] = useState(false);

  const {
    status: printerStatus,
    checkPrinter,
    connectHardwarePrinter,
    setPrinterConfig,
  } = usePrinter();

  const productsRef = useRef<Product[]>([]);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Core Barcode Scanning Handler
  const handleBarcodeScan = useCallback((barcode: string) => {
    if (!barcode) return;
    const cleanBarcode = toEnglishDigits(barcode.trim()).toLowerCase();
    if (!cleanBarcode) return;

    // Search product in products catalog
    const product = productsRef.current.find(
      (p) =>
        (p.barcode && toEnglishDigits(p.barcode.trim()).toLowerCase() === cleanBarcode) ||
        (p.sku && toEnglishDigits(p.sku.trim()).toLowerCase() === cleanBarcode) ||
        (p.id && p.id.toLowerCase() === cleanBarcode) ||
        (p.name && p.name.trim().toLowerCase() === cleanBarcode)
    );

    if (!product) {
      toast.error(`محصولی با بارکد "${barcode}" در انبار یافت نشد`);
      return;
    }

    setItems((prev) => {
      // 1. Check if this exact product already exists in the invoice
      const existingIndex = prev.findIndex((it) => it.productId === product.id);

      if (existingIndex !== -1) {
        // Same product scanned again: increment quantity
        const currentQty = parseNumber(prev[existingIndex].qty);
        const newQty = String(currentQty + 1);

        return prev.map((it, idx) => {
          if (idx !== existingIndex) return it;
          const qty = parseNumber(newQty);
          const unitPrice = parseNumber(it.unitPrice);
          const gross = qty * unitPrice;
          const discPct = parseNumber(it.discountPct);
          const discountAmount = (gross * discPct) / 100;
          const taxable = gross - discountAmount;
          const taxPct = parseNumber(it.taxPct);
          const taxAmount = (taxable * taxPct) / 100;
          return {
            ...it,
            qty: newQty,
            discountAmount: String(discountAmount),
            taxAmount: String(taxAmount),
            finalPrice: String(taxable + taxAmount),
          };
        });
      }

      // 2. A DIFFERENT product is scanned:
      // Construct the row for the new product
      const unitPrice = String(product.price || 0);
      const taxRate = String(product.taxRate || 0);
      const gross = parseNumber(unitPrice);
      const taxAmount = (gross * parseNumber(taxRate)) / 100;
      const finalPrice = String(gross + taxAmount);

      const newRow: ItemRow = {
        productId: product.id,
        productName: product.name,
        qty: '1',
        unit: product.unit || '',
        unitPrice: unitPrice,
        discountPct: '0',
        discountAmount: '0',
        taxPct: taxRate,
        taxAmount: String(taxAmount),
        finalPrice: finalPrice,
      };

      // Check if an empty/unselected row is available (e.g. the initial blank row)
      const emptyRowIndex = prev.findIndex(
        (it) => !it.productId && (!it.productName || it.productName.trim() === '')
      );

      if (emptyRowIndex !== -1) {
        // Place new product into the empty row
        const updated = [...prev];
        updated[emptyRowIndex] = newRow;
        return updated;
      }

      // No empty row: ADD A NEW ROW for this different product!
      return [...prev, newRow];
    });

    toast.success(`«${product.name}» به فاکتور اضافه شد`);
  }, []);

  // Global hardware barcode scanner hook
  useBarcodeScanner({ onScan: handleBarcodeScan, enabled: scannerEnabled });

  const loadData = useCallback(async () => {
    try {
      const [custData, agentData, whData, prodData, staffData] = await Promise.all([
        fetchData<Customer>('customers', { where: {} }),
        fetchData<ProcessAgent>('process_agents', { where: { active: true } }),
        fetchData<Warehouse>('warehouses', { where: { active: true } }),
        fetchData<Product>('products', { where: { active: true } }),
        fetchData<Profile>('profiles', { where: { active: true } }),
      ]);
      setCustomers(custData || []);
      setAgents(agentData || []);
      setWarehouses(whData || []);
      setProducts(prodData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setInternalNumber(`SI-${Date.now().toString().slice(-8)}`);
    setSaleDate(new Date().toISOString().slice(0, 10));
  }, []);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: '',
        productName: '',
        qty: '1',
        unit: '',
        unitPrice: '0',
        discountPct: '0',
        discountAmount: '0',
        taxPct: '0',
        taxAmount: '0',
        finalPrice: '0',
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemRow, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === 'productId') {
          const p = products.find((prod) => prod.id === value);
          if (p) {
            updated.productName = p.name;
            updated.unit = p.unit || '';
            updated.unitPrice = String(p.price || 0);
            updated.taxPct = String(p.taxRate || 0);
          }
        }
        if (field === 'qty' || field === 'unitPrice' || field === 'discountPct' || field === 'taxPct' || field === 'productId') {
          const qty = parseNumber(updated.qty);
          const unitPrice = parseNumber(updated.unitPrice);
          const gross = qty * unitPrice;
          const discPct = parseNumber(updated.discountPct);
          const discountAmount = (gross * discPct) / 100;
          updated.discountAmount = String(discountAmount);
          const taxable = gross - discountAmount;
          const taxPct = parseNumber(updated.taxPct);
          const taxAmount = (taxable * taxPct) / 100;
          updated.taxAmount = String(taxAmount);
          updated.finalPrice = String(taxable + taxAmount);
        }
        return updated;
      })
    );
  };

  const subtotal = items.reduce((sum, item) => sum + parseNumber(item.qty) * parseNumber(item.unitPrice), 0);
  const totalDiscount = items.reduce((sum, item) => sum + parseNumber(item.discountAmount), 0);
  const totalTax = items.reduce((sum, item) => sum + parseNumber(item.taxAmount), 0);
  const finalAmount = items.reduce((sum, item) => sum + parseNumber(item.finalPrice), 0);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!saleDate) e.saleDate = 'تاریخ فروش الزامی است';
    if (!customerId) e.customerId = 'انتخاب مشتری الزامی است';
    if (items.length === 0 || items.every((i) => !i.productId && !i.productName)) {
      e.items = 'حداقل یک قلم کالا یا خدمت الزامی است';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast.error('اطلاعات کاربر بارگذاری نشده است');
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const customer = customers.find((c) => c.id === customerId);
      const customerName = customer ? [customer.firstName, customer.lastName, customer.companyName].filter(Boolean).join(' ') : null;
      const agent = agents.find((a) => a.id === agentId);
      const agentName = agent ? agent.name : null;
      const seller = staff.find((s) => s.id === sellerId);
      const sellerName = seller ? fullName(seller.firstName, seller.lastName) : null;

      const invoice = await createData('sales_invoices', {
        internalNumber,
        invoiceNumber: invoiceNumber || null,
        saleDate: new Date(saleDate).toISOString(),
        registeredDate: new Date().toISOString(),
        customerId: customerId || null,
        customerName,
        saleType,
        sellerId: sellerId || null,
        sellerName,
        agentId: agentId || null,
        agentName,
        currency: 'IRR',
        exchangeRate: 1,
        paymentTerms: paymentTerms || null,
        warehouseId: warehouseId || null,
        subtotal,
        totalDiscount,
        taxableAmount: subtotal - totalDiscount,
        totalTax,
        finalAmount,
        paidAmount: 0,
        balanceDue: finalAmount,
        status: 'draft',
        taxStatus: 'pending',
        description: description || null,
        createdById: profile.id,
      });

      // Save invoice item rows
      const validItems = items.filter((it) => it.productId || it.productName);
      await Promise.all(
        validItems.map((item, idx) =>
          createData('sales_invoice_items', {
            invoiceId: invoice.id,
            productId: item.productId || null,
            productName: item.productName || null,
            rowNumber: idx + 1,
            qty: parseNumber(item.qty),
            unit: item.unit || null,
            unitPrice: parseNumber(item.unitPrice),
            discountPct: parseNumber(item.discountPct),
            discountAmount: parseNumber(item.discountAmount),
            taxPct: parseNumber(item.taxPct),
            taxAmount: parseNumber(item.taxAmount),
            finalPrice: parseNumber(item.finalPrice),
          })
        )
      );

      // Audit log entry
      await createData('sales_invoice_history', {
        invoiceId: invoice.id,
        action: 'create',
        fromStatus: null,
        toStatus: 'draft',
        performedById: profile.id,
        comment: 'فاکتور فروش ایجاد شد',
      });

      toast.success('فاکتور فروش با موفقیت ذخیره شد');
      setLastCreatedInvoice({ ...invoice, items: validItems });
      setShowPrintDialog(true);
    } catch (error: any) {
      toast.error('ثبت فاکتور ناموفق بود: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Perform invoice print (thermal 80mm BIXOLON SRP-350II or A4)
  const executePrint = (format: 'thermal' | 'a4') => {
    if (!lastCreatedInvoice) return;
    setPrinting(true);

    const customer = customers.find((c) => c.id === customerId);
    const cName = customer ? [customer.firstName, customer.lastName, customer.companyName].filter(Boolean).join(' ') : 'مشتری متفرقه';
    const wh = warehouses.find((w) => w.id === warehouseId);
    const invoiceItems = lastCreatedInvoice.items || items.filter((it) => it.productId || it.productName);

    const html =
      format === 'thermal'
        ? generateThermalReceiptHTML(lastCreatedInvoice, invoiceItems, cName, wh?.name, printerStatus.model || 'BIXOLON SRP-350II')
        : generateInvoicePrintHTML(lastCreatedInvoice, invoiceItems, cName, wh?.name);

    const ok = printInvoice(html);
    if (!ok) {
      toast.error('ارسال به پرینتر ناموفق بود. لطفاً دسترسی پاپ‌آپ را در مرورگر مجاز کنید.');
    } else {
      toast.success(`دستور چاپ به چاپگر ${printerStatus.model || 'BIXOLON SRP-350II'} ارسال شد.`);
    }

    setTimeout(() => setPrinting(false), 1200);
  };

  // Test print for BIXOLON SRP-350II
  const handleTestPrint = () => {
    const testInvoice = {
      internalNumber: 'TEST-BIXOLON',
      invoiceNumber: '001',
      saleDate: new Date().toISOString(),
      customerName: 'تست اتصال چاپگر',
      saleType: 'cash',
      subtotal: 150000,
      totalDiscount: 0,
      totalTax: 15000,
      finalAmount: 165000,
      paidAmount: 165000,
      balanceDue: 0,
      description: `چاپ آزمایشی موفق با چاپگر حرارتی ${printerStatus.model}`,
    };

    const testItems = [
      {
        productName: 'کالای نمونه تست چاپگر',
        qty: 1,
        unit: 'عدد',
        unitPrice: 150000,
        finalPrice: 165000,
      },
    ];

    const html = generateThermalReceiptHTML(
      testInvoice,
      testItems,
      'مشتری تستی',
      'انبار مرکزی',
      printerStatus.model
    );

    printInvoice(html);
    toast.success(`فیش آزمایشی به ${printerStatus.model} ارسال شد`);
  };

  return (
    <div className="w-full" dir="rtl">
      {/* Page Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت فاکتور فروش</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">
            داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> فروش <span className="mx-1.5 text-[#CBD5E1]">←</span> فاکتور جدید
          </div>
        </div>

        {/* Printer & Scanner Quick Status Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Connected Printer Status Badge */}
          <button
            type="button"
            onClick={() => setShowPrinterSettings(true)}
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
            title="تنظیمات پرینتر و تست چاپ"
          >
            <Printer className="h-4 w-4 text-emerald-600" />
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{printerStatus.model || 'BIXOLON SRP-350II'}</span>
            </span>
            <span className="rounded bg-emerald-200/70 px-1.5 py-0.5 text-[10px] text-emerald-900">80mm</span>
            <Settings2 className="h-3.5 w-3.5 text-emerald-600" />
          </button>

          <Link href="/dashboard/sales-invoices">
            <Button variant="outline" className="h-[40px] rounded-[10px] border-[#DCE3EE] text-xs">
              <ArrowRight className="h-4 w-4" /> بازگشت به لیست
            </Button>
          </Link>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* General Information Card */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#3155E7]">
                    <FileText className="h-5 w-5" />
                  </span>
                  <h2 className="text-base font-bold text-[#1D2939]">اطلاعات پایه فاکتور</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره داخلی</Label>
                    <Input
                      value={internalNumber}
                      readOnly
                      className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-slate-50 font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره فاکتور رسمی</Label>
                    <Input
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="اختیاری..."
                      className="h-[42px] rounded-[10px] border-[#DCE3EE]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">
                      تاریخ فروش <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="h-[42px] rounded-[10px] border-[#DCE3EE]"
                    />
                    {errors.saleDate && <span className="text-xs text-rose-500">{errors.saleDate}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">
                      مشتری <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm"
                    >
                      <option value="">انتخاب مشتری...</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {[c.firstName, c.lastName, c.companyName].filter(Boolean).join(' ')}
                        </option>
                      ))}
                    </select>
                    {errors.customerId && <span className="text-xs text-rose-500">{errors.customerId}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نوع فروش</Label>
                    <select
                      value={saleType}
                      onChange={(e) => setSaleType(e.target.value)}
                      className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm"
                    >
                      {SALE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">فروشنده / صندوقدار</Label>
                    <select
                      value={sellerId}
                      onChange={(e) => setSellerId(e.target.value)}
                      className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm"
                    >
                      <option value="">انتخاب فروشنده...</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {fullName(s.firstName, s.lastName)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">عامل فروش</Label>
                    <select
                      value={agentId}
                      onChange={(e) => setAgentId(e.target.value)}
                      className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm"
                    >
                      <option value="">انتخاب عامل فروش...</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">انبار مبدأ</Label>
                    <select
                      value={warehouseId}
                      onChange={(e) => setWarehouseId(e.target.value)}
                      className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm"
                    >
                      <option value="">انتخاب انبار...</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-sm font-semibold text-[#344054]">شرایط پرداخت</Label>
                    <Input
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      placeholder="شرایط پرداخت نقدی یا مدت‌دار..."
                      className="h-[42px] rounded-[10px] border-[#DCE3EE]"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">توضیحات فاکتور</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="توضیحات تکمیلی..."
                    className="rounded-[10px] border-[#DCE3EE]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items & Barcode Scanner Card */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-[#FF7A00]" />
                    <h2 className="text-base font-bold text-[#1D2939]">اقلام کالا / خدمات</h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={scannerEnabled ? 'default' : 'outline'}
                      onClick={() => {
                        setScannerEnabled((v) => !v);
                        if (!scannerEnabled) {
                          toast.success('اسکنر فعال شد — بارکد را اسکن کنید');
                          quickBarcodeInputRef.current?.focus();
                        } else {
                          toast.info('اسکنر بارکد غیرفعال شد');
                        }
                      }}
                      className={scannerEnabled ? 'bg-[#FF7A00] text-white hover:bg-[#E66E00]' : ''}
                    >
                      <ScanLine className="h-4 w-4" />
                      {scannerEnabled ? 'اسکنر بارکدخوان فعال' : 'فعال‌سازی اسکنر'}
                    </Button>

                    <Button type="button" size="sm" variant="outline" onClick={addItem}>
                      <Plus className="h-4 w-4" /> افزودن سطر دستی
                    </Button>
                  </div>
                </div>

                {/* Quick Scanner Input Field */}
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2 text-amber-900 sm:w-44">
                      <ScanLine className="h-5 w-5 text-[#FF7A00] animate-pulse" />
                      <span className="text-xs font-bold">ورودی مستقیم اسکنر:</span>
                    </div>
                    <div className="relative flex-1">
                      <Input
                        ref={quickBarcodeInputRef}
                        data-barcode-input="true"
                        type="text"
                        placeholder="بارکد محصول را با دستگاه اسکنر بخوانید یا وارد کنید و اینتر بزنید..."
                        value={quickBarcode}
                        onChange={(e) => setQuickBarcode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (quickBarcode.trim()) {
                              handleBarcodeScan(quickBarcode.trim());
                              setQuickBarcode('');
                            }
                          }
                        }}
                        className="h-10 rounded-lg border-amber-300 bg-white pr-9 text-sm font-mono placeholder:text-slate-400 focus:border-[#FF7A00] focus:ring-[#FF7A00]"
                      />
                      <Package className="pointer-events-none absolute right-2.5 top-2.5 h-5 w-5 text-amber-500" />
                    </div>
                    {quickBarcode && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (quickBarcode.trim()) {
                            handleBarcodeScan(quickBarcode.trim());
                            setQuickBarcode('');
                          }
                        }}
                        className="bg-[#FF7A00] text-white hover:bg-[#E66E00]"
                      >
                        ثبت بارکد
                      </Button>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-amber-800">
                    💡 با اسکن هر محصول، در صورت جدید بودن یک سطر جدید به‌صورت خودکار اضافه می‌شود و در صورت تکراری بودن، تعداد آن افزایش می‌یابد.
                  </p>
                </div>

                {/* Items List Rows */}
                <div className="space-y-3">
                  {items.map((item, i) => (
                    <div key={i} className="rounded-lg border border-[#E7ECF3] bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-[#667085]">
                          ردیف {toEnglishDigits(String(i + 1))}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(i)}
                            className="text-rose-400 hover:text-rose-600 transition"
                            title="حذف سطر"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="sm:col-span-2">
                          <Label className="mb-1 block text-[11px] text-slate-500">انتخاب کالا</Label>
                          <select
                            value={item.productId}
                            onChange={(e) => updateItem(i, 'productId', e.target.value)}
                            className="h-[38px] w-full rounded-[8px] border border-[#DCE3EE] bg-white px-2 text-sm"
                          >
                            <option value="">انتخاب محصول از انبار...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.barcode ? `(بارکد: ${p.barcode})` : ''} - {formatToman(p.price || 0)} تومان
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label className="mb-1 block text-[11px] text-slate-500">نام کالا / شرح</Label>
                          <Input
                            placeholder="نام کالا"
                            value={item.productName}
                            onChange={(e) => updateItem(i, 'productName', e.target.value)}
                            className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm"
                          />
                        </div>

                        <div>
                          <Label className="mb-1 block text-[11px] text-slate-500">واحد</Label>
                          <Input
                            placeholder="عدد / کیلو"
                            value={item.unit}
                            onChange={(e) => updateItem(i, 'unit', e.target.value)}
                            className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm"
                          />
                        </div>

                        <div>
                          <Label className="mb-1 block text-[11px] text-slate-500">تعداد</Label>
                          <Input
                            placeholder="تعداد"
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateItem(i, 'qty', e.target.value)}
                            className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm"
                          />
                        </div>

                        <div>
                          <Label className="mb-1 block text-[11px] text-slate-500">قیمت واحد (تومان)</Label>
                          <Input
                            placeholder="قیمت واحد"
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                            className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm"
                          />
                        </div>

                        <div>
                          <Label className="mb-1 block text-[11px] text-slate-500">درصد تخفیف (%)</Label>
                          <Input
                            placeholder="تخفیف"
                            type="number"
                            value={item.discountPct}
                            onChange={(e) => updateItem(i, 'discountPct', e.target.value)}
                            className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm"
                          />
                        </div>

                        <div>
                          <Label className="mb-1 block text-[11px] text-slate-500">مبلغ نهایی سطر</Label>
                          <div className="flex h-[38px] items-center justify-center rounded-[8px] bg-blue-50 px-3 text-sm font-bold text-blue-700">
                            {formatToman(parseNumber(item.finalPrice))} تومان
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {errors.items && <span className="mt-2 block text-xs text-rose-500">{errors.items}</span>}

                {/* Totals Summary */}
                <div className="mt-4 space-y-2 rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-600">جمع کل اقلام:</span>
                    <span className="font-bold text-slate-800">{formatToman(subtotal)} تومان</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-600">تخفیف کلی:</span>
                    <span className="font-bold text-rose-600">{formatToman(totalDiscount)} تومان</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-600">مالیات بر ارزش افزوده:</span>
                    <span className="font-bold text-amber-600">{formatToman(totalTax)} تومان</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base">
                    <span className="font-bold text-blue-700">مبلغ قابل پرداخت نهایی:</span>
                    <span className="font-black text-blue-800 text-lg">{formatToman(finalAmount)} تومان</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Link href="/dashboard/sales-invoices">
                <Button type="button" variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE]">
                  انصراف
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={submitting}
                className="h-[42px] rounded-[10px] bg-[#3155E7] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" /> در حال ثبت فاکتور...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 ml-2" /> ثبت و صدور فاکتور
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Sidebar Info & Guides */}
          <div className="space-y-4">
            {/* Printer Card */}
            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Printer className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-sm font-bold text-emerald-950">وضعیت پرینتر متصل</h3>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    متصل
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">مدل چاپگر:</span>
                    <span className="font-bold text-emerald-900">{printerStatus.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">عرض کاغذ:</span>
                    <span className="font-semibold">80mm حرارتی</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">نوع درگاه:</span>
                    <span className="font-mono">USB / Direct POS</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleTestPrint}
                    className="flex-1 border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 text-xs"
                  >
                    <Receipt className="h-3.5 w-3.5 ml-1" /> تست چاپ فیش
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPrinterSettings(true)}
                    className="border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 text-xs"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Guide Card */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
                    <Lightbulb className="h-5 w-5" />
                  </span>
                  <h2 className="text-base font-bold text-[#1D2939]">راهنمای ثبت</h2>
                </div>
                <div className="space-y-3">
                  {guideItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#3155E7]">
                        <item.icon className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-[#344054]">{item.title}</div>
                        <div className="mt-0.5 text-xs text-[#98A2B3]">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-3 rounded-[12px] border border-blue-100 bg-blue-50 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
              <p className="text-xs text-blue-700 leading-5">
                پس از ثبت موفق، فیش فاکتور بلافاصله با فرمت رول ۸۰ میلی‌متری متناسب با پرینتر بیکسولون (BIXOLON SRP-350II) یا فرمت A4 آماده پرینت خواهد بود.
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Printer Settings & Hardware Detection Modal */}
      <Dialog open={showPrinterSettings} onOpenChange={setShowPrinterSettings}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Printer className="h-5 w-5 text-emerald-600" />
              تنظیمات و شناسایی پرینتر BIXOLON SRP-350II
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-950">وضعیت اتصال فعلی:</span>
                <span className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                  متصل و فعال
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-emerald-900">
                <div>• <strong>مدل:</strong> {printerStatus.model}</div>
                <div>• <strong>پروتکل:</strong> ESC/POS حرارتی (Thermal Receipt)</div>
                <div>• <strong>عرض چاپ:</strong> 80mm / 72mm printable (576 dots)</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">انتخاب مدل پرینتر پیش‌فرض:</Label>
              <select
                value={printerStatus.model}
                onChange={(e) => setPrinterConfig(e.target.value, '80mm')}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs"
              >
                <option value="BIXOLON SRP-350II">BIXOLON SRP-350II (فیش‌پرینتر حرارتی ۸۰ میلی‌متری)</option>
                <option value="BIXOLON SRP-350III">BIXOLON SRP-350III (نسخه ۳ حرارتی)</option>
                <option value="BIXOLON SRP-350plus">BIXOLON SRP-350plus (نسخه پلاس)</option>
                <option value="BIXOLON SRP-E300">BIXOLON SRP-E300 (سری اقتصادی)</option>
                <option value="Epson TM-T20 / Standard POS">Epson TM-T20 / Standard Thermal POS</option>
                <option value="Standard Office Printer">چاپگر اداری معمولی (A4 / A5)</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const res = await connectHardwarePrinter();
                  if (res.success) {
                    toast.success(`چاپگر ${res.model} متصل و آماده چاپ شد`);
                  }
                }}
                className="text-xs gap-1.5"
              >
                <Usb className="h-3.5 w-3.5 text-blue-600" />
                شناسایی پورت USB
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleTestPrint}
                className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs gap-1.5"
              >
                <Receipt className="h-3.5 w-3.5" />
                چاپ فیش تستی
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Created - Print Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              فاکتور فروش با موفقیت ثبت شد
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-700 leading-6">
              فاکتور فروش با شماره داخلی <strong>{lastCreatedInvoice?.internalNumber}</strong> با موفقیت ذخیره گردید.
              می‌توانید فیش را مستقیماً با چاپگر حرارتی <strong>{printerStatus.model}</strong> یا فرمت استاندارد A4 پرینت کنید.
            </p>

            {/* Select Print Format */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
              <Label className="text-xs font-bold text-slate-800">قالب چاپ:</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPrintFormat('thermal')}
                  className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition ${
                    printFormat === 'thermal'
                      ? 'border-[#FF7A00] bg-amber-50/80 text-amber-950 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Receipt className="h-5 w-5 mb-1 text-[#FF7A00]" />
                  <span className="text-xs">فیش حرارتی ۸۰mm</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">مخصوص BIXOLON SRP-350II</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintFormat('a4')}
                  className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition ${
                    printFormat === 'a4'
                      ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="h-5 w-5 mb-1 text-blue-600" />
                  <span className="text-xs">فاکتور رسمی A4</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">چاپگرهای اداری</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
              <Printer className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>چاپگر آماده: <strong>{printerStatus.model}</strong></span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPrintDialog(false);
                router.push('/dashboard/sales-invoices');
              }}
              className="text-xs"
            >
              بازگشت به لیست
            </Button>
            <Button
              disabled={printing}
              onClick={() => executePrint(printFormat)}
              className="bg-[#3155E7] text-white hover:bg-[#2445C7] text-xs gap-1.5"
            >
              <Printer className="h-4 w-4" />
              {printing ? 'در حال ارسال به پرینتر...' : `چاپ با ${printerStatus.model}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
