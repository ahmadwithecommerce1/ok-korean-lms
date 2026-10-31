import React, { useState } from 'react';
import { X, DollarSign, Check, AlertCircle } from 'lucide-react';
import { FeeRecord } from '../../types';

interface FeePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeRecord: FeeRecord | null;
  onConfirmPayment: (
    feeId: string, 
    amount: number, 
    method: FeeRecord['paymentMethod'], 
    receiptNo?: string, 
    note?: string
  ) => void;
}

export const FeePaymentModal: React.FC<FeePaymentModalProps> = ({
  isOpen,
  onClose,
  feeRecord,
  onConfirmPayment,
}) => {
  if (!isOpen || !feeRecord) return null;

  const [paymentAmount, setPaymentAmount] = useState<number>(feeRecord.pendingAmount);
  const [paymentMethod, setPaymentMethod] = useState<FeeRecord['paymentMethod']>('Bank Transfer');
  const [receiptNumber, setReceiptNumber] = useState(`PKR-REC-${Date.now().toString().slice(-6)}`);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }
    if (paymentAmount > feeRecord.pendingAmount) {
      setError(`Payment cannot exceed pending balance of Rs. ${feeRecord.pendingAmount.toLocaleString()} PKR.`);
      return;
    }

    onConfirmPayment(feeRecord.id, paymentAmount, paymentMethod, receiptNumber, note);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white font-bold">
              Rs.
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Record Tuition Fee (PKR)</h3>
              <p className="text-xs text-slate-400 font-mono">{feeRecord.studentRoll} · {feeRecord.studentName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current balance card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Billing Cycle</span>
              <strong className="text-slate-900 dark:text-white">{feeRecord.month}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Total Fee Due</span>
              <span className="font-mono text-slate-900 dark:text-white">Rs. {feeRecord.totalAmount.toLocaleString()} PKR</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Previously Paid</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Rs. {feeRecord.paidAmount.toLocaleString()} PKR</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">Remaining Balance</span>
              <span className="font-mono text-base font-extrabold text-rose-600 dark:text-rose-400">
                Rs. {feeRecord.pendingAmount.toLocaleString()} PKR
              </span>
            </div>
          </div>

          {/* Payment amount */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Amount (PKR) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={feeRecord.pendingAmount}
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-base font-bold font-mono focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Payment method */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Channel
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as FeeRecord['paymentMethod'])}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Bank Transfer" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Bank Transfer (HBL / Meezan / Alfalah)</option>
              <option value="EasyPaisa / JazzCash" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">EasyPaisa / JazzCash Mobile Account</option>
              <option value="Cash" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Cash at Reception</option>
              <option value="Card" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Credit / Debit Card</option>
            </select>
          </div>

          {/* Receipt number */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Official Receipt Voucher No.
            </label>
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes / Slip Reference
            </label>
            <input
              type="text"
              placeholder="e.g. Cleared via Bank deposit slip"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Issue PKR Receipt</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
