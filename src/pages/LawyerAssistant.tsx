import React, { useState, useEffect, useRef } from "react";
import { 
  Scale, 
  MessageSquare, 
  Send, 
  Loader2, 
  Gavel, 
  ShieldCheck, 
  RefreshCw, 
  Users, 
  ArrowRight,
  FileText,
  Search,
  BookOpen,
  Zap,
  Library,
  ChevronRight,
  Filter,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getLawyerCoPilotAdvice } from "../services/legalService";
import { searchLocalLegislation, formatLawsForContext } from "../services/legislationService";
import { searchPrecedents, Precedent } from "../services/precedentService";
import ReactMarkdown from "react-markdown";
import { cn } from "../lib/utils";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc, query, where, orderBy, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { useLanguage } from "../contexts/LanguageContext";

export default function LawyerAssistant() {
  const { language, isRtl } = useLanguage();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string, timestamp: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [user] = useAuthState(auth);
  const isSending = useRef(false);

  // Precedent Search State
  const [showLibrary, setShowLibrary] = useState(false);
  const [precedentSearchQuery, setPrecedentSearchQuery] = useState("");
  const [precedents, setPrecedents] = useState<Precedent[]>([]);
  const [isSearchingPrecedents, setIsSearchingPrecedents] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePrecedentSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!precedentSearchQuery.trim()) return;
    
    setIsSearchingPrecedents(true);
    try {
      const results = await searchPrecedents(precedentSearchQuery);
      setPrecedents(results);
    } catch (err) {
      console.error("Precedent search failed:", err);
    } finally {
      setIsSearchingPrecedents(false);
    }
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading || isSending.current) return;
    
    isSending.current = true;
    setInput("");
    
    const now = Date.now();
    setMessages(prev => [...prev, { role: 'user', text, timestamp: now }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ 
        role: m.role === 'user' ? 'user' : 'model', 
        text: m.text 
      }));

      // Search for laws
      const localLaws = await searchLocalLegislation(text);
      const context = formatLawsForContext(localLaws);

      const advice = await getLawyerCoPilotAdvice(text, history, context, language);
      const assistantNow = Date.now();
      setMessages(prev => [...prev, { role: 'model', text: advice, timestamp: assistantNow }]);
      
      // Save to Firestore if logged in
      if (user) {
        const chatData = {
          userId: user.uid,
          messages: [...messages, { role: 'user', text, timestamp: now }, { role: 'model', text: advice, timestamp: assistantNow }],
          updatedAt: serverTimestamp(),
          createdAt: currentChatId ? undefined : serverTimestamp(),
          isTechnical: true
        };

        const path = "lawyer_co_pilots";
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
    } catch (error: any) {
      console.error("Technical co-pilot error:", error);
      const errorMessage = error?.message || "";
      let userFriendlyError = "An error occurred while communicating with the AI Strategic Associate.";
      
      if (errorMessage.includes("UNAVAILABLE") || errorMessage.includes("503")) {
        userFriendlyError = "The AI service is currently experiencing high demand. Please try again in a few moments.";
      } else if (errorMessage.includes("permissions") || errorMessage.includes("insufficient")) {
        userFriendlyError = "System permission error. Please refresh and try again.";
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: `⚠️ **${userFriendlyError}**`, 
        timestamp: Date.now() 
      }]);
    } finally {
      setIsLoading(false);
      isSending.current = false;
    }
  };

  const handleReload = () => {
    setMessages([]);
    setCurrentChatId(null);
    setInput("");
  };

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-prestige-50">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]">
        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      <header className="px-8 py-6 bg-white border-b border-prestige-100 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-prestige-950 rounded-2xl text-white shadow-lg">
            <Zap className="w-5 h-5 text-accent-gold" />
          </div>
          <div className="text-start">
            <h1 className="text-xl font-black text-prestige-950 tracking-tight leading-none mb-1">
              AI Strategic <span className="text-accent-gold italic serif font-normal">Associate</span>
            </h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-black text-prestige-400 uppercase tracking-widest">Advanced Technical Research Active</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowLibrary(!showLibrary)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border",
              showLibrary 
                ? "bg-accent-gold text-prestige-950 border-accent-gold shadow-lg shadow-accent-gold/20" 
                : "bg-white text-prestige-400 border-prestige-100 hover:bg-prestige-50 hover:text-prestige-950"
            )}
          >
            <Library className="w-4 h-4" />
            Precedent Library
          </button>
          <div className="w-px h-8 bg-prestige-100 mx-2" />
          <button 
            onClick={handleReload}
            className="p-3 hover:bg-prestige-50 rounded-xl transition-all text-prestige-400 hover:text-prestige-950"
            title="New Research Session"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Main Conversation Area */}
        <div className={cn(
          "flex-1 flex flex-col relative transition-all duration-500",
          showLibrary ? "mr-96" : "mr-0"
        )}>
          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 pb-32 relative scrollbar-hide">
            {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-12 max-w-4xl mx-auto py-12">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-gold/10 rounded-full border border-accent-gold/20 mb-4">
                <ShieldCheck className="w-4 h-4 text-accent-gold" />
                <span className="text-[10px] font-black text-accent-gold uppercase tracking-[0.2em]">Verified Professional Tool</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-prestige-950 tracking-tighter leading-tight max-w-2xl">
                AI Strategic <span className="text-accent-gold italic serif font-normal">Associate</span> at your service.
              </h2>
              <p className="text-lg text-prestige-500 font-medium leading-relaxed max-w-2xl">
                I can help you with case law analysis, procedural timelines, drafting memorandum outlines, and clarifying jurisdictional nuances in UAE law.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {[
                {
                  title: "Technical Analysis",
                  q: "Identify potential jurisdictional conflicts between DIFC and Dubai Mainland in commercial disputes.",
                  icon: Gavel
                },
                {
                  title: "Procedural Guidance",
                  q: "What is the statute of limitations for filing a civil liability claim under the New UAE Civil Transactions Law?",
                  icon: BookOpen
                },
                {
                  title: "Drafting Aid",
                  q: "Show me a structured outline for a defense memorandum against an unfair dismissal claim.",
                  icon: FileText
                },
                {
                  title: "Case Strategy",
                  q: "What are the common pitfalls in real estate arbitration proceedings in Sharjah?",
                  icon: Scale
                }
              ].map(item => (
                <button 
                  key={item.q} 
                  onClick={() => handleSend(item.q)}
                  className="p-8 bg-white border border-prestige-100 rounded-[2.5rem] hover:border-accent-indigo hover:shadow-2xl hover:shadow-accent-indigo/10 transition-all text-left group flex items-start gap-5 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-2xl bg-prestige-50 flex items-center justify-center text-prestige-400 group-hover:bg-accent-indigo group-hover:text-white transition-all transform group-hover:scale-110 group-hover:rotate-3 shrink-0">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-accent-gold uppercase tracking-widest">{item.title}</p>
                    <p className="text-prestige-600 group-hover:text-prestige-950 transition-colors font-bold leading-tight">{item.q}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-6", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
            <div className={cn(
              "w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center mt-1 shadow-lg",
              m.role === 'user' ? "bg-prestige-100 text-prestige-400" : "bg-prestige-950 text-white"
            )}>
              {m.role === 'user' ? <Users className="w-6 h-6" /> : <Zap className="w-6 h-6 text-accent-gold" />}
            </div>
            <div className={cn(
              "max-w-[85%] flex flex-col gap-2",
              m.role === 'user' ? "items-end" : "items-start text-start"
            )}>
              <div className={cn(
                "p-6 rounded-[2rem] text-sm font-medium leading-relaxed shadow-sm border",
                m.role === 'user' 
                  ? "bg-white text-prestige-700 border-prestige-100 rounded-tr-none" 
                  : "bg-white text-prestige-950 border-prestige-200 rounded-tl-none prose prose-prestige max-w-none"
              )}>
                {m.role === 'user' ? (
                  m.text
                ) : (
                  <div className="prose prose-sm prose-prestige max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-p:leading-relaxed">
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold text-prestige-400 uppercase tracking-widest px-2">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-6">
            <div className="w-12 h-12 rounded-2xl bg-prestige-950 text-white flex-shrink-0 flex items-center justify-center mt-1 animate-pulse shadow-lg">
              <Zap className="w-6 h-6 text-accent-gold" />
            </div>
            <div className="p-6 bg-white border border-prestige-200 rounded-[2rem] rounded-tl-none flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-accent-indigo animate-spin" />
              <span className="text-sm font-black text-prestige-950 animate-pulse tracking-tight">ANALYZING LEGAL FRAMEWORK...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

        </div>

        {/* Side Panel: Precedent Library */}
        <AnimatePresence>
          {showLibrary && (
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-96 bg-white border-l border-prestige-100 shadow-2xl z-20 flex flex-col"
            >
              <div className="p-6 border-b border-prestige-100 flex items-center justify-between bg-prestige-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-gold/10 flex items-center justify-center">
                    <Library className="w-4 h-4 text-accent-gold" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-prestige-950 tracking-tight">Precedent Library</h2>
                    <p className="text-[10px] text-prestige-400 font-bold uppercase tracking-widest">Case Law Database</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowLibrary(false)}
                  className="p-2 hover:bg-prestige-100 rounded-lg text-prestige-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 border-b border-prestige-100">
                <form onSubmit={handlePrecedentSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-prestige-400" />
                  <input 
                    value={precedentSearchQuery}
                    onChange={(e) => setPrecedentSearchQuery(e.target.value)}
                    placeholder="Search keywords, citations..."
                    className="w-full pl-10 pr-4 py-2.5 bg-prestige-50 border border-prestige-100 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-accent-gold outline-none transition-all"
                  />
                  {isSearchingPrecedents && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-accent-gold animate-spin" />
                  )}
                </form>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {precedents.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-12 h-12 bg-prestige-50 rounded-full flex items-center justify-center mx-auto">
                      <Search className="w-6 h-6 text-prestige-200" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-prestige-950 uppercase tracking-tight">No Precedents Loaded</p>
                      <p className="text-[10px] text-prestige-400 font-medium leading-relaxed px-6">
                        Search by keyword (e.g. "Good Faith") or citation to explore verified UAE precedents.
                      </p>
                    </div>
                  </div>
                ) : (
                  precedents.map((prec) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={prec.id}
                      className="p-4 bg-white border border-prestige-100 rounded-2xl hover:border-accent-gold hover:shadow-md transition-all group cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[8px] font-black bg-prestige-950 text-white px-2 py-0.5 rounded uppercase tracking-widest">
                          {prec.jurisdiction}
                        </span>
                        <span className="text-[9px] font-bold text-accent-gold">{prec.citation}</span>
                      </div>
                      <h3 className="text-xs font-black text-prestige-950 group-hover:text-accent-gold transition-colors mb-2 leading-tight">
                        {prec.caseName}
                      </h3>
                      <p className="text-[10px] text-prestige-500 line-clamp-3 mb-3 leading-relaxed font-medium">
                        {prec.summary}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {prec.legalPrinciples.map(principle => (
                          <span key={principle} className="text-[8px] font-bold text-prestige-400 border border-prestige-100 px-2 py-0.5 rounded-full bg-prestige-50/50">
                            {principle}
                          </span>
                        ))}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSend(`Analyze the technical implications of ${prec.caseName} (${prec.citation}) in relation to my current matter.`);
                        }}
                        className="w-full py-2 bg-prestige-50 hover:bg-accent-gold hover:text-prestige-950 text-[9px] font-black uppercase tracking-widest text-prestige-400 rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <Zap className="w-3 h-3" />
                        Analyze with AI
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
              
              <div className="p-4 bg-prestige-50/80 border-t border-prestige-100">
                <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-prestige-100">
                  <div className="w-6 h-6 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <span className="text-[9px] font-black text-prestige-950 uppercase tracking-widest">MOJ Authenticated Data</span>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <div className={cn(
        "absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-prestige-50 via-prestige-50 to-transparent z-20 transition-all duration-500",
        showLibrary ? "pr-[26rem]" : "pr-8"
      )}>
        <div className="max-w-4xl mx-auto">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="p-2 bg-white border border-prestige-200 rounded-3xl shadow-2xl flex items-center gap-3 focus-within:ring-2 focus-within:ring-accent-indigo transition-all ring-offset-4 ring-offset-prestige-50"
          >
            <div className="flex flex-1 items-center px-4 gap-3">
              <Search className="w-5 h-5 text-prestige-400" />
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Submit technical legal query or request drafting outline..."
                className="flex-1 py-4 bg-transparent text-prestige-950 font-bold placeholder:text-prestige-300 outline-none"
              />
            </div>
            
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-4 bg-prestige-950 text-white rounded-2xl shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all disabled:scale-100"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="mt-4 text-center text-[10px] font-bold text-prestige-400 uppercase tracking-widest">
            AI can make mistakes. Verify technical citations against official ministerial decrees.
          </p>
        </div>
      </div>
    </div>
  );
}
