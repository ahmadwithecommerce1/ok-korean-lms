import React, { useEffect, useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Scale,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { StorageService } from '../services/storageService';
import { AcademyDataService } from '../services/academyDataService';
import { ExpenseRecord, FeeRecord, PayrollRecord } from '../types';

export const FinancialReportsPage: React.FC = () => {
  const [fees, setFees] = useState<FeeRecord[]>(() => StorageService.getFees());
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => AcademyDataService.getExpenses());
  const [payroll, setPayroll] = useState<PayrollRecord[]>(() => AcademyDataService.getPayrollRecords());

  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));

  useEffect(() => {
    const u1 = StorageService.subscribeFees(setFees);
    const u2 = AcademyDataService.subscribeExpenses(setExpenses);
    const u3 = AcademyDataService.subscribePayroll(setPayroll);
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  const monthlyBreakdown = useMemo(() => {
    const months = [
      { idx: '01', label: 'Jan', name: 'January' },
      { idx: '02', label: 'Feb', name: 'February' },
      { idx: '03', label: 'Mar', name: 'March' },
      { idx: '04', label: 'Apr', name: 'April' },
      { idx: '05', label: 'May', name: 'May' },
      { idx: '06', label: 'Jun', name: 'June' },
      { idx: '07', label: 'Jul', name: 'July' },
      { idx: '08', label: 'Aug', name: 'August' },
      { idx: '09', label: 'Sep', name: 'September' },
      { idx: '10', label: 'Oct', name: 'October' },
      { idx: '11', label: 'Nov', name: 'November' },
      { idx: '12', label: 'Dec', name: 'December' },
    ];

    return months.map((m) => {
      const ym = `${selectedYear}-${m.idx}`;
      const income = fees
        .filter((f) => {
          const d = f.lastPaymentDate || f.dueDate || '';
          const mLabel = `${m.name} ${selectedYear}`.toLowerCase();
          return d.startsWith(ym) || (f.month || '').toLowerCase() === mLabel;
        })
        .reduce((sum, f) => sum + (f.paidAmount || 0), 0);

      const opExpenses = expenses
        .filter((e) => (e.date || '').startsWith(ym))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const salariesPaid = payroll
        .filter((p) => p.monthKey === ym)
        .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

      const totalOutflow = opExpenses + salariesPaid;
      return {
        month: m.label,
        fullMonth: `${m.name} ${selectedYear}`,
        income,
        opExpenses,
        salariesPaid,
        totalOutflow,
        netBalance: income - totalOutflow,
      };
    });
  }, [fees, expenses, payroll, selectedYear]);

  const totals = useMemo(() => {
    const totalIncome = monthlyBreakdown.reduce((s, r) => s + r.income, 0);
    const totalOpExpenses = monthlyBreakdown.reduce((s, r) => s + r.opExpenses, 0);
    const totalSalaries = monthlyBreakdown.reduce((s, r) => s + r.salariesPaid, 0);
    const totalOutflow = totalOpExpenses + totalSalaries;
    const netSurplus = totalIncome - totalOutflow;
    const pendingReceivables = fees.reduce((s, f) => s + (f.pendingAmount || 0), 0);
    return { totalIncome, totalOpExpenses, totalSalaries, totalOutflow, netSurplus, pendingReceivables };
  }, [monthlyBreakdown, fees]);

  const handleExportCsv = () => {
    const header = ['Month', 'Fee Income (PKR)', 'Operating Expenses (PKR)', 'Payroll Paid (PKR)', 'Total Outflow (PKR)', 'Net Balance (PKR)'];
    const rows = monthlyBreakdown.map((r) => [
      r.fullMonth,
      r.income,
      r.opExpenses,
      r.salariesPaid,
      r.totalOutflow,
      r.netBalance,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ok-korean-financial-statement-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
            <span>Financial Reports & Income Statement</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Consolidated Fee Revenue vs Operating Expenses & Faculty Payroll in PKR.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
          >
            {['2025', '2026', '2027'].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-500">Total Fee Income</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 tabular-nums">
            Rs. {totals.totalIncome.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400">Collected in {selectedYear}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-rose-500">Total Outflows</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-500 mt-2 tabular-nums">
            Rs. {totals.totalOutflow.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400">
            Expenses {totals.totalOpExpenses.toLocaleString()} + Payroll {totals.totalSalaries.toLocaleString()}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-cyan-500">Net Surplus / Deficit</span>
            <Scale className="w-4 h-4 text-cyan-500" />
          </div>
          <p className={`text-2xl font-black mt-2 tabular-nums ${totals.netSurplus >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            Rs. {totals.netSurplus.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400">Annual net balance ({selectedYear})</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800">
          <span className="text-xs font-bold uppercase text-amber-500">Pending Fee Receivables</span>
          <p className="text-2xl font-black text-amber-500 mt-2 tabular-nums">
            Rs. {totals.pendingReceivables.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400">Outstanding student tuition dues</span>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
          Monthly Cashflow ({selectedYear}): Fee Income vs Total Outflow
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="income" name="Fee Income (PKR)" fill="#10b981" radius={[5, 5, 0, 0]} />
              <Bar dataKey="totalOutflow" name="Expenses & Payroll (PKR)" fill="#f43f5e" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Statement Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[680px]">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 uppercase text-[11px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4">Fee Income</th>
                <th className="py-3 px-4">Operating Expenses</th>
                <th className="py-3 px-4">Payroll Paid</th>
                <th className="py-3 px-4">Total Outflow</th>
                <th className="py-3 px-4 text-right">Net Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {monthlyBreakdown.map((row) => (
                <tr key={row.month}>
                  <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{row.fullMonth}</td>
                  <td className="py-2.5 px-4 font-mono text-emerald-500">Rs. {row.income.toLocaleString()}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-slate-300">Rs. {row.opExpenses.toLocaleString()}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-slate-300">Rs. {row.salariesPaid.toLocaleString()}</td>
                  <td className="py-2.5 px-4 font-mono text-rose-500">Rs. {row.totalOutflow.toLocaleString()}</td>
                  <td className={`py-2.5 px-4 font-mono font-bold text-right ${row.netBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    Rs. {row.netBalance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
