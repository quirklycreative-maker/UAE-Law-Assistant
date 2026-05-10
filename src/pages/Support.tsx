import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageSquare, Send, Bot, User, Loader2, ShieldAlert, CheckCircle2, LifeBuoy } from "lucide-react";
import { db, handleFirestoreError, OperationType, signInWithGoogle } from "../lib/firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { MODELS, generateGeminiContent } from "../lib/gemini";
import { logUsage } from "../lib/usage";
import { motion, AnimatePresence } from "../lib/motion-shim";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { useUser } from "../contexts/UserContext";

// Remove local ai initialization as we use imports now

const SYSTEM_PROMPT = `You are the Support Assistant for "Huqiqiyy Co-pilot", a digital law platform in the UAE.
Your goal is to help users with platform features, technical issues, account access, and general app navigation.

IMPORTANT RULES:
1. ONLY answer questions about the app features, support flows, account access, or technical issues.
2. DO NOT provide actual legal advice or legal analysis.
3. Be professional, empathetic, and concise.
4. If a query is actually for the copilot or legal analysis, politely refuse and direct the user to Huqiqiyy Copilot using the copilot link.
5. The app supports Arabic and English. Use the language the user speaks.
6. NEVER answer questions unrelated to the platform (e.g., weather, general trivia, unrelated products).

Current Context: This is the support page, not the legal copilot.`;

interface Message {
  role: "user" | "model" | "system";
  content: string;
  timestamp: any;
}

const SUPPORT_KEYWORDS = [
  "login",
  "log in",
  "sign in",
  "logout",
  "password",
  "account",
  "booking",
  "book",
  "appointment",
  "support",
  "error",
  "bug",
  "upload",
  "pdf",
  "image",
  "voice",
  "language",
  "history",
  "app",
  "site",
  "navigation",
  "profile",
  "dashboard",
  "notification",
  "payment",
  "invoice",
];

const COPILOT_KEYWORDS = [
  "copilot",
  "assistant",
  "legal advice",
  "legal analysis",
  "laws",
  "draft",
  "memo",
  "research",
  "analysis",
  "case",
  "jurisdiction",
  "regulation",
  "article",
  "labor law",
  "labour law",
  "employment",
  "contract",
  "tenant",
  "real estate",
  "inheritance",
  "divorce",
  "commercial",
];

export default function Support() {
  const { user, lawyerProfile } = useUser();
  const navigate = useNavigate();
  const { t, isRtl } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fromBooking, setFromBooking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const currentRole = lawyerProfile ? "lawyer" : "client";

  const renderMessage = (content: string) => {
    if (!content.includes("[COPILOT_LINK]")) return content;

    return content.split(/(\[COPILOT_LINK\])/g).map((part, index) => {
      if (part === "[COPILOT_LINK]") {
        return (
          <Link
            key={`copilot-link-${index}`}
            to="/assistant"
            className="font-black text-accent-indigo underline underline-offset-2 hover:text-accent-gold transition-colors"
          >
            Huqiqiyy Copilot
          </Link>
        );
      }

      return <React.Fragment key={`support-part-${index}`}>{part}</React.Fragment>;
    });
  };

  useEffect(() => {
    if (sessionStorage.getItem("booking_handoff") === "1") {
      setFromBooking(true);
      sessionStorage.removeItem("booking_handoff");
    }
  }, []);

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
      content: t("aiSupportWelcome") || `Hello! I'm your Huqiqiyy Support Bot. How can I help you as a ${currentRole} today?`,
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
      const normalizedInput = userMessage.content.toLowerCase();
      const hasSupportIntent = SUPPORT_KEYWORDS.some((keyword) => normalizedInput.includes(keyword));
      const hasCopilotIntent = COPILOT_KEYWORDS.some((keyword) => normalizedInput.includes(keyword));

      if (hasCopilotIntent && !hasSupportIntent) {
        const denialMessage: Message = {
          role: "model",
          content: "This support page only handles platform help. For legal analysis or drafting, please open [COPILOT_LINK].",
          timestamp: new Date().toISOString()
        };

        const finalMessages = [...newMessages, denialMessage];
        await updateDoc(doc(db, path, sessionId), {
          messages: finalMessages,
          updatedAt: serverTimestamp()
        });
        setMessages(finalMessages);
        return;
      }

      if (!hasSupportIntent) {
        const denialMessage: Message = {
          role: "model",
          content: "I can only help with support topics here. For legal analysis or drafting, please open [COPILOT_LINK].",
          timestamp: new Date().toISOString()
        };

        const finalMessages = [...newMessages, denialMessage];
        await updateDoc(doc(db, path, sessionId), {
          messages: finalMessages,
          updatedAt: serverTimestamp()
        });
        setMessages(finalMessages);
        return;
      }

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
        throw new Error("Empty response from OpenRouter");
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

  if (!user) {
    return (
      <div className="flex-1 flex flex-col bg-prestige-50 min-h-[calc(100vh-80px)]">
        <div className="max-w-2xl mx-auto w-full px-6 py-24 flex-1 flex items-center justify-center">
          <div className="w-full bg-white rounded-[3rem] border border-prestige-100 shadow-2xl shadow-prestige-900/5 p-10 md:p-14 text-center space-y-6">
            <div className="w-20 h-20 rounded-[2rem] bg-prestige-950 text-white flex items-center justify-center mx-auto shadow-xl shadow-prestige-900/10">
              <LifeBuoy className="w-10 h-10" />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-black text-prestige-950 tracking-tight">{t("support")}</h1>
          <p className="text-prestige-500 font-medium leading-relaxed">
                Sign in to open a support session and get help with the platform.
              </p>
            </div>
            {fromBooking && (
              <div className="rounded-2xl border border-accent-indigo/15 bg-accent-indigo/5 px-4 py-3 text-sm text-accent-indigo font-semibold">
                You were sent here from another flow. Sign in to continue with support.
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={() => signInWithGoogle()}
                className="px-6 py-4 bg-prestige-950 text-white rounded-2xl font-black hover:bg-accent-indigo transition-all shadow-xl shadow-prestige-950/10 active:scale-95"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              {t("aiSupport")} • Support portal
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
          Support only. For legal analysis or copilot questions, open Huqiqiyy Copilot.
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
                {renderMessage(m.content)}
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
