import React, { createContext, useContext, useState, useEffect } from 'react';
import { LanguageCode } from '../types';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  isUrdu: boolean;
}

const STORAGE_KEY = 'ok_korean_language_pref';

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.students': 'Student Directory',
    'nav.attendance': 'Daily Attendance',
    'nav.tests': 'Weekly Tests',
    'nav.fees': 'Fees Management',
    'nav.reports': 'PDF Reports',
    'nav.whatsapp': 'WhatsApp Hub',
    'nav.settings': 'Settings',
    'nav.teachers': 'Faculty Accounts',
    'nav.signOut': 'Sign Out',
    'nav.topikPrep': 'TOPIK Prep 2026/27',
    'nav.activeTerm': 'Term 3 in session. EPS-TOPIK employment batches scheduled.',
    
    // Header & Titles
    'header.title.dashboard': 'Executive Dashboard',
    'header.sub.dashboard': 'Academy overview and key operational statistics',
    'header.title.students': 'Student Directory',
    'header.sub.students': 'Candidate admissions, course level and records',
    'header.title.attendance': 'Daily Attendance Hub',
    'header.sub.attendance': 'Real-time batch presence tracking & logs',
    'header.title.tests': 'Weekly Test Evaluations',
    'header.sub.tests': 'Vocabulary, grammar, reading & listening assessment',
    'header.title.fees': 'Tuition & Fees Ledger',
    'header.sub.fees': 'PKR fee invoicing, payments ledger and arrears',
    'header.title.reports': 'Academic Report Cards',
    'header.sub.reports': 'Weekly and monthly certified PDF report cards',
    'header.title.whatsapp': 'Parent WhatsApp Hub',
    'header.sub.whatsapp': 'Instant automated progress and attendance alerts',
    'header.title.settings': 'Academy Settings',
    'header.sub.settings': 'Institutional info, teacher access, and language',

    // Dashboard
    'dash.welcome': 'Welcome back',
    'dash.totalStudents': 'Total Enrolled',
    'dash.todayAttendance': "Today's Attendance",
    'dash.feesCollected': 'Fees Collected',
    'dash.pendingDues': 'Pending Dues',
    'dash.avgScore': 'Average Test Score',
    'dash.topPerformer': 'Leaderboard Top',
    'dash.analytics': 'Academic & Attendance Analytics',
    'dash.weeklyAttendance': 'Weekly Attendance %',
    'dash.testScores': 'Test Scores Avg',
    'dash.activityFeed': 'Recent Activity Feed',
    'dash.markAttendance': "Mark Today's Attendance",
    'dash.recordTest': 'Record Weekly Test',
    'dash.timetable': 'Active Batch Timetable & Capacity',
    'dash.studentsUnit': 'Students',
    
    // Auth & Portals
    'auth.welcomeTitle': 'Empowering students to master Korean fluently.',
    'auth.adminPortal': 'Admin Portal',
    'auth.teacherPortal': 'Teacher Portal',
    'auth.username': 'Username / Identifier',
    'auth.password': 'Password',
    'auth.signIn': 'Sign In to Portal',
    'auth.secProtocol': 'Security Protocol v4.2 · Session Guard',

    // Actions
    'btn.save': 'Save',
    'btn.cancel': 'Cancel',
    'btn.edit': 'Edit',
    'btn.delete': 'Delete',
    'btn.downloadPdf': 'Download PDF Report',
    'btn.print': 'Print Report',
    'btn.search': 'Search...',
    'btn.filter': 'Filter',
    'btn.reset': 'Reset',
    'btn.addStudent': 'Enroll New Student',
    'btn.createInvoice': 'Generate Invoice',
    'btn.recordPayment': 'Record Payment',
    'btn.markAllPresent': 'Mark All Present',
    'btn.saveAttendance': 'Save Attendance',
    'btn.recordNewTest': 'Record New Test',
    'btn.sendWhatsApp': 'Send on WhatsApp',

    // Language names
    'lang.en': 'English',
    'lang.kr': '한국어 (Korean)',
    'lang.ur': 'اردو (Urdu)',
  },
  kr: {
    // Navigation
    'nav.dashboard': '대시보드',
    'nav.students': '원생 명부',
    'nav.attendance': '출석 관리',
    'nav.tests': '주간 시험',
    'nav.fees': '수강료 관리',
    'nav.reports': '성적표 발급',
    'nav.whatsapp': '학부모 소통',
    'nav.settings': '학원 설정',
    'nav.teachers': '강사진 계정 관리',
    'nav.signOut': '로그아웃',
    'nav.topikPrep': 'TOPIK / EPS 대비 과정',
    'nav.activeTerm': '3학기 진행 중. EPS-TOPIK 취업 비자반 정규 수업.',

    // Header & Titles
    'header.title.dashboard': '학원 종합 대시보드',
    'header.sub.dashboard': '학원 전체 현황 및 핵심 통계',
    'header.title.students': '원생 관리 명부',
    'header.sub.students': '입학 등록, 반 배정 및 학습자 신상',
    'header.title.attendance': '출결 관리 허브',
    'header.sub.attendance': '실시간 반별 출석 체크 및 출결 현황',
    'header.title.tests': '주간 성적 평가',
    'header.sub.tests': '어휘, 문법, 읽기, 듣기 성적 평가 및 석차',
    'header.title.fees': '수강료 및 학비 수납장',
    'header.sub.fees': '수강료 청구, 납부 내역 및 미납금 관리 (PKR)',
    'header.title.reports': '공식 성적표 발급',
    'header.sub.reports': '주간 및 월간 종합 학업 리포트 PDF 출력',
    'header.title.whatsapp': '학부모 WhatsApp 허브',
    'header.sub.whatsapp': '출결, 시험 결과 및 학비 알림 자동 발송',
    'header.title.settings': '학원 운영 설정',
    'header.sub.settings': '기관 정보, 강사 권한 설정 및 언어 변경',

    // Dashboard
    'dash.welcome': '환영합니다',
    'dash.totalStudents': '총 등록 원생',
    'dash.todayAttendance': '오늘의 출석률',
    'dash.feesCollected': '수납 완료액',
    'dash.pendingDues': '미납 수강료',
    'dash.avgScore': '평균 시험 성적',
    'dash.topPerformer': '수석 우수 원생',
    'dash.analytics': '학습 및 출석 종합 분석',
    'dash.weeklyAttendance': '주간 출석률 %',
    'dash.testScores': '주간 시험 평균',
    'dash.activityFeed': '최근 활동 내역',
    'dash.markAttendance': '오늘의 출석 체크',
    'dash.recordTest': '주간 시험 점수 입력',
    'dash.timetable': '현재 반별 강의 시간표 및 수용 현황',
    'dash.studentsUnit': '명',

    // Auth & Portals
    'auth.welcomeTitle': '한국어 마스터를 위한 최고의 교육 파트너',
    'auth.adminPortal': '관리자 포털',
    'auth.teacherPortal': '강사 전용 포털',
    'auth.username': '아이디 / 사용자명',
    'auth.password': '비밀번호',
    'auth.signIn': '포털 로그인',
    'auth.secProtocol': '보안 프로토콜 v4.2 적용',

    // Actions
    'btn.save': '저장하기',
    'btn.cancel': '취소',
    'btn.edit': '수정',
    'btn.delete': '삭제',
    'btn.downloadPdf': 'PDF 성적표 다운로드',
    'btn.print': '인쇄하기',
    'btn.search': '검색...',
    'btn.filter': '필터',
    'btn.reset': '초기화',
    'btn.addStudent': '신규 원생 등록',
    'btn.createInvoice': '수강료 청구서 발행',
    'btn.recordPayment': '수납 확인 등록',
    'btn.markAllPresent': '전원 출석 체크',
    'btn.saveAttendance': '출석 저장하기',
    'btn.recordNewTest': '새 시험 결과 입력',
    'btn.sendWhatsApp': 'WhatsApp 알림 전송',

    // Language names
    'lang.en': 'English (영어)',
    'lang.kr': '한국어 (Korean)',
    'lang.ur': 'اردو (우르두어)',
  },
  ur: {
    // Navigation
    'nav.dashboard': 'ڈیش بورڈ',
    'nav.students': 'طلباء کی ڈائرکٹری',
    'nav.attendance': 'روزانہ حاضری',
    'nav.tests': 'ہفتہ وار ٹیسٹ',
    'nav.fees': 'فیس مینجمنٹ',
    'nav.reports': 'پی ڈی ایف رپورٹس',
    'nav.whatsapp': 'واٹس ایپ ہب',
    'nav.settings': 'سیٹنگز',
    'nav.teachers': 'اساتذہ کے اکاؤنٹس',
    'nav.signOut': 'سائن آؤٹ',
    'nav.topikPrep': 'ٹوپک امتحان تیاری 2026/27',
    'nav.activeTerm': 'کورین زبان اور EPS-TOPIK کلاسز جاری ہیں۔',

    // Header & Titles
    'header.title.dashboard': 'ایگزیکٹو ڈیش بورڈ',
    'header.sub.dashboard': 'اکیڈمی کا مجموعی جائزہ اور اعداد و شمار',
    'header.title.students': 'طلباء کی ڈائرکٹری',
    'header.sub.students': 'طلباء کے اندراج، لیول اور مکمل معلومات',
    'header.title.attendance': 'روزانہ حاضری پورٹل',
    'header.sub.attendance': 'بیچ وائز لائیو حاضری اور تاریخ وار ریکارڈ',
    'header.title.tests': 'ہفتہ وار امتحانات',
    'header.sub.tests': 'الفاظ، گرامر، ریڈنگ اور بولنے کے نمبرات',
    'header.title.fees': 'فیس اور واجبات لیجر',
    'header.sub.fees': 'پاکستانی روپے (PKR) میں فیس کا ریکارڈ اور رسید',
    'header.title.reports': 'تعلیمی رپورٹ کارڈز',
    'header.sub.reports': 'ہفتہ وار اور ماہانہ مصدقہ پی ڈی ایف رپورٹ کارڈ',
    'header.title.whatsapp': 'والدین واٹس ایپ رابطہ',
    'header.sub.whatsapp': 'حاضری، نتائج اور فیس کی خودکار معلومات',
    'header.title.settings': 'اکیڈمی سیٹنگز',
    'header.sub.settings': 'اساتذہ کی اجازت، فیس اور نظام کی ترتیبات',

    // Dashboard
    'dash.welcome': 'خوش آمدید',
    'dash.totalStudents': 'کل طلباء',
    'dash.todayAttendance': 'آج کی حاضری',
    'dash.feesCollected': 'وصول شدہ فیس',
    'dash.pendingDues': 'باقی واجبات',
    'dash.avgScore': 'اوسط ٹیسٹ اسکور',
    'dash.topPerformer': 'نمایاں پوزیشن',
    'dash.analytics': 'تعلیمی اور حاضری کا تجزیہ',
    'dash.weeklyAttendance': 'ہفتہ وار حاضری فیصد',
    'dash.testScores': 'ٹیسٹ اوسط اسکور',
    'dash.activityFeed': 'حالیہ سرگرمیاں',
    'dash.markAttendance': 'آج کی حاضری لگائیں',
    'dash.recordTest': 'ٹیسٹ نمبر درج کریں',
    'dash.timetable': 'کلاسوں کا شیڈول اور اوقات',
    'dash.studentsUnit': 'طلباء',

    // Auth & Portals
    'auth.welcomeTitle': 'اوکے کورین لینگویج سینٹر میں خوش آمدید',
    'auth.adminPortal': 'ایڈمن پورٹل',
    'auth.teacherPortal': 'ٹیچر پورٹل',
    'auth.username': 'صارف کا نام (Username)',
    'auth.password': 'پاس ورڈ (Password)',
    'auth.signIn': 'پورٹل میں داخل ہوں',
    'auth.secProtocol': 'محفوظ تصدیقی پروٹوکول v4.2',

    // Actions
    'btn.save': 'محفوظ کریں',
    'btn.cancel': 'منسوخ کریں',
    'btn.edit': 'تبدیل کریں',
    'btn.delete': 'حذف کریں',
    'btn.downloadPdf': 'پی ڈی ایف ڈاؤن لوڈ کریں',
    'btn.print': 'پرنٹ کریں',
    'btn.search': 'تلاش کریں...',
    'btn.filter': 'فلٹر',
    'btn.reset': 'ری سیٹ',
    'btn.addStudent': 'نیا طالب علم داخل کریں',
    'btn.createInvoice': 'فیس واؤچر بنائیں',
    'btn.recordPayment': 'فیس وصولی درج کریں',
    'btn.markAllPresent': 'سب کو حاضر مارک کریں',
    'btn.saveAttendance': 'حاضری محفوظ کریں',
    'btn.recordNewTest': 'نیا ٹیسٹ ریکارڈ کریں',
    'btn.sendWhatsApp': 'واٹس ایپ پر بھیجیں',

    // Language names
    'lang.en': 'انگریزی (English)',
    'lang.kr': 'کورین (한국어)',
    'lang.ur': 'اردو (Urdu)',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return (saved === 'kr' || saved === 'ur' || saved === 'en') ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      console.error(e);
    }
  };

  const t = (key: string): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isUrdu: language === 'ur' }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
