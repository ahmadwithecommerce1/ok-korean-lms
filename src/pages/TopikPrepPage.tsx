import React, { useEffect, useMemo, useState } from 'react';
import {
  GraduationCap,
  Plus,
  Trash2,
  BookMarked,
  Award,
  Check,
  X,
  Search,
} from 'lucide-react';
import { AcademyDataService } from '../services/academyDataService';
import { StorageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { Student, TopikPracticeTest, TopikResource } from '../types';

export const TopikPrepPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'resources' | 'mocks'>('resources');
  const [resources, setResources] = useState<TopikResource[]>(() => AcademyDataService.getTopikResources());
  const [mockTests, setMockTests] = useState<TopikPracticeTest[]>(() => AcademyDataService.getTopikPracticeTests());
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());

  const [levelFilter, setLevelFilter] = useState<'All' | 'TOPIK I' | 'TOPIK II'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Resource modal
  const [resModalOpen, setResModalOpen] = useState(false);
  const [topikLevel, setTopikLevel] = useState<'TOPIK I' | 'TOPIK II'>('TOPIK I');
  const [resCategory, setResCategory] = useState<TopikResource['category']>('Vocabulary');
  const [koreanTerm, setKoreanTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const [grammarPattern, setGrammarPattern] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');

  // Mock test modal
  const [mockModalOpen, setMockModalOpen] = useState(false);
  const [mockTitle, setMockTitle] = useState('');
  const [mockSection, setMockSection] = useState<TopikPracticeTest['section']>('Full Mock');
  const [mockDate, setMockDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [durationMinutes, setDurationMinutes] = useState(100);
  const [totalMarks, setTotalMarks] = useState(200);
  const [passingScore, setPassingScore] = useState(140);
  const [questionsCount, setQuestionsCount] = useState(70);

  // Record score modal
  const [scoreTest, setScoreTest] = useState<TopikPracticeTest | null>(null);
  const [attemptStudentId, setAttemptStudentId] = useState(students[0]?.id || '');
  const [attemptScore, setAttemptScore] = useState(150);

  useEffect(() => {
    const u1 = AcademyDataService.subscribeTopikResources(setResources);
    const u2 = AcademyDataService.subscribeTopikPracticeTests(setMockTests);
    const u3 = StorageService.subscribeStudents(setStudents);
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  const filteredResources = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return resources.filter((r) => {
      if (levelFilter !== 'All' && r.topikLevel !== levelFilter) return false;
      if (!q) return true;
      return (
        r.koreanTerm.toLowerCase().includes(q) ||
        r.meaning.toLowerCase().includes(q) ||
        (r.grammarPattern || '').toLowerCase().includes(q)
      );
    });
  }, [resources, levelFilter, searchQuery]);

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!koreanTerm.trim() || !meaning.trim()) return;
    await AcademyDataService.saveTopikResource(
      {
        topikLevel,
        category: resCategory,
        koreanTerm: koreanTerm.trim(),
        meaning: meaning.trim(),
        grammarPattern: grammarPattern.trim() || undefined,
        exampleSentence: exampleSentence.trim() || undefined,
      },
      user?.name || 'Admin',
      user?.role || 'admin'
    );
    setKoreanTerm('');
    setMeaning('');
    setGrammarPattern('');
    setExampleSentence('');
    setResModalOpen(false);
  };

  const handleSaveMockTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockTitle.trim()) return;
    await AcademyDataService.saveTopikPracticeTest(
      {
        title: mockTitle.trim(),
        topikLevel,
        section: mockSection,
        date: mockDate,
        durationMinutes: Number(durationMinutes) || 100,
        totalMarks: Number(totalMarks) || 200,
        passingScore: Number(passingScore) || 140,
        questionsCount: Number(questionsCount) || 70,
        results: [],
      },
      user?.name || 'Admin',
      user?.role || 'admin'
    );
    setMockTitle('');
    setMockModalOpen(false);
  };

  const handleRecordAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoreTest) return;
    const stu = students.find((s) => s.id === attemptStudentId);
    if (!stu) return;
    const numericScore = Number(attemptScore) || 0;
    await AcademyDataService.recordTopikMockAttempt(
      scoreTest.id,
      {
        studentId: stu.id,
        studentRoll: stu.rollNumber,
        studentName: stu.fullName,
        score: numericScore,
        maxScore: scoreTest.totalMarks,
        passed: numericScore >= scoreTest.passingScore,
        date: new Date().toISOString().split('T')[0],
      },
      user?.name || 'Admin',
      user?.role || 'admin'
    );
    setScoreTest(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-emerald-500" />
            <span>TOPIK I & TOPIK II Preparation</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Curated Korean vocabulary/grammar drills, exam strategies, and practice mock test scoreboards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              activeTab === 'resources'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Vocab & Grammar ({resources.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mocks')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              activeTab === 'mocks'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Practice Mock Tests ({mockTests.length})
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Hangul term, English meaning, or grammar pattern..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
          >
            <option value="All">All Levels</option>
            <option value="TOPIK I">TOPIK I</option>
            <option value="TOPIK II">TOPIK II</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => (activeTab === 'resources' ? setResModalOpen(true) : setMockModalOpen(true))}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{activeTab === 'resources' ? 'Add Vocab / Grammar' : 'Create Practice Test'}</span>
        </button>
      </div>

      {activeTab === 'resources' ? (
        filteredResources.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
            <BookMarked className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No TOPIK study items added yet</h3>
            <p className="text-xs text-slate-400 mt-1">Build your TOPIK I & II vocabulary and grammar bank.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((r) => (
              <div
                key={r.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 text-[10px] font-bold">
                      {r.topikLevel}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 text-[10px] font-bold">
                      {r.category}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => AcademyDataService.deleteTopikResource(r.id, user?.name || 'Admin', user?.role || 'admin')}
                    className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{r.koreanTerm}</h3>
                <p className="text-xs font-semibold text-cyan-500">{r.meaning}</p>
                {r.grammarPattern && <p className="text-[11px] font-mono text-slate-400">Pattern: {r.grammarPattern}</p>}
                {r.exampleSentence && (
                  <p className="text-xs text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                    {r.exampleSentence}
                  </p>
                )}
              </div>
            ))}
          </div>
        )
      ) : mockTests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
          <Award className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No TOPIK mock tests created yet</h3>
          <p className="text-xs text-slate-400 mt-1">Create TOPIK Reading, Listening, Writing, or Full Mock evaluations.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mockTests.map((mt) => (
            <div
              key={mt.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 text-[10px] font-bold">
                      {mt.topikLevel}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 text-[10px] font-bold">
                      {mt.section}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{mt.date}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">{mt.title}</h3>
                  <p className="text-xs text-slate-400">
                    {mt.questionsCount} Questions · {mt.durationMinutes} mins · Pass: {mt.passingScore}/{mt.totalMarks}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScoreTest(mt);
                      setAttemptStudentId(students[0]?.id || '');
                      setAttemptScore(mt.passingScore);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                  >
                    + Record Student Score
                  </button>
                  <button
                    type="button"
                    onClick={() => AcademyDataService.deleteTopikPracticeTest(mt.id, user?.name || 'Admin', user?.role || 'admin')}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {(mt.results || []).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {mt.results.map((res) => (
                    <div
                      key={res.studentId}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{res.studentName}</span>
                        <span className="font-mono text-[10px] text-slate-400">{res.studentRoll}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900 dark:text-white block">
                          {res.score}/{res.maxScore}
                        </span>
                        <span className={`text-[10px] font-bold ${res.passed ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {res.passed ? 'Passed' : 'Below Cut-off'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resource Modal */}
      {resModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-base">Add TOPIK Study Item</h3>
              <button type="button" onClick={() => setResModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveResource} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">TOPIK Level</label>
                  <select
                    value={topikLevel}
                    onChange={(e) => setTopikLevel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="TOPIK I">TOPIK I</option>
                    <option value="TOPIK II">TOPIK II</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <select
                    value={resCategory}
                    onChange={(e) => setResCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Vocabulary">Vocabulary</option>
                    <option value="Grammar">Grammar</option>
                    <option value="Reading Strategy">Reading Strategy</option>
                    <option value="Listening Strategy">Listening Strategy</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Korean Term / Expression *</label>
                <input
                  type="text"
                  required
                  value={koreanTerm}
                  onChange={(e) => setKoreanTerm(e.target.value)}
                  placeholder="e.g. 결정하다 / -기 때문에"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Meaning / Explanation *</label>
                <input
                  type="text"
                  required
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                  placeholder="e.g. To decide / Because of ~"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Example Sentence</label>
                <textarea
                  rows={2}
                  value={exampleSentence}
                  onChange={(e) => setExampleSentence(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setResModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold flex items-center gap-1 cursor-pointer">
                  <Check className="w-4 h-4" /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mock Test Modal */}
      {mockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-base">Create TOPIK Practice Test</h3>
              <button type="button" onClick={() => setMockModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMockTest} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Mock Test Title *</label>
                <input
                  type="text"
                  required
                  value={mockTitle}
                  onChange={(e) => setMockTitle(e.target.value)}
                  placeholder="e.g. 96th TOPIK I Full Practice Simulation"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">TOPIK Level</label>
                  <select
                    value={topikLevel}
                    onChange={(e) => setTopikLevel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="TOPIK I">TOPIK I</option>
                    <option value="TOPIK II">TOPIK II</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Section</label>
                  <select
                    value={mockSection}
                    onChange={(e) => setMockSection(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Full Mock">Full Mock</option>
                    <option value="Reading">Reading</option>
                    <option value="Listening">Listening</option>
                    <option value="Writing">Writing</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value) || 100)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Passing Cut-Off</label>
                  <input
                    type="number"
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value) || 60)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value) || 60)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Questions</label>
                  <input
                    type="number"
                    value={questionsCount}
                    onChange={(e) => setQuestionsCount(Number(e.target.value) || 50)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setMockModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer">
                  Create Mock Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Score Modal */}
      {scoreTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-sm">Record Score · {scoreTest.title}</h3>
              <button type="button" onClick={() => setScoreTest(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRecordAttempt} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Student</label>
                <select
                  value={attemptStudentId}
                  onChange={(e) => setAttemptStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.fullName} ({s.rollNumber})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Score (Max: {scoreTest.totalMarks})</label>
                <input
                  type="number"
                  min={0}
                  max={scoreTest.totalMarks}
                  value={attemptScore}
                  onChange={(e) => setAttemptScore(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setScoreTest(null)} className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer">
                  Save Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
