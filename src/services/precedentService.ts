/// <reference types="vite/client" />
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

export interface Precedent {
  id: string;
  caseName: string;
  citation: string;
  court: string;
  year: string;
  legalPrinciples: string[];
  summary: string;
  jurisdiction: "Dubai" | "Abu Dhabi" | "Federal" | "DIFC" | "ADGM";
}

const MOCK_PRECEDENTS: Precedent[] = [
  {
    id: "prec-1",
    caseName: "Cassation Court Case No. 123/2022",
    citation: "2022 DXB CAS 123",
    court: "Dubai Court of Cassation",
    year: "2022",
    legalPrinciples: ["Good Faith", "Contractual Liability"],
    summary: "The court affirmed that the principle of good faith in Article 246 of the Civil Transactions Law applies to all stages of a contract, including termination. Arbitrary termination of a commercial agency agreement without valid justification leads to compensation.",
    jurisdiction: "Dubai"
  },
  {
    id: "prec-2",
    caseName: "Federal Supreme Court Case No. 456/2021",
    citation: "2021 FED SUP 456",
    court: "Federal Supreme Court",
    year: "2021",
    legalPrinciples: ["Public Policy", "Arbitration"],
    summary: "Public policy considerations in the UAE include the non-arbitrability of labor disputes. Any arbitration clause in a standard employment contract is null and void if it contradicts the mandatory protections of the Labor Law.",
    jurisdiction: "Federal"
  },
  {
    id: "prec-3",
    caseName: "DIFC Court of Appeal - Standard Chartered v. Investment Corp",
    citation: "2019 DIFC CA 008",
    court: "DIFC Court of Appeal",
    year: "2019",
    legalPrinciples: ["Jurisdiction", "Functus Officio"],
    summary: "Detailed analysis of the jurisdiction of DIFC courts in relation to domestic and international arbitration awards. The court clarified the scope of the 'Conduit Jurisdiction' following the creation of the Joint Judicial Committee.",
    jurisdiction: "DIFC"
  },
  {
    id: "prec-4",
    caseName: "Abu Dhabi Court of Cassation Case No. 789/2023",
    citation: "2023 AD CAS 789",
    court: "Abu Dhabi Court of Cassation",
    year: "2023",
    legalPrinciples: ["Force Majeure", "Exceptional Circumstances"],
    summary: "The court distinguished between Force Majeure (Article 273) and Exceptional Circumstances (Article 249). It held that economic fluctuations do not automatically constitute exceptional circumstances unless they render the obligation 'oppressive' rather than just 'onerous'.",
    jurisdiction: "Abu Dhabi"
  }
];

/**
 * Searches for case law precedents
 */
export async function searchPrecedents(keyword: string): Promise<Precedent[]> {
  try {
    // 1. Future MOJ Integration placeholder
    const mojApiKey = import.meta.env.VITE_MOJ_API_KEY;
    if (mojApiKey) {
      try {
        const response = await fetch(`https://api.moj.gov.ae/v1/precedents/search?query=${encodeURIComponent(keyword)}`, {
          headers: {
            "Authorization": `Bearer ${mojApiKey}`,
            "Content-Type": "application/json"
          }
        });
        if (response.ok) {
          const data = await response.json();
          return data.precedents; // Assuming API returns matching structure
        }
      } catch (apiErr) {
        console.error("MOJ Precedents API Error:", apiErr);
      }
    }

    // 2. Firestore Search
    const path = "precedents";
    const precRef = collection(db, path);
    // Note: Simple firestore query. For real search use Algolia or similar if keyword search is intensive.
    // For now, we fetch a few and filter in-memory for the demo.
    const q = query(precRef, limit(20));
    const snapshot = await getDocs(q);
    const dbResults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Precedent));

    const allResults = [...dbResults, ...MOCK_PRECEDENTS];

    return allResults.filter(p => 
      p.caseName.toLowerCase().includes(keyword.toLowerCase()) || 
      p.legalPrinciples.some(lp => lp.toLowerCase().includes(keyword.toLowerCase())) ||
      p.summary.toLowerCase().includes(keyword.toLowerCase()) ||
      p.citation.toLowerCase().includes(keyword.toLowerCase())
    ).slice(0, 5);
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, "precedents");
    return MOCK_PRECEDENTS.filter(p => 
      p.caseName.toLowerCase().includes(keyword.toLowerCase()) || 
      p.summary.toLowerCase().includes(keyword.toLowerCase())
    ).slice(0, 5);
  }
}
