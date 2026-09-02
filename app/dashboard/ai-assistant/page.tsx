'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, TrendingUp, AlertTriangle, Lightbulb, BarChart3, Loader2, Plus, HelpCircle, Check, X } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

interface CreateField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'boolean';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  default?: any;
}

interface CreateSchema {
  model: string;
  title: string;
  description: string;
  fields: CreateField[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  details?: string[];
  alerts?: string[];
  recommendations?: string[];
  stats?: { label: string; value: string }[];
  section?: string;
  timestamp?: string;
  createSchema?: CreateSchema;
  createSuccess?: boolean;
}

const FINANCIAL_ACTIONS = [
  { label: 'نمای کلی مالی', section: 'overview' },
  { label: 'فاکتورها', section: 'invoices' },
  { label: 'مطالبات و بدهی‌ها', section: 'receivables' },
  { label: 'چک‌های دریافتی', section: 'cheques' },
  { label: 'حساب‌های بانکی', section: 'banks' },
  { label: 'پرداخت‌ها', section: 'payments' },
  { label: 'حسابداری', section: 'accounting' },
  { label: 'کارتخوان‌ها', section: 'cardReaders' },
  { label: 'تنخواه‌دار', section: 'pettyCash' },
  { label: 'طرف‌های حساب', section: 'contactParties' },
  { label: 'صدور اسناد', section: 'documentIssuance' },
  { label: 'پیش‌فاکتور', section: 'preInvoices' },
];

const SMART_ACTIONS = [
  { label: 'هشدارهای هوشمند', section: 'smartAlerts' },
  { label: 'امتیازدهی لیدها', section: 'leadScoring' },
  { label: 'پیش‌بینی ریزش', section: 'churnPrediction' },
  { label: 'فروش متقاطع', section: 'crossSell' },
  { label: 'تخصیص منابع فروش', section: 'salesAllocation' },
  { label: 'موجودی هوشمند', section: 'smartInventory' },
  { label: 'سودآوری مشتری', section: 'customerProfitability' },
  { label: 'تقویم مالی', section: 'financialCalendar' },
  { label: 'مسیر تبدیل', section: 'conversionPath' },
];

const ANALYSIS_ACTIONS = [...FINANCIAL_ACTIONS, ...SMART_ACTIONS];

const CREATE_ACTIONS = [
  { label: 'تنخواه‌دار', section: 'pettyCash' },
  { label: 'حساب بانکی', section: 'bankAccount' },
  { label: 'فاکتور', section: 'invoice' },
  { label: 'پرداخت', section: 'payment' },
  { label: 'رسید', section: 'receipt' },
  { label: 'چک دریافتی', section: 'receivedCheque' },
  { label: 'کارتخوان', section: 'cardReader' },
  { label: 'طرف حساب', section: 'contactParty' },
  { label: 'حساب حسابداری', section: 'account' },
  { label: 'مرکز هزینه', section: 'costCenter' },
  { label: 'سال مالی', section: 'fiscalYear' },
  { label: 'چک', section: 'cheque' },
  { label: 'پیش‌فاکتور', section: 'preInvoice' },
  { label: 'اعلامیه پرداخت', section: 'paymentAnnouncement' },
];

export default function AIAssistantPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'analyze' | 'smart' | 'create'>('analyze');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: 'سلام! من دستیار هوشمند مالی شما هستم.\n\nمی‌توانم:\n• داده‌های مالی شما را تحلیل کنم\n• با تحلیل‌های هوشمند، ریسک‌ها و فرصت‌ها را شناسایی کنم (ریزش مشتری، امتیاز لید، موجودی، سودآوری و...)\n• رکوردهای جدید ایجاد کنم (مثل فاکتور، تنخواه‌دار، حساب بانکی و...)\n• راهنمایی بدم\n\nبرای شروع، یکی از دکمه‌های زیر را انتخاب کنید یا سوال خود را بنویسید.',
        section: 'دستیار مالی',
      },
    ]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (payload: Record<string, any>, userDisplayText: string) => {
    setLoading(true);
    const userMsg: Message = { role: 'user', content: userDisplayText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در ارتباط با دستیار');

      const assistantMsg: Message = {
        role: 'assistant',
        content: json.summary || json.content || 'پاسخی یافت نشد.',
        details: json.details,
        alerts: json.alerts,
        recommendations: json.recommendations,
        stats: json.stats,
        section: json.section,
        timestamp: json.timestamp,
        createSchema: json.createSchema,
        createSuccess: json.type === 'create_success',
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `خطا: ${e.message}`, section: 'خطا' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = (section: string) => {
    sendMessage({ section, mode: 'analyze' }, `تحلیل ${ANALYSIS_ACTIONS.find((a) => a.section === section)?.label || section}`);
  };

  const handleCreate = (section: string) => {
    sendMessage({ mode: 'create', createSection: section }, `ایجاد ${CREATE_ACTIONS.find((a) => a.section === section)?.label || section}`);
  };

  const handleHelp = () => {
    sendMessage({ mode: 'help' }, 'راهنما');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage({ message: input }, input);
  };

  const handleCreateSubmit = (schema: CreateSchema, values: Record<string, any>) => {
    sendMessage(
      { mode: 'create', createSection: schema.model, confirmCreate: true, fieldValues: values },
      `ثبت ${schema.title}`,
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]" dir="rtl">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-[30px] w-[5px] rounded-[4px] bg-gradient-to-b from-[#2DD4BF] to-[#0D9488]" />
          <h1 className="text-[24px] font-bold leading-tight text-[#0F172A] sm:text-[28px]">
            دستیار هوشمند مالی
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#2DD4BF]/10 px-2.5 py-1 text-[11px] font-medium text-[#0D9488]">
            <Sparkles className="h-3 w-3" />
            AI
          </span>
          <button
            onClick={handleHelp}
            disabled={loading}
            className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition-all hover:border-[#2DD4BF] hover:text-[#0D9488] disabled:opacity-50"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            راهنما
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-3 flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab('analyze')}
          className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${activeTab === 'analyze' ? 'bg-white text-[#0D9488] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <BarChart3 className="ml-1 inline h-3.5 w-3.5" />
          مالی
        </button>
        <button
          onClick={() => setActiveTab('smart')}
          className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${activeTab === 'smart' ? 'bg-white text-[#0D9488] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Sparkles className="ml-1 inline h-3.5 w-3.5" />
          هوشمند
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${activeTab === 'create' ? 'bg-white text-[#0D9488] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Plus className="ml-1 inline h-3.5 w-3.5" />
          ایجاد رکورد
        </button>
      </div>

      {/* Quick action chips */}
      <div className="mb-3 flex flex-wrap gap-2">
        {activeTab === 'analyze'
          ? FINANCIAL_ACTIONS.map((qa) => (
              <button
                key={qa.section}
                onClick={() => handleAnalyze(qa.section)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition-all hover:border-[#2DD4BF] hover:bg-[#2DD4BF]/5 hover:text-[#0D9488] disabled:opacity-50"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                {qa.label}
              </button>
            ))
          : activeTab === 'smart'
          ? SMART_ACTIONS.map((qa) => (
              <button
                key={qa.section}
                onClick={() => handleAnalyze(qa.section)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition-all hover:border-[#2DD4BF] hover:bg-[#2DD4BF]/5 hover:text-[#0D9488] disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {qa.label}
              </button>
            ))
          : CREATE_ACTIONS.map((qa) => (
              <button
                key={qa.section}
                onClick={() => handleCreate(qa.section)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition-all hover:border-[#2DD4BF] hover:bg-[#2DD4BF]/5 hover:text-[#0D9488] disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {qa.label}
              </button>
            ))}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div ref={scrollRef} className="h-full overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} onCreateSubmit={handleCreateSubmit} loading={loading} />
          ))}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2DD4BF] to-[#0D9488]">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-[#0D9488]" />
                <span className="text-sm text-slate-500">در حال پردازش...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="سوال خود را بنویسید... (مثلاً: سلام، یا: یک فاکتور ایجاد کن)"
          disabled={loading}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2DD4BF] focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#0D9488] px-5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          ارسال
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ msg, onCreateSubmit, loading }: { msg: Message; onCreateSubmit: (schema: CreateSchema, values: Record<string, any>) => void; loading: boolean }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-3">
        <div className="max-w-[80%] rounded-2xl bg-gradient-to-r from-[#2DD4BF] to-[#0D9488] px-4 py-3 text-sm text-white shadow-sm">
          {msg.content}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200">
          <User className="h-5 w-5 text-slate-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2DD4BF] to-[#0D9488]">
        <Bot className="h-5 w-5 text-white" />
      </div>
      <div className="max-w-[85%] space-y-3">
        {msg.section && (
          <div className="inline-flex items-center gap-1 rounded-full bg-[#2DD4BF]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#0D9488]">
            <Sparkles className="h-3 w-3" />
            {msg.section}
          </div>
        )}
        <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-line leading-relaxed ${msg.createSuccess ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-50 text-slate-800'}`}>
          {msg.content}
        </div>

        {/* Create form */}
        {msg.createSchema && !msg.createSuccess && (
          <CreateForm schema={msg.createSchema} onSubmit={onCreateSubmit} loading={loading} />
        )}

        {/* Stats grid */}
        {msg.stats && msg.stats.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {msg.stats.map((s, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                <div className="text-[11px] text-slate-400">{s.label}</div>
                <div className="text-sm font-bold tabular-nums text-slate-800" dir="ltr">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Details */}
        {msg.details && msg.details.length > 0 && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-blue-700">
              <BarChart3 className="h-3.5 w-3.5" />
              جزئیات
            </div>
            <ul className="space-y-1">
              {msg.details.map((d, i) => (
                <li key={i} className="text-[13px] text-slate-600">{d}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Alerts */}
        {msg.alerts && msg.alerts.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              هشدارها
            </div>
            <ul className="space-y-1">
              {msg.alerts.map((a, i) => (
                <li key={i} className="text-[13px] text-amber-800">{a}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {msg.recommendations && msg.recommendations.length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
              <Lightbulb className="h-3.5 w-3.5" />
              توصیه‌ها
            </div>
            <ul className="space-y-1">
              {msg.recommendations.map((r, i) => (
                <li key={i} className="text-[13px] text-emerald-800">{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateForm({ schema, onSubmit, loading }: { schema: CreateSchema; onSubmit: (schema: CreateSchema, values: Record<string, any>) => void; loading: boolean }) {
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    const defaults: Record<string, any> = {};
    for (const f of schema.fields) {
      if (f.default !== undefined) defaults[f.key] = f.default;
    }
    setValues(defaults);
  }, [schema.model]);

  const handleChange = (key: string, val: any) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(schema, values);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#2DD4BF]/30 bg-white p-4 space-y-3">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0D9488]">
        <Plus className="h-4 w-4" />
        فرم {schema.title}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {schema.fields.map((f) => (
          <div key={f.key} className="space-y-1">
            <label className="text-[12px] font-medium text-slate-600">
              {f.label}
              {f.required && <span className="text-red-500"> *</span>}
            </label>
            {f.type === 'select' ? (
              <select
                value={values[f.key] ?? ''}
                onChange={(e) => handleChange(f.key, e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 focus:border-[#2DD4BF] focus:outline-none focus:ring-1 focus:ring-[#2DD4BF]/30 disabled:opacity-50"
              >
                <option value="">انتخاب کنید...</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : f.type === 'boolean' ? (
              <button
                type="button"
                onClick={() => handleChange(f.key, !values[f.key])}
                disabled={loading}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] transition-all disabled:opacity-50 ${values[f.key] ? 'border-[#2DD4BF] bg-[#2DD4BF]/10 text-[#0D9488]' : 'border-slate-200 text-slate-500'}`}
              >
                <div className={`flex h-4 w-4 items-center justify-center rounded ${values[f.key] ? 'bg-[#2DD4BF]' : 'bg-slate-100'}`}>
                  {values[f.key] && <Check className="h-3 w-3 text-white" />}
                </div>
                {values[f.key] ? 'بله' : 'خیر'}
              </button>
            ) : (
              <input
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                value={values[f.key] ?? ''}
                onChange={(e) => handleChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                disabled={loading}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-[#2DD4BF] focus:outline-none focus:ring-1 focus:ring-[#2DD4BF]/30 disabled:opacity-50"
              />
            )}
          </div>
        ))}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#2DD4BF] to-[#0D9488] px-4 py-2 text-[13px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
        ثبت در دیتابیس
      </button>
    </form>
  );
}
