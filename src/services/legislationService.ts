/// <reference types="vite/client" />
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { logUsage } from "../lib/usage";

export interface LawSnippet {
  id: string;
  title: string;
  content: string;
  articleNumber?: string;
  lawNumber: string;
  category: string;
}

const MOCK_LEGISLATION: LawSnippet[] = [
  {
    id: "labor-1",
    title: "Federal Decree-Law No. 33 of 2021",
    lawNumber: "33/2021",
    articleNumber: "9",
    category: "Labor Law",
    content: "Probation period shall not exceed 6 months. Employer must give 14 days notice to terminate during probation."
  },
  {
    id: "labor-2",
    title: "Federal Decree-Law No. 33 of 2021",
    lawNumber: "33/2021",
    articleNumber: "51",
    category: "Labor Law",
    content: "Full-time foreign workers are entitled to end-of-service gratuity after 1 year of continuous service. Calculated as 21 days' basic salary for each of the first 5 years."
  },
  {
    id: "comm-1",
    title: "Federal Law No. 2 of 2015 on Commercial Companies",
    lawNumber: "2/2015",
    articleNumber: "71",
    category: "Commercial Law",
    content: "A Limited Liability Company (LLC) must have between 2 and 50 partners. Each partner is only liable to the extent of their share in the capital."
  },
  {
    id: "prop-1",
    title: "Dubai Law No. 7 of 2006",
    lawNumber: "7/2006",
    articleNumber: "4",
    category: "Property Law",
    content: "Right to own real property in the Emirate of Dubai is restricted to UAE and GCC nationals. Non-nationals may be granted rights in designated areas (Freehold)."
  },
  {
    id: "civil-1",
    title: "Federal Law No. 5 of 1985 (Civil Transactions Law)",
    lawNumber: "5/1985",
    articleNumber: "246",
    category: "Civil Law",
    content: "The contract must be performed in accordance with its contents and in a manner consistent with the requirements of good faith."
  }
];

/**
 * Searches local Firestore legislation for relevant laws (Basic RAG)
 * Now includes support for real MOJ Legislation API integration.
 */
export async function searchLocalLegislation(keyword: string): Promise<LawSnippet[]> {
  try {
    // 1. Attempt to fetch from real UAE MOJ Legislation API if configured
    const mojApiKey = import.meta.env.VITE_MOJ_API_KEY;
    if (mojApiKey) {
      try {
        const response = await fetch(`https://api.moj.gov.ae/v1/legislation/search?query=${encodeURIComponent(keyword)}`, {
          headers: {
            "Authorization": `Bearer ${mojApiKey}`,
            "Content-Type": "application/json"
          }
        });
        if (response.ok) {
          const data = await response.json();
          return data.snippets.map((s: any) => ({
            id: s.id,
            title: s.title,
            lawNumber: s.law_no,
            articleNumber: s.article_no,
            category: s.category || "General",
            content: s.text_content
          }));
        }
      } catch (apiErr) {
        console.error("MOJ Legislation API Error:", apiErr);
      }
    }

    const path = "legislation";
    const lawsRef = collection(db, path);
    const q = query(lawsRef, limit(10));
    const snapshot = await getDocs(q);
    const dbResults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LawSnippet));

    // Combine with mock data for robust initial experience
    const allResults = [...dbResults, ...MOCK_LEGISLATION];

    logUsage('legal_search', 'success');

    return allResults.filter(law => 
      law.title.toLowerCase().includes(keyword.toLowerCase()) || 
      law.content.toLowerCase().includes(keyword.toLowerCase()) ||
      law.category.toLowerCase().includes(keyword.toLowerCase())
    ).slice(0, 4);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, "legislation");
      console.warn("DB search failed, falling back to mock legislation:", e);
      return MOCK_LEGISLATION.filter(law => 
      law.title.toLowerCase().includes(keyword.toLowerCase()) || 
      law.content.toLowerCase().includes(keyword.toLowerCase()) ||
      law.category.toLowerCase().includes(keyword.toLowerCase())
    ).slice(0, 4);
  }
}

/**
 * Formats laws for AI prompt
 */
export function formatLawsForContext(laws: LawSnippet[]): string {
  if (laws.length === 0) return "No specific local database entries found for this exact query.";
  
  return laws.map(law => `
LAW: ${law.title} (Law No. ${law.lawNumber})
ARTICLE: ${law.articleNumber || "N/A"}
CONTENT: ${law.content}
---`).join("\n");
}
