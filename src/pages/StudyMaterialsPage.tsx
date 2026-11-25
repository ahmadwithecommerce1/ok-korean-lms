import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  Download,
  Upload,
  X,
  Check,
  FolderOpen,
} from 'lucide-react';
import { AcademyDataService } from '../services/academyDataService';
import { useAuth } from '../context/AuthContext';
import { CourseRecord, StudyMaterialCategory, StudyMaterialRecord } from '../types';

const CATEGORIES: StudyMaterialCategory[] = [
  'PDF Document',
  'Worksheet',
  'Vocabulary List',
  'Audio / Listening',
  'Slide Deck',
  'Grammar Guide',
];

export const StudyMaterialsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [materials, setMaterials] = useState<StudyMaterialRecord[]>(() => AcademyDataService.getMaterials());
  const [courses, setCourses] = useState<CourseRecord[]>(() => AcademyDataService.getCourses());

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | StudyMaterialCategory>('All');
  const [modalOpen, setModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<StudyMaterialCategory>('PDF Document');
  const [courseTitle, setCourseTitle] = useState('TOPIK I Foundation');
  const [level, setLevel] = useState('Level 1 - Beginner (TOPIK I)');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const u1 = AcademyDataService.subscribeMaterials(setMaterials);
    const u2 = AcademyDataService.subscribeCourses(setCourses);
    return () => {
      u1();
      u2();
    };
  }, []);

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileSize(`${Math.max(1, Math.round(file.size / 1024))} KB`);
    if (file.size <= 450 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFileUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await AcademyDataService.saveMaterial(
      {
        title: title.trim(),
        category,
        courseTitle: courseTitle.trim(),
        level,
        fileName: fileName.trim() || undefined,
        fileSize: fileSize.trim() || undefined,
        fileUrl: fileUrl.trim() || undefined,
        description: description.trim() || undefined,
      },
      user?.name || 'Admin',
      user?.role || 'admin'
    );
    setTitle('');
    setFileUrl('');
    setFileName('');
    setFileSize('');
    setDescription('');
    setModalOpen(false);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return materials.filter((m) => {
      if (categoryFilter !== 'All' && m.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.courseTitle.toLowerCase().includes(q) ||
        (m.fileName || '').toLowerCase().includes(q)
      );
    });
  }, [materials, searchQuery, categoryFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-emerald-500" />
            <span>Study Materials & Resources Library</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload notes, Korean worksheets, grammar guides, vocabulary sheets, and listening links.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/30 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Upload / Add Material</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search study materials by title, course, or filename..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as any)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No study materials uploaded yet</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">Add Korean PDF notes, worksheets, or resource URLs for your classes.</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
          >
            + Upload First Material
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold">
                    {m.category}
                  </span>
                  {(isAdmin || m.uploadedBy === user?.name) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete "${m.title}"?`)) {
                          AcademyDataService.deleteMaterial(m.id, user?.name || 'Admin', user?.role || 'admin');
                        }
                      }}
                      className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{m.title}</h3>
                <p className="text-[11px] text-emerald-500 font-semibold">{m.courseTitle}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{m.level}</p>
                {m.description && <p className="text-xs text-slate-500 dark:text-slate-300">{m.description}</p>}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <span className="text-[11px] text-slate-400 truncate">
                  {m.fileName ? `${m.fileName} ${m.fileSize ? `(${m.fileSize})` : ''}` : `By ${m.uploadedBy || 'Faculty'}`}
                </span>
                {m.fileUrl && (
                  <a
                    href={m.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={m.fileUrl.startsWith('data:') ? m.fileName || `${m.title}.pdf` : undefined}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/15 text-emerald-500 font-bold text-[11px] hover:bg-emerald-600 hover:text-white transition-colors"
                  >
                    {m.fileUrl.startsWith('data:') ? <Download className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    <span>Open</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-base">Upload Study Material</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Material Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Week 3 Korean Particles Worksheet"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as StudyMaterialCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Course / Subject</label>
                  <input
                    type="text"
                    list="courses-datalist"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <datalist id="courses-datalist">
                    {courses.map((c) => (
                      <option key={c.id} value={c.title} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Attach File (PDF/Doc up to 450KB) or Paste Link</label>
                <div className="flex items-center gap-2 mb-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer font-semibold">
                    <Upload className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{fileName || 'Choose File'}</span>
                    <input type="file" onChange={handleFileAttach} className="hidden" />
                  </label>
                  {fileSize && <span className="text-[11px] text-slate-400">{fileSize}</span>}
                </div>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... (external link if large file)"
                  value={fileUrl.startsWith('data:') ? '' : fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
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
                  <span>Save Material</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
