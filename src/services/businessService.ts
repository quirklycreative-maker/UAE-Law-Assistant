/// <reference types="vite/client" />
/**
 * Commercial Registry Integration
 * Useful for verifying UAE business licenses and entities.
 */

export interface BusinessEntity {
  licenseNumber: string;
  nameEn: string;
  nameAr: string;
  status: string;
  expiryDate: string;
  activities: string[];
  legalForm: string;
  address: string;
}

/**
 * Searches the UAE Ministry of Economy Commercial Registry.
 */
export async function searchCommercialRegistry(licenseNumber: string): Promise<BusinessEntity | null> {
  const moeApiKey = import.meta.env.VITE_MOE_API_KEY;
  
  if (!moeApiKey) {
    console.warn("Ministry of Economy API key not found. License verification disabled.");
    return null;
  }

  try {
    const response = await fetch(`https://api.moe.gov.ae/v1/commercial-registry/search?licenseNumber=${licenseNumber}`, {
      headers: {
        "Authorization": `Bearer ${moeApiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        licenseNumber: data.license_no,
        nameEn: data.trade_name_en,
        nameAr: data.trade_name_ar,
        status: data.license_status,
        expiryDate: data.expiry_date,
        activities: data.activities || [],
        legalForm: data.legal_form_en,
        address: data.main_address
      };
    }
  } catch (error) {
    console.error("Commercial Registry API Error:", error);
  }

  return null;
}
