import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Users, 
  FileText, 
  Check, 
  RefreshCw,
  Fingerprint,
  Info,
  Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, StudentBatch, StudentLevel, StudentStatus } from '../../types';
import { StorageService } from '../../services/storageService';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
  existingStudents: Student[];
}

interface ParsedCandidate {
  id: string;
  rollNumber: string;
  fullName: string;
  koreanName?: string;
  fatherName: string;
  contactNumber: string;
  parentWhatsApp: string;
  email?: string;
  batch: StudentBatch;
  level: StudentLevel;
  notes?: string;
  isValid: boolean;
  validationError?: string;
  isDuplicateRoll: boolean;
}

const DEFAULT_BATCH: StudentBatch = 'Batch A (Morning 09:00 - 11:00)';
const DEFAULT_LEVEL: StudentLevel = 'Level 1 - Beginner (TOPIK I)';

const BATCHES: StudentBatch[] = [
  'Batch A (Morning 09:00 - 11:00)',
  'Batch B (Afternoon 14:00 - 16:00)',
  'Batch C (Evening 18:00 - 20:00)',
  'Batch D (Weekend Intensive)',
];

const LEVELS: StudentLevel[] = [
  'Level 1 - Beginner (TOPIK I)',
  'Level 2 - Elementary (TOPIK I)',
  'Level 3 - Intermediate (TOPIK II)',
  'Level 4 - Upper-Intermediate (TOPIK II)',
  'Level 5 - Advanced (TOPIK II)',
];

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingStudents,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [candidates, setCandidates] = useState<ParsedCandidate[]>([]);
  const [initialStatus, setInitialStatus] = useState<StudentStatus>('Pending Verification');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Find column value using fuzzy matching
  const findValue = (row: Record<string, any>, possibleKeys: string[]): string => {
    const rowKeys = Object.keys(row);
    for (const pKey of possibleKeys) {
      const match = rowKeys.find(k => k.trim().toLowerCase() === pKey.toLowerCase());
      if (match && row[match] !== undefined && row[match] !== null) {
        return String(row[match]).trim();
      }
    }
    return '';
  };

  // Match batch string to enum
  const mapBatch = (raw: string): StudentBatch => {
    if (!raw) return DEFAULT_BATCH;
    const lower = raw.toLowerCase();
    if (lower.includes('morning') || lower.includes('batch a') || lower.includes('9:00') || lower.includes('09:00')) {
      return 'Batch A (Morning 09:00 - 11:00)';
    }
    if (lower.includes('afternoon') || lower.includes('batch b') || lower.includes('14:00') || lower.includes('2:00')) {
      return 'Batch B (Afternoon 14:00 - 16:00)';
    }
    if (lower.includes('evening') || lower.includes('batch c') || lower.includes('18:00') || lower.includes('6:00')) {
      return 'Batch C (Evening 18:00 - 20:00)';
    }
    if (lower.includes('weekend') || lower.includes('batch d') || lower.includes('intensive')) {
      return 'Batch D (Weekend Intensive)';
    }
    return DEFAULT_BATCH;
  };

  // Match level string to enum
  const mapLevel = (raw: string): StudentLevel => {
    if (!raw) return DEFAULT_LEVEL;
    const lower = raw.toLowerCase();
    if (lower.includes('beginner') || lower.includes('level 1') || lower.includes('topik 1')) {
      return 'Level 1 - Beginner (TOPIK I)';
    }
    if (lower.includes('elementary') || lower.includes('level 2')) {
      return 'Level 2 - Elementary (TOPIK I)';
    }
    if (lower.includes('upper') || lower.includes('level 4')) {
      return 'Level 4 - Upper-Intermediate (TOPIK II)';
    }
    if (lower.includes('intermediate') || lower.includes('level 3')) {
      return 'Level 3 - Intermediate (TOPIK II)';
    }
    if (lower.includes('advanced') || lower.includes('level 5')) {
      return 'Level 5 - Advanced (TOPIK II)';
    }
    return DEFAULT_LEVEL;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) parseExcelFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) parseExcelFile(dropped);
  };

  const parseExcelFile = (fileToParse: File) => {
    setError(null);
    setFile(fileToParse);
    setFileName(fileToParse.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          setError('The uploaded Excel file contains no worksheets.');
          return;
        }

        const sheet = workbook.Sheets[firstSheetName];
        const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rawJson.length === 0) {
          setError('The worksheet is empty. Please ensure rows have candidate details.');
          return;
        }

        const existingRolls = new Set(existingStudents.map(s => s.rollNumber.trim().toLowerCase()));

        const parsed: ParsedCandidate[] = rawJson.map((row, idx) => {
          let roll = findValue(row, ['roll no', 'roll number', 'rollno', 'roll', 'student id', 'id']);
          if (!roll) {
            // Auto generate sequential roll number based on existing count
            const num = (existingStudents.length + idx + 1).toString().padStart(3, '0');
            roll = `OK-2025-${num}`;
          }

          const name = findValue(row, ['name', 'full name', 'student name', 'candidate name']);
          const koreanName = findValue(row, ['korean name', 'hangul', '한국어 이름']);
          const fatherName = findValue(row, ['father name', 'father', 'guardian', "father's name"]);
          const parentWhatsApp = findValue(row, ['parent whatsapp', 'whatsapp', 'parent contact', 'guardian phone', 'phone', 'contact']);
          const contactNumber = findValue(row, ['student contact', 'contact number', 'phone', 'mobile']) || parentWhatsApp;
          const email = findValue(row, ['email', 'email address', 'e-mail']);
          const rawBatch = findValue(row, ['batch', 'assigned batch', 'time', 'class time', 'timing']);
          const rawLevel = findValue(row, ['level', 'course level', 'topik level', 'curriculum', 'course']);
          const notes = findValue(row, ['notes', 'remarks', 'objective', 'comments']);

          const isDuplicate = existingRolls.has(roll.toLowerCase());
          const isValid = Boolean(name && fatherName && (parentWhatsApp || contactNumber));
          let validationError = '';
          if (!name) validationError = 'Missing Full Name';
          else if (!fatherName) validationError = 'Missing Father Name';
          else if (!parentWhatsApp && !contactNumber) validationError = 'Missing Contact/WhatsApp';

          return {
            id: `candidate_${idx}_${Date.now()}`,
            rollNumber: roll,
            fullName: name,
            koreanName,
            fatherName,
            contactNumber: contactNumber || '+92 300 0000000',
            parentWhatsApp: parentWhatsApp || contactNumber || '+92 300 0000000',
            email,
            batch: mapBatch(rawBatch),
            level: mapLevel(rawLevel),
            notes: notes || 'Imported via Bulk Excel Upload',
            isValid,
            validationError,
            isDuplicateRoll: isDuplicate,
          };
        });

        setCandidates(parsed);
      } catch (err: any) {
        console.error('Excel parsing error:', err);
        setError(`Failed to read Excel file: ${err.message || 'Invalid format'}`);
      }
    };

    reader.readAsBinaryString(fileToParse);
  };

  const removeCandidate = (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
  };

  const downloadSampleTemplate = () => {
    const templateData = [
      {
        'Roll No': 'OK-2025-050',
        'Full Name': 'Muhammad Usman',
        'Korean Name': '무함마드 우스만',
        'Father Name': 'Usman Tariq',
        'Batch': 'Batch A (Morning 09:00 - 11:00)',
        'Course Level': 'Level 1 - Beginner (TOPIK I)',
        'Parent WhatsApp': '+92 300 1234567',
        'Student Contact': '+92 301 7654321',
        'Email': 'usman.tariq@example.com',
        'Notes': 'EPS-TOPIK Manufacturing candidate'
      },
      {
        'Roll No': 'OK-2025-051',
        'Full Name': 'Zainab Bibi',
        'Korean Name': '자이나브 비비',
        'Father Name': 'Muhammad Akram',
        'Batch': 'Batch B (Afternoon 14:00 - 16:00)',
        'Course Level': 'Level 2 - Elementary (TOPIK I)',
        'Parent WhatsApp': '+92 321 9876543',
        'Student Contact': '+92 321 4455667',
        'Email': 'zainab.bibi@example.com',
        'Notes': 'Targeting TOPIK Level 2 certificate'
      },
      {
        'Roll No': 'OK-2025-052',
        'Full Name': 'Bilal Ahmad',
        'Korean Name': '빌랄 아흐마드',
        'Father Name': 'Ahmad Raza',
        'Batch': 'Batch C (Evening 18:00 - 20:00)',
        'Course Level': 'Level 3 - Intermediate (TOPIK II)',
        'Parent WhatsApp': '+92 333 5556677',
        'Student Contact': '+92 333 1122334',
        'Email': 'bilal.ahmad@example.com',
        'Notes': 'GKS Scholarship applicant'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    // Auto fit column widths
    const colWidths = [
      { wch: 14 }, // Roll No
      { wch: 20 }, // Full Name
      { wch: 16 }, // Korean Name
      { wch: 18 }, // Father Name
      { wch: 32 }, // Batch
      { wch: 34 }, // Course Level
      { wch: 18 }, // Parent WhatsApp
      { wch: 18 }, // Student Contact
      { wch: 25 }, // Email
      { wch: 35 }  // Notes
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, 'OK_Korean_Student_Upload_Template.xlsx');
  };

  const handleExecuteImport = async () => {
    const validCandidates = candidates.filter(c => c.isValid);
    if (validCandidates.length === 0) {
      setError('No valid student rows to import. Please check data requirements.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setImportProgress(10);

    try {
      const payload: Array<Omit<Student, 'id'>> = validCandidates.map(c => ({
        rollNumber: c.rollNumber,
        fullName: c.fullName,
        koreanName: c.koreanName || undefined,
        fatherName: c.fatherName,
        contactNumber: c.contactNumber,
        parentWhatsApp: c.parentWhatsApp,
        email: c.email || undefined,
        level: c.level,
        batch: c.batch,
        status: initialStatus,
        deviceSyncStatus: 'Pending',
        enrollRequested: false,
        enrollRequestedAt: undefined,
        enrollmentDate: new Date().toISOString().split('T')[0],
        notes: c.notes || 'Imported via Excel Batch Upload',
        biometricEnrolled: false,
        biometricPin: c.rollNumber.replace(/[^0-9]/g, '') || undefined
      }));

      setImportProgress(50);
      const created = await StorageService.importStudentsBatch(payload, 'Admin', 'admin');
      setImportProgress(100);

      setTimeout(() => {
        setIsProcessing(false);
        onSuccess(created.length);
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Import failed:', err);
      setIsProcessing(false);
      setError(`Batch import error: ${err.message || 'Could not save to Firestore'}`);
    }
  };

  const validCount = candidates.filter(c => c.isValid).length;
  const invalidCount = candidates.length - validCount;
  const duplicateCount = candidates.filter(c => c.isDuplicateRoll).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-[95%] max-w-4xl mx-auto shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-fadeIn text-slate-800 dark:text-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-emerald-950 dark:bg-emerald-950/95 text-white flex items-center justify-between gap-3 border-b border-emerald-900/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base tracking-tight text-white">
                  Excel Bulk Student Upload (.xlsx)
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 whitespace-nowrap">
                  FIRESTORE BATCH SYNC
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-200/80 mt-0.5 truncate sm:overflow-visible">
                Import candidates in bulk with automatic ZKTeco K40 biometric enrollment queuing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-900/60 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Bar: Download Sample Template + Template Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Excel Format Specification
                </span>
                <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Columns supported: <strong>Roll No, Full Name, Father Name, Batch, Course Level, Parent WhatsApp, Contact, Email, Notes</strong>.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-500/40 transition-all cursor-pointer shadow-xs shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel Template</span>
            </button>
          </div>

          {/* Dropzone Upload Box */}
          {candidates.length === 0 ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
              }`}
            >
              <div className="p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 shadow-sm">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Drop your students .xlsx or .xls file here, or <span className="text-emerald-600 dark:text-emerald-400 underline">browse</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Supports Microsoft Excel (.xlsx, .xls) and CSV files
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info & Statistics Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">{fileName}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {candidates.length} candidates loaded
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{validCount} Ready to Import</span>
                  </div>
                  {duplicateCount > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{duplicateCount} Duplicate Rolls</span>
                    </div>
                  )}
                  {invalidCount > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold">
                      <X className="w-3.5 h-3.5" />
                      <span>{invalidCount} Missing Fields</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCandidates([]);
                      setFile(null);
                      setFileName('');
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Upload different file"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Initial Status Configuration */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Initial Enrollment Status for Imported Students
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      ZKTeco K40 biometric verification workflow
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInitialStatus('Pending Verification')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      initialStatus === 'Pending Verification'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Pending Verification (K40 Required)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialStatus('Active')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      initialStatus === 'Active'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Active Immediately
                  </button>
                </div>
              </div>

              {/* Preview Table of Parsed Rows */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="max-h-64 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                        <th className="p-3 w-8">#</th>
                        <th className="p-3">Roll No</th>
                        <th className="p-3">Candidate Name</th>
                        <th className="p-3">Father Name</th>
                        <th className="p-3">Assigned Batch</th>
                        <th className="p-3">Level</th>
                        <th className="p-3">WhatsApp</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {candidates.map((c, index) => (
                        <tr 
                          key={c.id} 
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            !c.isValid ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                          }`}
                        >
                          <td className="p-3 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-950/90 via-slate-900 to-slate-900 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-semibold tracking-wide whitespace-nowrap shadow-xs">
                              {c.rollNumber}
                            </span>
                            {c.isDuplicateRoll && (
                              <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-sans font-normal mt-0.5">
                                Duplicate in system
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900 dark:text-white block">{c.fullName || '—'}</span>
                            {c.koreanName && (
                              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-korean">{c.koreanName}</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">{c.fatherName || '—'}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px] truncate max-w-[140px]">
                            {c.batch.split(' (')[0]}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px] truncate max-w-[140px]">
                            {c.level.split(' - ')[0]}
                          </td>
                          <td className="p-3 font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                            {c.parentWhatsApp}
                          </td>
                          <td className="p-3">
                            {c.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-500/30">
                                <Check className="w-3 h-3" />
                                Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-300 dark:border-rose-500/30">
                                {c.validationError}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeCandidate(c.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Remove row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {candidates.length > 0 && (
              <span>
                Ready to sync <strong>{validCount}</strong> candidate{validCount === 1 ? '' : 's'} to Firestore students collection.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={validCount === 0 || isProcessing}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                validCount === 0 || isProcessing
                  ? 'bg-emerald-400 dark:bg-emerald-800 opacity-60 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Syncing {validCount} to Firestore...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Import {validCount} Students to Firestore</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
export default ExcelImportModal;
