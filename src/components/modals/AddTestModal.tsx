import React, { useState, useEffect } from 'react';
import { X, Award, Check, AlertCircle, Sliders } from 'lucide-react';
import { WeeklyTest, TestScore, StudentBatch, SubjectConfig, SubjectKey } from '../../types';
import { StorageService } from '../../services/storageService';

interface AddTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (test: Omit<WeeklyTest, 'id'>) => void;
}

const BATCH_OPTIONS: StudentBatch[] = [
  'Batch A (Morning 09:00 - 11:00)',
  'Batch B (Afternoon 14:00 - 16:00)',
  'Batch C (Evening 18:00 - 20:00)',
  'Batch D (Weekend Intensive)',
];

function calculateGrade(percentage: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

export const AddTestModal: React.FC<AddTestModalProps> = ({ isOpen, onClose, onSave }) => {
  const [testTitle, setTestTitle] = useState('Weekly Assessment 7 - Korean Sentence Structure & MCQs');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [batch, setBatch] = useState<StudentBatch>(BATCH_OPTIONS[0]);
  const [topicCovered, setTopicCovered] = useState('Basic SOV sentence construction, honorific particles, reading comprehension, and 20 MCQs.');

  // Subject Column Configurations: Vocab -> Grammar -> Reading -> Sentences -> Spk/List -> MCQs
  const [subjects, setSubjects] = useState<SubjectConfig[]>([
    { key: 'vocabulary', label: 'Vocabulary', shortLabel: 'Vocab', enabled: true, maxMarks: 15 },
    { key: 'grammar', label: 'Grammar', shortLabel: 'Grammar', enabled: true, maxMarks: 15 },
    { key: 'reading', label: 'Reading', shortLabel: 'Reading', enabled: true, maxMarks: 20 },
    { key: 'sentences', label: 'Sentence Construction', shortLabel: 'Sentences', enabled: true, maxMarks: 20 },
    { key: 'listeningSpeaking', label: 'Speaking / Listening', shortLabel: 'Spk/List', enabled: true, maxMarks: 15 },
    { key: 'mcqs', label: 'Multiple Choice Questions (MCQs)', shortLabel: 'MCQs', enabled: true, maxMarks: 15 },
  ]);

  const [scores, setScores] = useState<TestScore[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Enabled subjects preserving exact order
  const enabledSubjects = subjects.filter(s => s.enabled);
  const totalMaxMarks = enabledSubjects.reduce((acc, s) => acc + (s.maxMarks || 0), 0);

  // Helper to calculate student total, percentage, grade
  const computeStudentStats = (score: Partial<TestScore>, currentSubjects: SubjectConfig[]) => {
    const activeSubs = currentSubjects.filter(s => s.enabled);
    const maxPossible = activeSubs.reduce((acc, s) => acc + (s.maxMarks || 0), 0);
    
    let obtainedTotal = 0;
    activeSubs.forEach(sub => {
      const val = (score[sub.key] as number) || 0;
      obtainedTotal += val;
    });

    const pct = maxPossible > 0 ? Math.round((obtainedTotal / maxPossible) * 100) : 0;
    return {
      totalScore: obtainedTotal,
      maxPossibleScore: maxPossible,
      percentage: pct,
      grade: calculateGrade(pct),
    };
  };

  // Re-initialize or load students for this batch
  useEffect(() => {
    if (!isOpen) return;
    const students = StorageService.getStudents().filter(s => s.batch === batch && s.status !== 'Inactive');
    
    const initialScores: TestScore[] = students.map(s => {
      const baseScore: Partial<TestScore> = {
        studentId: s.id,
        studentRoll: s.rollNumber,
        studentName: s.fullName,
        vocabulary: 13,
        grammar: 13,
        reading: 18,
        sentences: 18,
        listeningSpeaking: 13,
        mcqs: 13,
      };
      const stats = computeStudentStats(baseScore, subjects);
      return {
        ...baseScore,
        ...stats,
      } as TestScore;
    });

    setScores(initialScores);
    setError(null);
  }, [batch, isOpen]);

  if (!isOpen) return null;

  // Toggle subject column
  const handleToggleSubject = (key: SubjectKey) => {
    const updated = subjects.map(s => {
      if (s.key === key) {
        const nextEnabled = !s.enabled;
        return {
          ...s,
          enabled: nextEnabled,
          maxMarks: nextEnabled && s.maxMarks === 0 ? 20 : s.maxMarks,
        };
      }
      return s;
    });
    setSubjects(updated);

    setScores(prev => prev.map(score => {
      const stats = computeStudentStats(score, updated);
      return { ...score, ...stats };
    }));
  };

  // Update subject max marks
  const handleUpdateSubjectMax = (key: SubjectKey, newMax: number) => {
    const val = Math.max(1, Number.isNaN(newMax) ? 1 : newMax);
    const updated = subjects.map(s => s.key === key ? { ...s, maxMarks: val } : s);
    setSubjects(updated);

    setScores(prev => prev.map(score => {
      const clampedScore = { ...score };
      if (typeof clampedScore[key] === 'number' && (clampedScore[key] as number) > val) {
        clampedScore[key] = val;
      }
      const stats = computeStudentStats(clampedScore, updated);
      return { ...clampedScore, ...stats };
    }));
  };

  // Handle score change for individual student
  const handleScoreChange = (studentId: string, field: SubjectKey, val: number) => {
    const subjectCfg = subjects.find(s => s.key === field);
    const maxVal = subjectCfg ? subjectCfg.maxMarks : 100;
    const clampedVal = Math.max(0, Math.min(maxVal, Number.isNaN(val) ? 0 : val));

    setScores(prev => prev.map(s => {
      if (s.studentId !== studentId) return s;
      const updated = { ...s, [field]: clampedVal };
      const stats = computeStudentStats(updated, subjects);
      return { ...updated, ...stats };
    }));
  };

  // Quick Preset buttons
  const applyPreset = (presetType: 'all6' | 'mcq_only' | 'core_sentences_mcq' | 'topik_standard') => {
    let newSubjects: SubjectConfig[];
    if (presetType === 'all6') {
      newSubjects = subjects.map(s => ({
        ...s,
        enabled: true,
        maxMarks: s.key === 'reading' || s.key === 'sentences' ? 20 : 15
      }));
    } else if (presetType === 'mcq_only') {
      newSubjects = subjects.map(s => ({ ...s, enabled: s.key === 'mcqs', maxMarks: s.key === 'mcqs' ? 100 : 0 }));
    } else if (presetType === 'core_sentences_mcq') {
      newSubjects = subjects.map(s => {
        if (s.key === 'vocabulary') return { ...s, enabled: true, maxMarks: 20 };
        if (s.key === 'grammar') return { ...s, enabled: true, maxMarks: 20 };
        if (s.key === 'sentences') return { ...s, enabled: true, maxMarks: 30 };
        if (s.key === 'mcqs') return { ...s, enabled: true, maxMarks: 30 };
        return { ...s, enabled: false, maxMarks: 0 };
      });
    } else {
      // TOPIK 5-Pillars without MCQs (20 ea = 100)
      newSubjects = subjects.map(s => {
        if (s.key === 'mcqs') return { ...s, enabled: false, maxMarks: 0 };
        return { ...s, enabled: true, maxMarks: 20 };
      });
    }

    setSubjects(newSubjects);
    setScores(prev => prev.map(score => {
      const stats = computeStudentStats(score, newSubjects);
      return { ...score, ...stats };
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTitle.trim()) {
      setError('Test Title is required.');
      return;
    }
    if (enabledSubjects.length === 0) {
      setError('Please enable at least one subject column (e.g. Sentences, Reading, Vocab, etc.).');
      return;
    }
    if (totalMaxMarks <= 0) {
      setError('Total exam marks must be greater than zero.');
      return;
    }
    if (scores.length === 0) {
      setError('Selected batch has no enrolled students.');
      return;
    }

    const monthStr = new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    onSave({
      testTitle: testTitle.trim(),
      date,
      month: monthStr,
      batch,
      topicCovered: topicCovered.trim(),
      subjectsConfig: subjects,
      totalMaxMarks,
      scores,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-fadeIn flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 sm:px-8 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-900 font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>Record Examination Marks</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 font-mono font-bold">
                  Total Max: {totalMaxMarks} Pts
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Customizable subjects including Sentences & MCQs with automatic percentage and grade calculation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body with proper padding & internal scroll */}
        <form onSubmit={handleSubmit} className="p-6 sm:px-8 space-y-6 text-xs overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Test Meta Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assessment Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="e.g. Assessment 7 - Hangul Sentences & MCQs"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Exam Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Batch <span className="text-rose-500">*</span>
              </label>
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value as StudentBatch)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
              >
                {BATCH_OPTIONS.map(b => (
                  <option key={b} value={b} className="bg-slate-900 text-slate-100">{b}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Exam Syllabus & Topic Covered
              </label>
              <input
                type="text"
                value={topicCovered}
                onChange={(e) => setTopicCovered(e.target.value)}
                placeholder="e.g. Sentence construction, grammatical markers, reading comprehension, and TOPIK MCQs"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>
          </div>

          {/* CUSTOMIZABLE SUBJECTS & COLUMN SELECTION PANEL */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  Customize Subject Columns & Total Maximum Marks
                </span>
              </div>

              {/* Quick Presets (High-contrast in both Dark and Light modes) */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyPreset('all6')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-[11px] font-bold text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
                >
                  All 6 Subjects
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('mcq_only')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-[11px] font-bold text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
                >
                  MCQs Only (100 pts)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('core_sentences_mcq')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-[11px] font-bold text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
                >
                  Sentences + MCQs Focus
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('topik_standard')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-[11px] font-bold text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
                >
                  TOPIK Standard
                </button>
              </div>
            </div>

            {/* Subject Checkboxes and Max Marks Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
              {subjects.map(sub => (
                <div
                  key={sub.key}
                  className={`p-3 rounded-xl border transition-all ${
                    sub.enabled
                      ? 'bg-white dark:bg-slate-800 border-indigo-400 dark:border-indigo-600 shadow-xs'
                      : 'bg-slate-200/50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label 
                      onClick={() => handleToggleSubject(sub.key)}
                      className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-900 dark:text-white select-none"
                    >
                      <input
                        type="checkbox"
                        checked={sub.enabled}
                        onChange={() => {}}
                        className="rounded text-indigo-600 accent-indigo-600"
                      />
                      <span>{sub.shortLabel}</span>
                    </label>

                    {sub.key === 'sentences' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        NEW
                      </span>
                    )}
                  </div>

                  {sub.enabled ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">Max:</span>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={sub.maxMarks}
                        onChange={(e) => handleUpdateSubjectMax(sub.key, parseInt(e.target.value))}
                        className="w-16 px-1.5 py-1 text-center font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-indigo-500 shadow-inner"
                      />
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Disabled</span>
                  )}
                </div>
              ))}
            </div>

            {/* Total Indicator */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs pt-2.5 border-t border-slate-200 dark:border-slate-700 font-semibold">
              <span className="text-slate-700 dark:text-slate-300">
                Active Columns: <strong className="text-indigo-600 dark:text-indigo-400">{enabledSubjects.map(s => s.shortLabel).join(', ')}</strong>
              </span>
              <span className="text-slate-900 dark:text-white font-mono">
                Total Exam Maximum Marks: <strong className="text-base text-indigo-600 dark:text-indigo-400">{totalMaxMarks}</strong> Pts
              </span>
            </div>
          </div>

          {/* STUDENT MARKS ENTRY TABLE (Strict column order: Student Name | Vocab | Grammar | Reading | Sentences | Spk/List | MCQs | Total) */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                Candidate Obtained Marks Entry ({scores.length} Students)
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                Enter obtained marks per subject; Total, % and Grade calculate automatically
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-[360px] overflow-y-auto shadow-xs">
              <div className="overflow-x-auto">
                {scores.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
                    No active students enrolled in this batch. Please select another batch.
                  </div>
                ) : (
                  <table className="w-full text-xs text-left min-w-[760px]">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-3.5 whitespace-nowrap">Student Name</th>
                        {/* Dynamic Subject Columns in exact order */}
                        {enabledSubjects.map(sub => (
                          <th key={sub.key} className="py-3 px-2 text-center whitespace-nowrap">
                            {sub.shortLabel} <span className="text-slate-500 dark:text-slate-400 font-normal">({sub.maxMarks})</span>
                          </th>
                        ))}
                        <th className="py-3 px-3 text-center whitespace-nowrap">
                          Total Obtained <span className="text-slate-500 dark:text-slate-400 font-normal">({totalMaxMarks})</span>
                        </th>
                        <th className="py-3 px-2 text-center whitespace-nowrap">Percentage</th>
                        <th className="py-3 px-3 text-center whitespace-nowrap">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {scores.map((s) => (
                        <tr key={s.studentId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                          {/* Student Name */}
                          <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                            <div>{s.studentName}</div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{s.studentRoll}</span>
                          </td>

                          {/* Dynamic Enabled Subjects inputs */}
                          {enabledSubjects.map(sub => {
                            const currentVal = typeof s[sub.key] === 'number' ? (s[sub.key] as number) : 0;
                            return (
                              <td key={sub.key} className="py-2 px-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={sub.maxMarks}
                                  value={currentVal}
                                  onChange={(e) => handleScoreChange(s.studentId, sub.key, parseInt(e.target.value))}
                                  className="w-14 sm:w-16 px-1.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-center font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 shadow-xs"
                                />
                              </td>
                            );
                          })}

                          {/* Total Obtained */}
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                            {s.totalScore} / {totalMaxMarks}
                          </td>

                          {/* Percentage */}
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums whitespace-nowrap">
                            {s.percentage}%
                          </td>

                          {/* Grade */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black ${
                              s.grade === 'A+' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                              s.grade === 'A' ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' :
                              s.grade === 'B' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                              s.grade === 'C' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                              'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                              {s.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save & Publish Examination Results</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
