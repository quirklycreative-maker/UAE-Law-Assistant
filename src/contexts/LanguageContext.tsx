import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRtl: boolean;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    appName: "JusticeFlow UAE",
    home: "Home",
    findLawyer: "Find a Lawyer",
    myBookings: "My Bookings",
    login: "Login",
    register: "Register",
    logout: "Logout",
    heroTitle: "UAE Law, Explained.",
    heroSubtitle: "Instant, verified legal guidance based on Federal and Local UAE legislation. Navigate your legal journey with confidence.",
    startChat: "Start Legal Consultation",
    howItWorks: "How It Works",
    expertLawyers: "150+ Expert Lawyers",
    verifiedLaws: "Verified UAE Laws",
    instantAdvice: "Instant AI Advice",
    askAssistant: "Ask the Assistant",
    typeMessage: "Ask about a specific law or situation...",
    findExpert: "Find Expert",
    needMoreDetail: "Need more detail?",
    formalAssessment: "Formal Assessment",
    consultProfessional: "Consult with a verified professional for binding advice.",
    expertCounsel: "Expert Legal Counsel",
    vettedPros: "Vetted professionals specialized in UAE laws, ready to assist your specific needs.",
    bookConsult: "Book Consultation",
    signInToView: "Sign in to view appointments",
    startListening: "Start listening...",
    stopListening: "Stop listening",
    voiceMode: "Voice Mode",
    enableVoice: "Enable Voice Output",
    uploadPdf: "Upload PDF Document",
    documentAttached: "Document attached",
    removeDocument: "Remove document",
    analyzingDoc: "Analyzing document...",
    uploadImage: "Upload Image",
    takePhoto: "Take Photo",
    imageAttached: "Image attached",
    shareLink: "Share Link",
    copied: "Copied!",
    currency: "AED",
    feePerSession: "Fee per session",
    bookSession: "Book Session",
    specialization: "Specialization",
    maxPrice: "Max Price",
    minRating: "Min Rating",
    anyRating: "Any Rating",
    resetFilters: "Reset Filters",
    noLawyersFound: "No lawyers found",
    adjustFilters: "Try adjusting your filters to find more experts.",
    showingMatches: "Showing",
    lawyerMatches: "lawyers matches",
    analyzingLegislation: "Analyzing Legislation...",
    legalHistory: "Legal History",
    noConversations: "No conversations yet.",
    messagesExchanged: "messages exchanged",
    recordedOn: "Recorded on",
    caseAnalysisReference: "Case Analysis Reference",
    privacySafeguard: "Privacy Safeguard",
    privacyNote: "For your security, original legal documents uploaded during this session were processed strictly in-memory and have been purged from our systems. Only the textual analysis and AI response are retained for your reference.",
    inquiry: "Inquiry",
    systemResponse: "System Response",
  },
  ar: {
    appName: "جاستس فلو الإمارات",
    home: "الرئيسية",
    findLawyer: "ابحث عن محامٍ",
    myBookings: "حجوزاتي",
    login: "تسجيل الدخول",
    register: "التسجيل",
    logout: "تسجيل الخروج",
    heroTitle: "قوانين الإمارات، مبسطة.",
    heroSubtitle: "إرشادات قانونية فورية وموثقة بناءً على التشريعات الاتحادية والمحلية لدولة الإمارات. ابدأ رحلتك القانونية بثقة.",
    startChat: "ابدأ الاستشارة القانونية",
    howItWorks: "كيف يعمل النظام",
    expertLawyers: "أكثر من 150 محامٍ خبير",
    verifiedLaws: "قوانين إماراتية موثقة",
    instantAdvice: "نصيحة فورية بالذكاء الاصطناعي",
    askAssistant: "اسأل المساعد",
    typeMessage: "اسأل عن قانون محدد أو موقف قانوني...",
    findExpert: "ابحث عن خبير",
    needMoreDetail: "هل تحتاج إلى مزيد من التفاصيل؟",
    formalAssessment: "تقييم رسمي",
    consultProfessional: "استشر متخصصاً معتمداً للحصول على نصيحة ملزمة.",
    expertCounsel: "استشارات قانونية من خبراء",
    vettedPros: "متخصصون معتمدون في قوانين الإمارات، جاهزون لمساعدتك.",
    bookConsult: "حجز استشارة",
    signInToView: "سجل الدخول لعرض المواعيد",
    startListening: "بدء الاستماع...",
    stopListening: "إيقاف الاستماع",
    voiceMode: "الوضع الصوتي",
    enableVoice: "تفعيل الإخراج الصوتي",
    uploadPdf: "تحميل مستند PDF",
    documentAttached: "المستند مرفق",
    removeDocument: "إزالة المستند",
    analyzingDoc: "جاري تحليل المستند...",
    uploadImage: "تحميل صورة",
    takePhoto: "التقاط صورة",
    imageAttached: "الصورة مرفقة",
    shareLink: "مشاركة الرابط",
    copied: "تم النسخ!",
    currency: "درهم",
    feePerSession: "رسوم الجلسة",
    bookSession: "حجز جلسة",
    specialization: "التخصص",
    maxPrice: "السعر الأقصى",
    minRating: "التقييم الأدنى",
    anyRating: "أي تقييم",
    resetFilters: "إعادة ضبط الفلاتر",
    noLawyersFound: "لم يتم العثور على محامين",
    adjustFilters: "حاول تعديل الفلاتر للعثور على المزيد من الخبراء.",
    showingMatches: "عرض",
    lawyerMatches: "محامين مطابقين",
    analyzingLegislation: "جاري تحليل التشريعات...",
    legalHistory: "السجل القانوني",
    noConversations: "لا توجد محادثات بعد.",
    messagesExchanged: "رسائل متبادلة",
    recordedOn: "سجل في",
    caseAnalysisReference: "مرجع تحليل الحالة",
    privacySafeguard: "ضمان الخصوصية",
    privacyNote: "لأمانك، تم التعامل مع المستندات القانونية الأصلية المحملة خلال هذه الجلسة في الذاكرة فقط وتم مسحها من أنظمتنا. يتم الاحتفاظ فقط بالتحليل النصي واستجابة الذكاء الاصطناعي للرجوع إليها.",
    inquiry: "استفسار",
    systemResponse: "استجابة النظام",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app_lang', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => translations[language][key] || key;
  const isRtl = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRtl, t }}>
      <div className={isRtl ? 'font-arabic' : 'font-sans'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
