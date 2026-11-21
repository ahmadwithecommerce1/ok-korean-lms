import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit3,
  Trash2,
  Clock,
  Check,
  X,
  ListChecks,
  AlertCircle,
} from 'lucide-react';
import { AcademyDataService } from '../services/academyDataService';
import { StorageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { CourseRecord, StudentLevel, SyllabusWeekItem, TeacherAccount } from '../types';

const LEVELS: StudentLevel[] = [
  'Level 1 - Beginner (TOPIK I)',
  'Level 2 - Elementary (TOPIK I)',
  'Level 3 - Intermediate (TOPIK II)',
  'Level 4 - Upper-Intermediate (TOPIK II)',
  'Level 5 - Advanced (TOPIK II)',
];

export const CoursesCurriculumPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [courses, setCourses] = useState<CourseRecord[]>(() => AcademyDataService.getCourses());
  const [teachers, setTeachers] = useState<TeacherAccount[]>(() => StorageService.getTeacherAccounts());

  const [searchQuery, setSearchQuery] = useState('');
  const [trackFilter, setTrackFilter] = useState<string>('All');
  const [selectedCourse, setSelectedCourse] = useState<CourseRecord | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [level, setLevel] = useState<string>(LEVELS[0]);
  const [topikTrack, setTopikTrack] = useState<CourseRecord['topikTrack']>('TOPIK I');
  const [durationWeeks, setDurationWeeks] = useState(12);
  const [totalHours, setTotalHours] = useState(72);
  const [tuitionFee, setTuitionFee] = useState(25000);
  const [instructorName, setInstructorName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CourseRecord['status']>('Active');
  const [syllabus, setSyllabus] = useState<SyllabusWeekItem[]>([
    { week: 1, topic: 'Hangul Vowels & Consonants', grammarPoints: 'Basic Syllable Blocks', vocabularyTarget: '40 Core Words' },
  ]);

  useEffect(() => {
    const u1 = AcademyDataService.subscribeCourses(setCourses);
    const u2 = StorageService.subscribeTeachers(setTeachers);
    return () => {
      u1();
      u2();
    };
  }, []);

  const openCreateModal = () => {
    setEditingCourse(null);
    setTitle('');
    setCode(`KOR-${100 + courses.length + 1}`);
    setLevel(LEVELS[0]);
    setTopikTrack('TOPIK I');
    setDurationWeeks(12);
    setTotalHours(72);
    setTuitionFee(25000);
    setInstructorName(teachers[0]?.name || '');
    setDescription('');
    setStatus('Active');
    setSyllabus([{ week: 1, topic: '', grammarPoints: '', vocabularyTarget: '' }]);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (c: CourseRecord) => {
    setEditingCourse(c);
    setTitle(c.title);
    setCode(c.code);
    setLevel(c.level);
    setTopikTrack(c.topikTrack);
    setDurationWeeks(c.durationWeeks);
    setTotalHours(c.totalHours);
    setTuitionFee(c.tuitionFee);
    setInstructorName(c.instructorName || '');
    setDescription(c.description);
    setStatus(c.status);
    setSyllabus(c.syllabus?.length ? c.syllabus : [{ week: 1, topic: '', grammarPoints: '', vocabularyTarget: '' }]);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const addSyllabusWeek = () => {
    setSyllabus((prev) => [
      ...prev,
      { week: prev.length + 1, topic: '', grammarPoints: '', vocabularyTarget: '' },
    ]);
  };

  const updateSyllabusItem = (idx: number, field: keyof SyllabusWeekItem, val: string | number) => {
    setSyllabus((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item)));
  };

  const removeSyllabusItem = (idx: number) => {
    setSyllabus((prev) => prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, week: i + 1 })));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const saved = await AcademyDataService.saveCourse(
        {
          id: editingCourse?.id,
          createdAt: editingCourse?.createdAt,
          title: title.trim(),
          code: code.trim(),
          level,
          topikTrack,
          durationWeeks: Number(durationWeeks) || 12,
          totalHours: Number(totalHours) || 60,
          tuitionFee: Number(tuitionFee) || 0,
          instructorName: instructorName.trim() || undefined,
          description: description.trim(),
          syllabus: syllabus.filter((s) => s.topic.trim() || s.grammarPoints.trim()),
          status,
        },
        user?.name || 'Admin',
        user?.role || 'admin'
      );
      setSelectedCourse(saved);
      setModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to save course.');
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return courses.filter((c) => {
      if (trackFilter !== 'All' && c.topikTrack !== trackFilter) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.instructorName || '').toLowerCase().includes(q)
      );
    });
  }, [courses, searchQuery, trackFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-500" />
            <span>Courses & Korean Curriculum</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage TOPIK I, TOPIK II, EPS-TOPIK courses, tuition structure, and weekly syllabus roadmaps.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/30 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Course</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses by title, code, or instructor..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
          />
        </div>
        <select
          value={trackFilter}
          onChange={(e) => setTrackFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
        >
          <option value="All">All Tracks</option>
          <option value="TOPIK I">TOPIK I</option>
          <option value="TOPIK II">TOPIK II</option>
          <option value="EPS-TOPIK">EPS-TOPIK</option>
          <option value="General Korean">General Korean</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No courses defined yet</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">Create structured Korean courses with weekly syllabus topics.</p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
          >
            + Add Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-3">
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCourse(c)}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all cursor-pointer ${
                  selectedCourse?.id === c.id
                    ? 'border-emerald-500 ring-1 ring-emerald-500/40'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-500 border border-cyan-500/30 font-mono text-[10px] font-bold">
                        {c.code}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold">
                        {c.topikTrack}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'Active' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-slate-500/15 text-slate-400'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">{c.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{c.level}</p>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => openEditModal(c)}
                      className="p-2 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete course "${c.title}"?`)) {
                            AcademyDataService.deleteCourse(c.id, user?.name || 'Admin', user?.role || 'admin');
                            if (selectedCourse?.id === c.id) setSelectedCourse(null);
                          }
                        }}
                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" /> {c.durationWeeks} Weeks · {c.totalHours} Hrs
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    Rs. {c.tuitionFee.toLocaleString()} PKR
                  </span>
                  <span>{c.syllabus?.length || 0} Syllabus Weeks</span>
                </div>
              </div>
            ))}
          </div>

          {/* Syllabus Details Panel */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 h-fit">
            {selectedCourse ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Syllabus Breakdown</span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{selectedCourse.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{selectedCourse.description || 'No description added.'}</p>
                </div>

                {(!selectedCourse.syllabus || selectedCourse.syllabus.length === 0) ? (
                  <p className="text-xs text-slate-400 py-4">No weekly syllabus items configured yet. Click edit to build weeks.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {selectedCourse.syllabus.map((wk) => (
                      <div key={wk.week} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 text-xs">
                        <span className="font-mono text-[10px] font-bold text-cyan-500">WEEK {wk.week}</span>
                        <h4 className="font-bold text-slate-900 dark:text-white mt-0.5">{wk.topic}</h4>
                        {wk.grammarPoints && <p className="text-slate-500 dark:text-slate-300 mt-1">Grammar: {wk.grammarPoints}</p>}
                        {wk.vocabularyTarget && <p className="text-emerald-500 text-[11px] mt-0.5">Vocab: {wk.vocabularyTarget}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                <ListChecks className="w-9 h-9 mx-auto mb-2 opacity-40" />
                Select a course card to inspect its weekly syllabus curriculum.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Course Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <h3 className="font-bold text-base">{editingCourse ? 'Edit Course & Syllabus' : 'Create Korean Course'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Course Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. EPS-TOPIK Mastery Track"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">TOPIK Track</label>
                  <select
                    value={topikTrack}
                    onChange={(e) => setTopikTrack(e.target.value as CourseRecord['topikTrack'])}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="TOPIK I">TOPIK I</option>
                    <option value="TOPIK II">TOPIK II</option>
                    <option value="EPS-TOPIK">EPS-TOPIK</option>
                    <option value="General Korean">General Korean</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Level</label>
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
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Duration (Weeks)</label>
                  <input
                    type="number"
                    min={1}
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tuition Fee (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={tuitionFee}
                    onChange={(e) => setTuitionFee(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Contact Hours</label>
                  <input
                    type="number"
                    min={1}
                    value={totalHours}
                    onChange={(e) => setTotalHours(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Lead Instructor</label>
                  <input
                    type="text"
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Course Overview</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Weekly Syllabus Builder */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Weekly Syllabus Outline</span>
                  <button
                    type="button"
                    onClick={addSyllabusWeek}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 font-bold text-[11px] cursor-pointer"
                  >
                    + Add Week
                  </button>
                </div>
                {syllabus.map((wk, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="sm:col-span-1 font-mono font-bold text-cyan-500 flex items-center">W{wk.week}</div>
                    <input
                      type="text"
                      placeholder="Topic"
                      value={wk.topic}
                      onChange={(e) => updateSyllabusItem(idx, 'topic', e.target.value)}
                      className="sm:col-span-4 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      placeholder="Grammar Points"
                      value={wk.grammarPoints}
                      onChange={(e) => updateSyllabusItem(idx, 'grammarPoints', e.target.value)}
                      className="sm:col-span-4 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      placeholder="Vocab Target"
                      value={wk.vocabularyTarget}
                      onChange={(e) => updateSyllabusItem(idx, 'vocabularyTarget', e.target.value)}
                      className="sm:col-span-2 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => removeSyllabusItem(idx)}
                      className="sm:col-span-1 text-rose-500 hover:bg-rose-500/10 rounded-lg flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Course</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
