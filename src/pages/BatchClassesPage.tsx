import React, { useEffect, useMemo, useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit3,
  Trash2,
  Users,
  Clock,
  MapPin,
  X,
  Check,
  UserCheck,
  AlertCircle,
  Eye,
  Power,
} from 'lucide-react';
import { AcademyDataService } from '../services/academyDataService';
import { StorageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { BatchRecord, Student, StudentBatch, StudentLevel, TeacherAccount } from '../types';

const LEVELS: StudentLevel[] = [
  'Level 1 - Beginner (TOPIK I)',
  'Level 2 - Elementary (TOPIK I)',
  'Level 3 - Intermediate (TOPIK II)',
  'Level 4 - Upper-Intermediate (TOPIK II)',
  'Level 5 - Advanced (TOPIK II)',
];

export const BatchClassesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [batches, setBatches] = useState<BatchRecord[]>(() => AcademyDataService.getBatches());
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [teachers, setTeachers] = useState<TeacherAccount[]>(() => StorageService.getTeacherAccounts());

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | BatchRecord['status']>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchRecord | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<BatchRecord | null>(null);
  const [assignModalBatch, setAssignModalBatch] = useState<BatchRecord | null>(null);
  const [viewingRosterBatch, setViewingRosterBatch] = useState<BatchRecord | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState('');
  const [level, setLevel] = useState<string>(LEVELS[0]);
  const [timing, setTiming] = useState('Morning');
  const [scheduleDays, setScheduleDays] = useState('Mon - Sat');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [classroom, setClassroom] = useState('Room 101 (Hangul Lab)');
  const [capacity, setCapacity] = useState(30);
  const [teacherId, setTeacherId] = useState('');
  const [status, setStatus] = useState<BatchRecord['status']>('Active');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const u1 = AcademyDataService.subscribeBatches(setBatches);
    const u2 = StorageService.subscribeStudents(setStudents);
    const u3 = StorageService.subscribeTeachers(setTeachers);
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  const openCreateModal = () => {
    setEditingBatch(null);
    setName('');
    setCode(`OK-B${String(batches.length + 1).padStart(2, '0')}`);
    setLevel(LEVELS[0]);
    setTiming('Morning');
    setScheduleDays('Mon - Sat');
    setStartTime('09:00');
    setEndTime('11:00');
    setClassroom('Room 101');
    setCapacity(30);
    setTeacherId(teachers[0]?.id || '');
    setStatus('Active');
    setDescription('');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (b: BatchRecord) => {
    setEditingBatch(b);
    setName(b.name);
    setCode(b.code);
    setLevel(b.level);
    setTiming(b.timing);
    setScheduleDays(b.scheduleDays);
    setStartTime(b.startTime);
    setEndTime(b.endTime);
    setClassroom(b.classroom);
    setCapacity(b.capacity);
    setTeacherId(b.teacherId || '');
    setStatus(b.status);
    setDescription(b.description || '');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const getEnrolledStudents = (b: BatchRecord) => {
    const nameNorm = (b.name || '').trim().toLowerCase();
    const codeNorm = (b.code || '').trim().toLowerCase();
    return students.filter(
      (s) =>
        s.batchId === b.id ||
        (s.batch || '').trim().toLowerCase() === nameNorm ||
        (codeNorm && (s.batchCode || '').trim().toLowerCase() === codeNorm)
    );
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg('Batch Name is required.');
      return;
    }
    if (!code.trim()) {
      setErrorMsg('Batch Code is required.');
      return;
    }
    const assignedTeacher = teachers.find((t) => t.id === teacherId);
    try {
      await AcademyDataService.saveBatch(
        {
          id: editingBatch?.id,
          createdAt: editingBatch?.createdAt,
          name: name.trim(),
          code: code.trim(),
          level,
          timing,
          scheduleDays: scheduleDays.trim(),
          startTime,
          endTime,
          classroom: classroom.trim(),
          capacity: Number(capacity) || 30,
          teacherId: assignedTeacher?.id,
          teacherName: assignedTeacher?.name,
          status,
          description: description.trim() || undefined,
        },
        user?.name || 'Admin',
        user?.role || 'admin'
      );
      setModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to save batch record.');
    }
  };

  const openAssignStudents = (b: BatchRecord) => {
    setAssignModalBatch(b);
    const matching = getEnrolledStudents(b).map((s) => s.id);
    setSelectedStudentIds(matching);
  };

  const handleToggleBatchActive = async (b: BatchRecord) => {
    const nextStatus: BatchRecord['status'] = b.status === 'Inactive' ? 'Active' : 'Inactive';
    await AcademyDataService.saveBatch(
      { ...b, status: nextStatus },
      user?.name || 'Admin',
      user?.role || 'admin'
    );
  };

  const handleSaveAssignments = () => {
    if (!assignModalBatch) return;
    const targetBatchName = assignModalBatch.name as StudentBatch;
    const mappedTiming =
      assignModalBatch.timing === 'Evening'
        ? 'Evening'
        : assignModalBatch.timing === 'Morning'
        ? 'Morning'
        : undefined;

    const selectedSet = new Set(selectedStudentIds);
    const previouslyEnrolled = getEnrolledStudents(assignModalBatch);

    // 1. Assign newly checked students to this batch
    selectedStudentIds.forEach((sid) => {
      const stu = students.find((s) => s.id === sid);
      if (
        stu &&
        (stu.batch !== targetBatchName ||
          stu.batchId !== assignModalBatch.id ||
          stu.batchCode !== assignModalBatch.code)
      ) {
        StorageService.updateStudent(
          {
            ...stu,
            batch: targetBatchName,
            batchId: assignModalBatch.id,
            batchCode: assignModalBatch.code,
            ...(mappedTiming ? { timing: mappedTiming } : {}),
            ...(assignModalBatch.level ? { level: assignModalBatch.level as StudentLevel } : {}),
          },
          user?.name || 'Admin',
          user?.role || 'admin'
        );
      }
    });

    // 2. Unassign students that were previously in this batch and unchecked (preserving student records)
    previouslyEnrolled.forEach((stu) => {
      if (!selectedSet.has(stu.id)) {
        StorageService.updateStudent(
          {
            ...stu,
            batch: '',
            batchId: '',
            batchCode: '',
          },
          user?.name || 'Admin',
          user?.role || 'admin'
        );
      }
    });

    setAssignModalBatch(null);
  };

  const filteredBatches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return batches.filter((b) => {
      if (statusFilter !== 'All' && b.status !== statusFilter) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.teacherName || '').toLowerCase().includes(q) ||
        b.classroom.toLowerCase().includes(q)
      );
    });
  }, [batches, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-500" />
            <span>Batch & Classes Management</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize Korean language cohorts, class timings, rooms, teacher allocations, and student capacity.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/30 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Batch / Class</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search batch name, code, room, or teacher..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Inactive">Inactive</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Batch Cards Grid */}
      {filteredBatches.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
          <Layers className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No batches created yet</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Create your academy batches (Morning, Afternoon, Evening, or Weekend) to organize schedules and rosters.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
          >
            + Add First Batch
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatches.map((b) => {
            const enrolledCount = getEnrolledStudents(b).length;
            const fillPct = Math.min(100, Math.round((enrolledCount / (b.capacity || 1)) * 100));
            return (
              <div
                key={b.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                        {b.code}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">{b.name}</h3>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        b.status === 'Active'
                          ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                          : b.status === 'Upcoming'
                          ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                          : b.status === 'Inactive'
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400">{b.level}</p>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {b.scheduleDays} · {b.startTime} - {b.endTime} ({b.timing})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{b.classroom}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Instructor: {b.teacherName || 'Unassigned'}</span>
                    </div>
                  </div>

                  {/* Capacity bar */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Seat Occupancy</span>
                      <span className="font-mono text-slate-900 dark:text-white">
                        {enrolledCount} / {b.capacity} ({fillPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openAssignStudents(b)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 text-xs font-bold cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Assign Students</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewingRosterBatch(b)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-bold cursor-pointer"
                      title="View Enrolled Students"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Roster ({enrolledCount})</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleToggleBatchActive(b)}
                        className={`p-2 rounded-lg cursor-pointer transition-colors ${
                          b.status === 'Inactive'
                            ? 'text-emerald-500 hover:bg-emerald-500/10'
                            : 'text-amber-500 hover:bg-amber-500/10'
                        }`}
                        title={b.status === 'Inactive' ? 'Activate Batch' : 'Deactivate Batch'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditModal(b)}
                      className="p-2 rounded-lg text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                      title="Edit Batch"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setDeletingBatch(b)}
                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        title="Delete Batch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Batch Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-base">{editingBatch ? 'Edit Batch Details' : 'Create New Batch'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Batch Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. TOPIK I Morning Cohort"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Batch Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. OK-B01"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Proficiency Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Timing Shift</label>
                  <select
                    value={timing}
                    onChange={(e) => setTiming(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                    <option value="Weekend">Weekend</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Schedule Days</label>
                  <input
                    type="text"
                    value={scheduleDays}
                    onChange={(e) => setScheduleDays(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Classroom / Lab</label>
                  <input
                    type="text"
                    value={classroom}
                    onChange={(e) => setClassroom(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Assigned Instructor</label>
                  <select
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Unassigned</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as BatchRecord['status'])}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {editingBatch && (status === 'Inactive' || status === 'Completed') && getEnrolledStudents(editingBatch).length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {getEnrolledStudents(editingBatch).length} student(s) are currently enrolled in this batch. Marking it{' '}
                    <strong>{status}</strong> keeps all student records intact and simply hides this batch from new student enrollments.
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingBatch ? 'Save Batch' : 'Create Batch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Students Modal */}
      {assignModalBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm">Assign Students to {assignModalBatch.name}</h3>
                <p className="text-[11px] text-slate-400">Selected candidates will be synced to this batch in Firebase</p>
              </div>
              <button type="button" onClick={() => setAssignModalBatch(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 max-h-80 overflow-y-auto space-y-2 text-xs">
              {students.length === 0 ? (
                <p className="text-slate-400 text-center py-6">No students registered in Student Directory yet.</p>
              ) : (
                students.map((stu) => {
                  const checked = selectedStudentIds.includes(stu.id);
                  return (
                    <label
                      key={stu.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer ${
                        checked
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-900 dark:text-white'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedStudentIds((prev) =>
                              prev.includes(stu.id) ? prev.filter((id) => id !== stu.id) : [...prev, stu.id]
                            )
                          }
                          className="accent-emerald-600"
                        />
                        <div>
                          <span className="font-bold block">{stu.fullName}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {stu.rollNumber} · Current: {stu.batch || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignModalBatch(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignments}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                Save Assignments ({selectedStudentIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Delete / Deactivate Confirmation Modal */}
      {deletingBatch && (() => {
        const enrolled = getEnrolledStudents(deletingBatch);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-500 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Delete Batch "{deletingBatch.name}"?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    Code: {deletingBatch.code} · {deletingBatch.level}
                  </p>
                </div>
              </div>

              {enrolled.length > 0 ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-1.5">
                  <div className="font-bold">
                    {enrolled.length} student record(s) are currently enrolled in this batch.
                  </div>
                  <p className="opacity-90 leading-relaxed">
                    Student records will <strong>never be deleted</strong>. You can mark the batch <strong>Inactive</strong> to keep historical links intact, or delete the batch and unlink students until reassigned.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  No students are currently assigned to this batch. This will remove the batch definition from Firestore.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingBatch(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                {enrolled.length > 0 && deletingBatch.status !== 'Inactive' && (
                  <button
                    type="button"
                    onClick={async () => {
                      await AcademyDataService.saveBatch(
                        { ...deletingBatch, status: 'Inactive' },
                        user?.name || 'Admin',
                        user?.role || 'admin'
                      );
                      setDeletingBatch(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Mark Inactive Instead
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    await AcademyDataService.deleteBatch(
                      deletingBatch.id,
                      user?.name || 'Admin',
                      user?.role || 'admin',
                      { allowWhenEnrolled: true }
                    );
                    setDeletingBatch(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                >
                  {enrolled.length > 0 ? 'Delete & Preserve Students' : 'Delete Batch'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* View Enrolled Students Roster Modal */}
      {viewingRosterBatch && (() => {
        const enrolledRoster = getEnrolledStudents(viewingRosterBatch);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>Enrolled Students — {viewingRosterBatch.name}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {viewingRosterBatch.code} · {viewingRosterBatch.timing} {viewingRosterBatch.startTime}-{viewingRosterBatch.endTime} · Teacher: {viewingRosterBatch.teacherName || 'Unassigned'}
                  </p>
                </div>
                <button type="button" onClick={() => setViewingRosterBatch(null)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 max-h-[65vh] overflow-y-auto">
                {enrolledRoster.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">
                    No students are currently enrolled in this batch.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Serial</th>
                        <th className="py-2.5 px-3">Roll No</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Class</th>
                        <th className="py-2.5 px-3">Course Level</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {enrolledRoster.map((stu, idx) => (
                        <tr key={stu.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-mono text-slate-400">
                            #{stu.serialNumber ?? idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-cyan-500">
                            {stu.rollNumber}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            {stu.fullName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {stu.studentClass || 'Class 1'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {stu.level?.split(' - ')[0] || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                              {stu.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-400 font-semibold">
                  Total Enrolled: {enrolledRoster.length} / {viewingRosterBatch.capacity}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewingRosterBatch;
                      setViewingRosterBatch(null);
                      openAssignStudents(target);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Manage Assignments
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingRosterBatch(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
