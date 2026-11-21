import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit3,
  Clock,
  MapPin,
  X,
  Check,
} from 'lucide-react';
import { AcademyDataService } from '../services/academyDataService';
import { StorageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { AcademicEvent, AcademicEventType, AttendanceScheduleSettings } from '../types';

const EVENT_TYPES: AcademicEventType[] = ['Exam', 'Holiday', 'Class Schedule', 'Announcement', 'Workshop'];

const TYPE_STYLES: Record<AcademicEventType, string> = {
  Exam: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
  Holiday: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  'Class Schedule': 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  Announcement: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30',
  Workshop: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30',
};

export const AcademicCalendarPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [events, setEvents] = useState<AcademicEvent[]>(() => AcademyDataService.getEvents());
  const [scheduleSettings, setScheduleSettings] = useState<AttendanceScheduleSettings>(() =>
    StorageService.getAttendanceScheduleSettings()
  );

  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [typeFilter, setTypeFilter] = useState<'All' | AcademicEventType>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AcademicEvent | null>(null);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<AcademicEventType>('Exam');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [targetBatch, setTargetBatch] = useState('All Batches');
  const [location, setLocation] = useState('Main Campus Hall');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const u1 = AcademyDataService.subscribeEvents(setEvents);
    const u2 = StorageService.subscribeAttendanceScheduleSettings(setScheduleSettings);
    return () => {
      u1();
      u2();
    };
  }, []);

  const holidayOverrideDates = useMemo(() => {
    const set = new Set<string>();
    (scheduleSettings.dateOverridesList || []).forEach((ov) => {
      if (ov.action === 'holiday' || !ov.isAllowed) {
        set.add(ov.date);
      }
    });
    return set;
  }, [scheduleSettings]);

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{ dateStr: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ dateStr: null, dayNum: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({ dateStr: `${year}-${mm}-${dd}`, dayNum: d });
    }
    return cells;
  }, [viewMonth]);

  const openCreateModal = (presetDate?: string) => {
    setEditingEvent(null);
    setTitle('');
    setType('Exam');
    setDate(presetDate || new Date().toISOString().split('T')[0]);
    setStartTime('09:00');
    setEndTime('11:00');
    setTargetBatch('All Batches');
    setLocation('Main Campus');
    setDescription('');
    setModalOpen(true);
  };

  const openEditModal = (ev: AcademicEvent) => {
    setEditingEvent(ev);
    setTitle(ev.title);
    setType(ev.type);
    setDate(ev.date);
    setStartTime(ev.startTime || '09:00');
    setEndTime(ev.endTime || '11:00');
    setTargetBatch(ev.targetBatch || 'All Batches');
    setLocation(ev.location || 'Main Campus');
    setDescription(ev.description || '');
    setModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    await AcademyDataService.saveEvent(
      {
        id: editingEvent?.id,
        createdAt: editingEvent?.createdAt,
        title: title.trim(),
        type,
        date,
        startTime,
        endTime,
        targetBatch,
        location: location.trim(),
        description: description.trim() || undefined,
      },
      user?.name || 'Admin',
      user?.role || 'admin'
    );
    setModalOpen(false);
  };

  const visibleEvents = useMemo(
    () =>
      events.filter((ev) => {
        if (typeFilter !== 'All' && ev.type !== typeFilter) return false;
        return true;
      }),
    [events, typeFilter]
  );

  const monthPrefix = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}`;
  const monthEvents = visibleEvents.filter((ev) => ev.date.startsWith(monthPrefix));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-emerald-500" />
            <span>Academic Calendar & Events</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Schedule TOPIK exams, academy holidays, workshops, special classes, and important milestones.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreateModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/30 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Academic Event</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Month Grid */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1.5">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((cell, idx) => {
              if (!cell.dateStr) {
                return <div key={`empty_${idx}`} className="h-20 rounded-xl bg-slate-50/40 dark:bg-slate-800/20" />;
              }
              const dayEvents = visibleEvents.filter((e) => e.date === cell.dateStr);
              const isToday = cell.dateStr === new Date().toISOString().split('T')[0];
              const isHolidayOverride = holidayOverrideDates.has(cell.dateStr);

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => openCreateModal(cell.dateStr!)}
                  className={`h-20 p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer overflow-hidden ${
                    isToday
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : isHolidayOverride
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-slate-200/70 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-bold ${isToday ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-200'}`}>
                      {cell.dayNum}
                    </span>
                    {isHolidayOverride && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Holiday Override" />}
                  </div>
                  <div className="space-y-0.5 w-full">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className={`text-[9px] font-bold px-1 py-0.5 rounded truncate border ${TYPE_STYLES[ev.type]}`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-slate-400 font-semibold">+{dayEvents.length - 2} more</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Event List Sidebar */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Events ({monthEvents.length} this month)
            </h3>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
            >
              <option value="All">All Types</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {visibleEvents.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No academic events scheduled yet. Click any day on the calendar or "Add Academic Event" to create one.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {visibleEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${TYPE_STYLES[ev.type]}`}>
                      {ev.type}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(ev)}
                        className="p-1 text-slate-400 hover:text-emerald-500 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete event "${ev.title}"?`)) {
                              AcademyDataService.deleteEvent(ev.id, user?.name || 'Admin', user?.role || 'admin');
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{ev.title}</h4>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>{ev.date}</span>
                    {ev.startTime && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {ev.startTime}-{ev.endTime}
                      </span>
                    )}
                    {ev.location && (
                      <span className="inline-flex items-center gap-1 font-sans">
                        <MapPin className="w-3 h-3" /> {ev.location}
                      </span>
                    )}
                  </div>
                  {ev.description && <p className="text-[11px] text-slate-500 dark:text-slate-400">{ev.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-base">{editingEvent ? 'Edit Event' : 'New Academic Event'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEvent} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. TOPIK I Mock Evaluation"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AcademicEventType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Batch</label>
                  <input
                    type="text"
                    value={targetBatch}
                    onChange={(e) => setTargetBatch(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                  <span>Save Event</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
