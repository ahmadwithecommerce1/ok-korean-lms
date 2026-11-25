import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPlus,
  Check,
  CheckCheck,
  X,
  Search,
  Phone,
  MessageCircle,
  Mail,
  GraduationCap,
  Clock,
  MapPin,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Users,
  Loader2,
  Calendar,
  Sparkles,
  ArrowRight,
  Trash2,
  Layers
} from 'lucide-react';
import { AdmissionRequest, AdmissionRequestStatus, TabId } from '../types';
import { AdmissionService, BulkApproveResult } from '../services/admissionService';
import { useAuth } from '../context/AuthContext';

interface AdmissionRequestsPageProps {
  onNavigate?: (tab: TabId) => void;
}

export const AdmissionRequestsPage: React.FC<AdmissionRequestsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AdmissionRequest[]>(() =>
    AdmissionService.getAdmissionRequests()
  );
  const [statusFilter, setStatusFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingIds, setProcessingIds] = useState<Record<string, 'approve' | 'reject' | 'delete' | null>>({});
  const [banner, setBanner] = useState<{
    type: 'success' | 'info' | 'error' | 'warning';
    message: string;
    rollNumber?: string;
    failedItems?: Array<{ name: string; error: string }>;
  } | null>(null);

  // Bulk Approve modal state
  const [isBulkApproveModalOpen, setIsBulkApproveModalOpen] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  // History selection & Clear History modal state
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  const [historyModalMode, setHistoryModalMode] = useState<'all' | 'selected' | 'single' | null>(null);
  const [historyClearScope, setHistoryClearScope] = useState<'all' | 'Approved' | 'Rejected'>('all');
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<AdmissionRequest | null>(null);
  const [isClearingHistory, setIsClearingHistory] = useState(false);

  useEffect(() => {
    const unsubscribe = AdmissionService.subscribeAdmissionRequests((liveList) => {
      setRequests(liveList);
    });
    return () => unsubscribe();
  }, []);

  // Keep selectedHistoryIds synced if items were removed externally
  useEffect(() => {
    const validHistoricalIds = new Set(
      requests.filter((r) => r.status === 'Approved' || r.status === 'Rejected').map((r) => r.id)
    );
    setSelectedHistoryIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validHistoricalIds.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [requests]);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    requests.forEach((req) => {
      if (req.status === 'Approved') approved++;
      else if (req.status === 'Rejected') rejected++;
      else pending++;
    });
    return {
      pending,
      approved,
      rejected,
      historyTotal: approved + rejected,
      total: requests.length,
    };
  }, [requests]);

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === 'Pending'),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((req) => {
      if (statusFilter !== 'All' && req.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        req.fullName.toLowerCase().includes(q) ||
        (req.koreanName || '').toLowerCase().includes(q) ||
        (req.fatherName || '').toLowerCase().includes(q) ||
        (req.contactNumber || '').toLowerCase().includes(q) ||
        (req.parentWhatsApp || '').toLowerCase().includes(q) ||
        (req.email || '').toLowerCase().includes(q) ||
        (req.level || '').toLowerCase().includes(q) ||
        (req.batch || '').toLowerCase().includes(q) ||
        (req.enrollmentDate || '').toLowerCase().includes(q) ||
        (req.city || '').toLowerCase().includes(q) ||
        (req.approvedRollNumber || '').toLowerCase().includes(q) ||
        (req.approvedSerialNumber || '').toLowerCase().includes(q)
      );
    });
  }, [requests, statusFilter, searchQuery]);

  const visibleHistoricalRequests = useMemo(
    () => filteredRequests.filter((r) => r.status === 'Approved' || r.status === 'Rejected'),
    [filteredRequests]
  );

  const allVisibleHistorySelected =
    visibleHistoricalRequests.length > 0 &&
    visibleHistoricalRequests.every((r) => selectedHistoryIds.has(r.id));

  const toggleSelectHistoryItem = (id: string) => {
    setSelectedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisibleHistory = () => {
    if (allVisibleHistorySelected) {
      setSelectedHistoryIds((prev) => {
        const next = new Set(prev);
        visibleHistoricalRequests.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedHistoryIds((prev) => {
        const next = new Set(prev);
        visibleHistoricalRequests.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const handleApprove = async (req: AdmissionRequest) => {
    setProcessingIds((prev) => ({ ...prev, [req.id]: 'approve' }));
    setBanner(null);
    try {
      const { student, wasDuplicate } = await AdmissionService.approveAdmissionRequest(
        req,
        user?.name || 'Principal Administrator'
      );
      setBanner({
        type: wasDuplicate ? 'info' : 'success',
        message: wasDuplicate
          ? `${student.fullName} is already enrolled (Serial: ${student.formattedSerialNumber || student.serialNumber} · Roll: ${student.rollNumber}). Linked existing Student Directory record and marked request Approved without creating a duplicate.`
          : `Approved ${student.fullName}! Assigned Serial ${student.formattedSerialNumber || student.serialNumber} and Roll Number ${student.rollNumber} and enrolled in Student Directory.`,
        rollNumber: student.rollNumber,
      });
    } catch (err: any) {
      console.error('Error approving admission request:', err);
      setBanner({
        type: 'error',
        message: err?.message || 'Unable to approve admission request. Please try again.',
      });
    } finally {
      setProcessingIds((prev) => ({ ...prev, [req.id]: null }));
    }
  };

  const handleBulkApproveConfirm = async () => {
    if (pendingRequests.length === 0) {
      setIsBulkApproveModalOpen(false);
      return;
    }

    setIsBulkApproving(true);
    setBanner(null);
    try {
      const result: BulkApproveResult = await AdmissionService.approveAllPendingRequests(
        pendingRequests,
        user?.name || 'Principal Administrator'
      );

      const enrolledCount = result.approved.length;
      const dupCount = result.skippedDuplicates.length;
      const failedCount = result.failed.length;

      const summaryParts: string[] = [];
      if (enrolledCount > 0) {
        summaryParts.push(
          `Approved & enrolled ${enrolledCount} student${enrolledCount === 1 ? '' : 's'} into the Student Directory.`
        );
      }
      if (dupCount > 0) {
        summaryParts.push(
          `${dupCount} already-enrolled applicant${dupCount === 1 ? ' was' : 's were'} linked without duplicating student records.`
        );
      }
      if (failedCount > 0) {
        summaryParts.push(
          `${failedCount} request${failedCount === 1 ? '' : 's'} failed and remain pending.`
        );
      }
      if (summaryParts.length === 0) {
        summaryParts.push('No eligible pending requests were processed.');
      }

      setBanner({
        type: failedCount > 0 ? (enrolledCount > 0 ? 'warning' : 'error') : 'success',
        message: summaryParts.join(' '),
        failedItems: result.failed.map((f) => ({
          name: f.request.fullName || f.request.id,
          error: f.error,
        })),
      });
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err?.message || 'Bulk approval failed unexpectedly.',
      });
    } finally {
      setIsBulkApproving(false);
      setIsBulkApproveModalOpen(false);
    }
  };

  const handleReject = async (req: AdmissionRequest) => {
    setProcessingIds((prev) => ({ ...prev, [req.id]: 'reject' }));
    setBanner(null);
    try {
      await AdmissionService.rejectAdmissionRequest(
        req,
        user?.name || 'Principal Administrator'
      );
      setBanner({
        type: 'info',
        message: `Marked admission request from ${req.fullName || 'Applicant'} as Rejected.`,
      });
    } catch (err: any) {
      console.error('Error rejecting admission request:', err);
      setBanner({
        type: 'error',
        message: err?.message || 'Unable to reject admission request. Please try again.',
      });
    } finally {
      setProcessingIds((prev) => ({ ...prev, [req.id]: null }));
    }
  };

  const handleConfirmClearHistory = async () => {
    setIsClearingHistory(true);
    setBanner(null);
    try {
      let deletedCount = 0;
      const adminName = user?.name || 'Principal Administrator';

      if (historyModalMode === 'single' && singleDeleteTarget) {
        deletedCount = await AdmissionService.deleteAdmissionHistoryRecords(
          [singleDeleteTarget.id],
          adminName
        );
      } else if (historyModalMode === 'selected') {
        const ids = Array.from(selectedHistoryIds);
        deletedCount = await AdmissionService.deleteAdmissionHistoryRecords(ids, adminName);
        setSelectedHistoryIds(new Set());
      } else if (historyModalMode === 'all') {
        if (historyClearScope === 'all') {
          deletedCount = await AdmissionService.clearAdmissionHistory(adminName);
        } else {
          const scopedIds = requests
            .filter((r) => r.status === historyClearScope)
            .map((r) => r.id);
          deletedCount = await AdmissionService.deleteAdmissionHistoryRecords(scopedIds, adminName);
        }
        setSelectedHistoryIds(new Set());
      }

      setBanner({
        type: 'info',
        message: `Cleared ${deletedCount} historical admission record${deletedCount === 1 ? '' : 's'} from Firebase. Pending requests and enrolled Student Directory records remain untouched.`,
      });
    } catch (err: any) {
      console.error('Error clearing admission history:', err);
      setBanner({
        type: 'error',
        message: err?.message || 'Failed to clear admission request history.',
      });
    } finally {
      setIsClearingHistory(false);
      setHistoryModalMode(null);
      setSingleDeleteTarget(null);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const getStatusBadge = (status: AdmissionRequestStatus, rollNumber?: string, serialNumber?: string) => {
    if (status === 'Approved') {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved</span>
          </span>
          {serialNumber && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              {serialNumber}
            </span>
          )}
          {rollNumber && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
              {rollNumber}
            </span>
          )}
        </div>
      );
    }
    if (status === 'Rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
          <XCircle className="w-3.5 h-3.5" />
          <span>Rejected</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span>Pending Review</span>
      </span>
    );
  };

  const clearScopeCount =
    historyClearScope === 'all'
      ? counts.historyTotal
      : historyClearScope === 'Approved'
      ? counts.approved
      : counts.rejected;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5 flex-wrap">
            <UserPlus className="w-6 h-6 text-emerald-500" />
            <span>Online Admission Requests</span>
            {counts.pending > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-slate-950 shadow-sm">
                {counts.pending} Pending
              </span>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
            Review incoming applications submitted via the Official Website Form (`admission_requests`) and enroll approved candidates directly into the Student Directory.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {counts.pending > 0 && (
            <button
              type="button"
              onClick={() => setIsBulkApproveModalOpen(true)}
              disabled={isBulkApproving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isBulkApproving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              <span>Approve All Pending Requests</span>
            </button>
          )}

          {counts.historyTotal > 0 && (
            <button
              type="button"
              onClick={() => {
                setHistoryClearScope('all');
                setHistoryModalMode('all');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/15 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/30 font-bold text-xs sm:text-sm transition-all cursor-pointer"
              title="Remove approved/rejected admission history without touching pending requests or enrolled students"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Admission History</span>
            </button>
          )}

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('students')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm border border-slate-700 transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>View Student Directory</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {banner && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex flex-col gap-2.5 animate-fadeIn ${
            banner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : banner.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : banner.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {banner.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : banner.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              ) : banner.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              ) : (
                <FileText className="w-5 h-5 text-slate-400 shrink-0" />
              )}
              <span className="font-semibold">{banner.message}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(banner.type === 'success' || banner.type === 'warning') && onNavigate && (
                <button
                  onClick={() => onNavigate('students')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  Open Student Directory
                </button>
              )}
              <button
                onClick={() => setBanner(null)}
                className="p-1 rounded-lg opacity-70 hover:opacity-100 cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {banner.failedItems && banner.failedItems.length > 0 && (
            <div className="mt-1 p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-1 text-xs">
              <p className="font-bold text-rose-300">Failed Requests:</p>
              <ul className="list-disc list-inside space-y-0.5 text-rose-200">
                {banner.failedItems.map((item, idx) => (
                  <li key={idx}>
                    <span className="font-semibold">{item.name}:</span> {item.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Pending Review
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {counts.pending}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Awaiting admin action
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Approved & Enrolled
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {counts.approved}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Synced to students collection
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Rejected
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {counts.rejected}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Declined applications
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
            Total Submissions
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {counts.total}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Live Firestore sync active
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((tab) => {
              const count =
                tab === 'Pending'
                  ? counts.pending
                  : tab === 'Approved'
                  ? counts.approved
                  : tab === 'Rejected'
                  ? counts.rejected
                  : counts.total;
              const isActive = statusFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applicant name, phone, batch..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Historical Selection Action Bar (shown only when historical records are visible) */}
        {visibleHistoricalRequests.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <label className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allVisibleHistorySelected}
                onChange={toggleSelectAllVisibleHistory}
                className="w-4 h-4 rounded-md border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>
                Select all visible history ({visibleHistoricalRequests.length})
              </span>
            </label>

            {selectedHistoryIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {selectedHistoryIds.size} selected
                </span>
                <button
                  type="button"
                  onClick={() => setHistoryModalMode('selected')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm shadow-rose-600/25 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Selected History ({selectedHistoryIds.size})</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Applications List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <UserPlus className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No {statusFilter === 'All' ? '' : statusFilter.toLowerCase()} admission requests
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            {searchQuery
              ? 'No applications matched your search query. Clear the search filter to view all submissions.'
              : 'New student admission forms submitted from the Official Website (`admission_requests` collection) will appear here in real time.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map((req) => {
            const busy = processingIds[req.id];
            const isHistorical = req.status === 'Approved' || req.status === 'Rejected';
            const cleanWa = (req.parentWhatsApp || '').replace(/[^0-9]/g, '');
            const displayName = req.fullName || 'Not provided';
            const initials =
              (req.fullName || 'AP')
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'AP';

            const batchLabel = [req.batch, req.studentClass, req.timing]
              .filter(Boolean)
              .filter((val, idx, arr) => arr.indexOf(val) === idx)
              .join(' · ');

            const enrollmentDateLabel =
              req.enrollmentDate ||
              (req.createdAt ? req.createdAt.split('T')[0] : 'Not specified');

            return (
              <div
                key={req.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-xs transition-all ${
                  selectedHistoryIds.has(req.id)
                    ? 'border-rose-500/60 ring-1 ring-rose-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left: Student Identity & Application Metadata */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {isHistorical && (
                      <div className="pt-3 shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedHistoryIds.has(req.id)}
                          onChange={() => toggleSelectHistoryItem(req.id)}
                          title="Select historical record to remove"
                          className="w-4 h-4 rounded-md border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                      </div>
                    )}

                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                              {displayName}
                            </h3>
                            {req.koreanName && (
                              <span className="text-xs font-korean font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                                {req.koreanName}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Submitted {formatDate(req.createdAt)}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-medium">
                              <Sparkles className="w-3 h-3" />
                              <span>{req.source || 'Official Website Form'}</span>
                            </span>
                          </div>
                        </div>

                        {getStatusBadge(req.status, req.approvedRollNumber, req.approvedSerialNumber)}
                      </div>

                      {/* Structured Student Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pt-1">
                        {/* 1. Father / Guardian Name */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Father / Guardian Name
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-0.5 block truncate">
                            {req.fatherName || 'Not provided'}
                          </span>
                        </div>

                        {/* 2. Student Contact Phone */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Student Contact Phone
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs font-mono font-semibold text-slate-800 dark:text-slate-100">
                            <Phone className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                            <span className="truncate">{req.contactNumber || 'Not provided'}</span>
                          </div>
                        </div>

                        {/* 3. Parent WhatsApp */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Parent WhatsApp
                          </span>
                          <div className="flex items-center justify-between gap-2 mt-0.5 text-xs font-mono font-semibold text-slate-800 dark:text-slate-100">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="truncate">{req.parentWhatsApp || 'Not provided'}</span>
                            </div>
                            {cleanWa && (
                              <a
                                href={`https://wa.me/${cleanWa}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-sans font-bold bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 transition-colors shrink-0"
                                title="Message Parent on WhatsApp"
                              >
                                Chat
                              </a>
                            )}
                          </div>
                        </div>

                        {/* 4. Assigned Batch */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Assigned Batch
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate">{batchLabel || 'Not specified'}</span>
                          </div>
                        </div>

                        {/* 5. Course Level */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Course Level
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                            <GraduationCap className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <span className="truncate">{req.level}</span>
                          </div>
                        </div>

                        {/* 6. Enrollment Date */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Enrollment Date
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs font-mono font-semibold text-slate-800 dark:text-slate-100">
                            <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="truncate">{enrollmentDateLabel}</span>
                          </div>
                        </div>
                      </div>

                      {/* Secondary metadata (Email Address, City, Address, CNIC, Education, Academic Notes) */}
                      {(req.email || req.city || req.address || req.cnic || req.qualification || req.notes) && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1">
                          {req.email && (
                            <span className="inline-flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                              <span className="font-medium">{req.email}</span>
                            </span>
                          )}
                          {(req.city || req.address) && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{[req.city, req.address].filter(Boolean).join(', ')}</span>
                            </span>
                          )}
                          {req.cnic && (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              CNIC: {req.cnic}
                            </span>
                          )}
                          {req.qualification && (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              Education: {req.qualification}
                            </span>
                          )}
                          {req.notes && (
                            <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 italic">
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span>"{req.notes}"</span>
                            </span>
                          )}
                        </div>
                      )}

                      {req.reviewedBy && req.reviewedAt && (
                        <p className="text-[11px] text-slate-400 font-mono">
                          {req.status} by {req.reviewedBy} on {formatDate(req.reviewedAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Approve & Reject Action Buttons for Pending, or History Remove Button for Historical */}
                  {req.status === 'Pending' ? (
                    <div className="flex flex-row lg:flex-col items-center lg:items-stretch gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleApprove(req)}
                        disabled={Boolean(busy) || isBulkApproving}
                        className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-w-[130px]"
                      >
                        {busy === 'approve' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Enrolling...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Approve</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReject(req)}
                        disabled={Boolean(busy) || isBulkApproving}
                        className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/10 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-500/30 font-bold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-w-[130px]"
                      >
                        {busy === 'reject' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Rejecting...</span>
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4" />
                            <span>Reject</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setSingleDeleteTarget(req);
                          setHistoryModalMode('single');
                        }}
                        disabled={Boolean(busy)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/25 transition-colors cursor-pointer disabled:opacity-50"
                        title="Remove from admission request history (Student Directory records will not be affected)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove History</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal: Approve All Pending Requests */}
      {isBulkApproveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-fadeIn text-slate-800 dark:text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 shrink-0">
                <CheckCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                  Approve All Pending Requests
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bulk admission approval & student enrollment
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              You are about to approve{' '}
              <span className="font-bold text-emerald-500">
                {pendingRequests.length} pending admission request{pendingRequests.length === 1 ? '' : 's'}
              </span>
              . Each applicant will be assigned a unique sequential Roll Number, enrolled in the Student Directory, and updated to Approved in Firebase. Duplicate student enrollments are automatically prevented.
            </p>

            {pendingRequests.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/70 max-h-36 overflow-y-auto space-y-1 text-xs">
                {pendingRequests.slice(0, 6).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate text-slate-800 dark:text-slate-100">
                      {p.fullName || 'Not provided'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                      {p.contactNumber || p.parentWhatsApp || ''}
                    </span>
                  </div>
                ))}
                {pendingRequests.length > 6 && (
                  <p className="text-[11px] text-slate-400 pt-1">
                    +{pendingRequests.length - 6} more pending applicant(s)
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsBulkApproveModalOpen(false)}
                disabled={isBulkApproving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkApproveConfirm}
                disabled={isBulkApproving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 cursor-pointer transition-colors disabled:opacity-60"
              >
                {isBulkApproving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Approving ({pendingRequests.length})...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Yes, Approve All ({pendingRequests.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Clear / Remove Admission Request History */}
      {historyModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-fadeIn text-slate-800 dark:text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                  {historyModalMode === 'single'
                    ? 'Remove Admission History Record'
                    : historyModalMode === 'selected'
                    ? `Remove ${selectedHistoryIds.size} Selected History Record${selectedHistoryIds.size === 1 ? '' : 's'}`
                    : 'Clear Admission Request History'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Safe cleanup for processed admission logs
                </p>
              </div>
            </div>

            {historyModalMode === 'all' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Select history records to clear:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setHistoryClearScope('all')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      historyClearScope === 'all'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    All ({counts.historyTotal})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryClearScope('Approved')}
                    disabled={counts.approved === 0}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer disabled:opacity-40 ${
                      historyClearScope === 'Approved'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Approved ({counts.approved})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryClearScope('Rejected')}
                    disabled={counts.rejected === 0}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer disabled:opacity-40 ${
                      historyClearScope === 'Rejected'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Rejected ({counts.rejected})
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {historyModalMode === 'single' && singleDeleteTarget ? (
                <>
                  Remove historical {singleDeleteTarget.status.toLowerCase()} record for{' '}
                  <span className="font-bold text-slate-900 dark:text-white">
                    {singleDeleteTarget.fullName}
                  </span>{' '}
                  from `admission_requests`?
                </>
              ) : historyModalMode === 'selected' ? (
                <>
                  Permanently remove{' '}
                  <span className="font-bold text-rose-500">{selectedHistoryIds.size}</span>{' '}
                  selected historical record{selectedHistoryIds.size === 1 ? '' : 's'} from Firebase?
                </>
              ) : (
                <>
                  Permanently remove{' '}
                  <span className="font-bold text-rose-500">{clearScopeCount}</span>{' '}
                  historical record{clearScopeCount === 1 ? '' : 's'} from `admission_requests`?
                </>
              )}
            </p>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
              <strong>Protected Data:</strong> Active Pending requests ({counts.pending}) and all enrolled students in the Student Directory will <strong>NOT</strong> be deleted.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setHistoryModalMode(null);
                  setSingleDeleteTarget(null);
                }}
                disabled={isClearingHistory}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearHistory}
                disabled={
                  isClearingHistory ||
                  (historyModalMode === 'all' && clearScopeCount === 0)
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/30 cursor-pointer transition-colors disabled:opacity-50"
              >
                {isClearingHistory ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Remove</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionRequestsPage;
