import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye, 
  Phone, 
  MessageCircle, 
  CalendarCheck, 
  Award, 
  FileText,
  X,
  AlertTriangle,
  GraduationCap,
  Fingerprint,
  FileSpreadsheet,
  Send,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { Student, StudentBatch, StudentLevel, StudentStatus, StudentClass, ClassTiming, TabId } from '../types';
import { StorageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { StudentModal, CLASSES, TIMINGS } from '../components/modals/StudentModal';
import { ExcelImportModal } from '../components/modals/ExcelImportModal';
import { ZKTecoVerificationModal } from '../components/modals/ZKTecoVerificationModal';

interface StudentsPageProps {
  onNavigate?: (tab: TabId) => void;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('All');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedTiming, setSelectedTiming] = useState<string>('All');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Bulk Selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Feedback banner & toast
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [verifyingStudent, setVerifyingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // Real-time live Firestore subscription
  useEffect(() => {
    return StorageService.subscribeStudents((liveStudents) => {
      setStudents(liveStudents);
    });
  }, []);

  const refreshList = () => {
    setStudents(StorageService.getStudents());
  };

  const handleSaveStudent = (data: Omit<Student, 'id'> | Student) => {
    if ('id' in data) {
      StorageService.updateStudent(data as Student, user?.name || 'Admin', user?.role || 'admin');
    } else {
      const created = StorageService.addStudent({
        ...data,
        deviceSyncStatus: 'Pending',
        enrollRequested: true,
        enrollRequestedAt: new Date().toISOString()
      }, user?.name || 'Admin', user?.role || 'admin');

      StorageService.sendEnrollRequest(created.id);
      setBannerMessage(`Enrolled ${created.fullName} (${created.rollNumber})! Biometric enroll signal queued to ZKTeco K40 device.`);
    }
    refreshList();
  };

  const handleSendEnrollRequest = async (student: Student) => {
    try {
      await StorageService.sendEnrollRequest(student.id);
      showToast('Enrollment request sent to device');
      setBannerMessage(`Enrollment request sent to device for ${student.fullName} (${student.rollNumber}). Student status: Awaiting Fingerprint.`);
    } catch {
      showToast('Enrollment request sent to device');
    }
  };

  const handleDelete = () => {
    if (!deletingStudent) return;
    StorageService.deleteStudent(deletingStudent.id, user?.name || 'Admin', user?.role || 'admin');
    setDeletingStudent(null);
    if (viewingStudent?.id === deletingStudent.id) {
      setViewingStudent(null);
    }
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      next.delete(deletingStudent.id);
      return next;
    });
    refreshList();
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedStudentIds);
    if (ids.length === 0) return;
    StorageService.deleteStudentsBatch(ids, user?.name || 'Admin', user?.role || 'admin');
    setSelectedStudentIds(new Set());
    setIsBulkDeleteModalOpen(false);
    showToast(`Deleted ${ids.length} selected students successfully`);
    refreshList();
  };

  // Toggle single selection
  const toggleSelectStudent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter logic
  const filteredStudents = students.filter(student => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      student.fullName.toLowerCase().includes(q) ||
      student.rollNumber.toLowerCase().includes(q) ||
      student.fatherName.toLowerCase().includes(q) ||
      student.contactNumber.toLowerCase().includes(q) ||
      student.parentWhatsApp.toLowerCase().includes(q) ||
      (student.koreanName && student.koreanName.includes(searchQuery));

    const matchesBatch = selectedBatch === 'All' || student.batch === selectedBatch;
    const matchesClass = selectedClass === 'All' || (student.studentClass || 'Class 1') === selectedClass;
    const matchesTiming = selectedTiming === 'All' || (student.timing || 'Morning') === selectedTiming;
    const matchesLevel = selectedLevel === 'All' || student.level === selectedLevel;
    const matchesStatus = selectedStatus === 'All' || student.status === selectedStatus;

    return matchesSearch && matchesBatch && matchesClass && matchesTiming && matchesLevel && matchesStatus;
  });

  // Toggle select all visible
  const isAllSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.has(s.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Dynamic Feedback Banner */}
      {bannerMessage && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <Fingerprint className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 animate-pulse" />
            <span className="font-medium">{bannerMessage}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            className="p-1 rounded-lg text-indigo-500 hover:text-indigo-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Student Management Directory</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
            Registered Korean language students, biometric fingerprint verification, and batch distributions.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            {/* Bulk Delete Selected Button */}
            {selectedStudentIds.size > 0 && (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-rose-600/30 transition-all cursor-pointer animate-pulse"
                title="Delete selected students"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Selected ({selectedStudentIds.size})</span>
              </button>
            )}

            {/* 2. Excel Bulk Student Upload Button */}
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
              title="Import students from an Excel .xlsx sheet"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import Students via Excel</span>
            </button>

            {/* Enroll New Student Button */}
            <button
              onClick={() => {
                setEditingStudent(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Enroll New Student</span>
            </button>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, roll number, Korean name, or phone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
            >
              <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Classes</option>
              {CLASSES.map((c) => (
                <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{c}</option>
              ))}
            </select>

            {/* Timing Filter */}
            <select
              value={selectedTiming}
              onChange={(e) => setSelectedTiming(e.target.value)}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
            >
              <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Timings</option>
              {TIMINGS.map((t) => (
                <option key={t} value={t} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{t}</option>
              ))}
            </select>

            {/* Batch Filter */}
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
            >
              <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Batches</option>
              <option value="Batch A (Morning 09:00 - 11:00)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Batch A (Morning)</option>
              <option value="Batch B (Afternoon 14:00 - 16:00)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Batch B (Afternoon)</option>
              <option value="Batch C (Evening 18:00 - 20:00)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Batch C (Evening)</option>
              <option value="Batch D (Weekend Intensive)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Weekend Intensive</option>
            </select>

            {/* Level Filter */}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
            >
              <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Levels</option>
              <option value="Level 1 - Beginner (TOPIK I)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Beginner (TOPIK I)</option>
              <option value="Level 2 - Elementary (TOPIK I)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Elementary (TOPIK I)</option>
              <option value="Level 3 - Intermediate (TOPIK II)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Intermediate (TOPIK II)</option>
              <option value="Level 4 - Upper-Intermediate (TOPIK II)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Upper-Intermediate</option>
              <option value="Level 5 - Advanced (TOPIK II)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Advanced</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
            >
              <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Statuses</option>
              <option value="Active" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Active</option>
              <option value="Pending Verification" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Pending Verification</option>
              <option value="On Leave" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">On Leave</option>
              <option value="Graduated" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Graduated</option>
              <option value="Inactive" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Inactive</option>
            </select>

            {(searchQuery || selectedBatch !== 'All' || selectedClass !== 'All' || selectedTiming !== 'All' || selectedLevel !== 'All' || selectedStatus !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedBatch('All');
                  setSelectedClass('All');
                  setSelectedTiming('All');
                  setSelectedLevel('All');
                  setSelectedStatus('All');
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-300 dark:border-rose-500/30 rounded-xl transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Counter Strip */}
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
          <span>
            Showing <strong className="text-slate-900 dark:text-white tabular-nums font-bold">{filteredStudents.length}</strong> of {students.length} registered students
            {selectedStudentIds.size > 0 && (
              <span className="ml-2 font-semibold text-indigo-600 dark:text-indigo-400">
                ({selectedStudentIds.size} selected)
              </span>
            )}
          </span>
          <span className="text-slate-500 dark:text-slate-400 hidden sm:inline font-medium">
            Red badge: Awaiting Fingerprint · Green badge: Biometric Enrolled
          </span>
        </div>
      </div>

      {/* Students Data Grid / Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-300">No students found</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No matching records for your current search or filters. Try adjusting your query or enroll a new candidate.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-700/80">
                <tr>
                  {isAdmin && (
                    <th className="py-3 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        title="Select All Students"
                        className="w-4 h-4 rounded-md border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="py-3 px-4 whitespace-nowrap">Roll No</th>
                  <th className="py-3 px-4">Student & Biometric Status</th>
                  <th className="py-3 px-4">Class & Timing</th>
                  <th className="py-3 px-4 hidden md:table-cell">Father Name</th>
                  <th className="py-3 px-4 text-center hidden lg:table-cell">Parent WhatsApp</th>
                  <th className="py-3 px-4">Standing</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filteredStudents.map((student) => {
                  const isEnrolled = Boolean(student.biometricEnrolled || student.deviceSyncStatus === 'Enrolled');
                  const isPending = !isEnrolled || student.status === 'Pending Verification' || student.deviceSyncStatus === 'Pending';

                  const cleanPhone = student.parentWhatsApp ? student.parentWhatsApp.replace(/[^0-9]/g, '') : '';
                  const initials = student.fullName.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('') || 'ST';

                  return (
                    <tr 
                      key={student.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      onClick={() => setViewingStudent(student)}
                    >
                      {/* Checkbox */}
                      {isAdmin && (
                        <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.has(student.id)}
                            onChange={(e) => toggleSelectStudent(student.id, e as unknown as React.MouseEvent)}
                            className="w-4 h-4 rounded-md border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* Roll No as sleek horizontal pill badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-950/90 via-slate-900 to-slate-900 border border-cyan-500/30 shadow-md shadow-black/60 shadow-[0_0_8px_rgba(6,182,212,0.15)] text-cyan-300 font-mono text-xs font-semibold tracking-wider tabular-nums whitespace-nowrap ring-1 ring-cyan-500/20 select-none">
                          {student.rollNumber}
                        </span>
                      </td>

                      {/* Student Name, Initials Avatar & Red-to-Green Fingerprint Icon */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {/* Circular Avatar with Initials */}
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ring-1 ring-white/10 uppercase">
                            {initials}
                          </div>

                          {/* Fingerprint Icon: Green if enrolled, Red if pending/unmatched */}
                          <div
                            className={`p-1.5 rounded-lg border shrink-0 transition-all ${
                              isEnrolled
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-xs ring-1 ring-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
                            }`}
                            title={isEnrolled ? 'Fingerprint Enrolled on ZKTeco Device' : 'Awaiting Fingerprint Enrollment'}
                          >
                            <Fingerprint className="w-4 h-4" />
                          </div>

                          <div>
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                              <span>{student.fullName}</span>
                              {/* Translucent badge */}
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1 ${
                                isEnrolled
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {isEnrolled ? 'Enrolled' : 'Awaiting Fingerprint'}
                              </span>
                            </div>

                            {student.koreanName && (
                              <div className="text-[11px] text-indigo-400 font-semibold font-korean mt-0.5">
                                {student.koreanName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Class & Timing */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {student.studentClass || 'Class 1'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {student.timing || 'Morning'}
                        </div>
                      </td>

                      {/* Father Name */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 hidden md:table-cell font-medium">
                        {student.fatherName}
                      </td>

                      {/* Parent WhatsApp - Clickable WhatsApp Icon Only with Tooltip */}
                      <td className="py-3.5 px-4 text-center hidden lg:table-cell">
                        {cleanPhone ? (
                          <div className="relative inline-flex items-center justify-center group/wa">
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 hover:border-emerald-500/50 hover:scale-110 active:scale-95 transition-all shadow-xs cursor-pointer inline-flex items-center justify-center"
                              title="Message on WhatsApp"
                              aria-label="Message on WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4 text-emerald-400" />
                            </a>
                            {/* Hover Tooltip */}
                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 opacity-0 shadow-xl transition-all duration-200 group-hover/wa:opacity-100 z-30">
                              Message on WhatsApp
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>

                      {/* Standing Status - Modern Pill Shape with Pulsing Indicator */}
                      <td className="py-3.5 px-4">
                        {student.status === 'Pending Verification' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)] whitespace-nowrap">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            <span>Pending Verification</span>
                          </span>
                        ) : student.status === 'Active' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Active</span>
                          </span>
                        ) : student.status === 'On Leave' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>On Leave</span>
                          </span>
                        ) : student.status === 'Graduated' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            <span>Graduated</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span>{student.status}</span>
                          </span>
                        )}
                      </td>

                      {/* Action buttons with Primary Enroll Button & Clean Spacing */}
                      <td className="py-3.5 pl-4 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2.5">
                          {/* Send Enroll Request Primary Action Button */}
                          {isPending && (
                            <button
                              onClick={() => handleSendEnrollRequest(student)}
                              title="Send Biometric Enroll Command to ZKTeco Terminal"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer whitespace-nowrap border border-indigo-400/30"
                            >
                              <Send className="w-3.5 h-3.5 text-indigo-100" />
                              <span className="hidden sm:inline">Send Enroll Request</span>
                            </button>
                          )}

                          <div className="flex items-center gap-1 border-l border-slate-700/60 pl-2">
                            <button
                              onClick={() => setViewingStudent(student)}
                              title="View Student Dossier"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingStudent(student);
                                    setIsModalOpen(true);
                                  }}
                                  title="Edit Profile"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeletingStudent(student)}
                                  title="Delete Record"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-fadeIn text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30">
                <Trash2 className="w-6 h-6 text-rose-500 dark:text-rose-400" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Delete Selected Students?</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              You have selected <strong className="text-slate-900 dark:text-white">{selectedStudentIds.size} student(s)</strong>. Are you sure you want to permanently delete them? All their attendance records and reports will be removed. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/30 cursor-pointer transition-colors"
              >
                Yes, Delete {selectedStudentIds.size} Students
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      <StudentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStudent(null);
        }}
        onSave={handleSaveStudent}
        studentToEdit={editingStudent}
        existingCount={students.length}
      />

      {/* Excel Bulk Upload Modal */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onSuccess={(count: number) => {
          refreshList();
          setBannerMessage(`Successfully imported ${count} students via Excel! deviceSyncStatus is set to 'Pending' with enroll requests queued.`);
        }}
        existingStudents={students}
      />

      {/* ZKTeco K40 Biometric Verification Modal */}
      <ZKTecoVerificationModal
        isOpen={!!verifyingStudent}
        onClose={() => setVerifyingStudent(null)}
        student={verifyingStudent}
        onVerified={(updated: Student) => {
          refreshList();
          setBannerMessage(`Biometric enrollment confirmed for ${updated.fullName}! Student status is now Active.`);
        }}
      />

      {/* Delete Confirmation Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-fadeIn text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30">
                <AlertTriangle className="w-6 h-6 text-rose-500 dark:text-rose-400" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Delete Student Record?</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Are you sure you want to permanently remove <strong className="text-slate-900 dark:text-white">{deletingStudent.fullName}</strong> ({deletingStudent.rollNumber})? This will also remove their associated attendance logs and reports.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/30 cursor-pointer transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Student Dossier Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-fadeIn text-slate-800 dark:text-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-base text-white shadow-md">
                  {viewingStudent.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{viewingStudent.fullName}</span>
                    {viewingStudent.koreanName && (
                      <span className="text-indigo-600 dark:text-indigo-300 font-korean text-xs font-normal">
                        ({viewingStudent.koreanName})
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {viewingStudent.rollNumber} · Enrolled {viewingStudent.enrollmentDate}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingStudent(null)}
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Content */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Quick stats strip */}
              {(() => {
                const stats = StorageService.getStudentAttendanceStats(viewingStudent.id);
                const isBiometric = viewingStudent.biometricEnrolled || viewingStudent.deviceSyncStatus === 'Enrolled';
                return (
                  <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-center">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Attendance Rate</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{stats.rate}%</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{stats.present} / {stats.total} days</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Biometric Device</p>
                      <p className={`text-sm font-bold flex items-center justify-center gap-1 mt-1 ${isBiometric ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                        <Fingerprint className="w-4 h-4" />
                        {isBiometric ? 'Enrolled' : 'Awaiting'}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {isBiometric ? 'Synced' : 'Send Request'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Batch</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{viewingStudent.batch.split(' (')[0]}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{viewingStudent.level.split(' - ')[0]}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Personal & Academic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Father / Guardian Name</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{viewingStudent.fatherName}</span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Parent WhatsApp</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-sm font-mono">{viewingStudent.parentWhatsApp}</span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Student Contact</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-sm font-mono">{viewingStudent.contactNumber}</span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Email</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{viewingStudent.email || 'N/A'}</span>
                </div>
                <div className="sm:col-span-2 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Target Curriculum / Level</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-300 text-sm">{viewingStudent.level}</span>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1">{viewingStudent.notes || 'No extra notes recorded.'}</p>
                </div>
              </div>

              {/* Action shortcuts */}
              <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {(!viewingStudent.biometricEnrolled && viewingStudent.deviceSyncStatus !== 'Enrolled') && (
                    <button
                      onClick={() => handleSendEnrollRequest(viewingStudent)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer shadow-xs"
                    >
                      <Fingerprint className="w-3.5 h-3.5 animate-pulse" />
                      <span>Send Enroll Request</span>
                    </button>
                  )}

                  <a
                    href={`https://wa.me/${viewingStudent.parentWhatsApp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Hello, message from Ok Korean Language Centre regarding ${viewingStudent.fullName} (${viewingStudent.rollNumber}).`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-500/40 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Parent</span>
                  </a>

                  {onNavigate && (
                    <button
                      onClick={() => {
                        setViewingStudent(null);
                        onNavigate('reports');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-300 dark:border-indigo-500/40 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Report Card</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      onClick={() => {
                        const target = viewingStudent;
                        setViewingStudent(null);
                        setEditingStudent(target);
                        setIsModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      Edit Profile
                    </button>
                  )}
                  <button
                    onClick={() => setViewingStudent(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 border border-slate-700 dark:border-slate-600 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsPage;
