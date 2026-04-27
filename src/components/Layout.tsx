import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Scale, MessageSquare, Users, Calendar, LogIn, LogOut, Search, Globe, Paperclip, CheckCircle2 } from "lucide-react";
import { auth, signInWithGoogle, logout } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const location = useLocation();
  const { language, setLanguage, t, isRtl } = useLanguage();

  const navItems = [
    { name: t("home"), path: "/assistant", icon: MessageSquare },
    { name: "Legislation", path: "/laws", icon: Search },
    { name: "My History", path: "/history", icon: Scale },
    { name: t("findLawyer"), path: "/lawyers", icon: Users },
    { name: t("myBookings"), path: "/appointments", icon: Calendar },
  ];

  const [isAuthActionLoading, setIsAuthActionLoading] = React.useState(false);

  const handleLogin = async () => {
    if (isAuthActionLoading) return;
    setIsAuthActionLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Layout login error:", err);
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  return (
    <div className={cn("min-h-screen bg-slate-50 flex flex-col font-sans", isRtl && "font-arabic")}>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 bg-emerald-700 rounded-md flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-800 leading-tight">{t("appName")}</span>
              {location.pathname === "/assistant" && (
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest scale-90 origin-left">Live Sync</span>
                </div>
              )}
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 h-full">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center h-16 text-sm font-medium transition-all border-b-2",
                    isActive 
                      ? "text-emerald-700 border-emerald-700" 
                      : "text-slate-500 border-transparent hover:text-slate-800"
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <button 
                onClick={() => {
                  const url = window.location.origin;
                  navigator.clipboard.writeText(url).then(() => alert("Link copied to clipboard!"));
                }}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-200 transition-all"
              >
                <Paperclip className="w-3.5 h-3.5" />
                {t("shareLink")}
              </button>

            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button 
                onClick={() => setLanguage('en')}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded transition-all",
                  language === 'en' ? "bg-white text-emerald-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                EN
              </button>
              <button 
                onClick={() => setLanguage('ar')}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded transition-all",
                  language === 'ar' ? "bg-white text-emerald-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                AR
              </button>
            </div>

            {loading || isAuthActionLoading ? (
              <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <div className={cn("hidden sm:block", isRtl ? "text-left" : "text-right")}>
                  <p className="text-xs font-bold text-slate-700">{user.displayName}</p>
                  <button onClick={logout} className="text-[10px] uppercase font-bold tracking-wider text-slate-400 hover:text-red-500 transition-colors">
                    {t("logout")}
                  </button>
                </div>
                <img src={user.photoURL || ""} alt="avatar" className="w-9 h-9 rounded-xl border border-slate-200 shadow-sm" />
              </div>
            ) : (
              <div className="flex gap-4">
                <button 
                  onClick={handleLogin}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                  disabled={isAuthActionLoading}
                >
                  {t("login")}
                </button>
                <button 
                  onClick={handleLogin}
                  className="px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50"
                  disabled={isAuthActionLoading}
                >
                  {t("register")}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex-1 flex flex-col min-h-0"
        >
          {children}
        </motion.div>
      </main>
      
      {location.pathname !== "/assistant" && (
        <footer className="px-8 py-4 bg-slate-100 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 font-bold tracking-tight uppercase">
          <div className="flex flex-wrap gap-4 md:gap-6">
            <span>© {new Date().getFullYear()} {t("appName").toUpperCase()}</span>
            <a href="#" className="hover:text-slate-700 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-700 transition-colors">Terms of Use</a>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>AI SYSTEMS ONLINE</span>
          </div>
        </footer>
      )}
    </div>
  );
}
