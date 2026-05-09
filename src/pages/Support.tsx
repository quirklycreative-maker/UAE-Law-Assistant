import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Bot, User, Loader2, ShieldAlert, CheckCircle2, LifeBuoy } from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { MODELS, generateGeminiContent } from "../lib/gemini";
import { logUsage } from "../lib/usage";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { useUser } from "../contexts/UserContext";

// Remove local ai initialization as we use imports now

const SYSTEM_PROMPT = `You are the Customer Support Assistant for "Huqiqiyy Co-pilot", a digital law platform in the UAE.
Your goal is to help users with platform features, technical issues, and general app navigation.

IMPORTANT RULES:
1. ONLY answer questions about the app features (Lawyer Profiles, Consultation Booking, Legal Research Assistant, Case Law Library, Document Analysis).
2. DO NOT provide actual legal advice. If a user asks for legal advice, politely explain that you are a support bot and they should book a consultation with one of our licensed lawyers.
3. Be professional, empathetic, and concise.
4. If a user is a LAWYER, help them with dashboard management, client meetings, and the Lawyer Assistant tool.
5. If a user is a CLIENT, help them find lawyers, manage appointments, and understand their history.
6. The app supports Arabic and English. Use the language the user speaks.
7. NEVER answer questions unrelated to the platform (e.g., weather, general trivia, unrelated products).

Current Context: The user is a {{ROLE}}.`;

interface Message {
  role: "user" | "model" | "system";
  content: string;
  timestamp: any;
}

