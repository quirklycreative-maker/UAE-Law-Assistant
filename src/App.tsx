import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Layout from "./components/Layout";
import { Search, MessageSquare, Scale, Users, Gavel, ShieldCheck, ArrowRight, Send, Loader2, Calendar, CheckCircle2, Briefcase, Mic, MicOff, Volume2, VolumeX, FileText, X, Paperclip, Camera, Image as ImageIcon, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getLegalAdvice } from "./services/legalService";
import { searchLocalLegislation, formatLawsForContext } from "./services/legislationService";
import ReactMarkdown from "react-markdown";
import LawyerCard from "./components/LawyerCard";
import { cn } from "./lib/utils";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, signInWithGoogle, handleFirestoreError, OperationType } from "./lib/firebase";
import { collection, addDoc, query, where, getDocs, onSnapshot, orderBy, serverTimestamp, updateDoc, doc, setDoc } from "firebase/firestore";
import { useLanguage } from "./contexts/LanguageContext";
import { extractTextFromPdf } from "./lib/pdfUtils";
import History from "./pages/History";

// --- Mock Data ---
const MOCK_LAWYERS = [
  {
    id: "1",
    name: "Adv. Sarah Al-Mansoori",
    specialization: "Corporate & Commercial",
    rating: 4.9,
    reviews: 124,
    price: 450,
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
    bio: "Specializing in UAE commercial law and business setups. Expert in navigating free zone regulations."
  },
  {
    id: "2",
    name: "Dr. Omar Khouri",
    specialization: "Family Law",
    rating: 4.8,
    reviews: 89,
    price: 350,
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400",
    bio: "Compassionate legal support for family matters, including personal status laws and inheritance."
  },
  {
    id: "3",
    name: "Layla Rashid",
    specialization: "Criminal & Defense",
    rating: 4.7,
    reviews: 210,
    price: 600,
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400",
    bio: "Dedicated litigator with extensive experience in criminal courts across all emirates."
  },
  {
    id: "4",
    name: "Ahmed Al-Farsi",
    specialization: "Real Estate & Property",
    rating: 4.6,
    reviews: 67,
    price: 400,
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400",
    bio: "Helping investors and residents with UAE property disputes, title transfers, and rental litigations."
  }
];

const LAW_CATEGORIES = [
  { id: "labor", name: "Labor Law", icon: Briefcase, desc: "Private sector employment relations, contracts, and gratuity." },
  { id: "commercial", name: "Commercial Law", icon: Scale, desc: "Business regulations, companies, and commercial agency laws." },
  { id: "property", name: "Property & Real Estate", icon: ShieldCheck, desc: "Laws governing ownership, tenancy, and real estate development." },
  { id: "civil", name: "Civil Transactions", icon: Gavel, desc: "General civil rights, obligations, and contract laws." },
  { id: "criminal", name: "Criminal Law", icon: ShieldCheck, desc: "UAE penal code, crimes, and legal procedures." },
  { id: "personal", name: "Personal Status", icon: Users, desc: "Marriage, divorce, inheritance, and child custody." }
];

// --- Sub-Pages ---

