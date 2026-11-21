import React, { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { AcademyDataService } from '../services/academyDataService';
import { StorageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { PaymentMethodType, PayrollRecord, TeacherAccount } from '../types';

const METHODS: PaymentMethodType[] = ['Bank Transfer', 'Cash', 'EasyPaisa / JazzCash', 'Card', 'Online'];

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export const SalaryPayrollPage: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<PayrollRecord[]>(() => AcademyDataService.getPayrollRecords());
  const [teachers, setTeachers] = useState<TeacherAccount[]>(() => StorageService.getTeacherAccounts());

  const [selectedMonthKey, setSelectedMonthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Pending' | 'Partial'>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PayrollRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '');
  const [baseSalary, setBaseSalary] = useState(45000);
  const [bonus, setBonus] = useState(0);
  const [deductions, setDeductions] = useState(0);
  const [paidAmount, setPaidAmount] = useState(45000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Bank Transfer');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const u1 = AcademyDataService.subscribePayroll(setRecords);
    const u2 = StorageService.subscribeTeachers(setTeachers);
    return () => {
      u1();
      u2();
    };
  }, []);

  const handleTeacherPick = (id: string) => {
    setTeacherId(id);
    const t = teachers.find((x) => x.id === id);
    const base = Number(t?.baseSalary) || 45000;
    setBaseSalary(base);
    setPaidAmount(base);
  };

  const openCreateModal = () => {
    setEditing(null);
    const first = teachers[0];
    const base = Number(first?.baseSalary) || 45000;
    setTeacherId(first?.id || '');
    setBaseSalary(base);
    setBonus(0);
    setDeductions(0);
    setPaidAmount(0);
    setPaymentMethod('Bank Transfer');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReceiptNumber(`SAL-${Date.now().toString().slice(-5)}`);
    setNotes('');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (rec: PayrollRecord) => {
    setEditing(rec);
    setTeacherId(rec.teacherId);
    setBaseSalary(rec.baseSalary);
    setBonus(rec.bonus);
    setDeductions(rec.deductions);
    setPaidAmount(rec.paidAmount);
    setPaymentMethod(rec.paymentMethod || 'Bank Transfer');
    setPaymentDate(rec.paymentDate || new Date().toISOString().split('T')[0]);
    setReceiptNumber(rec.receiptNumber || '');
    setNotes(rec.notes || '');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const t = teachers.find((x) => x.id === teacherId);
    if (!t) {
      setErrorMsg('Please select a faculty/staff member.');
      return;
    }
    const net = Math.max(0, Number(baseSalary) + Number(bonus) - Number(deductions));
    const paid = Math.min(net, Math.max(0, Number(paidAmount)));
    const status: PayrollRecord['status'] = paid >= net ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';

    try {
      await AcademyDataService.savePayrollRecord(
        {
          id: editing?.id,
          createdAt: editing?.createdAt,
          teacherId: t.id,
          teacherName: t.name,
          teacherUsername: t.username,
          designation: t.designation || 'Instructor',
          monthKey: selectedMonthKey,
          month: formatMonthLabel(selectedMonthKey),
          baseSalary: Number(baseSalary),
          bonus: Number(bonus),
          deductions: Number(deductions),
          netSalary: net,
          paidAmount: paid,
          status,
          paymentDate: paid > 0 ? paymentDate : undefined,
          paymentMethod,
          receiptNumber: receiptNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        user?.name || 'Admin',
        user?.role || 'admin'
      );
      setModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to save payroll record.');
    }
  };

  const handleGenerateMonthlyBatch = async () => {
    const activeStaff = teachers.filter((t) => t.status === 'Active');
    for (const t of activeStaff) {
      const exists = records.some((r) => r.teacherId === t.id && r.monthKey === selectedMonthKey);
      if (!exists) {
        const base = Number(t.baseSalary) || 45000;
        await AcademyDataService.savePayrollRecord(
          {
            teacherId: t.id,
            teacherName: t.name,
            teacherUsername: t.username,
            designation: t.designation || 'Instructor',
            monthKey: selectedMonthKey,
            month: formatMonthLabel(selectedMonthKey),
            baseSalary: base,
            bonus: 0,
            deductions: 0,
            netSalary: base,
            paidAmount: 0,
            status: 'Pending',
            paymentMethod: 'Bank Transfer',
          },
          user?.name || 'Admin',
          user?.role || 'admin'
        );
      }
    }
  };

  const filtered = useMemo(
    () =>
      records.filter((r) => {
        if (selectedMonthKey && r.monthKey !== selectedMonthKey) return false;
        if (statusFilter !== 'All' && r.status !== statusFilter) return false;
        return true;
      }),
    [records, selectedMonthKey, statusFilter]
  );

  const monthTotals = useMemo(() => {
    const netTotal = filtered.reduce((s, r) => s + r.netSalary, 0);
    const paidTotal = filtered.reduce((s, r) => s + r.paidAmount, 0);
    return { netTotal, paidTotal, pendingTotal: Math.max(0, netTotal - paidTotal) };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Banknote className="w-6 h-6 text-emerald-500" />
            <span>Teacher Salary & Payroll (PKR)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate monthly faculty salary slips, track bonuses/deductions, and record disbursements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateMonthlyBatch}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
          >
            Auto-Generate {formatMonthLabel(selectedMonthKey)}
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Salary Slip</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800">
          <span className="text-xs font-bold uppercase text-slate-400">Net Payroll ({formatMonthLabel(selectedMonthKey)})</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tabular-nums">
            Rs. {monthTotals.netTotal.toLocaleString()} PKR
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800">
          <span className="text-xs font-bold uppercase text-emerald-500">Total Disbursed</span>
          <p className="text-2xl font-black text-emerald-500 mt-1.5 tabular-nums">
            Rs. {monthTotals.paidTotal.toLocaleString()} PKR
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800">
          <span className="text-xs font-bold uppercase text-amber-500">Remaining Payable</span>
          <p className="text-2xl font-black text-amber-500 mt-1.5 tabular-nums">
            Rs. {monthTotals.pendingTotal.toLocaleString()} PKR
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
        <label className="font-bold text-slate-500">Payroll Month:</label>
        <input
          type="month"
          value={selectedMonthKey}
          onChange={(e) => setSelectedMonthKey(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
        >
          <option value="All">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Partial">Partial</option>
          <option value="Pending">Pending</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No payroll slips for {formatMonthLabel(selectedMonthKey)}
            </p>
            <p className="text-xs mt-1">Click "Auto-Generate" above to create slips for all active staff.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[740px]">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 uppercase text-[11px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Faculty / Staff</th>
                  <th className="py-3 px-4">Base</th>
                  <th className="py-3 px-4">Bonus / Ded.</th>
                  <th className="py-3 px-4">Net Payable</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{r.teacherName}</div>
                      <div className="text-[11px] text-slate-400">{r.designation || 'Faculty'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">Rs. {r.baseSalary.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <span className="text-emerald-500">+{r.bonus.toLocaleString()}</span> /{' '}
                      <span className="text-rose-500">-{r.deductions.toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      Rs. {r.netSalary.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-500">
                      Rs. {r.paidAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        r.status === 'Paid'
                          ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                          : r.status === 'Partial'
                          ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                      }`}>
                        {r.status === 'Paid' && <CheckCircle2 className="w-3 h-3" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(r)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/15 hover:bg-emerald-600 text-emerald-500 hover:text-white font-bold text-[11px] cursor-pointer"
                        >
                          {r.status === 'Paid' ? 'Edit' : 'Pay / Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete payroll record for ${r.teacherName}?`)) {
                              AcademyDataService.deletePayrollRecord(r.id, user?.name || 'Admin', user?.role || 'admin');
                            }
                          }}
                          className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
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
              <h3 className="font-bold text-base">{editing ? 'Update Salary Slip' : 'Create Salary Slip'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-3.5 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <div>
                <label className="block font-semibold mb-1">Staff / Faculty Member</label>
                <select
                  value={teacherId}
                  disabled={Boolean(editing)}
                  onChange={(e) => handleTeacherPick(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold mb-1">Base (PKR)</label>
                  <input
                    type="number"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Bonus</label>
                  <input
                    type="number"
                    value={bonus}
                    onChange={(e) => setBonus(Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Deductions</label>
                  <input
                    type="number"
                    value={deductions}
                    onChange={(e) => setDeductions(Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between font-bold">
                <span>Net Payable Salary:</span>
                <span className="font-mono text-emerald-500">
                  Rs. {Math.max(0, baseSalary + bonus - deductions).toLocaleString()} PKR
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Amount Paid (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold flex items-center gap-1 cursor-pointer">
                  <Check className="w-4 h-4" /> Save Payroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