export default function Support() {
  const { user, lawyerProfile } = useUser();
  const { t, isRtl } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const currentRole = lawyerProfile ? "lawyer" : "client";

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Load or create session
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "support_sessions"),
      where("userId", "==", user.uid),
      where("userRole", "==", currentRole),
      where("status", "==", "active"),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setSessionId(snapshot.docs[0].id);
        setMessages(docData.messages || []);
      } else {
        // No active session for this role, start a new one automatically
        createNewSession();
      }
    });

    return () => unsubscribe();
  }, [user?.uid, currentRole]);

  const createNewSession = async () => {
    if (!user) return;
    const initialMessage: Message = {
      role: "model",
      content: t("aiSupportWelcome") || `Hello! I'm your Huqiqiyy Co-pilot Support Assistant. How can I help you as a ${currentRole} today?`,
      timestamp: new Date().toISOString()
    };
    
    const path = "support_sessions";
    try {
      const docRef = await addDoc(collection(db, path), {
        userId: user.uid,
        userEmail: user.email,
        userRole: currentRole,
        messages: [initialMessage],
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setSessionId(docRef.id);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !sessionId || isTyping) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    const path = "support_sessions";
    try {
      // Sync user message to DB
      await updateDoc(doc(db, path, sessionId), {
        messages: newMessages,
        updatedAt: serverTimestamp()
      });

      // Call AI
      const prompt = SYSTEM_PROMPT.replace("{{ROLE}}", currentRole);
      const history = messages
        .filter(m => m.role === "user" || m.role === "model")
        .map(m => ({
          role: m.role as "user" | "model",
          parts: [{ text: m.content }]
        }));

      const aiText = await generateGeminiContent({
        model: MODELS.flash,
        contents: [
          ...history,
          { role: "user", parts: [{ text: input }] }
        ],
        systemInstruction: prompt,
        generationConfig: {
          temperature: 0.7
        },
        usageLabel: 'support_query'
      });

      if (!aiText) {
        throw new Error("Empty response from Gemini");
      }
      
      const aiMessage: Message = {
        role: "model",
        content: aiText,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...newMessages, aiMessage];
      
      // Sync AI message to DB
      await updateDoc(doc(db, path, sessionId), {
        messages: finalMessages,
        updatedAt: serverTimestamp()
      });

    } catch (err) {
      console.error("Support AI Error:", err);
      logUsage('support_query', 'error');
      // If it's a Firestore error, handle it
      if (err instanceof Error && err.message.includes("permission")) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const resolveTicket = async () => {
    if (!sessionId) return;
    if (window.confirm(t("confirmResolve") || "Mark this support session as resolved?")) {
      const path = "support_sessions";
      try {
        await updateDoc(doc(db, path, sessionId), {
          status: "resolved",
          updatedAt: serverTimestamp()
        });
        setMessages([]);
        setSessionId(null);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col bg-prestige-50 h-[calc(100vh-80px)] overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-prestige-100 p-4 md:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
            currentRole === "lawyer" ? "bg-accent-indigo shadow-accent-indigo/20" : "bg-prestige-950 shadow-prestige-950/20"
          )}>
            <LifeBuoy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-prestige-950 tracking-tight">{t("support")}</h1>
            <p className="text-[10px] font-bold text-prestige-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              {t("aiSupport")} • {currentRole === "lawyer" ? t("lawyer") : t("client")} {t("portal")}
            </p>
          </div>
        </div>
        
        <button 
          onClick={resolveTicket}
          className="px-4 py-2 bg-prestige-50 text-prestige-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-prestige-100"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {t("resolved")}
        </button>
      </div>

      {/* Warning Box */}
      <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] font-bold text-amber-800 leading-relaxed uppercase tracking-wide">
          {t("supportNotice")}
        </p>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar"
      >
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              key={i}
              className={cn(
                "flex items-start gap-3 max-w-[85%]",
                m.role === "user" ? (isRtl ? "mr-auto" : "ml-auto") : ""
              )}
            >
              {m.role !== "user" && (
                <div className="w-8 h-8 rounded-lg bg-white border border-prestige-100 shadow-sm flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-accent-indigo" />
                </div>
              )}
              <div className={cn(
                "p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm transition-all",
                m.role === "user" 
                  ? (currentRole === "lawyer" 
                    ? (isRtl ? "bg-accent-indigo text-white rounded-tl-none shadow-accent-indigo/10" : "bg-accent-indigo text-white rounded-tr-none shadow-accent-indigo/10") 
                    : (isRtl ? "bg-prestige-950 text-white rounded-tl-none shadow-prestige-900/10" : "bg-prestige-950 text-white rounded-tr-none shadow-prestige-900/10"))
                  : (isRtl ? "bg-white border border-prestige-100 text-prestige-700 rounded-tr-none" : "bg-white border border-prestige-100 text-prestige-700 rounded-tl-none")
              )}>
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-white border border-prestige-100 shadow-sm flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-prestige-400" />
                </div>
              )}
            </motion.div>
          ))}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-white border border-prestige-100 shadow-sm flex items-center justify-center">
                <Bot className="w-4 h-4 text-accent-indigo" />
              </div>
              <div className={cn(
                "bg-white border border-prestige-100 px-4 py-3 rounded-3xl flex items-center gap-1.5 shadow-sm",
                isRtl ? "rounded-tr-none" : "rounded-tl-none"
              )}>
                <span className="w-1.5 h-1.5 bg-prestige-200 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-prestige-200 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-prestige-200 rounded-full animate-bounce" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="p-4 md:p-8 bg-white border-t border-prestige-100">
        <form 
          onSubmit={handleSendMessage}
          className="max-w-4xl mx-auto flex gap-3 p-2 bg-prestige-50 rounded-2xl border border-prestige-100"
        >
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder={t("typeSupportMessage")}
            className="flex-1 bg-transparent px-4 py-3 text-sm font-bold text-prestige-950 outline-none placeholder:text-prestige-300"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-white transition-all shadow-lg active:scale-95 disabled:opacity-50",
              currentRole === "lawyer" ? "bg-accent-indigo shadow-accent-indigo/20" : "bg-prestige-950 shadow-prestige-900/20"
            )}
          >
            {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className={cn("w-5 h-5", isRtl && "rotate-180")} />}
          </button>
        </form>
      </div>
    </div>
  );
}