function BrowseLaws() {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto px-4 py-16 space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-slate-900">UAE Legislation Directory</h2>
        <p className="text-slate-500 max-w-2xl mx-auto">Explore and search through the comprehensive library of UAE Federal and Local laws.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {LAW_CATEGORIES.map(cat => (
          <motion.div 
            key={cat.id} 
            whileHover={{ y: -5 }}
            className="p-8 bg-white border border-slate-200 rounded-3xl cursor-pointer hover:border-indigo-400 group"
            onClick={() => navigate(`/assistant?q=Tell me about the ${cat.name} in UAE`)}
          >
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <cat.icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">{cat.name}</h3>
            <p className="text-sm text-slate-500 line-clamp-3">{cat.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { t, isRtl } = useLanguage();

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative h-[500px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=2000" 
            className="w-full h-full object-cover brightness-[0.4]"
            alt="Dubai skyline"
          />
        </div>
        <div className="container mx-auto px-6 relative z-10 text-white space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-3xl space-y-4"
          >
            <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
              {t("heroTitle")}
              <br />
              <span className="text-emerald-400">JusticeFlow UAE</span>
            </h1>
            <p className="text-lg text-slate-300 max-w-xl font-medium">
              {t("heroSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={() => navigate("/assistant")}
                className="px-6 py-3 bg-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-900/20"
              >
                {t("startChat")} <ArrowRight className={cn("w-4 h-4", isRtl && "rotate-180")} />
              </button>
              <button 
                onClick={() => navigate("/lawyers")}
                className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-2 text-sm"
              >
                {t("findLawyer")}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-xl w-full bg-white rounded-xl p-1.5 shadow-2xl flex items-center border border-slate-200"
          >
            <Search className="w-5 h-5 text-slate-400 mx-4" />
            <input 
              type="text" 
              placeholder={t("typeMessage")}
              className="flex-1 py-3 text-slate-900 outline-none placeholder:text-slate-400 font-medium text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/assistant?q=${searchQuery}`)}
            />
            <button 
              onClick={() => navigate(`/assistant?q=${searchQuery}`)}
              className="px-5 py-2.5 bg-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-800 transition-colors text-sm"
            >
              Analyze
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6">
        <div className="text-center space-y-2 mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">{t("howItWorks")}</h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm font-medium">Providing a seamless bridge between complex legislation and professional legal advice.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: MessageSquare, title: t("instantAdvice"), desc: "Instantly summarize UAE laws relevant to your specific situation with direct article references." },
            { icon: ShieldCheck, title: t("verifiedLaws"), desc: "Onboarded and verified legal professionals specialized in various fields of UAE law." },
            { icon: Gavel, title: t("expertLawyers"), desc: "Securely book and pay for legal consultations directly through the platform." }
          ].map((f, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all space-y-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-700">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Statistics */}
      <section className="bg-slate-900 py-16 text-white">
        <div className="container mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {[
            { label: t("verifiedLaws"), val: "5,000+" },
            { label: t("expertLawyers"), val: "150+" },
            { label: "Consultations", val: "12k+" },
            { label: "Client Rating", val: "4.9/5" }
          ].map((s, i) => (
            <div key={i} className="space-y-1">
              <div className="text-3xl font-bold text-emerald-500">{s.val}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Assistant() {
  const navigate = useNavigate();
  const { t, language, isRtl } = useLanguage();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [pdfContent, setPdfContent] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [user] = useAuthState(auth);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Disabled pull-to-refresh as it was causing UX issues and clearing chat accidentally
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Disabled pull-to-refresh
  };

  const handleTouchEnd = () => {
    // Disabled pull-to-refresh
  };

  const handleReload = () => {
    setIsRefreshing(true);
    setMessages([]);
    setAttachedFile(null);
    setCurrentChatId(null);
    setAttachedImage(null);
    setPdfContent(null);
    setInput("");
    setMicError(null);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const isSending = useRef(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const initSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError("Speech recognition not supported.");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === 'ar' ? 'ar-AE' : 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setMicError(null);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      handleSend(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      
      const errorMap: Record<string, string> = {
        'not-allowed': "Microphone blocked. Use 'Open in New Tab' to bypass iframe restrictions.",
        'service-not-allowed': "Speech service blocked by browser policy.",
        'no-speech': "", 
        'network': "Speech network error. Check your connection.",
        'audio-capture': "Microphone busy or not found.",
      };

      if (event.error !== 'no-speech') {
        setMicError(errorMap[event.error] || `Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
  };

  const toggleListening = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.error("Stop error:", e);
      }
      setIsListening(false);
    } else {
      setMicError(null);
      const recognition = initSpeechRecognition();
      if (recognition) {
        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch (e) {
          console.error("Launch error:", e);
          if (!isListening) {
            setMicError("Mic initialization failed.");
          }
        }
      }
    }
  };

  const speak = (text: string) => {
    if (!voiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'ar' ? 'ar-SA' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q && !isSending.current) {
      handleSend(q);
    }
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      try {
        setIsExtracting(true);
        setAttachedFile(file);
        const text = await extractTextFromPdf(file);
        setPdfContent(text);
      } catch (error) {
        console.error("PDF Error:", error);
        alert("Could not process PDF. Please try another file.");
      } finally {
        setIsExtracting(false);
      }
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
        setAttachedFile(null); // Clear PDF if image is selected
        setPdfContent(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setAttachedFile(null);
    setAttachedImage(null);
    setPdfContent(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSend = async (text: string = input) => {
    if ((!text.trim() && !pdfContent) || isLoading || isSending.current) return;
    
    setMicError(null);
    isSending.current = true;
    setInput("");
    
    const userMessage = attachedFile 
      ? `${text}\n\n[Attached Document: ${attachedFile.name}]`
      : attachedImage
        ? `${text}\n\n[Attached Image]`
        : text;

    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ 
        role: m.role === 'user' ? 'user' : 'model', 
        text: m.text 
      }));

      // Combine input with PDF content if available
      let fullPrompt = text;
      if (pdfContent) {
        fullPrompt = `I have attached a legal document for analysis. 
        DOCUMENT CONTENT:
        ${pdfContent}
        
        USER QUESTION:
        ${text || "Please analyze this document and summarize the key legal points."}`;
      }

      // Perform RAG search
      const localLaws = await searchLocalLegislation(text || "legal document analysis");
      const context = formatLawsForContext(localLaws);

      const advice = await getLegalAdvice(fullPrompt, history, context, language, attachedImage || undefined);
      setMessages(prev => [...prev, { role: 'model', text: advice }]);
      
      if (voiceEnabled) {
        speak(advice);
      }

      // Clear the file after sending
      removeFile();

      // Save to Firestore if logged in
      if (user) {
        const chatData = {
          userId: user.uid,
          messages: [...messages, { role: 'user', text: userMessage }, { role: 'model', text: advice }],
          updatedAt: serverTimestamp(),
          createdAt: currentChatId ? undefined : serverTimestamp()
        };

        const path = "ai_conversations";
        try {
          if (currentChatId) {
            await updateDoc(doc(db, path, currentChatId), chatData);
          } else {
            const docRef = await addDoc(collection(db, path), chatData);
            setCurrentChatId(docRef.id);
          }
        } catch (err) {
          handleFirestoreError(err, currentChatId ? OperationType.UPDATE : OperationType.CREATE, path);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      if (error instanceof Error && error.message.includes("unavailable")) {
        setIsOnline(false);
        setMicError("Cloud synchronization paused (Offline)");
      }
    } finally {
      setIsLoading(false);
      isSending.current = false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden">
      <motion.div 
        className="absolute top-0 left-0 right-0 flex justify-center py-4 pointer-events-none z-10"
        style={{ opacity: pullDistance / 60, y: pullDistance - 40 }}
      >
        <RefreshCw className={cn("w-6 h-6 text-emerald-600", isRefreshing && "animate-spin")} />
      </motion.div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-8 space-y-6 pb-36 scrollbar-hide chat-container"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-8 opacity-90">
            <div className="p-5 bg-emerald-50 rounded-2xl text-emerald-700">
              <MessageSquare className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t("askAssistant")}</h2>
              <p className="max-w-md text-sm text-slate-500 font-medium">Describe your situation or specific law articles for instant analysis.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-4">
              {[
                language === 'en' ? "What are my rights as a tenant in Dubai?" : "ما هي حقوقي كمستأجر في دبي؟",
                language === 'en' ? "UAE Labor Law on end-of-service gratuity" : "قانون العمل الإماراتي بشأن مكافأة نهاية الخدمة",
                language === 'en' ? "Setting up a business in a Free Zone" : "تأسيس عمل تجاري في منطقة حرة",
                language === 'en' ? "Inheritance laws for expats in UAE" : "قوانين الميراث للوافدين في الإمارات"
              ].map(q => (
                <button 
                  key={q} 
                  onClick={() => handleSend(q)}
                  className="p-5 text-sm font-medium bg-white border border-slate-200 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50/30 transition-all text-left shadow-sm shadow-slate-100"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-4", m.role === 'user' ? (isRtl ? "flex-row" : "flex-row-reverse") : (isRtl ? "flex-row-reverse" : "flex-row"))}>
            <div className={cn(
              "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1",
              m.role === 'user' ? "bg-slate-200" : "bg-emerald-100 text-emerald-700"
            )}>
              {m.role === 'user' ? null : <Scale className="w-4 h-4" />}
            </div>
            <div className={cn(
              "max-w-[85%] rounded-2xl p-5 shadow-sm text-sm leading-relaxed",
              m.role === 'user' 
                ? "bg-slate-100 text-slate-700 rounded-tr-none" 
                : "bg-white border border-emerald-100 rounded-tl-none text-slate-800"
            )}>
              {m.role === 'user' ? (
                <p className="whitespace-pre-wrap font-medium">{m.text}</p>
              ) : (
                <>
                  <div className={cn("prose prose-sm prose-emerald max-w-none prose-p:leading-relaxed prose-headings:mb-3 prose-headings:mt-6 first:prose-headings:mt-0", isRtl && "text-right")}>
                    <ReactMarkdown
                      components={{
                        strong: ({node, ...props}) => <strong className="text-emerald-900 font-extrabold bg-emerald-50 px-1 rounded" {...props} />,
                        code: ({node, ...props}) => <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[11px] border border-slate-200" {...props} />,
                        blockquote: ({node, ...props}) => (
                          <blockquote className={cn("border-emerald-500 bg-emerald-50/30 p-4 italic text-emerald-900 my-4", isRtl ? "border-r-4 rounded-l-xl text-right" : "border-l-4 rounded-r-xl text-left")} {...props} />
                        ),
                        h1: ({node, ...props}) => <h1 className="text-lg font-bold text-slate-900" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-base font-bold text-slate-900" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-sm font-bold text-slate-900 underline decoration-emerald-200 underline-offset-4" {...props} />,
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  </div>
                  <div className="mt-6 pt-4 border-t border-emerald-50 flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t("formalAssessment")}</span>
                      <span className="text-[9px] text-slate-400">{t("consultProfessional")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={() => speak(m.text)}
                        className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Read aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => navigate("/lawyers")}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10 whitespace-nowrap"
                      >
                        {t("findExpert")} <ArrowRight className={cn("w-3.5 h-3.5", isRtl && "rotate-180")} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className={cn("flex gap-4", isRtl ? "flex-row-reverse" : "flex-row")}>
             <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center animate-pulse">
                <Scale className="w-4 h-4" />
             </div>
            <div className="bg-white border border-emerald-100 rounded-2xl rounded-tl-none p-5 flex items-center gap-3 shadow-sm">
              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Analyzing Legislation...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent pt-10">
        <form 
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 p-2 shadow-2xl rounded-2xl max-w-3xl mx-auto w-full flex flex-col gap-2"
        >
        <AnimatePresence>
          {(attachedFile || attachedImage) && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-4 py-2 border-b border-slate-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 overflow-hidden text-lg">
                  {attachedFile ? "📄" : (attachedImage ? <img src={attachedImage} className="w-full h-full object-cover" alt="attachment" /> : "📁")}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {attachedFile ? t("documentAttached") : t("imageAttached")}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[200px]">
                      {attachedFile ? attachedFile.name : "Document Image"}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[9px] font-bold border border-emerald-100">
                      EPHEMERAL
                    </span>
                  </div>
                </div>
                {isExtracting && (
                  <span className="text-[10px] text-emerald-600 font-bold animate-pulse ml-2">{t("analyzingDoc")}</span>
                )}
              </div>
              <button 
                type="button"
                onClick={removeFile}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-2">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf"
            className="hidden"
          />
          <input 
            type="file" 
            ref={imageInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />
          <input 
            type="file" 
            ref={cameraInputRef}
            onChange={handleImageChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
          
          <div className="flex items-center justify-between px-2 pb-1">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Privacy First: Docs processed in-memory & never stored
            </div>
            {!isOnline && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Connection Issue: Some features limited
              </motion.div>
            )}
            {micError && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100"
              >
                <span>{micError}</span>
                {micError.includes("blocked") && (
                  <button 
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="underline text-red-600 hover:text-red-700 decoration-red-300"
                  >
                    Open in New Tab
                  </button>
                )}
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1">
              <button 
                type="button"
                onClick={handleReload}
                className={cn(
                  "p-2.5 rounded-xl transition-all bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50",
                  isRefreshing && "animate-spin text-emerald-600 bg-emerald-50"
                )}
                title="Reset Chat"
              >
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="w-[1px] h-6 bg-slate-100 mx-1 hidden sm:block" />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "p-2.5 rounded-xl transition-all",
                  attachedFile ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-400 hover:text-slate-600"
                )}
                title={t("uploadPdf")}
              >
                <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button 
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className={cn(
                  "p-2.5 rounded-xl transition-all",
                  attachedImage ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-400 hover:text-slate-600"
                )}
                title={t("uploadImage")}
              >
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="w-[1px] h-6 bg-slate-100 mx-1" />
            
            <button 
              type="button"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                voiceEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-400 hover:text-slate-600"
              )}
              title={t("enableVoice")}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            <button 
              type="button"
              onClick={toggleListening}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                isListening ? "bg-red-50 text-red-600 animate-pulse" : "bg-slate-50 text-slate-400 hover:text-slate-600"
              )}
              title={t("voiceMode")}
            >
              {isListening ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <input 
              type="text" 
              placeholder={isListening ? t("startListening") : t("typeMessage")}
              className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-[13px] sm:text-sm transition-all shadow-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button 
              type="submit"
              disabled={(!input.trim() && !attachedFile && !attachedImage) || isLoading}
              className="p-2.5 sm:p-3 bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-700/20"
            >
              <Send className={cn("w-4 h-4 sm:w-5 sm:h-5", isRtl && "rotate-180")} />
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
  );
}

function Lawyers() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const handleBook = async (lawyerId: string) => {
    if (!user) {
      if (isAuthLoading) return;
      setIsAuthLoading(true);
      try {
        await signInWithGoogle();
      } catch (err) {
        console.error("Lawyers sign-in error:", err);
      } finally {
        setIsAuthLoading(false);
      }
      return;
    }

    const lawyer = MOCK_LAWYERS.find(l => l.id === lawyerId);
    if (!lawyer) return;

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawyerId: lawyer.id,
          lawyerName: lawyer.name,
          price: lawyer.price,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        }),
      });

      const session = await response.json();
      if (session.id) {
        const path = "consultations";
        try {
          await addDoc(collection(db, path), {
            clientId: user.uid,
            lawyerId: lawyer.id,
            lawyerName: lawyer.name,
            price: lawyer.price,
            scheduledAt: new Date(Date.now() + 86400000).toISOString(),
            status: "pending",
            paymentStatus: "paid",
            createdAt: serverTimestamp(),
          });

          alert(`Consultation booked with ${lawyer.name}! Check your appointments.`);
          navigate("/appointments");
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      }
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message.includes("unavailable")) {
        alert("Firestore backend is currently unreachable. Please check your connection.");
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-slate-900">{t("expertCounsel")}</h2>
        <p className="text-slate-500 max-w-2xl mx-auto">{t("vettedPros")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {MOCK_LAWYERS.map(lawyer => (
          <LawyerCard key={lawyer.id} lawyer={lawyer} onBook={handleBook} />
        ))}
      </div>
    </div>
  );
}

function Appointments() {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const path = "consultations";
    const q = query(
      collection(db, path), 
      where("clientId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppointments(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 h-[60vh] flex flex-col items-center justify-center space-y-6">
        <Calendar className="w-16 h-16 text-slate-300" />
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">{t("signInToView")}</h2>
          <p className="text-slate-500">Track your legal consultations and session details.</p>
        </div>
        <button 
          onClick={async () => {
            try {
              await signInWithGoogle();
            } catch (err) {
              console.error("Appointments sign-in error:", err);
            }
          }}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-hover transition-all"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 space-y-8">
      <h2 className="text-3xl font-bold flex items-center gap-3">
        <Calendar className="w-8 h-8 text-indigo-600" />
        My Appointments
      </h2>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-4">
          <p className="text-slate-500">No appointments found. Book a consultation with an expert lawyer.</p>
          <button onClick={() => navigate("/lawyers")} className="text-indigo-600 font-bold hover:underline">Browse Lawyers</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {appointments.map((apt) => (
            <div key={apt.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg">{apt.lawyerName}</h3>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                    apt.status === 'confirmed' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {apt.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {new Date(apt.scheduledAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <div className="flex items-center justify-between pt-4">
                  <span className="text-sm font-semibold text-slate-700">AED {apt.price}</span>
                  <button className="text-sm text-indigo-600 font-bold hover:underline">View Link</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main App ---

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/laws" element={<BrowseLaws />} />
          <Route path="/lawyers" element={<Lawyers />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
