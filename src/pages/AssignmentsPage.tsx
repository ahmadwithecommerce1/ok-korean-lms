import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Plus,
  Trash2,
  Check,
  X,
  Users,
  Calendar,
} from 'lucide-react';
import { AcademyDataService } from '../services/academyDataService';
import { StorageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import {
  AssignmentRecord,
  AssignmentSubmissionEntry,
  AssignmentSubmissionStatus,
  BatchRecord,
  Student,
} from '../types';

export const AssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentRecord[]>(() => AcademyDataService.getAssignments());
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [batches, setBatches] = useState<BatchRecord[]>(() => AcademyDataService.getBatches());
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);

  // New assignment form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseLevel, setCourseLevel] = useState('TOPIK I · Grammar & Writing');
  const [targetType, setTargetType] = useState<'Batch' | 'Student'>('Batch');
  const [targetBatch, setTargetBatch] = useState<string>(() => AcademyDataService.getBatches()[0]?.name || '');
  const [targetStudentId, setTargetStudentId] = useState<string>(students[0]?.id || '');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [maxMarks, setMaxMarks] = useState(20);

  useEffect(() => {
    const u1 = AcademyDataService.subscribeAssignments(setAssignments);
    const u2 = StorageService.subscribeStudents(setStudents);
    const u3 = AcademyDataService.subscribeBatches((liveBatches) => {
      setBatches(liveBatches);
      setTargetBatch((prev) => prev || liveBatches[0]?.name || '');
    });
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  useEffect(() => {
    if (!selectedAssignmentId && assignments.length > 0) {
      setSelectedAssignmentId(assignments[0].id);
    }
  }, [assignments, selectedAssignmentId]);

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId) || null;

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const targetStudents: Student[] =
      targetType === 'Batch'
        ? students.filter((s) => s.batch === targetBatch)
        : students.filter((s) => s.id === targetStudentId);

    const submissions: AssignmentSubmissionEntry[] = targetStudents.map((s) => ({
      studentId: s.id,
      studentRoll: s.rollNumber,
      studentName: s.fullName,
      status: 'Pending',
    }));

    const targetStu = students.find((s) => s.id === targetStudentId);

    const saved = await AcademyDataService.saveAssignment(
      {
        title: title.trim(),
        description: description.trim(),
        courseLevel: courseLevel.trim(),
        targetType,
        targetBatch: targetType === 'Batch' ? targetBatch : undefined,
        targetStudentId: targetType === 'Student' ? targetStudentId : undefined,
        targetStudentName: targetType === 'Student' ? targetStu?.fullName : undefined,
        dueDate,
        maxMarks: Number(maxMarks) || 20,
        submissions,
      },
      user?.name || 'Admin',
      user?.role || 'admin'
    );
    setSelectedAssignmentId(saved.id);
    setTitle('');
    setDescription('');
    setModalOpen(false);
  };

  const handleSubmissionChange = (
    sub: AssignmentSubmissionEntry,
    status: AssignmentSubmissionStatus,
    marks?: number
  ) => {
    if (!selectedAssignment) return;
    AcademyDataService.updateAssignmentSubmission(
      selectedAssignment.id,
      sub.studentId,
      { status, marks: marks ?? sub.marks, remarks: sub.remarks },
      user?.name || 'Admin',
      user?.role || 'admin'
    );
  };

  const assignmentStats = useMemo(() => {
    if (!selectedAssignment) return { total: 0, submitted: 0, graded: 0 };
    const subs = selectedAssignment.submissions || [];
    return {
      total: subs.length,
      submitted: subs.filter((s) => s.status === 'Submitted' || s.status === 'Late' || s.status === 'Graded').length,
      graded: subs.filter((s) => s.status === 'Graded').length,
    };
  }, [selectedAssignment]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-emerald-500" />
            <span>Assignments & Homework Tracker</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Assign Korean writing/reading homework to batches or students and track submissions & grading.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/30 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Assignment</span>
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
          <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No assignments posted yet</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">Create an assignment for a batch or individual student to start tracking homework.</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
          >
            + Post Assignment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Assignments List */}
          <div className="lg:col-span-5 space-y-3">
            {assignments.map((a) => {
              const doneCount = (a.submissions || []).filter((s) => s.status !== 'Pending').length;
              const totalCount = (a.submissions || []).length;
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAssignmentId(a.id)}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border transition-all cursor-pointer ${
                    selectedAssignmentId === a.id
                      ? 'border-emerald-500 ring-1 ring-emerald-500/40'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                        {a.targetType === 'Batch' ? (a.targetBatch || '').split(' (')[0] : a.targetStudentName || 'Student'}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">{a.title}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{a.courseLevel}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete assignment "${a.title}"?`)) {
                          AcademyDataService.deleteAssignment(a.id, user?.name || 'Admin', user?.role || 'admin');
                        }
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" /> Due: {a.dueDate}
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-500">
                      <Users className="w-3.5 h-3.5" /> {doneCount}/{totalCount} Submitted
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submission Grading Table */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-4">
            {selectedAssignment ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{selectedAssignment.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedAssignment.description || 'No additional instructions.'}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-mono font-bold text-emerald-500 block">
                      {assignmentStats.submitted}/{assignmentStats.total} Submitted · {assignmentStats.graded} Graded
                    </span>
                    <span className="text-[11px] text-slate-400">Max Marks: {selectedAssignment.maxMarks}</span>
                  </div>
                </div>

                {selectedAssignment.submissions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    No students currently belong to the selected batch/target.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 uppercase text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Student</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Marks (/ {selectedAssignment.maxMarks})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedAssignment.submissions.map((sub) => (
                          <tr key={sub.studentId}>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 dark:text-white">{sub.studentName}</div>
                              <div className="font-mono text-[10px] text-cyan-500">{sub.studentRoll}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={sub.status}
                                onChange={(e) =>
                                  handleSubmissionChange(sub, e.target.value as AssignmentSubmissionStatus)
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Submitted">Submitted</option>
                                <option value="Late">Late</option>
                                <option value="Graded">Graded</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min={0}
                                max={selectedAssignment.maxMarks}
                                value={sub.marks ?? ''}
                                placeholder="—"
                                onChange={(e) => {
                                  const val = e.target.value === '' ? undefined : Number(e.target.value);
                                  handleSubmissionChange(sub, val !== undefined ? 'Graded' : sub.status, val);
                                }}
                                className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-base">Create Homework / Assignment</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAssignment} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Assignment Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Write 15 Korean sentences using -아/어요"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Assign To</label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value as 'Batch' | 'Student')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Batch">Entire Batch</option>
                    <option value="Student">Individual Student</option>
                  </select>
                </div>
                {targetType === 'Batch' ? (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Batch</label>
                    <select
                      value={targetBatch}
                      onChange={(e) => setTargetBatch(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {batches.length === 0 ? (
                        <option value="">No batches created yet</option>
                      ) : (
                        batches.map((b) => (
                          <option key={b.id} value={b.name}>{b.name} ({b.code})</option>
                        ))
                      )}
                      {targetBatch && !batches.some((b) => b.name === targetBatch) && (
                        <option value={targetBatch}>{targetBatch}</option>
                      )}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Student</label>
                    <select
                      value={targetStudentId}
                      onChange={(e) => setTargetStudentId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{s.fullName} ({s.rollNumber})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Track</label>
                  <input
                    type="text"
                    value={courseLevel}
                    onChange={(e) => setCourseLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Instructions</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Post Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
