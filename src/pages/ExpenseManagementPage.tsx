import React, { useEffect, useMemo, useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Check,
  Wallet,
} from 'lucide-react';
import { AcademyDataService } from '../services/academyDataService';
import { useAuth } from '../context/AuthContext';
import { ExpenseCategory, ExpenseRecord, PaymentMethodType } from '../types';

const CATEGORIES: ExpenseCategory[] = [
  'Rent & Utilities',
  'Staff & Faculty',
  'Study Materials & Printing',
  'Equipment & Biometric',
  'Marketing',
  'Maintenance',
  'Other',
];

const PAYMENT_METHODS: PaymentMethodType[] = ['Cash', 'Bank Transfer', 'EasyPaisa / JazzCash', 'Card', 'Online'];

export const ExpenseManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => AcademyDataService.getExpenses());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | ExpenseCategory>('All');
  const [monthFilter, setMonthFilter] = useState<string>('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRecord | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Rent & Utilities');
  const [amount, setAmount] = useState<number>(5000);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Cash');
  const [vendor, setVendor] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const unsub = AcademyDataService.subscribeExpenses(setExpenses);
    return () => unsub();
  }, []);

  const openCreateModal = () => {
    setEditing(null);
    setTitle('');
    setCategory('Rent & Utilities');
    setAmount(5000);
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('Cash');
    setVendor('');
    setReferenceNo('');
    setDescription('');
    setModalOpen(true);
  };

  const openEditModal = (exp: ExpenseRecord) => {
    setEditing(exp);
    setTitle(exp.title);
    setCategory(exp.category);
    setAmount(exp.amount);
    setDate(exp.date);
    setPaymentMethod(exp.paymentMethod);
    setVendor(exp.vendor || '');
    setReferenceNo(exp.referenceNo || '');
    setDescription(exp.description || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) return;
    await AcademyDataService.saveExpense(
      {
        id: editing?.id,
        createdAt: editing?.createdAt,
        title: title.trim(),
        category,
        amount: Number(amount),
        date,
        paymentMethod,
        vendor: vendor.trim() || undefined,
        referenceNo: referenceNo.trim() || undefined,
        description: description.trim() || undefined,
      },
      user?.name || 'Admin',
      user?.role || 'admin'
    );
    setModalOpen(false);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return expenses.filter((e) => {
      if (categoryFilter !== 'All' && e.category !== categoryFilter) return false;
      if (monthFilter && !e.date.startsWith(monthFilter)) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        (e.vendor || '').toLowerCase().includes(q) ||
        (e.referenceNo || '').toLowerCase().includes(q)
      );
    });
  }, [expenses, searchQuery, categoryFilter, monthFilter]);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentYearKey = new Date().toISOString().slice(0, 4);

  const summary = useMemo(() => {
    const monthlyTotal = expenses
      .filter((e) => e.date.startsWith(currentMonthKey))
      .reduce((sum, e) => sum + e.amount, 0);
    const yearlyTotal = expenses
      .filter((e) => e.date.startsWith(currentYearKey))
      .reduce((sum, e) => sum + e.amount, 0);
    const filteredTotal = filtered.reduce((sum, e) => sum + e.amount, 0);
    return { monthlyTotal, yearlyTotal, filteredTotal, count: filtered.length };
  }, [expenses, filtered, currentMonthKey, currentYearKey]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-500" />
            <span>Academy Expense Management (PKR)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track campus rent, utility bills, printing, equipment, marketing, and operational expenditures.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/30 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800">
          <span className="text-xs font-bold uppercase text-slate-400">This Month ({currentMonthKey})</span>
          <p className="text-2xl font-black text-rose-500 mt-1.5 tabular-nums">
            Rs. {summary.monthlyTotal.toLocaleString()} PKR
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800">
          <span className="text-xs font-bold uppercase text-slate-400">Year-to-Date ({currentYearKey})</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tabular-nums">
            Rs. {summary.yearlyTotal.toLocaleString()} PKR
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800">
          <span className="text-xs font-bold uppercase text-slate-400">Filtered Total ({summary.count} items)</span>
          <p className="text-2xl font-black text-amber-500 mt-1.5 tabular-nums">
            Rs. {summary.filteredTotal.toLocaleString()} PKR
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expense title, vendor, or receipt ref..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as any)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
        />
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No expense entries recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 uppercase text-[11px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Title & Vendor</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Method / Ref</th>
                  <th className="py-3 px-4">Amount (PKR)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">{exp.date}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{exp.title}</div>
                      {exp.vendor && <div className="text-[11px] text-slate-400">Vendor: {exp.vendor}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-300">
                      {exp.paymentMethod}
                      {exp.referenceNo && <span className="block font-mono text-[10px] text-slate-400">{exp.referenceNo}</span>}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-500">
                      Rs. {exp.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(exp)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete expense "${exp.title}"?`)) {
                              AcademyDataService.deleteExpense(exp.id, user?.name || 'Admin', user?.role || 'admin');
                            }
                          }}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-base">{editing ? 'Edit Expense' : 'Record New Expense'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Expense Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Monthly Campus Electricity Bill"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Amount (PKR) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>{pm}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Vendor / Payee</label>
                  <input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Receipt / Ref #</label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold flex items-center gap-1 cursor-pointer">
                  <Check className="w-4 h-4" /> Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
