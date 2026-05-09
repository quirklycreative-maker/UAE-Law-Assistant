import { GoogleGenAI } from "@google/genai";
import { logUsage, UsageType } from "./usage";

// Target stable and experimental models available in this SDK version
export const MODELS = {
  flash: "gemini-1.5-flash-latest", 
  pro: "gemini-2.0-flash-exp",
};

// Initialize the SDK with correct property object
export const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "" 
});

/**
 * Robust helper to generate content with fallback logic
 */
export async function generateGeminiContent(params: {
  model: string;
  contents: any[];
  systemInstruction?: string;
  generationConfig?: any;
  usageLabel?: UsageType;
}) {
  const { model, contents, systemInstruction, generationConfig, usageLabel = 'gemini_query' } = params;
  
  // The @google/genai SDK used here seems to use a single generateContent call 
  // with a 'config' property for systemInstruction and other settings.
  const executeQuery = async (modelId: string) => {
    return await ai.models.generateContent({
      model: modelId,
      contents,
      config: {
        ...generationConfig,
        systemInstruction,
        temperature: generationConfig?.temperature ?? 0.7,
      },
    });
  };

  try {
    const result = await executeQuery(model);
    logUsage(usageLabel, 'success');
    return result.text || "";
  } catch (error: any) {
    const errorStr = JSON.stringify(error).toUpperCase();
    const isTechnicalError = error?.status === 503 || 
                             error?.status === 500 || 
                             errorStr.includes("503") || 
                             errorStr.includes("500") || 
                             errorStr.includes("UNAVAILABLE") ||
                             errorStr.includes("XHR ERROR") || 
                             errorStr.includes("RPC FAILED");

    // If we're already on flash and it failed, or if it's not a recoverable error, throw
    if (model === MODELS.flash || !isTechnicalError) {
      logUsage(usageLabel, 'error');
      throw error;
    }

    // Recoverable error on non-flash model: try fallback to flash
    console.warn(`Gemini ${model} failed, falling back to Flash:`, error);
    
    try {
      const fallbackResult = await executeQuery(MODELS.flash);
      logUsage(usageLabel, 'success', 0);
      return fallbackResult.text || "";
    } catch (fallbackError) {
      logUsage(usageLabel, 'error');
      throw fallbackError;
    }
  }
}
