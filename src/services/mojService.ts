/// <reference types="vite/client" />
/**
 * Ministry of Justice (MOJ) Shared Services
 * Covers Case Status lookup and Marriage/Inheritance calculators.
 */

export interface CaseStatus {
  caseNumber: string;
  court: string;
  status: string;
  lastActionDate: string;
  nextHearingDate?: string;
  parties: { name: string; role: string }[];
}

/**
 * Checks court case status by case number and year.
 * User requested we DO NOT store this data.
 */
export async function getCaseStatus(caseNumber: string, year: string, courtCode: string): Promise<CaseStatus | null> {
  const mojApiKey = import.meta.env.VITE_MOJ_API_KEY;

  if (!mojApiKey) {
    console.warn("MOJ API key not found.");
    return null;
  }

  try {
    const response = await fetch(`https://api.moj.gov.ae/v1/case-services/status`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mojApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ caseNumber, year, courtCode })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        caseNumber: data.case_id,
        court: data.court_name,
        status: data.current_status,
        lastActionDate: data.last_update,
        nextHearingDate: data.next_hearing,
        parties: data.involved_parties || []
      };
    }
  } catch (error) {
    console.error("Case Status API Error:", error);
  }

  return null;
}

/**
 * Placeholder for Inheritance calculation logic.
 * Usually based on Sharia law principles provided by MOJ APIs.
 */
export async function calculateInheritance(heirs: any): Promise<any> {
    // This would typically call an MOJ calculator API
    return { status: "Calculation service requires MOJ API credentials" };
}
