import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';
import { AcademySettings, FeeRecord, Student } from '../../types';
import { getStudentSerialDisplay } from '../../services/storageService';

interface FeeInvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeRecord: FeeRecord | null;
  student?: Student;
  academySettings: AcademySettings;
}

export const FeeInvoicePrintModal: React.FC<FeeInvoicePrintModalProps> = ({
  isOpen,
  onClose,
  feeRecord,
  student,
  academySettings,
}) => {
  const [paperSize, setPaperSize] = useState<'A4' | 'A5'>('A4');

  // Toggle body class so @media print hides #root (dark dashboard, sidebar, table) and prints ONLY the white invoice
  useEffect(() => {
    if (!isOpen) {
      document.body.classList.remove('printing-fee-invoice');
      return;
    }

    document.body.classList.add('printing-fee-invoice');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('printing-fee-invoice');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !feeRecord) return null;

  const studentName = student?.fullName || feeRecord.studentName;
  const studentRoll = student?.rollNumber || feeRecord.studentRoll || 'N/A';
  const studentSerial =
    feeRecord.studentSerial || (student ? getStudentSerialDisplay(student) : '') || 'N/A';
  const studentBatch = student?.batch || feeRecord.batch || 'N/A';
  const invoiceNumber =
    feeRecord.receiptNumber || `INV-${feeRecord.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`;
  const issuedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const statusConfig =
    feeRecord.status === 'Paid'
      ? {
          label: 'PAID',
          sublabel: 'CLEARED IN FULL',
          borderClass: 'border-emerald-600 text-emerald-700 bg-emerald-50/70',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        }
      : feeRecord.status === 'Partial'
      ? {
          label: 'PARTIAL',
          sublabel: 'BALANCE DUE',
          borderClass: 'border-amber-600 text-amber-700 bg-amber-50/70',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: <Clock className="w-3.5 h-3.5" />,
        }
      : {
          label: 'PENDING',
          sublabel: 'PAYMENT REQUIRED',
          borderClass: 'border-rose-600 text-rose-700 bg-rose-50/70',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
          icon: <AlertCircle className="w-3.5 h-3.5" />,
        };

  const handlePrintNow = () => {
    window.print();
  };

  const modalContent = (
    <div
      className="fee-invoice-print-portal fixed inset-0 z-[100] flex flex-col items-center justify-start sm:justify-center overflow-y-auto bg-slate-950/80 backdrop-blur-xs p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fee-invoice-modal-title"
      onClick={onClose}
    >
      <div
        className={`w-full ${
          paperSize === 'A5' ? 'max-w-[560px]' : 'max-w-[780px]'
        } transition-all duration-200 my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar (Hidden on Print) */}
        <div className="fee-invoice-print-toolbar no-print mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 border border-slate-700/80 px-4 py-3 text-white shadow-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 id="fee-invoice-modal-title" className="text-sm font-bold text-white">
                Fee Invoice Preview
              </h3>
              <p className="text-[11px] text-slate-400">
                {studentName} · {feeRecord.month}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper Size Selector */}
            <div className="inline-flex items-center rounded-xl bg-slate-800 p-0.5 border border-slate-700 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setPaperSize('A4')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  paperSize === 'A4'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('A5')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  paperSize === 'A5'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                A5
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrintNow}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Now</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close Print Preview"
              aria-label="Close Print Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clean White Printable Invoice Sheet */}
        <div
          id="fee-printable-invoice"
          className={`fee-invoice-paper bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 ${
            paperSize === 'A5' ? 'p-6 sm:p-7' : 'p-7 sm:p-10'
          }`}
        >
          {/* Dynamic @page size rule for selected paper */}
          <style>{`
            @media print {
              @page {
                size: ${paperSize} portrait;
                margin: 12mm;
              }
            }
          `}</style>

          {/* Academy Header & Invoice Meta */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-slate-900">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-sm tracking-tight shrink-0">
                  OK
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {academySettings.academyName || 'OK Korean Language Centre'}
                  </h1>
                  {academySettings.academyKoreanName && (
                    <p className="text-xs font-bold text-indigo-700">
                      {academySettings.academyKoreanName}
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-2.5 text-xs text-slate-600 max-w-md leading-relaxed">
                {academySettings.address}
              </p>
              <p className="mt-1 text-xs text-slate-600 font-medium">
                Phone: {academySettings.contactPhone} · Email: {academySettings.email}
              </p>
              {academySettings.registrationNumber && (
                <p className="mt-0.5 text-[11px] text-slate-500 font-mono">
                  Reg No: {academySettings.registrationNumber}
                </p>
              )}
            </div>

            <div className="sm:text-right shrink-0">
              <div className="inline-block px-3 py-1 rounded-md bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-widest">
                Tuition Fee Invoice
              </div>
              <div className="mt-3 space-y-1 text-xs">
                <div className="text-slate-600">
                  Invoice Ref:{' '}
                  <span className="font-mono font-bold text-slate-900">{invoiceNumber}</span>
                </div>
                <div className="text-slate-600">
                  Issued Date: <span className="font-semibold text-slate-900">{issuedDate}</span>
                </div>
                <div className="text-slate-600">
                  Due Date:{' '}
                  <span className="font-mono font-bold text-rose-700">{feeRecord.dueDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Student & Billing Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-slate-200">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1.5 text-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                Student Details
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-900 text-right">{studentName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Serial No:</span>
                <span className="font-mono font-bold text-slate-900">{studentSerial}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Roll No:</span>
                <span className="font-mono font-bold text-slate-900">{studentRoll}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Batch / Class:</span>
                <span className="font-semibold text-slate-800 text-right">{studentBatch}</span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1.5 text-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                Billing Summary
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Billing Month:</span>
                <span className="font-bold text-slate-900">{feeRecord.month}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Due Date:</span>
                <span className="font-mono font-bold text-slate-900">{feeRecord.dueDate}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="font-semibold text-slate-800">
                  {feeRecord.paymentMethod || 'Not recorded'}
                </span>
              </div>
              <div className="flex justify-between gap-2 items-center pt-0.5">
                <span className="text-slate-500">Status:</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusConfig.badgeClass}`}
                >
                  {statusConfig.icon}
                  <span>{feeRecord.status}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-5">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3.5 rounded-tl-lg font-bold">Fee Description</th>
                  <th className="py-2.5 px-3.5 font-bold">Billing Month</th>
                  <th className="py-2.5 px-3.5 rounded-tr-lg text-right font-bold">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 border border-t-0 border-slate-200">
                <tr className="bg-white">
                  <td className="py-3.5 px-3.5">
                    <div className="font-bold text-slate-900">
                      Monthly Tuition Fee — {feeRecord.month}
                    </div>
                    {feeRecord.notes && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{feeRecord.notes}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-3.5 font-semibold text-slate-700">{feeRecord.month}</td>
                  <td className="py-3.5 px-3.5 text-right font-mono font-bold text-slate-900">
                    Rs. {feeRecord.totalAmount.toLocaleString()} PKR
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals + Official Status Stamp */}
          <div className="flex flex-col-reverse sm:flex-row items-center sm:items-end justify-between gap-6 pt-2 pb-6 border-b border-slate-200">
            {/* Official Rubber Stamp */}
            <div className="flex flex-col items-center sm:items-start">
              <div
                className={`inline-flex flex-col items-center justify-center px-6 py-2.5 rounded-xl border-4 border-double -rotate-6 select-none shadow-xs ${statusConfig.borderClass}`}
              >
                <span className="text-xl font-black tracking-[0.22em] leading-none">
                  {statusConfig.label}
                </span>
                <span className="text-[9px] font-extrabold tracking-[0.18em] mt-1">
                  {statusConfig.sublabel}
                </span>
              </div>
              {feeRecord.lastPaymentDate && (
                <p className="mt-3 text-[11px] text-slate-500">
                  Last Payment Recorded:{' '}
                  <span className="font-mono font-semibold text-slate-700">
                    {feeRecord.lastPaymentDate}
                  </span>
                </p>
              )}
            </div>

            {/* Financial Summary Box */}
            <div className="w-full sm:w-72 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-medium">Total Fee</span>
                <span className="font-mono font-bold text-slate-900">
                  Rs. {feeRecord.totalAmount.toLocaleString()} PKR
                </span>
              </div>
              <div className="flex items-center justify-between text-emerald-700">
                <span className="font-medium">Paid Amount</span>
                <span className="font-mono font-bold">
                  Rs. {feeRecord.paidAmount.toLocaleString()} PKR
                </span>
              </div>
              <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-sm">
                <span className="font-extrabold text-slate-900">Pending Amount</span>
                <span
                  className={`font-mono font-extrabold ${
                    feeRecord.pendingAmount > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  Rs. {feeRecord.pendingAmount.toLocaleString()} PKR
                </span>
              </div>
            </div>
          </div>

          {/* Footer & Authorized Signature */}
          <div className="pt-6 flex flex-col sm:flex-row sm:items-end justify-between gap-6 text-xs text-slate-600">
            <div className="max-w-sm">
              <p className="font-bold text-slate-900">
                {feeRecord.pendingAmount === 0
                  ? 'Thank you for your payment!'
                  : 'Please clear any outstanding dues by the due date.'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                This is a computer-generated fee invoice issued by{' '}
                {academySettings.academyName || 'OK Korean Language Centre'}.
              </p>
            </div>

            <div className="sm:text-right pt-4 sm:pt-0">
              <div className="w-44 sm:ml-auto border-t border-slate-400 pt-1.5 text-center">
                <div className="font-bold text-slate-900 text-[11px]">
                  {academySettings.principalName || 'Authorized Signatory'}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Accounts &amp; Administration
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
