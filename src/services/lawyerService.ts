/// <reference types="vite/client" />
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, getDocs, query, limit, where } from "firebase/firestore";

export interface Review {
  id: string;
  userName: string;
  userImage: string;
  rating: number;
  comment: string;
  date: string;
}

export interface WorkingHours {
  weekday: { start: string; end: string };
  friday: { start: string; end: string };
}

export interface Lawyer {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  reviews: number;
  reviewList?: Review[];
  price: number;
  image: string;
  bio: string;
  education?: string[];
  languages?: string[];
  experience?: string;
  isVerified?: boolean;
  workingHours?: WorkingHours;
  offDays?: string[];
  isOOO?: boolean;
}

const DEFAULT_HOURS: WorkingHours = {
  weekday: { start: "09:00", end: "18:00" },
  friday: { start: "08:00", end: "12:00" }
};

const MOCK_REVIEWS: Review[] = [
  {
    id: "r1",
    userName: "Hassan Ali",
    userImage: "https://i.pravatar.cc/100?img=11",
    rating: 5,
    comment: "Extremely professional and knowledgeable. Helped me resolve a complex commercial dispute efficiently.",
    date: "2024-03-15"
  },
  {
    id: "r2",
    userName: "Mona Smith",
    userImage: "https://i.pravatar.cc/100?img=25",
    rating: 4,
    comment: "Very helpful consultation. Clear explanations of the law.",
    date: "2024-02-28"
  }
];

const MOCK_LAWYERS: Lawyer[] = [
  {
    id: "1",
    name: "Adv. Sarah Al-Mansoori",
    specialization: "Corporate & Commercial",
    rating: 4.9,
    reviews: 124,
    reviewList: MOCK_REVIEWS,
    price: 450,
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
    bio: "Specializing in UAE commercial law and business setups. Expert in navigating free zone regulations. Sarah has over 15 years of experience advising international corporations on their entry into the UAE market.",
    education: ["LLM in International Law, University of Dubai", "LLB, Zayed University"],
    languages: ["Arabic", "English"],
    experience: "15+ Years",
    isVerified: true,
    workingHours: DEFAULT_HOURS,
    offDays: ["Saturday", "Sunday"]
  },
  {
    id: "2",
    name: "Dr. Omar Khouri",
    specialization: "Family Law",
    rating: 4.8,
    reviews: 89,
    reviewList: MOCK_REVIEWS,
    price: 350,
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400",
    bio: "Compassionate legal support for family matters, including personal status laws and inheritance. Dr. Omar is known for his mediation skills and finding amicable solutions for sensitive family disputes.",
    education: ["PhD in Family Law, Sorbonne University Abu Dhabi", "LLB, University of Sharjah"],
    languages: ["Arabic", "English", "French"],
    experience: "20+ Years",
    isVerified: true,
    workingHours: DEFAULT_HOURS,
    offDays: ["Saturday", "Sunday"]
  },
  {
    id: "3",
    name: "Layla Rashid",
    specialization: "Criminal & Defense",
    rating: 4.7,
    reviews: 210,
    reviewList: MOCK_REVIEWS,
    price: 600,
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400",
    bio: "Dedicated litigator with extensive experience in criminal courts across all emirates. Layla has successfully defended high-profile cases and is committed to upholding the rights of the accused.",
    education: ["LLB, Abu Dhabi University"],
    languages: ["Arabic", "English"],
    experience: "12+ Years",
    isVerified: true,
    workingHours: DEFAULT_HOURS,
    offDays: ["Friday", "Saturday"]
  },
  {
    id: "4",
    name: "Ahmed Al-Farsi",
    specialization: "Real Estate & Property",
    rating: 4.6,
    reviews: 67,
    reviewList: MOCK_REVIEWS,
    price: 400,
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400",
    bio: "Helping investors and residents with UAE property disputes, title transfers, and rental litigations. Ahmed provides strategic advice for both residential and commercial property investments.",
    education: ["LLB, UAE University"],
    languages: ["Arabic", "English"],
    experience: "10+ Years",
    isVerified: true,
    workingHours: DEFAULT_HOURS,
    offDays: ["Saturday", "Sunday"]
  },
  {
    id: "5",
    name: "Hala Mahmoud",
    specialization: "Labor & Employment",
    rating: 4.8,
    reviews: 112,
    reviewList: MOCK_REVIEWS,
    price: 380,
    image: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&q=80&w=400",
    bio: "Protecting employee rights and advising businesses on UAE labor law compliance. Expert in gratuity calculations, non-compete clauses, and workplace dispute resolution.",
    education: ["LLB, University of Sharjah", "Masters in Human Rights, American University of Sharjah"],
    languages: ["Arabic", "English"],
    experience: "14+ Years",
    isVerified: true,
    workingHours: DEFAULT_HOURS,
    offDays: ["Saturday", "Sunday"]
  }
];

/**
 * Fetches lawyers from MOJ Directory or local database.
 * Placeholder for real MOJ Lawyers Directory API.
 */
export async function getLawyers(): Promise<Lawyer[]> {
  try {
    // 1. Attempt to fetch from MOJ Lawyers Directory API (if configured)
    const mojApiKey = import.meta.env.VITE_MOJ_API_KEY;
    if (mojApiKey) {
      try {
        const response = await fetch("https://api.moj.gov.ae/v1/lawyers/directory", {
          headers: {
            "Authorization": `Bearer ${mojApiKey}`,
            "Content-Type": "application/json"
          }
        });
        if (response.ok) {
          const data = await response.json();
          // Map real API data to our Lawyer interface
          return data.lawyers.map((l: any) => ({
             id: l.id,
             name: l.fullName,
             specialization: l.mainFocus,
             rating: l.rating || 4.5,
             reviews: l.reviewCount || 0,
             price: l.consultationFee || 500,
             image: l.profileImageUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
             bio: l.shortBio || "",
             isVerified: true
          }));
        }
      } catch (apiErr) {
        console.error("MOJ Lawyers API Error:", apiErr);
      }
    }

    // 2. Fallback to local Firestore database
    const lawyersRef = collection(db, "lawyers");
    const q = query(lawyersRef, limit(20));
    const snapshot = await getDocs(q);
    const dbLawyers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lawyer));

    // Combine Mock Data with Real Data (as requested to show dummy profiles until API is confirmed)
    return [...MOCK_LAWYERS, ...dbLawyers];
  } catch (e) {
    console.warn("Lawyer fetch error, falling back to mocks:", e);
    return MOCK_LAWYERS;
  }
}

export async function getLawyerByUserId(userId: string): Promise<Lawyer | null> {
  try {
    const lawyersRef = collection(db, "lawyers");
    const q = query(lawyersRef, where("userId", "==", userId), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docData = snapshot.docs[0];
      return { id: docData.id, ...docData.data() } as Lawyer;
    }
    return null;
  } catch (e) {
    console.error("Error fetching lawyer by user ID:", e);
    return null;
  }
}

export async function getLawyerById(id: string): Promise<Lawyer | null> {
  const lawyers = await getLawyers();
  return lawyers.find(l => l.id === id) || null;
}
