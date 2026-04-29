import React, { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType, signInWithGoogle } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, Calendar, ChevronRight, Scale, Search, Trash2, ShieldCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { format } from "date-fns";

export default function History() {
  const [user] = useAuthState(auth);
  const { t, isRtl } = useLanguage();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const path = "ai_conversations";
    const q = query(
      collection(db, path),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setConversations(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user]);

  const selectedChat = conversations.find(c => c.id === selectedId);

  if (!user) {
    return (
      <div className="container mx-auto px-6 h-[70vh] flex flex-col items-center justify-center space-y-12">
        <div className="p-10 bg-prestige-50 rounded-[3rem] text-prestige-200">
           <MessageSquare className="w-20 h-20" />
        </div>
        <div className="text-center space-y-4 max-w-sm">
          <h2 className="text-4xl font-black text-prestige-950 tracking-tighter leading-tight">{t("signInToView")}</h2>
          <p className="text-prestige-500 font-medium">{t("historyDesc") || "Access your secure history of legal consultations and AI-driven case analyses."}</p>
        </div>
        <button 
          onClick={async () => {
            try {
              await signInWithGoogle();
            } catch (err) {
              console.error("History sign-in error:", err);
            }
          }}
          className="px-12 py-5 bg-prestige-950 text-white rounded-2xl font-black hover:bg-accent-indigo transition-all shadow-2xl shadow-prestige-950/20 active:scale-95"
        >
          {t("signInGoogle") || "Sign In with Google"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-white">
      {/* Sidebar List */}
      <div className={cn(
        "w-full md:w-[400px] border-b md:border-b-0 md:border-e border-prestige-100 flex flex-col bg-prestige-50/30",
        selectedId && "hidden md:flex"
      )}>
        <div className="p-8 border-b border-prestige-100 bg-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-accent-gold/10 rounded-lg flex items-center justify-center text-accent-gold">
              <Scale className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-accent-gold uppercase tracking-[0.3em]">{t("secureRecords") || "Secure Records"}</span>
          </div>
          <h2 className="text-3xl font-black text-prestige-900 tracking-tighter leading-none">
            {t("legalHistory") || "Legal History"}
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-prestige-50 rounded-[2rem] animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-12 text-center space-y-4 bg-white rounded-[2rem] border border-dashed border-prestige-100">
              <MessageSquare className="w-12 h-12 text-prestige-100 mx-auto" />
              <p className="text-sm text-prestige-400 font-bold uppercase tracking-widest">{t("noHistoryFound") || "No history found"}</p>
            </div>
          ) : (
            conversations.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedId(chat.id)}
                className={cn(
                  "w-full text-start p-6 transition-all rounded-[2rem] flex items-center gap-5 group relative overflow-hidden",
                  selectedId === chat.id 
                    ? "bg-prestige-950 text-white shadow-2xl shadow-prestige-900/20" 
                    : "hover:bg-white hover:shadow-xl hover:shadow-prestige-900/5 bg-transparent"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-500",
                  selectedId === chat.id 
                    ? "bg-accent-indigo border-accent-indigo text-white scale-110" 
                    : "bg-white border-prestige-100 text-prestige-400 group-hover:border-accent-indigo group-hover:text-accent-indigo"
                )}>
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-[10px] uppercase font-black tracking-[0.2em] mb-1",
                    selectedId === chat.id ? "text-prestige-400" : "text-prestige-400"
                  )}>
                    {format(chat.createdAt, 'MMM dd, yyyy')}
                  </p>
                  <p className={cn(
                    "text-base font-black truncate leading-tight tracking-tight",
                    selectedId === chat.id ? "text-white" : "text-prestige-900"
                  )}>
                    {chat.messages[0]?.text || t("newInquiry") || "New Inquiry"}
                  </p>
                </div>
                <ChevronRight className={cn(
                  "w-5 h-5 transition-transform", 
                  isRtl && "rotate-180", 
                  selectedId === chat.id ? "text-accent-gold" : "text-prestige-200 group-hover:text-accent-indigo"
                )} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-white overflow-hidden",
        !selectedId && "hidden md:flex items-center justify-center"
      )}>
        <AnimatePresence mode="wait">
          {selectedChat ? (
            <motion.div
              key={selectedChat.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {/* Chat Header */}
              <div className="p-8 border-b border-prestige-50 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-6">
                  <button onClick={() => setSelectedId(null)} className="md:hidden p-3 bg-prestige-50 rounded-2xl text-prestige-400 hover:text-accent-indigo transition-colors">
                    <ChevronRight className={cn("w-6 h-6", isRtl ? "rotate-0" : "rotate-180")} />
                  </button>
                  <div className={cn(isRtl ? "text-right" : "text-left")}>
                    <h3 className="text-2xl font-black text-prestige-950 tracking-tighter">{t("caseAnalysisArchive") || "Case Analysis Archive"}</h3>
                    <p className="text-xs text-prestige-400 font-bold uppercase tracking-widest mt-1">
                       {t("recordedOn") || "Session ID"} • {format(selectedChat.createdAt, 'MMMM do, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="p-3 bg-prestige-50 text-prestige-400 hover:text-accent-indigo rounded-2xl transition-all active:scale-95">
                    <Scale className="w-5 h-5" />
                  </button>
                  <button className={cn("p-3 bg-prestige-50 text-prestige-400 hover:text-red-500 rounded-2xl transition-all active:scale-95")}>
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-12 space-y-20 bg-accent-indigo/5 relative overflow-x-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-accent-indigo/[0.03] blur-[150px] -mr-96 -mt-96 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent-gold/[0.03] blur-[150px] -ml-64 -mb-64 pointer-events-none" />

                <div className="max-w-4xl mx-auto space-y-20 relative z-10">
                  {selectedChat.messages.map((m: any, i: number) => (
                    <div key={i} className={cn("flex flex-col gap-3", m.role === 'model' ? "items-start" : "items-end")}>
                      <div className={cn(
                        "flex items-center gap-4 text-[10px] uppercase font-black tracking-[0.3em]",
                        m.role === 'user' ? "text-prestige-400" : "text-accent-indigo",
                        isRtl && m.role === 'user' ? "flex-row-reverse" : "flex-row"
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", m.role === 'user' ? "bg-prestige-300" : "bg-accent-indigo animate-pulse")} />
                        {m.role === 'user' ? (t("inquiry") || "Client Inquiry") : (t("intelligenceReport") || "Intelligence Report")}
                      </div>
                      <div className={cn(
                        "leading-loose rounded-[2.5rem] shadow-2xl",
                        m.role === 'user' 
                          ? "bg-prestige-950 text-white p-10 font-bold w-full text-start text-lg shadow-prestige-950/20" 
                          : "bg-white p-12 border border-prestige-100 prose prose-lg max-w-none text-start text-prestige-900 shadow-prestige-900/5"
                      )}>
                        {m.role === 'user' ? (
                          m.text
                        ) : (
                          <ReactMarkdown
                            components={{
                              strong: ({node, ...props}) => <strong className="text-accent-indigo font-black" {...props} />,
                              blockquote: ({node, ...props}) => <blockquote className={cn("border-accent-gold bg-prestige-50 p-8 italic my-8 shadow-sm", isRtl ? "border-r-4 rounded-l-[2rem]" : "border-l-4 rounded-r-[2rem]")} {...props} />
                            }}
                          >
                            {m.text}
                          </ReactMarkdown>
                        )}
                      </div>
                      {m.timestamp && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-prestige-400 px-6">
                           {format(m.timestamp, 'HH:mm')}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Privacy Safeguard Note */}
                  <div className="pt-20 pb-12 border-t border-prestige-100">
                    <div className="bg-white rounded-[3rem] p-10 border border-prestige-100 flex items-start gap-6 shadow-2xl shadow-prestige-900/5">
                      <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                      <div className={cn(isRtl ? "text-right" : "text-left")}>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">{t("privacyProtocols") || "Privacy Protocols"}</p>
                        <p className="text-prestige-500 font-medium leading-relaxed">
                          {t("privacyNote") || "For your security, original legal documents uploaded during this session were processed strictly in-memory and have been purged. Only the vertical AI summary and strategic references are retained in this archive."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="text-center space-y-8 max-w-sm">
              <div className="w-24 h-24 bg-prestige-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-prestige-200 shadow-inner">
                <Search className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-prestige-950">{t("selectArchive") || "Select an Archive"}</h3>
                <p className="text-prestige-500 font-medium">{t("selectArchiveDesc") || "Browse your legal history from the sidebar to review past analyses and references."}</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
