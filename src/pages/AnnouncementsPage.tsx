import React, { useEffect, useMemo, useState } from 'react';
import {
  Megaphone,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Search,
} from 'lucide-react';
import { AcademyDataService } from '../services/academyDataService';
import { useAuth } from '../context/AuthContext';
import { AnnouncementRecord, BatchRecord } from '../types';

export const AnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>(() =>
    AcademyDataService.getAnnouncements()
  );
  const [batches, setBatches] = useState<BatchRecord[]>(() => AcademyDataService.getBatches());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | AnnouncementRecord['status']>('All');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementRecord | null>(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<AnnouncementRecord['priority']>('Normal');
  const [targetAudience, setTargetAudience] = useState<AnnouncementRecord['targetAudience']>('Everyone');
  const [targetBatch, setTargetBatch] = useState<string>(() => AcademyDataService.getBatches()[0]?.name || '');
  const [status, setStatus] = useState<AnnouncementRecord['status']>('Published');
  const [publishDate, setPublishDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const unsub = AcademyDataService.subscribeAnnouncements(setAnnouncements);
    const unsubBatches = AcademyDataService.subscribeBatches((liveBatches) => {
      setBatches(liveBatches);
      setTargetBatch((prev) => prev || liveBatches[0]?.name || '');
    });
    return () => {
      unsub();
      unsubBatches();
    };
  }, []);

  const openCreateModal = () => {
    setEditing(null);
    setTitle('');
    setMessage('');
    setPriority('Normal');
    setTargetAudience('Everyone');
    setTargetBatch(batches[0]?.name || '');
    setStatus('Published');
    setPublishDate(new Date().toISOString().split('T')[0]);
    setModalOpen(true);
  };

  const openEditModal = (a: AnnouncementRecord) => {
    setEditing(a);
    setTitle(a.title);
    setMessage(a.message);
    setPriority(a.priority);
    setTargetAudience(a.targetAudience);
    setTargetBatch(a.targetBatch || batches[0]?.name || '');
    setStatus(a.status);
    setPublishDate(a.publishDate);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    await AcademyDataService.saveAnnouncement(
      {
        id: editing?.id,
        createdAt: editing?.createdAt,
        title: title.trim(),
        message: message.trim(),
        priority,
        targetAudience,
        targetBatch: targetAudience === 'Specific Batch' ? targetBatch : undefined,
        status,
        publishDate,
      },
      user?.name || 'Admin',
      user?.role || 'admin'
    );
    setModalOpen(false);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return announcements.filter((a) => {
      if (statusFilter !== 'All' && a.status !== statusFilter) return false;
      if (!q) return true;
      return a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q);
    });
  }, [announcements, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-emerald-500" />
            <span>Academy Announcements & Circulars</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Publish official circulars for everyone, students, teachers, or specific cohorts.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/30 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Announcement</span>
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
            placeholder="Search announcements..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
        >
          <option value="All">All Statuses</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
          <Megaphone className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No announcements published yet</h3>
          <p className="text-xs text-slate-400 mt-1">Create an announcement to notify batches, students, or staff.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-2.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      a.priority === 'Urgent'
                        ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                        : a.priority === 'Important'
                        ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                        : 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30'
                    }`}
                  >
                    {a.priority}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    Target: {a.targetAudience === 'Specific Batch' ? a.targetBatch?.split(' (')[0] : a.targetAudience}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      a.status === 'Published'
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-slate-500/15 text-slate-400'
                    }`}
                  >
                    {a.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-slate-400 mr-2">{a.publishDate}</span>
                  <button
                    type="button"
                    onClick={() => openEditModal(a)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete announcement "${a.title}"?`)) {
                          AcademyDataService.deleteAnnouncement(a.id, user?.name || 'Admin', user?.role || 'admin');
                        }
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white">{a.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {a.message}
              </p>
              <p className="text-[11px] text-slate-400">Posted by {a.createdBy || 'Administration'}</p>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-base">{editing ? 'Edit Announcement' : 'Publish Announcement'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Announcement Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Important">Important</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Audience</label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Everyone">Everyone</option>
                    <option value="All Students">All Students</option>
                    <option value="Specific Batch">Specific Batch</option>
                    <option value="Teachers Only">Teachers Only</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Publish Date</label>
                  <input
                    type="date"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              {targetAudience === 'Specific Batch' && (
                <div>
                  <label className="block font-semibold mb-1">Target Batch</label>
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
              )}
              <div>
                <label className="block font-semibold mb-1">Announcement Body *</label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold flex items-center gap-1 cursor-pointer">
                  <Check className="w-4 h-4" /> Save Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
