import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Plus, 
  Trophy, 
  Medal, 
  Crown, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  BookOpen,
  Filter,
  SlidersHorizontal,
  CheckSquare,
  Square,
  Sparkles
} from 'lucide-react';
import { WeeklyTest, SubjectKey, SubjectConfig } from '../types';
import { StorageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { AddTestModal } from '../components/modals/AddTestModal';

export const TestsPage: React.FC = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState<WeeklyTest[]>(() => StorageService.getTests());
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(tests[0]?.id || null);

  // Live Firestore subscription
  useEffect(() => {
    return StorageService.subscribeTests((liveTests) => {
      setTests(liveTests);
    });
  }, []);

  // Global Column Visibility Toggles in table viewer
  const [visibleColumns, setVisibleColumns] = useState<Record<SubjectKey, boolean>>({
    vocabulary: true,
    grammar: true,
    reading: true,
    sentences: true,
    listeningSpeaking: true,
    mcqs: true,
  });

  const toggleColumn = (key: SubjectKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const refreshTests = () => {
    setTests(StorageService.getTests());
  };

  const handleSaveTest = (testData: Omit<WeeklyTest, 'id'>) => {
    const newTest = StorageService.addTest(testData, user?.name || 'Teacher', user?.role || 'teacher');
    refreshTests();
    setExpandedTestId(newTest.id);
  };

  const handleDeleteTest = (id: string) => {
    if (window.confirm('Are you sure you want to delete this test evaluation?')) {
      StorageService.deleteTest(id, user?.name || 'Teacher', user?.role || 'teacher');
      refreshTests();
    }
  };

  const filteredTests = tests.filter(t => selectedBatchFilter === 'All' || t.batch === selectedBatchFilter);

  // Overall Class Leaderboard (Top 3 across tests)
  const studentBestScores: Record<string, { studentId: string; roll: string; name: string; score: number; max: number; percentage: number; grade: string; batch: string }> = {};

  tests.forEach(t => {
    t.scores.forEach(s => {
      if (!studentBestScores[s.studentId] || s.percentage > studentBestScores[s.studentId].percentage) {
        studentBestScores[s.studentId] = {
          studentId: s.studentId,
          roll: s.studentRoll,
          name: s.studentName,
          score: s.totalScore,
          max: s.maxPossibleScore || t.totalMaxMarks || 100,
          percentage: s.percentage,
          grade: s.grade,
          batch: t.batch.split(' (')[0]
        };
      }
    });
  });

  const leaderboard = Object.values(studentBestScores)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  const columnLabels: { key: SubjectKey; label: string; short: string }[] = [
    { key: 'vocabulary', label: 'Vocabulary', short: 'Vocab' },
    { key: 'grammar', label: 'Grammar', short: 'Grammar' },
    { key: 'reading', label: 'Reading', short: 'Reading' },
    { key: 'sentences', label: 'Sentence Construction', short: 'Sentences' },
    { key: 'listeningSpeaking', label: 'Speaking/Listening', short: 'Spk/List' },
    { key: 'mcqs', label: 'Multiple Choice (MCQs)', short: 'MCQs' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500" />
            <span>Weekly Tests & Examination Grading Hub</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Modular scoring with MCQs, customizable subject maximum marks, and selective column visibility.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Test</span>
        </button>
      </div>

      {/* Class Leaderboard Podium (Top 3) */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white tracking-tight">
              Class Top Performers · TOPIK Excellence
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Top Ranking Students
          </span>
        </div>

        {leaderboard.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No test scores recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leaderboard.map((student, index) => {
              const rankInfo = [
                {
                  label: '1st Place',
                  badge: 'Gold Medal',
                  border: 'border-amber-400/40 bg-amber-500/10',
                  icon: Crown,
                  iconColor: 'text-amber-400',
                  pill: 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                },
                {
                  label: '2nd Place',
                  badge: 'Silver Medal',
                  border: 'border-slate-300/40 bg-slate-400/10',
                  icon: Medal,
                  iconColor: 'text-slate-300',
                  pill: 'bg-slate-300/20 text-slate-200 border-slate-300/40'
                },
                {
                  label: '3rd Place',
                  badge: 'Bronze Medal',
                  border: 'border-amber-700/40 bg-amber-700/10',
                  icon: Award,
                  iconColor: 'text-amber-500',
                  pill: 'bg-amber-700/20 text-amber-300 border-amber-700/40'
                }
              ][index] || {
                label: 'Runner-up',
                badge: 'Merit',
                border: 'border-slate-800',
                icon: Award,
                iconColor: 'text-slate-400',
                pill: 'bg-slate-800 text-slate-300'
              };

              const RankIcon = rankInfo.icon;

              return (
                <div
                  key={student.studentId}
                  className={`p-5 rounded-xl border backdrop-blur-md relative overflow-hidden transition-all hover:scale-[1.01] ${rankInfo.border}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${rankInfo.pill}`}>
                      {rankInfo.badge}
                    </span>
                    <RankIcon className={`w-5 h-5 ${rankInfo.iconColor}`} />
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white tabular-nums">
                      {student.percentage}%
                    </span>
                    <span className="text-xs font-bold text-amber-300">Grade {student.grade}</span>
                  </div>

                  <h4 className="font-bold text-base text-white mt-1 truncate">
                    {student.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                    <span>{student.roll}</span>
                    <span>·</span>
                    <span className="font-sans text-indigo-300">{student.batch}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FILTER & COLUMN VISIBILITY TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Batch Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">Filter Batch:</span>
            <select
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Batches</option>
              <option value="Batch A (Morning 09:00 - 11:00)">Batch A (Morning)</option>
              <option value="Batch B (Afternoon 14:00 - 16:00)">Batch B (Afternoon)</option>
              <option value="Batch C (Evening 18:00 - 20:00)">Batch C (Evening)</option>
              <option value="Batch D (Weekend Intensive)">Weekend Intensive</option>
            </select>
          </div>

          {/* Quick Column Toggles */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Visible Columns:</span>
            </span>
            {columnLabels.map(col => {
              const isChecked = visibleColumns[col.key];
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => toggleColumn(col.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isChecked
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 line-through'
                  }`}
                >
                  <span>{col.short}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Test Evaluations List */}
      <div className="space-y-4">
        {filteredTests.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
            <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">No assessments found</h4>
            <p className="text-xs text-slate-400 mt-1">Click "Record New Test" above to log results with MCQs.</p>
          </div>
        ) : (
          filteredTests.map((test) => {
            const isExpanded = expandedTestId === test.id;
            const testMax = test.totalMaxMarks || 100;
            const avgScore = test.scores.length > 0 
              ? Math.round(test.scores.reduce((acc, s) => acc + s.percentage, 0) / test.scores.length)
              : 0;
            const highestScore = test.scores.length > 0 
              ? Math.max(...test.scores.map(s => s.percentage))
              : 0;

            // Subjects defined in this test, or fallback to default
            const currentSubConfigs: SubjectConfig[] = test.subjectsConfig || [
              { key: 'vocabulary', label: 'Vocabulary', shortLabel: 'Vocab', enabled: true, maxMarks: 20 },
              { key: 'grammar', label: 'Grammar', shortLabel: 'Grammar', enabled: true, maxMarks: 20 },
              { key: 'reading', label: 'Reading', shortLabel: 'Reading', enabled: true, maxMarks: 20 },
              { key: 'sentences', label: 'Sentence Construction', shortLabel: 'Sentences', enabled: true, maxMarks: 20 },
              { key: 'listeningSpeaking', label: 'Speaking / Listening', shortLabel: 'Spk/List', enabled: true, maxMarks: 20 },
              { key: 'mcqs', label: 'Multiple Choice Questions (MCQs)', shortLabel: 'MCQs', enabled: true, maxMarks: 20 },
            ];

            // Render columns that are enabled in this test AND toggled visible by user
            const activeColumns = currentSubConfigs.filter(s => s.enabled && visibleColumns[s.key]);

            return (
              <div
                key={test.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all"
              >
                {/* Accordion Header */}
                <div
                  onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <span>{test.testTitle}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          Max: {testMax} Pts
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{test.topicCovered}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{test.batch.split(' (')[0]}</span>
                        <span>·</span>
                        <span>{test.date}</span>
                        <span>·</span>
                        <span>{test.scores.length} Candidates Evaluated</span>
                      </div>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="flex items-center gap-4 self-end md:self-auto shrink-0">
                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Class Average</div>
                      <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tabular-nums">{avgScore}%</div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Top Mark</div>
                      <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{highestScore}%</div>
                    </div>

                    <div className="pl-2 border-l border-slate-200 dark:border-slate-800 flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTest(test.id);
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Assessment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Table */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                      <table className="w-full text-xs text-left min-w-[650px]">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-2.5 px-3">Roll No</th>
                            <th className="py-2.5 px-3">Student Name</th>
                            {activeColumns.map(col => (
                              <th key={col.key} className="py-2.5 px-2 text-center whitespace-nowrap">
                                {col.shortLabel} <span className="text-slate-500 dark:text-slate-400 font-normal">({col.maxMarks})</span>
                              </th>
                            ))}
                            <th className="py-2.5 px-3 text-center whitespace-nowrap">
                              Total Obtained ({testMax})
                            </th>
                            <th className="py-2.5 px-2 text-center">Percentage</th>
                            <th className="py-2.5 px-3 text-center">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {[...test.scores]
                            .sort((a, b) => b.totalScore - a.totalScore)
                            .map((score, rank) => (
                              <tr key={score.studentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-600 dark:text-slate-400 tabular-nums">
                                  {score.studentRoll}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                                  <div className="flex items-center gap-1.5">
                                    {rank === 0 && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                                    <span>{score.studentName}</span>
                                  </div>
                                </td>

                                {/* Active columns values */}
                                {activeColumns.map(col => {
                                  const val = typeof score[col.key] === 'number' ? (score[col.key] as number) : 0;
                                  return (
                                    <td key={col.key} className="py-2 px-2 text-center tabular-nums text-slate-800 dark:text-slate-200 font-semibold">
                                      {val}
                                    </td>
                                  );
                                })}

                                <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white tabular-nums">
                                  {score.totalScore} / {score.maxPossibleScore || testMax}
                                </td>

                                <td className="py-2.5 px-2 text-center font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                                  {score.percentage}%
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black ${
                                    score.grade === 'A+' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                    score.grade === 'A' ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' :
                                    score.grade === 'B' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                                    score.grade === 'C' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                    'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  }`}>
                                    {score.grade}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Test Modal */}
      <AddTestModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveTest}
      />
    </div>
  );
};
