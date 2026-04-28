import React from "react";
import { Star, MapPin, Briefcase, GraduationCap, ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

interface LawyerProps {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  reviews: number;
  price: number;
  image: string;
  bio: string;
}

export default function LawyerCard({ lawyer, onBook }: { lawyer: LawyerProps; onBook: (id: string) => void }) {
  const { t, isRtl } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-[2rem] border border-prestige-100 overflow-hidden hover:shadow-2xl hover:shadow-prestige-900/5 transition-all duration-500 group flex flex-col h-full">
      <div 
        className="aspect-[1.1/1] relative overflow-hidden bg-prestige-50 cursor-pointer"
        onClick={() => navigate(`/lawyers/${lawyer.id}`)}
      >
        <img 
          src={lawyer.image} 
          alt={lawyer.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale-[0.2] group-hover:grayscale-0"
        />
        <div className={cn(
          "absolute top-6 bg-white/90 backdrop-blur-md shadow-xl px-3 py-1.5 rounded-full flex items-center gap-2",
          isRtl ? "left-6" : "right-6"
        )}>
          <Star className="w-4 h-4 text-accent-gold fill-accent-gold" />
          <span className="text-xs font-black text-prestige-950">{lawyer.rating}</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-prestige-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
            <span className="px-6 py-3 bg-white text-prestige-950 rounded-full font-black text-[10px] uppercase tracking-widest translate-y-4 group-hover:translate-y-0 transition-transform duration-500 shadow-xl">Detailed Profile</span>
        </div>
      </div>
      
      <div className="p-8 flex-1 flex flex-col relative text-start">
        <div className="mb-4">
          <h3 
            className="text-xl font-extrabold text-prestige-950 tracking-tight leading-tight group-hover:text-accent-indigo transition-colors cursor-pointer"
            onClick={() => navigate(`/lawyers/${lawyer.id}`)}
          >
            {lawyer.name}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 bg-accent-gold rounded-full" />
            <p className="text-[10px] text-prestige-500 font-black uppercase tracking-[0.15em]">{lawyer.specialization}</p>
          </div>
        </div>

        <p className="text-sm text-prestige-600 line-clamp-3 leading-relaxed flex-1 font-medium">
          {lawyer.bio}
        </p>

        <div className="pt-8 mt-8 border-t border-prestige-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className={cn(isRtl ? "text-right" : "text-left")}>
              <span className="text-[10px] text-prestige-400 block font-black uppercase tracking-widest mb-1">{t("feePerSession")}</span>
              <div className="flex items-baseline gap-1">
                 <span className="text-lg font-black text-prestige-950">{lawyer.price}</span>
                 <span className="text-[10px] font-bold text-prestige-400 uppercase">{t("currency")}</span>
              </div>
            </div>
            <button 
              onClick={() => onBook(lawyer.id)}
              className="px-6 py-3 bg-accent-indigo text-white rounded-2xl text-xs font-black hover:bg-prestige-950 transition-all shadow-xl shadow-accent-indigo/20 active:scale-95 flex items-center gap-2"
            >
              {t("bookSession")}
            </button>
          </div>
          
          <button 
            onClick={() => navigate(`/lawyers/${lawyer.id}`)}
            className="w-full py-4 border border-prestige-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-prestige-400 hover:text-accent-indigo hover:border-accent-indigo transition-all flex items-center justify-center gap-2 group-btn"
          >
            View Full Biography <ArrowRight className="w-3.5 h-3.5 group-btn-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
