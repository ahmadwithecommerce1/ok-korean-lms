import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Send, 
  CheckCheck, 
  User, 
  CalendarCheck, 
  Award, 
  CreditCard, 
  Bell, 
  Sparkles,
  Phone,
  Copy,
  Check
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Student, WeeklyTest, FeeRecord, TestScore } from '../types';

export const WhatsAppPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [tests, setTests] = useState<WeeklyTest[]>(() => StorageService.getTests());
  const [fees, setFees] = useState<FeeRecord[]>(() => StorageService.getFees());

  useEffect(() => {
    const unsubStudents = StorageService.subscribeStudents(setStudents);
    const unsubTests = StorageService.subscribeTests(setTests);
    const unsubFees = StorageService.subscribeFees(setFees);
    return () => {
      unsubStudents();
      unsubTests();
      unsubFees();
    };
  }, []);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [selectedTemplate, setSelectedTemplate] = useState<'attendance' | 'test' | 'fee' | 'general'>('attendance');
  const [copied, setCopied] = useState(false);

  const student = students.find(s => s.id === selectedStudentId) || students[0];

  // Derive contextual values
  const studentFee = fees.find(f => f.studentId === student?.id);
  const pendingAmount = studentFee ? studentFee.pendingAmount : 0;
  const latestTest = tests[0];
  const testScore = latestTest?.scores.find((s: TestScore) => s.studentId === student?.id);

  // Template builders
  const getTemplateMessage = (type: 'attendance' | 'test' | 'fee' | 'general'): string => {
    if (!student) return '';

    switch (type) {
      case 'attendance':
        return `🇰🇷 *Ok Korean Language Centre (오케이 한국어 학원)*
━━━━━━━━━━━━━━━━━━
Dear Parent / Guardian of *${student.fullName}* (${student.rollNumber}),

This is an automated attendance notification for today.
📅 *Date:* ${new Date().toISOString().split('T')[0]}
⏰ *Batch:* ${student.batch}
✅ *Status:* Present in Class

Regular attendance is critical for mastering TOPIK I & II grammar patterns. Thank you for your continued support!

Warm regards,
*Faculty Office · Ok Korean Language Centre*
📞 +82 2-789-5500`;

      case 'test':
        return `🇰🇷 *Ok Korean Language Centre (오케이 한국어 학원)*
━━━━━━━━━━━━━━━━━━
Dear Parent of *${student.fullName}* (${student.rollNumber}),

We are pleased to share the weekly evaluation result:
📝 *Assessment:* ${latestTest?.testTitle || 'Weekly TOPIK Assessment'}
🎯 *Score:* ${testScore ? testScore.totalScore : 88} / 100 (${testScore ? testScore.percentage : 88}%)
🎖️ *Grade:* ${testScore ? testScore.grade : 'A'}

*Component Marks:*
• Vocabulary: ${testScore?.vocabulary || 22}/25
• Grammar: ${testScore?.grammar || 22}/25
• Reading: ${testScore?.reading || 22}/25
• Speaking & Listening: ${testScore?.listeningSpeaking || 22}/25

Keep up the outstanding effort towards official TOPIK certification!

*Academic Director · Ok Korean Language Centre*`;

      case 'fee':
        return `🇰🇷 *OK Korean Language Center (오케이 한국어 학원)*
━━━━━━━━━━━━━━━━━━
Dear Parent of *${student.fullName}* (${student.rollNumber}),

This is a friendly reminder from the accounts office regarding tuition fees:
💼 *Month:* ${studentFee?.month || 'October 2026'}
💳 *Outstanding Dues:* Rs. ${(pendingAmount || 25000).toLocaleString()} PKR
⏳ *Due Date:* ${studentFee?.dueDate || '2026-10-30'}

Please clear the dues before the deadline via Bank Transfer or EasyPaisa/JazzCash to ensure uninterrupted class attendance.

*Accounts Office · OK Korean Language Center*
Thank you!`;

      case 'general':
        return `🇰🇷 *Ok Korean Language Centre (오케이 한국어 학원)*
━━━━━━━━━━━━━━━━━━
Notice for Students & Parents of *${student.fullName}*:

📢 *Notice:* TOPIK Registration & Special Revision Workshop.
Please be informed that special intensive mock test workshops for TOPIK will begin next Monday. Students are advised to bring their vocabulary workbooks.

For inquiries, contact the student coordinator.
*Administration · Ok Korean Language Centre*`;
    }
  };

  const [messageText, setMessageText] = useState<string>(() => getTemplateMessage('attendance'));

  // When student or template changes, update message
  const handleTemplateSwitch = (type: 'attendance' | 'test' | 'fee' | 'general') => {
    setSelectedTemplate(type);
    setMessageText(getTemplateMessage(type));
  };

  const handleStudentSwitch = (id: string) => {
    setSelectedStudentId(id);
    const newStudent = students.find(s => s.id === id);
    if (newStudent) {
      setTimeout(() => {
        setMessageText(getTemplateMessage(selectedTemplate));
      }, 0);
    }
  };

  // Clean phone number for wa.me URL
  const cleanPhone = student?.parentWhatsApp?.replace(/[^0-9]/g, '') || '';
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <span>Parent WhatsApp Communication Hub</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Send pre-formatted instant notifications, daily attendance slips, and test report summaries directly to parents.
        </p>
      </div>

      {/* Main Split Grid: Composer & Live WhatsApp Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Student Selector & Template Editor */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          {/* Student Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Recipient Student
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentSwitch(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-white bg-slate-50/50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.rollNumber}) · WhatsApp: {s.parentWhatsApp}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Info Capsule */}
          {student && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">{student.fullName}'s Guardian</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">{student.parentWhatsApp}</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-800">
                {student.batch.split(' (')[0]}
              </span>
            </div>
          )}

          {/* Template Choice Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select Notification Template
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleTemplateSwitch('attendance')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                  selectedTemplate === 'attendance'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <CalendarCheck className={`w-4 h-4 ${selectedTemplate === 'attendance' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">Attendance</span>
                  <span className="text-[10px] text-slate-400">Daily presence</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTemplateSwitch('test')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                  selectedTemplate === 'test'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <Award className={`w-4 h-4 ${selectedTemplate === 'test' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">Test Scores</span>
                  <span className="text-[10px] text-slate-400">Assessment card</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTemplateSwitch('fee')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                  selectedTemplate === 'fee'
                    ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/40 ring-1 ring-rose-500'
                    : 'border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <CreditCard className={`w-4 h-4 ${selectedTemplate === 'fee' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">Tuition Due</span>
                  <span className="text-[10px] text-slate-400">Fee reminder</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTemplateSwitch('general')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                  selectedTemplate === 'general'
                    ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/40 ring-1 ring-amber-500'
                    : 'border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <Bell className={`w-4 h-4 ${selectedTemplate === 'general' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">General</span>
                  <span className="text-[10px] text-slate-400">Notice/Workshop</span>
                </div>
              </button>
            </div>
          </div>

          {/* Editable Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Message Body (Editable)
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              rows={9}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-slate-50/40 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Trigger Dispatch Button */}
          <div className="pt-2 flex items-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Launch WhatsApp Chat</span>
            </a>
          </div>
        </div>

        {/* Right Column (5 cols): WhatsApp Chat Visual Simulator */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-[#efeae2] rounded-3xl border border-slate-300/80 shadow-lg overflow-hidden flex flex-col h-full min-h-[480px]">
            {/* WhatsApp App Top Bar */}
            <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white overflow-hidden ring-1 ring-white/60 shrink-0 p-0.5">
                  <img
                    src="/assets/aistudio/logo_-_Copy_d3a62f9d.png"
                    alt="OK Korean Language Center"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">OK Korean Language Center</p>
                  <p className="text-[10px] text-emerald-200">Official Parent Communication</p>
                </div>
              </div>
              <div className="text-[11px] font-mono text-emerald-200">
                Online
              </div>
            </div>

            {/* Chat Body with Subtle Background Doodle pattern */}
            <div className="flex-1 p-4 flex flex-col justify-end overflow-y-auto">
              <div className="self-center bg-white/80 backdrop-blur-xs text-[10px] font-semibold text-slate-600 px-3 py-1 rounded-full shadow-xs mb-4">
                TODAY
              </div>

              {/* Message Bubble (WhatsApp Style) */}
              <div className="max-w-[92%] bg-[#d9fdd3] text-slate-800 rounded-2xl rounded-tr-xs p-3.5 shadow-sm text-xs leading-relaxed space-y-1.5 self-end relative">
                <div className="whitespace-pre-wrap font-sans text-xs">
                  {messageText}
                </div>
                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 pt-1">
                  <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  <CheckCheck className="w-3.5 h-3.5 text-sky-600" />
                </div>
              </div>
            </div>

            {/* Bottom Fake Bar */}
            <div className="p-3 bg-[#f0f2f5] border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px]">Formatted with `https://wa.me/`</span>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 font-bold hover:underline"
              >
                Direct Send →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
