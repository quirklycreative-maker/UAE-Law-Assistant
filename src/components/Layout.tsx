import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Scale, MessageSquare, Users, Calendar, LogIn, LogOut, Search, Globe, Paperclip, CheckCircle2, FlaskConical, Loader2, Zap, ShieldCheck } from "lucide-react";
import { auth, signInWithGoogle, logout, db } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { getLawyerByUserId, Lawyer } from "../services/lawyerService";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const [lawyerProfile, setLawyerProfile] = React.useState<Lawyer | null>(null);
  const [isAuthorized, setIsAuthorized] = React.useState(false);
  const location = useLocation();
  const { language, setLanguage, t, isRtl } = useLanguage();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isAuthActionLoading, setIsAuthActionLoading] = React.useState(false);
  const [isDevLoading, setIsDevLoading] = React.useState(false);
  const isFixedPage = location.pathname === "/assistant" || location.pathname === "/history";

  const isSuperAdmin = user?.email === "universe.24.369@gmail.com";

  const toggleLawyerRole = async () => {
    if (!user || !isSuperAdmin) return;
    setIsDevLoading(true);
    try {
      if (lawyerProfile) {
        setLawyerProfile(null);
      } else {
        const profile = await getLawyerByUserId(user.uid);
        if (profile) {
          setLawyerProfile(profile);
        } else {
          // Mock simple profile for switching
          setLawyerProfile({ id: user.uid, name: user.displayName || "Lawyer" } as any);
        }
      }
    } catch (err) {
      console.error("Error toggling role:", err);
    } finally {
      setIsDevLoading(false);
    }
  };

  React.useEffect(() => {
    async function checkLawyer() {
      if (user) {
        // Check if explicitly authorized by admin
        const authRef = doc(db, "authorized_lawyers", user.email?.toLowerCase().trim() || "");
        const authSnap = await getDoc(authRef);
        const authorized = authSnap.exists();
        setIsAuthorized(authorized);

        const profile = await getLawyerByUserId(user.uid);
        
        // Rules for display:
        // 1. If super admin, keep whatever current state toggle is
        // 2. If authorized or has profile, start as lawyer
        if (!isSuperAdmin) {
          if (authorized || profile) {
            setLawyerProfile(profile || { id: user.uid, name: user.displayName || "Lawyer" } as any);
          } else {
            setLawyerProfile(null);
          }
        } else if (!lawyerProfile && (authorized || profile)) {
           // Initial load for super admin if they have a profile
           setLawyerProfile(profile || { id: user.uid, name: user.displayName || "Lawyer" } as any);
        }
      } else {
        setLawyerProfile(null);
        setIsAuthorized(false);
      }
    }
    checkLawyer();
  }, [user]);

  const navItems = [
    { name: t("home"), path: "/", icon: MessageSquare },
    { name: "Chat", path: "/assistant", icon: MessageSquare },
    ...(lawyerProfile ? [{ name: "AI Strategic Associate", path: "/lawyer/assistant", icon: Zap, isSpecial: true }] : []),
    { name: "Legislation", path: "/laws", icon: Search },
    { name: "My History", path: "/history", icon: Scale },
    { name: t("findLawyer"), path: "/lawyers", icon: Users },
    { name: t("myBookings"), path: "/appointments", icon: Calendar },
    ...(isSuperAdmin ? [{ name: "Admin", path: "/management", icon: ShieldCheck }] : []),
  ];

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

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className={cn("h-screen bg-prestige-50 flex flex-col font-sans overflow-hidden", isRtl && "font-arabic")}>
      <header className="sticky top-0 z-50 w-full border-b border-prestige-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between gap-4">
          <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 bg-accent-indigo rounded-xl flex items-center justify-center shadow-lg shadow-accent-indigo/20 group-hover:scale-110 transition-transform">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-prestige-950 leading-tight">JusticeFlow</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-accent-indigo rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-accent-indigo uppercase tracking-widest">UAE</span>
                {location.pathname === "/assistant" && (
                   <span className="hidden sm:inline text-[9px] font-black text-accent-gold uppercase tracking-widest bg-accent-gold/10 px-1 rounded-sm">Live</span>
                )}
              </div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-10 h-full">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center h-full text-sm font-bold transition-all relative group uppercase tracking-widest text-[11px]",
                    (item as any).isSpecial 
                      ? (isActive ? "text-accent-gold" : "text-accent-gold/60 hover:text-accent-gold")
                      : (isActive ? "text-accent-indigo" : "text-prestige-500 hover:text-prestige-900")
                  )}
                >
                  <div className="flex items-center gap-2">
                    {(item as any).isSpecial && <Zap className="w-3 h-3 fill-current" />}
                    {item.name}
                  </div>
                  {isActive && (
                    <motion.div 
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-accent-indigo rounded-t-full"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-6">
            <div className="hidden sm:flex items-center bg-prestige-100 rounded-full p-1 border border-prestige-200">
              <button 
                onClick={() => setLanguage('en')}
                className={cn(
                  "px-3 py-1 text-[10px] font-black rounded-full transition-all",
                  language === 'en' ? "bg-white text-accent-indigo shadow-sm" : "text-prestige-400 hover:text-prestige-600"
                )}
              >
                EN
              </button>
              <button 
                onClick={() => setLanguage('ar')}
                className={cn(
                  "px-3 py-1 text-[10px] font-black rounded-full transition-all",
                  language === 'ar' ? "bg-white text-accent-indigo shadow-sm" : "text-prestige-400 hover:text-prestige-600"
                )}
              >
                AR
              </button>
            </div>

            {loading || isAuthActionLoading ? (
              <div className="w-10 h-10 rounded-full bg-prestige-200 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-4 pl-4 border-l border-prestige-200">
                {isSuperAdmin && (
                  <button
                    onClick={toggleLawyerRole}
                    disabled={isDevLoading}
                    title="Toggle Lawyer/Client Role"
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                      lawyerProfile 
                        ? "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100" 
                        : "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100"
                    )}
                  >
                    {isDevLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <FlaskConical className="w-3 h-3" />
                    )}
                    {lawyerProfile ? "Become Client" : "Become Lawyer"}
                  </button>
                )}
                <div className="hidden sm:block text-end">
                  <div className="flex items-center gap-2 justify-end mb-0.5">
                    {lawyerProfile && (
                      <Link to="/lawyer/dashboard" className="text-[9px] font-black bg-accent-gold/10 text-accent-gold px-2 py-0.5 rounded border border-accent-gold/20 hover:bg-accent-gold hover:text-prestige-950 transition-colors uppercase tracking-widest leading-none">
                        Management
                      </Link>
                    )}
                    <p className="text-xs font-bold text-prestige-900">{user.displayName}</p>
                  </div>
                  <button onClick={logout} className="text-[10px] uppercase font-black tracking-widest text-prestige-400 hover:text-red-500 transition-colors">
                    {t("logout")}
                  </button>
                </div>
                <img src={user.photoURL || ""} alt="avatar" className="w-10 h-10 rounded-xl border-2 border-prestige-100 shadow-sm" />
              </div>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={handleLogin}
                  className="p-2.5 sm:px-5 sm:py-2.5 bg-prestige-950 text-white rounded-xl text-sm font-bold hover:bg-prestige-800 transition-all shadow-xl shadow-prestige-950/10 active:scale-95 flex items-center justify-center"
                  disabled={isAuthActionLoading}
                >
                  <span className="hidden sm:inline">{t("register")}</span>
                  <LogIn className="w-5 h-5 sm:hidden" />
                </button>
              </div>
            )}

            <div className="sm:hidden flex items-center bg-prestige-100 rounded-full p-0.5 border border-prestige-200">
               <button 
                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                className="px-2.5 py-1 text-[9px] font-black rounded-full bg-white text-accent-indigo shadow-sm uppercase"
              >
                {language === 'en' ? 'AR' : 'EN'}
              </button>
            </div>

            <button 
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 text-prestige-900 hover:bg-prestige-50 rounded-xl transition-colors"
            >
              <div className="w-6 h-5 flex flex-col justify-between relative">
                <span className={cn("w-full h-0.5 bg-current rounded-full transition-all duration-300", isMobileMenuOpen && "absolute top-2 rotate-45")} />
                <span className={cn("w-full h-0.5 bg-current rounded-full transition-all duration-300", isMobileMenuOpen && "opacity-0")} />
                <span className={cn("w-full h-0.5 bg-current rounded-full transition-all duration-300", isMobileMenuOpen && "absolute top-2 -rotate-45")} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-b border-prestige-200 overflow-hidden"
            >
              <div className="container mx-auto px-6 py-8 space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl transition-all font-black uppercase tracking-widest text-xs",
                          isActive 
                            ? "bg-accent-indigo text-white shadow-lg shadow-accent-indigo/20" 
                            : ((item as any).isSpecial ? "bg-accent-gold/10 text-accent-gold border border-accent-gold/20" : "bg-prestige-50 text-prestige-950 hover:bg-prestige-100")
                        )}
                      >
                        <item.icon className={cn("w-5 h-5", isActive ? "text-white" : ((item as any).isSpecial ? "text-accent-gold" : "text-accent-indigo"))} />
                        {item.name}
                        {(item as any).isSpecial && <Zap className="w-4 h-4 ml-auto fill-current" />}
                      </Link>
                    );
                  })}
                </div>

                <div className="pt-6 border-t border-prestige-100 flex items-center justify-between">
                  {user ? (
                    <div className="flex flex-col gap-4 w-full">
                      <div className="flex items-center gap-4 w-full">
                        <img src={user.photoURL || ""} alt="avatar" className="w-10 h-10 rounded-xl border-2 border-prestige-100" />
                        <div className="flex-1 text-start">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-prestige-900">{user.displayName}</p>
                            {lawyerProfile && (
                              <Link to="/lawyer/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="text-[8px] font-black bg-accent-gold/10 text-accent-gold px-1.5 py-0.5 rounded border border-accent-gold/20 uppercase">
                                Management
                              </Link>
                            )}
                          </div>
                          <button onClick={logout} className="text-[10px] uppercase font-black tracking-widest text-red-500">
                            {t("logout")}
                          </button>
                        </div>
                      </div>
                      {isSuperAdmin && (
                        <button
                          onClick={toggleLawyerRole}
                          disabled={isDevLoading}
                          className={cn(
                            "flex items-center justify-center gap-2 w-full p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                            lawyerProfile 
                              ? "bg-rose-50 text-rose-600 border-rose-100" 
                              : "bg-emerald-50 text-emerald-600 border-emerald-100"
                          )}
                        >
                          {isDevLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FlaskConical className="w-4 h-4" />
                          )}
                          {lawyerProfile ? "Become Client Role" : "Become Lawyer Role"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        handleLogin();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full py-4 bg-prestige-950 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-5 h-5" />
                      {t("register")}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>


      <main className={cn("flex-1 flex flex-col min-h-0 relative", !isFixedPage && "overflow-y-auto")}>
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
        <footer className="px-6 py-4 md:px-8 md:py-10 bg-prestige-950 text-white border-t border-prestige-800 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 text-[10px] md:text-[11px] font-bold tracking-widest uppercase">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-12">
            <Link to="/" className="hidden md:flex items-center gap-2">
               <Scale className="w-4 h-4 text-accent-gold" />
               <span className="text-prestige-100">{t("appName")}</span>
            </Link>
            <div className="flex gap-6 md:gap-8">
              <a href="#" className="text-prestige-400 hover:text-white transition-colors">Privacy</a>
              <a href="#" className="text-prestige-400 hover:text-white transition-colors">Terms</a>
              <a href="#" className="text-prestige-400 hover:text-white transition-colors">Support</a>
              {lawyerProfile ? (
                <button 
                  onClick={() => {
                    const url = window.location.origin;
                    navigator.clipboard.writeText(`Join me on JusticeFlow: ${url}`);
                    alert("Referral link copied to clipboard!");
                  }}
                  className="text-accent-gold hover:text-white transition-colors flex items-center gap-2"
                >
                  <Users className="w-3 h-3" />
                  Referral
                </button>
              ) : (
                <Link to="/register-lawyer" className="text-accent-gold hover:text-white transition-colors">Join as Lawyer</Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 bg-prestige-900/50 px-3 py-1.5 rounded-full border border-prestige-800 scale-90 md:scale-100">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
            <span className="text-prestige-300 text-[9px] md:text-[10px]">CORE AI ACTIVE</span>
          </div>
        </footer>
      )}
    </div>
  );
}
