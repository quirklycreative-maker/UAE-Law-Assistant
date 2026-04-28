import React, { useState, useEffect } from "react";
import { auth, db } from "../lib/firebase";
import { collection, getDocs, setDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Users, UserPlus, Trash2, ShieldCheck, Mail, Calendar, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface AuthorizedLawyer {
  email: string;
  addedAt: string;
}

export default function Management() {
  const [user] = useAuthState(auth);
  const isSuperAdmin = user?.email === "universe.24.369@gmail.com";
  
  const [lawyers, setLawyers] = useState<AuthorizedLawyer[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchLawyers();
    }
  }, [isSuperAdmin]);

  const fetchLawyers = async () => {
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
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-indigo/10 rounded-full border border-accent-indigo/20">
              <ShieldCheck className="w-3.5 h-3.5 text-accent-indigo" />
              <span className="text-[10px] font-black text-accent-indigo uppercase tracking-widest leading-none">Super Admin Console</span>
            </div>
            <h1 className="text-4xl font-black text-prestige-950 tracking-tighter">Role Management</h1>
            <p className="text-prestige-500 font-medium tracking-tight">Manage lawyer credentials and platform access.</p>
          </div>

          <form onSubmit={handleAddLawyer} className="flex gap-2 bg-white p-2 rounded-2xl border border-prestige-200 shadow-sm md:w-96">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-prestige-400" />
              <input 
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="New Lawyer Email"
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
              Authorize
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-32 bg-prestige-200/50 rounded-3xl animate-pulse" />
            ))
          ) : lawyers.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-3xl border-2 border-dashed border-prestige-200 space-y-4">
              <Users className="w-12 h-12 text-prestige-200 mx-auto" />
              <p className="text-sm font-bold text-prestige-400">No authorized lawyers yet.</p>
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
                    Added: {new Date(lawyer.addedAt).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
