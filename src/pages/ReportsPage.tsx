import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Award, 
  Calendar, 
  CheckCircle, 
  Sparkles,
  CalendarCheck,
  CreditCard,
  Building2,
  Clock
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { StorageService } from '../services/storageService';
import { Student, WeeklyTest } from '../types';
import { useLanguage } from '../context/LanguageContext';

export const ReportsPage: React.FC = () => {
  const { t } = useLanguage();

  const [students, setStudents] = useState(() => StorageService.getStudents());
  const [settings, setSettings] = useState(() => StorageService.getSettings());
  const [tests, setTests] = useState(() => StorageService.getTests());
  const [fees, setFees] = useState(() => StorageService.getFees());
  const [teachers, setTeachers] = useState(() => StorageService.getTeacherAccounts());

  useEffect(() => {
    const unsubStudents = StorageService.subscribeStudents(setStudents);
    const unsubSettings = StorageService.subscribeSettings(setSettings);
    const unsubTests = StorageService.subscribeTests(setTests);
    const unsubFees = StorageService.subscribeFees(setFees);
    const unsubTeachers = StorageService.subscribeTeachers(setTeachers);
    return () => {
      unsubStudents();
      unsubSettings();
      unsubTests();
      unsubFees();
      unsubTeachers();
    };
  }, []);

  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('monthly');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState<string>('October 2026');
  const [selectedTestId, setSelectedTestId] = useState<string>(tests[0]?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [teacherRemarks, setTeacherRemarks] = useState(
    'Demonstrates exceptional command over Hangul syntax, honorific verb endings (존댓말), and conversational listening. Recommended to sit for official TOPIK certification.'
  );

  const reportCardRef = useRef<HTMLDivElement>(null);

  const currentStudent = students.find(s => s.id === selectedStudentId) || students[0];

  // Dynamically resolve assigned instructor matching student's batch from admin-configured teachers
  const batchMatchedTeacher = teachers.find(t => 
    t.status === 'Active' && (t.assignedBatch === currentStudent?.batch || t.assignedBatch === 'All Batches')
  ) || teachers.find(t => t.status === 'Active') || teachers[0];

  // Active instructor: explicitly chosen or automatically matched from the admin-provided teachers
  const activeInstructor = (selectedTeacherId ? teachers.find(t => t.id === selectedTeacherId) : null) || batchMatchedTeacher;

  // Cursive signature string (clean name)
  const instructorSignatureName = activeInstructor
    ? activeInstructor.name.replace(/\(.*?\)/g, '').replace(/^Teacher\s+/i, '').trim()
    : 'Faculty Instructor';

  // Attendance stats (filtered by month for monthly report, or overall)
  const attendanceStats = currentStudent 
    ? StorageService.getStudentAttendanceStats(currentStudent.id, reportType === 'monthly' ? selectedMonth : undefined)
    : { total: 0, present: 0, absent: 0, leave: 0, late: 0, rate: 0 };

  // Filter tests based on type
  const availableMonthTests = tests.filter(t => t.month.toLowerCase() === selectedMonth.toLowerCase());
  
  // Test scores for this student
  const studentMonthScores = availableMonthTests.flatMap(t => {
    const score = t.scores.find(s => s.studentId === currentStudent?.id);
    if (!score) return [];
    return [{
      testId: t.id,
      testTitle: t.testTitle,
      date: t.date,
      ...score
    }];
  });

  // Selected single weekly test for weekly report
  const activeWeeklyTest = tests.find(t => t.id === selectedTestId) || tests[0];
  const activeWeeklyScore = activeWeeklyTest?.scores.find(s => s.studentId === currentStudent?.id);

  // Fee record for current student in PKR
  const studentFee = fees.find(f => f.studentId === currentStudent?.id && f.month === selectedMonth);

  // Averages calculation
  const avgPercentage = studentMonthScores.length > 0 
    ? Math.round(studentMonthScores.reduce((acc, s) => acc + s.percentage, 0) / studentMonthScores.length)
    : activeWeeklyScore ? activeWeeklyScore.percentage : 88;

  const overallGrade = 
    avgPercentage >= 90 ? 'A+' :
    avgPercentage >= 80 ? 'A' :
    avgPercentage >= 70 ? 'B' :
    avgPercentage >= 60 ? 'C' : 'D';

  const handleDownloadPDF = async () => {
    if (!reportCardRef.current || !currentStudent) return;
    setIsGeneratingPdf(true);

    try {
      const element = reportCardRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 mm
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(pageHeight, imgHeight));
      const filename = `OK_Korean_${reportType.toUpperCase()}_Report_${currentStudent.rollNumber}_${currentStudent.fullName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Could not generate PDF directly. Please use the Print button to Save as PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Weekly & Monthly Certified PDF Reports</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate and download official student transcripts with PKR tuition status, attendance rate, and modular scores.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{t('btn.print')}</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-60"
          >
            {isGeneratingPdf ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating {reportType === 'weekly' ? 'Weekly' : 'Monthly'} PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download {reportType === 'weekly' ? 'Weekly' : 'Monthly'} PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Control Selector Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 no-print">
        {/* Report Type Switcher Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setReportType('weekly')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportType === 'weekly'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Weekly Assessment Report
            </button>
            <button
              type="button"
              onClick={() => setReportType('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportType === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly Comprehensive Transcript
            </button>
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Active Format: <strong className="text-indigo-600 dark:text-indigo-400 uppercase">{reportType} Evaluation</strong>
          </span>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Student
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-slate-100">
                  {s.fullName} ({s.rollNumber}) · {s.batch.split(' (')[0]}
                </option>
              ))}
            </select>
          </div>

          {reportType === 'monthly' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Academic Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="October 2026" className="bg-slate-900 text-slate-100">October 2026</option>
                <option value="November 2026" className="bg-slate-900 text-slate-100">November 2026</option>
                <option value="September 2026" className="bg-slate-900 text-slate-100">September 2026</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Weekly Test
              </label>
              <select
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                {tests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.testTitle} ({t.date})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Faculty Instructor (System)
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">
                Auto: {batchMatchedTeacher ? batchMatchedTeacher.name : 'System Faculty'} ({currentStudent?.batch.split(' (')[0] || ''})
              </option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.assignedBatch ? t.assignedBatch.split(' (')[0] : 'All Batches'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Instructor Remarks
            </label>
            <input
              type="text"
              value={teacherRemarks}
              onChange={(e) => setTeacherRemarks(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Printable Report Card Document (Optimized for jsPDF & Print) */}
      <div className="w-full overflow-x-auto pb-4">
        <div className="min-w-[680px] flex justify-center">
          <div 
            ref={reportCardRef}
            className="w-full max-w-[850px] bg-white rounded-2xl border border-slate-300 p-8 sm:p-12 shadow-xl text-slate-900 font-sans print:p-0 print:border-none print:shadow-none"
          >
          {/* Header with User's Official Uploaded Logo */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden border border-slate-200 shadow-sm bg-white p-1 shrink-0">
                <img
                  src="/assets/aistudio/logo_-_Copy_d3a62f9d.png"
                  alt="OK Korean Language Center Logo"
                  className="w-full h-full object-contain"
                  crossOrigin="anonymous"
                />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-950 tracking-tight uppercase">
                  OK KOREAN LANGUAGE CENTER
                </h1>
                <p className="text-sm font-bold text-rose-600 font-korean tracking-wide">
                  오케이 한국어 학원 · {reportType === 'monthly' ? '월간 종합 학업 성적표' : '주간 성취도 평가 보고서'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Reg No: {settings.registrationNumber} · {settings.address}
                </p>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider mb-1 ${
                reportType === 'monthly' 
                  ? 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              }`}>
                {reportType === 'monthly' ? 'Monthly Transcript' : 'Weekly Assessment'}
              </span>
              <p className="text-[11px] text-slate-500 font-mono">
                {reportType === 'monthly' ? selectedMonth : activeWeeklyTest?.date}
              </p>
            </div>
          </div>

          {/* Student Dossier Strip */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Student Name</span>
                <span className="font-extrabold text-sm text-slate-900 mt-0.5 block">{currentStudent.fullName}</span>
                {currentStudent.koreanName && (
                  <span className="text-xs text-indigo-700 font-korean font-semibold">{currentStudent.koreanName}</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Roll Number</span>
                <span className="font-bold text-sm font-mono text-slate-900 mt-0.5 block">{currentStudent.rollNumber}</span>
                <span className="text-[11px] text-slate-500">Admitted: {currentStudent.enrollmentDate}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Level & Batch</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{currentStudent.level.split(' - ')[0]}</span>
                <span className="text-[11px] text-slate-500">{currentStudent.batch.split(' (')[0]}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Father & WhatsApp</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{currentStudent.fatherName}</span>
                <span className="text-[11px] text-slate-500 font-mono">{currentStudent.parentWhatsApp}</span>
              </div>
            </div>
          </div>

          {/* Summary KPI Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 text-center">
            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Attendance Standing</span>
              <span className="text-2xl font-black text-slate-900 tabular-nums">{attendanceStats.rate}%</span>
              <span className="text-[10px] text-emerald-600 font-semibold block">{attendanceStats.present} of {attendanceStats.total} Classes</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Academic Average</span>
              <span className="text-2xl font-black text-indigo-600 tabular-nums">{avgPercentage}%</span>
              <span className="text-[10px] text-slate-500 block">Scale: 100 Points</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Grade Awarded</span>
              <span className="text-2xl font-black text-amber-500">{overallGrade}</span>
              <span className="text-[10px] text-slate-500 block">TOPIK Criterion</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Tuition Standing (PKR)</span>
              <span className={`text-base font-extrabold mt-1 block ${
                studentFee?.status === 'Paid' ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {studentFee ? (studentFee.status === 'Paid' ? 'Fee Cleared' : `Due: Rs. ${studentFee.pendingAmount.toLocaleString()}`) : 'Cleared'}
              </span>
              <span className="text-[10px] text-slate-500 block">Pakistani Rupees</span>
            </div>
          </div>

          {/* Report Specific Content */}
          {reportType === 'monthly' ? (
            /* Monthly Aggregated Table */
            <div className="mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center justify-between">
                <span>Monthly Evaluation Cycle ({selectedMonth})</span>
                <span className="text-indigo-600 font-medium">{studentMonthScores.length} Tests Logged</span>
              </h3>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Weekly Test Title</th>
                      <th className="py-2.5 px-2 text-center">Vocab</th>
                      <th className="py-2.5 px-2 text-center">Grammar</th>
                      <th className="py-2.5 px-2 text-center">Reading</th>
                      <th className="py-2.5 px-2 text-center">Sentences</th>
                      <th className="py-2.5 px-2 text-center">Spk/List</th>
                      <th className="py-2.5 px-2 text-center">MCQs</th>
                      <th className="py-2.5 px-3 text-center">Total Obtained</th>
                      <th className="py-2.5 px-3 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentMonthScores.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-4 text-center text-slate-400">
                          No tests conducted for {selectedMonth}.
                        </td>
                      </tr>
                    ) : (
                      studentMonthScores.map((score, i) => (
                        <tr key={i}>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            <div>{score.testTitle}</div>
                            <span className="text-[10px] text-slate-400 font-mono">{score.date}</span>
                          </td>
                          <td className="py-2.5 px-2 text-center tabular-nums">{score.vocabulary ?? '-'}</td>
                          <td className="py-2.5 px-2 text-center tabular-nums">{score.grammar ?? '-'}</td>
                          <td className="py-2.5 px-2 text-center tabular-nums">{score.reading ?? '-'}</td>
                          <td className="py-2.5 px-2 text-center tabular-nums font-semibold text-slate-900">{score.sentences ?? '-'}</td>
                          <td className="py-2.5 px-2 text-center tabular-nums">{score.listeningSpeaking ?? '-'}</td>
                          <td className="py-2.5 px-2 text-center tabular-nums font-bold text-indigo-700">{score.mcqs ?? '-'}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900 tabular-nums">
                            {score.totalScore} ({score.percentage}%)
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-extrabold text-indigo-700">{score.grade}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Weekly Focused Component Breakdown */
            <div className="mb-5">
              <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 mb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-800 block">Weekly Test Details</span>
                  <h4 className="font-bold text-sm text-slate-900">{activeWeeklyTest?.testTitle}</h4>
                  <p className="text-xs text-slate-600 mt-0.5">{activeWeeklyTest?.topicCovered}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Total Exam Marks</span>
                  <span className="text-lg font-black font-mono text-indigo-700">{activeWeeklyTest?.totalMaxMarks || 100} Pts</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                <div className="p-3 rounded-xl border border-slate-200 text-center bg-slate-50/50">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Vocabulary</span>
                  <span className="text-xl font-bold text-slate-900 tabular-nums">{activeWeeklyScore?.vocabulary ?? 0}</span>
                  <span className="text-[10px] text-slate-400 block">Word Recall</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 text-center bg-slate-50/50">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Grammar</span>
                  <span className="text-xl font-bold text-slate-900 tabular-nums">{activeWeeklyScore?.grammar ?? 0}</span>
                  <span className="text-[10px] text-slate-400 block">Syntax & Particles</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 text-center bg-slate-50/50">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Reading</span>
                  <span className="text-xl font-bold text-slate-900 tabular-nums">{activeWeeklyScore?.reading ?? 0}</span>
                  <span className="text-[10px] text-slate-400 block">Comprehension</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 text-center bg-slate-50/50">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Sentences</span>
                  <span className="text-xl font-bold text-slate-900 tabular-nums">{activeWeeklyScore?.sentences ?? 0}</span>
                  <span className="text-[10px] text-slate-400 block">SOV Structure</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 text-center bg-slate-50/50">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Speaking</span>
                  <span className="text-xl font-bold text-slate-900 tabular-nums">{activeWeeklyScore?.listeningSpeaking ?? 0}</span>
                  <span className="text-[10px] text-slate-400 block">Audio & Fluency</span>
                </div>
                <div className="p-3 rounded-xl border border-indigo-200 text-center bg-indigo-50/50 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase block">MCQs</span>
                  <span className="text-xl font-black text-indigo-900 tabular-nums">{activeWeeklyScore?.mcqs ?? 0}</span>
                  <span className="text-[10px] text-indigo-500 block">Objective Quiz</span>
                </div>
              </div>
            </div>
          )}

          {/* Teacher Remarks */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
              Teacher Assessment & Recommendations
            </span>
            <p className="text-xs text-slate-700 leading-relaxed italic">
              "{teacherRemarks}"
            </p>
          </div>

          {/* Signatures & Academy Seal */}
          <div className="pt-4 border-t border-slate-200 flex items-end justify-between text-center text-xs">
            {/* Faculty Instructor: Dynamically matching name provided by admin in system */}
            <div className="w-48 text-center">
              <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center pb-1">
                <span className="font-serif italic text-slate-700 text-sm font-semibold">{instructorSignatureName}</span>
              </div>
              <p className="font-extrabold text-slate-900 text-xs">{activeInstructor?.name || 'Faculty Instructor'}</p>
              <p className="text-[11px] font-bold text-slate-700">Faculty Instructor</p>
              <p className="text-[10px] text-slate-400 font-korean">
                담당 강사 · {activeInstructor?.assignedBatch ? activeInstructor.assignedBatch.split(' (')[0] : '전임 교원'}
              </p>
            </div>

            {/* Official Logo Stamp */}
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-rose-600 p-1 flex flex-col items-center justify-center transform rotate-[-4deg]">
              <span className="text-[8px] font-black tracking-wider uppercase text-rose-600 font-korean">OK KOREAN</span>
              <span className="text-[9px] font-extrabold uppercase text-slate-800">VERIFIED</span>
              <span className="text-[7px] text-slate-500 font-mono">SEAL 2026</span>
            </div>

            {/* Principal Director: Farooq Shahzad */}
            <div className="w-48 text-center">
              <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center pb-1">
                <span className="font-serif italic text-slate-700 text-sm font-semibold">Farooq Shahzad</span>
              </div>
              <p className="font-extrabold text-slate-900 text-xs">Farooq Shahzad</p>
              <p className="text-[11px] font-bold text-slate-700">Principal Director</p>
              <p className="text-[10px] text-slate-400 font-korean">원장 파루크 샤자드</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};
