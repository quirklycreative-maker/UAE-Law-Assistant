import React from "react";
import { Star, MapPin, Briefcase, GraduationCap } from "lucide-react";
import { cn } from "../lib/utils";

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
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col">
      <div className="aspect-[16/10] relative overflow-hidden bg-slate-100">
        <img 
          src={lawyer.image} 
          alt={lawyer.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute top-4 right-4 bg-white shadow-sm px-2 py-1 rounded-md flex items-center gap-1.5">
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          <span className="text-[10px] font-bold text-slate-700">{lawyer.rating}</span>
        </div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-800 leading-tight">
            {lawyer.name}
          </h3>
          <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mt-1">{lawyer.specialization}</p>
        </div>

        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed flex-1 font-medium italic">
          "{lawyer.bio}"
        </p>

        <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
          <div>
             <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-tight">Fee per session</span>
            <span className="text-base font-bold text-slate-900">AED {lawyer.price}</span>
          </div>
          <button 
            onClick={() => onBook(lawyer.id)}
            className="px-5 py-2.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition-all shadow-sm shadow-emerald-700/10"
          >
            Book Session
          </button>
        </div>
      </div>
    </div>
  );
}
