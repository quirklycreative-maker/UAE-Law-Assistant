import React, { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
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
      <div className="container mx-auto px-4 h-[60vh] flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300">
          <MessageSquare className="w-8 h-8" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Sign in to view your history</h2>
          <p className="text-slate-500">Access all your previous legal consultations in one place.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-white">
      {/* Sidebar List */}
      <div className={cn(
        "w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col bg-slate-50/50",
        selectedId && "hidden md:flex"
      )}>
        <div className="p-6 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-700" />
            Legal History
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm text-slate-500">No conversations yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {conversations.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedId(chat.id)}
                  className={cn(
                    "w-full text-left p-6 transition-all hover:bg-white flex items-start gap-4 group",
                    selectedId === chat.id ? "bg-white shadow-sm ring-1 ring-inset ring-slate-200" : ""
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    selectedId === chat.id ? "bg-emerald-700 text-white" : "bg-white border border-slate-200 text-slate-400 group-hover:text-emerald-700 group-hover:border-emerald-200"
                  )}>
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {format(chat.createdAt, 'MMM dd, yyyy')}
                    </p>
                    <p className="text-sm font-bold text-slate-800 truncate mb-1">
                      {chat.messages[0]?.text || "New Inquiry"}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {chat.messages.length} messages exchanged
                    </p>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 text-slate-300 transition-transform", selectedId === chat.id && "rotate-90 md:rotate-0")} />
                </button>
              ))}
            </div>
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {/* Chat Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedId(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600">
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </button>
                  <div>
                    <h3 className="font-bold text-slate-900">Case Analysis Reference</h3>
                    <p className="text-xs text-slate-500 font-medium">Recorded on {format(selectedChat.createdAt, 'MMMM do, yyyy')}</p>
                  </div>
                </div>
                <button className="p-2.5 text-slate-400 hover:text-red-500 bg-slate-50 rounded-xl transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-8 space-y-12">
                {selectedChat.messages.map((m: any, i: number) => (
                  <div key={i} className={cn("max-w-3xl mx-auto flex gap-6", m.role === 'model' ? "flex-col" : "flex-col items-end")}>
                    <div className={cn(
                      "flex items-center gap-3 text-[10px] uppercase font-black tracking-[0.2em]",
                      m.role === 'user' ? "text-slate-400" : "text-emerald-700"
                    )}>
                      {m.role === 'user' ? "Inquiry" : "System Response"}
                      <div className={cn("w-1 h-1 rounded-full", m.role === 'user' ? "bg-slate-300" : "bg-emerald-500")} />
                    </div>
                    <div className={cn(
                      "text-slate-800 leading-relaxed text-sm md:text-base",
                      m.role === 'user' ? "bg-slate-50 p-6 rounded-2xl font-medium w-full" : "prose prose-emerald max-w-none"
                    )}>
                      {m.role === 'user' ? (
                        m.text
                      ) : (
                        <ReactMarkdown
                          components={{
                            strong: ({node, ...props}) => <strong className="text-emerald-900 font-extrabold" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-emerald-500 bg-emerald-50/50 p-4 italic my-4 rounded-r-xl" {...props} />
                          }}
                        >
                          {m.text}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}

                {/* Privacy Safeguard Note */}
                <div className="max-w-3xl mx-auto pt-12 pb-8">
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex items-start gap-4">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 mt-1 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Privacy Safeguard</p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        For your security, original legal documents uploaded during this session were processed strictly in-memory and have been purged from our systems. 
                        Only the textual analysis and AI response are retained for your reference.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Search className="w-8 h-8" />
              </div>
              <p className="text-slate-500 font-medium">Select a conversation from the sidebar to view full analysis and references.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
