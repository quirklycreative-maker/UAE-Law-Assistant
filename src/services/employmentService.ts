/// <reference types="vite/client" />
/**
 * MOHRE (Ministry of Human Resources & Emiratisation) Integration
 * Useful for labor contract verification and worker status.
 */

export interface LaborContract {
  contractNumber: string;
  establishmentName: string;
  workerName: string;
  profession: string;
  basicSalary: number;
  totalSalary: number;
  expiryDate: string;
  contractType: string;
}

/**
 * Fetches labor contract details using MOHRE API.
 */
export async function getLaborContractDetails(contractNumber: string, passportNumber: string): Promise<LaborContract | null> {
  const mohreApiKey = import.meta.env.VITE_MOHRE_API_KEY;

  if (!mohreApiKey) {
    console.warn("MOHRE API key not found.");
    return null;
  }

  try {
    const response = await fetch(`https://api.mohre.gov.ae/v1/labor-services/contracts/${contractNumber}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mohreApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ passportNumber })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        contractNumber: data.contract_id,
        establishmentName: data.establishment_name,
        workerName: data.worker_full_name,
        profession: data.job_title,
        basicSalary: data.basic_wage,
        totalSalary: data.total_wage,
        expiryDate: data.contract_end_date,
        contractType: data.contract_type
      };
    }
  } catch (error) {
    console.error("MOHRE API Error:", error);
  }

  return null;
}
