/// <reference types="vite/client" />
/**
 * Real Estate Integration (DLD / TAMM)
 * Useful for verifying title deeds and rental contracts (Ejari).
 */

export interface TitleDeed {
  certificateNumber: string;
  propertyType: string;
  area: string; // m2
  location: string;
  usage: string;
  restrictions: string[];
  ownerCount: number;
}

/**
 * Verifies a Title Deed through DLD (Dubai Land Department) or similar APIs.
 */
export async function verifyTitleDeed(certificateNumber: string): Promise<TitleDeed | null> {
  const tammApiKey = import.meta.env.VITE_TAMM_API_KEY;

  if (!tammApiKey) {
    console.warn("TAMM/DLD API key not found.");
    return null;
  }

  try {
    const response = await fetch(`https://api.tamm.abudhabi/v1/real-estate/properties/verify?certificateNumber=${certificateNumber}`, {
      headers: {
        "Authorization": `Bearer ${tammApiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        certificateNumber: data.cert_no,
        propertyType: data.type,
        area: data.surface_area,
        location: data.location_name,
        usage: data.land_use,
        restrictions: data.remarks || [],
        ownerCount: data.owners_count || 1
      };
    }
  } catch (error) {
    console.error("Property Verification API Error:", error);
  }

  return null;
}
