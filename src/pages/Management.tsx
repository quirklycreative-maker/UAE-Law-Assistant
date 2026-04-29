import React, { useState, useEffect } from "react";
import { auth, db } from "../lib/firebase";
import { collection, getDocs, setDoc, deleteDoc, doc, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Users, UserPlus, Trash2, ShieldCheck, Mail, Calendar, Loader2, LifeBuoy, MessageSquare, Clock, ArrowRight, ExternalLink, Activity, BarChart3, TrendingUp, Zap, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

import { useLanguage } from "../contexts/LanguageContext";

interface AuthorizedLawyer {
  email: string;
  addedAt: string;
}

interface SupportSession {
  id: string;
  userId: string;
  userEmail: string;
  userRole: "client" | "lawyer";
  messages: any[];
  status: "active" | "resolved";
  updatedAt: any;
}

interface UsageStat {
  id: string;
  type: string;
  status: string;
  tokens: number;
  userId: string;
  timestamp: any;
}

export default function Management() {
  const [user] = useAuthState(auth);
  const { t, isRtl } = useLanguage();
  const isSuperAdmin = user?.email === "universe.24.369@gmail.com";
  
  const [activeTab, setActiveTab] = useState<"lawyers" | "support" | "system">("lawyers");
  const [lawyers, setLawyers] = useState<AuthorizedLawyer[]>([]);
  const [supportSessions, setSupportSessions] = useState<SupportSession[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStat[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingSession, setViewingSession] = useState<SupportSession | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      if (activeTab === "lawyers") {
        fetchLawyers();
      } else if (activeTab === "support") {
        fetchSupportSessions();
      } else if (activeTab === "system") {
        fetchUsageStats();
      }
    }
  }, [isSuperAdmin, activeTab]);

  const fetchUsageStats = async () => {
    setIsLoading(true);
    try {
      const sevenDaysAgo = subDays(new Date(), 30); // Get last 30 days
      const q = query(
        collection(db, "usage_stats"), 
        where("timestamp", ">=", sevenDaysAgo),
        orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UsageStat[];
      setUsageStats(list);
    } catch (err) {
      console.error("Error fetching usage stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLawyers = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "authorized_lawyers"), orderBy("addedAt", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({
        email: doc.id,
        ...doc.data()
      })) as AuthorizedLawyer[];
      setLawyers(list);
    } catch (err) {
      console.error("Error fetching lawyers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSupportSessions = () => {
    setIsLoading(true);
    const q = query(collection(db, "support_sessions"), orderBy("updatedAt", "desc"));
    
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupportSession[];
      setSupportSessions(list);
      setIsLoading(false);
    });
  };

  const handleAddLawyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await setDoc(doc(db, "authorized_lawyers", newEmail.toLowerCase().trim()), {
        email: newEmail.toLowerCase().trim(),
        addedAt: new Date().toISOString(),
        addedBy: user?.uid
      });
      setNewEmail("");
      fetchLawyers();
    } catch (err) {
      console.error("Error adding lawyer:", err);
      alert("Failed to add lawyer. Check permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveLawyer = async (email: string) => {
    if (!window.confirm(`Are you sure you want to remove ${email}?`)) return;
    
    try {
      await deleteDoc(doc(db, "authorized_lawyers", email));
      fetchLawyers();
    } catch (err) {
      console.error("Error removing lawyer:", err);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center">
          <Trash2 className="w-8 h-8 text-rose-500" />
        </div>
        <h1 className="text-2xl font-black text-prestige-950 uppercase tracking-tight">Access Denied</h1>
        <p className="max-w-md text-prestige-500">This panel is restricted to the Super Admin account.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-prestige-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-indigo/10 rounded-full border border-accent-indigo/20">
                <ShieldCheck className="w-3.5 h-3.5 text-accent-indigo" />
                <span className="text-[10px] font-black text-accent-indigo uppercase tracking-widest leading-none">{t("adminConsole") || "Super Admin Console"}</span>
              </div>
              <h1 className="text-4xl font-black text-prestige-950 tracking-tighter">{t("management")}</h1>
              <p className="text-prestige-500 font-medium tracking-tight">{t("managementDesc") || "Monitor platform activity and manage users."}</p>
            </div>

            <div className="flex p-1 bg-white rounded-2xl border border-prestige-200 w-fit">
              <button
                onClick={() => setActiveTab("lawyers")}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === "lawyers" ? "bg-prestige-950 text-white shadow-lg" : "text-prestige-400 hover:text-prestige-600"
                )}
              >
                {t("lawyers") || "Lawyers"}
              </button>
              <button
                onClick={() => setActiveTab("support")}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === "support" ? "bg-prestige-950 text-white shadow-lg" : "text-prestige-400 hover:text-prestige-600"
                )}
              >
                {t("tickets")}
              </button>
              <button
                onClick={() => setActiveTab("system")}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === "system" ? "bg-prestige-950 text-white shadow-lg" : "text-prestige-400 hover:text-prestige-600"
                )}
              >
                {t("system")}
              </button>
            </div>
          </div>

          {activeTab === "lawyers" && (
            <form onSubmit={handleAddLawyer} className="flex gap-2 bg-white p-2 rounded-2xl border border-prestige-200 shadow-sm md:w-96">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-prestige-400" />
                <input 
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={t("newLawyerEmail") || "New Lawyer Email"}
                  className="w-full pl-10 pr-4 py-3 bg-transparent text-sm font-bold outline-none placeholder:text-prestige-300"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-accent-indigo text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-prestige-950 transition-all flex items-center gap-2 shadow-lg shadow-accent-indigo/20 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {t("authorize") || "Authorize"}
              </button>
            </form>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6">
          {activeTab === "lawyers" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="h-32 bg-prestige-200/50 rounded-3xl animate-pulse" />
                ))
              ) : lawyers.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-3xl border-2 border-dashed border-prestige-200 space-y-4">
                  <Users className="w-12 h-12 text-prestige-200 mx-auto" />
                  <p className="text-sm font-bold text-prestige-400">{t("noLawyersFound")}</p>
                </div>
              ) : (
                lawyers.map((lawyer) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={lawyer.email}
                    className="bg-white p-6 rounded-3xl border border-prestige-100 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 bg-prestige-50 rounded-xl flex items-center justify-center text-prestige-400 group-hover:bg-accent-indigo/10 group-hover:text-accent-indigo transition-colors">
                        <Mail className="w-6 h-6" />
                      </div>
                      <button 
                        onClick={() => handleRemoveLawyer(lawyer.email)}
                        className="p-2 text-prestige-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-4 space-y-1">
                      <p className="text-sm font-black text-prestige-950 truncate">{lawyer.email}</p>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-prestige-400 uppercase tracking-widest">
                        <Calendar className="w-3 h-3" />
                        {t("addedOn") || "Added"}: {new Date(lawyer.addedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          ) : activeTab === "support" ? (
            <div className="space-y-4">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-40 bg-prestige-200/50 rounded-3xl animate-pulse" />
                ))
              ) : supportSessions.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-3xl border-2 border-dashed border-prestige-200 space-y-4">
                  <LifeBuoy className="w-12 h-12 text-prestige-200 mx-auto" />
                  <p className="text-sm font-bold text-prestige-400">{t("noTickets")}</p>
                </div>
              ) : (
                supportSessions.map((session) => (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={session.id}
                    className="bg-white p-6 rounded-3xl border border-prestige-100 shadow-sm flex flex-col md:flex-row md:items-center gap-6"
                  >
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-white",
                            session.userRole === "lawyer" ? "bg-accent-indigo" : "bg-prestige-950"
                          )}>
                            {session.userRole === "lawyer" ? <ShieldCheck className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-prestige-950 tracking-tight">{session.userEmail}</p>
                            <p className="text-[10px] font-bold text-prestige-400 uppercase tracking-widest">
                              {session.userRole === "lawyer" ? t("lawyer") : t("client")} {t("support")} • {session.messages.length} {t("messagesExchanged")}
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          session.status === "active" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-prestige-100 text-prestige-400"
                        )}>
                          {session.status === "active" ? t("active") : t("resolved")}
                        </div>
                      </div>
                      
                      <div className="bg-prestige-50 p-4 rounded-2xl border border-prestige-100">
                        <p className="text-xs font-bold text-prestige-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {t("latestMessage")}:
                        </p>
                        <p className="text-sm font-medium text-prestige-700 italic">
                          "{session.messages[session.messages.length - 1]?.content.substring(0, 120)}..."
                        </p>
                      </div>
                    </div>

                    <div className="flex md:flex-col gap-2">
                      <button 
                        onClick={() => setViewingSession(session)}
                        className="flex-1 md:w-32 px-4 py-3 bg-prestige-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-prestige-950/20"
                      >
                        {t("viewTranscript")}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}

              {viewingSession && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setViewingSession(null)}
                    className="absolute inset-0 bg-prestige-950/60 backdrop-blur-sm"
                  />
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative w-full max-w-4xl max-h-[80vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                  >
                    <div className="p-6 border-b border-prestige-100 flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-black text-prestige-950 tracking-tight">{t("viewTranscript")}</h2>
                        <p className="text-[10px] font-bold text-prestige-400 uppercase tracking-widest">{viewingSession.userEmail} • {viewingSession.userRole}</p>
                      </div>
                      <button 
                        onClick={() => setViewingSession(null)}
                        className="p-2 hover:bg-prestige-50 rounded-xl transition-colors text-prestige-400"
                      >
                        {t("close") || "Close"}
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-prestige-50">
                      {viewingSession.messages.map((m, i) => (
                        <div key={i} className={cn(
                          "flex flex-col gap-1 max-w-[80%]",
                          m.role === "user" ? "ml-auto items-end" : "items-start"
                        )}>
                          <span className="text-[10px] font-black uppercase tracking-widest text-prestige-400">
                            {m.role === "user" ? t("user") || "User" : t("aiAssistant") || "AI Assistant"}
                          </span>
                          <div className={cn(
                            "p-4 rounded-2xl text-sm font-medium",
                            m.role === "user" 
                              ? (viewingSession.userRole === "lawyer" ? "bg-accent-indigo text-white" : "bg-prestige-950 text-white")
                              : "bg-white border border-prestige-100 text-prestige-700"
                          )}>
                            {m.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-12">
               {/* Analytics Grid */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 {[
                    { label: t("totalRequests"), value: usageStats.length, color: "text-accent-indigo", icon: Activity },
                    { label: t("successRate"), value: usageStats.length > 0 ? `${((usageStats.filter(s => s.status === 'success').length / usageStats.length) * 100).toFixed(1)}%` : "N/A", color: "text-emerald-500", icon: TrendingUp },
                    { label: "Gemini AI", value: usageStats.filter(s => s.type === 'gemini_query').length, color: "text-accent-gold", icon: Zap },
                    { label: "Legal Searches", value: usageStats.filter(s => s.type === 'legal_search').length, color: "text-sky-500", icon: BarChart3 },
                 ].map((metric, i) => (
                   <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-6 rounded-[2rem] border border-prestige-100 shadow-sm"
                   >
                     <div className="flex items-center justify-between mb-4">
                       <div className={cn("p-2 rounded-xl bg-opacity-10", metric.color.replace('text-', 'bg-'))}>
                         <metric.icon className={cn("w-5 h-5", metric.color)} />
                       </div>
                     </div>
                     <p className="text-sm font-bold text-prestige-400 uppercase tracking-widest leading-none mb-2">{metric.label}</p>
                     <p className="text-3xl font-black text-prestige-950 tracking-tighter">{metric.value}</p>
                   </motion.div>
                 ))}
               </div>

               {/* Charts Row */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-8 rounded-[2.5rem] border border-prestige-100 shadow-xl shadow-prestige-900/5 h-[450px] flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-8">
                       <div>
                         <h3 className="text-lg font-black text-prestige-950 tracking-tight">{t("usageOverview")}</h3>
                         <p className="text-xs font-bold text-prestige-400 uppercase tracking-widest">{t("last7Days")}</p>
                       </div>
                       <div className="flex items-center gap-4">
                         <div className="flex items-center gap-1.5">
                           <div className="w-2 h-2 bg-accent-indigo rounded-full" />
                           <span className="text-[10px] font-black text-prestige-500 uppercase tracking-widest">Queries</span>
                         </div>
                       </div>
                    </div>
                    <div className="flex-1 w-full">
                       {usageStats.length > 0 ? (
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={Array.from({ length: 7 }).map((_, i) => {
                              const d = subDays(new Date(), i);
                              const dayStr = format(d, 'MMM dd');
                              const count = usageStats.filter(s => {
                                const statDate = s.timestamp?.toDate ? s.timestamp.toDate() : new Date(s.timestamp);
                                return format(statDate, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd');
                              }).length;
                              return { name: dayStr, count };
                            }).reverse()}>
                              <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                dy={10}
                                reversed={isRtl}
                              />
                              <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                dx={isRtl ? 10 : -10}
                                orientation={isRtl ? 'right' : 'left'}
                              />
                              <Tooltip 
                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 800 }}
                              />
                              <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                         </ResponsiveContainer>
                       ) : (
                         <div className="h-full flex flex-col items-center justify-center space-y-4">
                           <BarChart3 className="w-12 h-12 text-prestige-100" />
                           <p className="text-sm font-bold text-prestige-300">{t("noUsageData")}</p>
                         </div>
                       )}
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-8 rounded-[2.5rem] border border-prestige-100 shadow-xl shadow-prestige-900/5 h-[450px] flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-8">
                       <div>
                         <h3 className="text-lg font-black text-prestige-950 tracking-tight">{t("apiRequests")}</h3>
                         <p className="text-xs font-bold text-prestige-400 uppercase tracking-widest">Distribution</p>
                       </div>
                    </div>
                    <div className="flex-1 w-full">
                       {usageStats.length > 0 ? (
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={[
                                { name: 'Gemini', value: usageStats.filter(s => s.type === 'gemini_query').length, fill: '#ef4444' },
                                { name: 'Search', value: usageStats.filter(s => s.type === 'legal_search').length, fill: '#3b82f6' },
                                { name: 'Support', value: usageStats.filter(s => s.type === 'support_query').length, fill: '#10b981' },
                              ]}
                              layout="vertical"
                              margin={{ left: 20, right: 20 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                              <XAxis type="number" hide />
                              <YAxis 
                                type="category" 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 800, fill: '#475569' }}
                                width={80}
                                orientation={isRtl ? 'right' : 'left'}
                              />
                              <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 800 }}
                              />
                              <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                                {usageStats.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={['#6366f1', '#f59e0b', '#10b981'][index % 3]} />
                                ))}
                              </Bar>
                            </BarChart>
                         </ResponsiveContainer>
                       ) : (
                         <div className="h-full flex flex-col items-center justify-center space-y-4">
                           <TrendingUp className="w-12 h-12 text-prestige-100" />
                           <p className="text-sm font-bold text-prestige-300">{t("noUsageData")}</p>
                         </div>
                       )}
                    </div>
                  </motion.div>
               </div>

               {/* Recent Stats Table */}
               <div className="bg-white rounded-[2.5rem] border border-prestige-100 shadow-xl shadow-prestige-900/5 overflow-hidden">
                  <div className="p-8 border-b border-prestige-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-prestige-950 tracking-tight">Recent Activity Log</h3>
                      <p className="text-[10px] font-bold text-prestige-400 uppercase tracking-widest leading-none mt-1">Live requests stream</p>
                    </div>
                    <button 
                      onClick={fetchUsageStats}
                      className="p-3 bg-prestige-50 text-prestige-400 hover:text-accent-indigo rounded-2xl transition-all"
                    >
                      <Activity className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-start">
                      <thead>
                        <tr className="bg-prestige-50/50">
                          <th className="px-8 py-4 text-[10px] font-black text-prestige-400 uppercase tracking-widest text-start">Type</th>
                          <th className="px-8 py-4 text-[10px] font-black text-prestige-400 uppercase tracking-widest text-start">Status</th>
                          <th className="px-8 py-4 text-[10px] font-black text-prestige-400 uppercase tracking-widest text-start">User ID</th>
                          <th className="px-8 py-4 text-[10px] font-black text-prestige-400 uppercase tracking-widest text-start">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-prestige-50">
                        {usageStats.slice(0, 10).map((stat) => (
                          <tr key={stat.id} className="hover:bg-prestige-50/30 transition-colors">
                            <td className="px-8 py-4">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center",
                                  stat.type === 'gemini_query' ? "bg-accent-gold/10 text-accent-gold" : "bg-accent-indigo/10 text-accent-indigo"
                                )}>
                                  {stat.type === 'gemini_query' ? <Zap className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                                </div>
                                <span className="text-xs font-bold text-prestige-900">{stat.type.replace('_', ' ').toUpperCase()}</span>
                              </div>
                            </td>
                            <td className="px-8 py-4">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                stat.status === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                              )}>
                                {stat.status}
                              </span>
                            </td>
                            <td className="px-8 py-4 text-[10px] font-mono text-prestige-400 font-bold">
                              {stat.userId.substring(0, 12)}...
                            </td>
                            <td className="px-8 py-4 text-[10px] font-bold text-prestige-500 uppercase tracking-widest">
                              {stat.timestamp?.toDate ? format(stat.timestamp.toDate(), 'HH:mm • MMM dd') : 'Just now'}
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
      </div>
    </div>
  );
}

