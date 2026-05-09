import { MODELS, generateGeminiContent } from "../lib/gemini";
import { logUsage } from "../lib/usage";

const SYSTEM_INSTRUCTION = `You are a concise UAE Legal AI Advisor for consumers. 

RULES:
1. BE CONCISE. Use bullet points. Avoid long paragraphs.
2. Always reference specific Law Numbers/Articles (e.g. UAE Labor Law Art. 1).
3. Do not give binding advice.
4. Respond in the same language as the user's request (English or Arabic).
5. AT THE END of every response, suggest a specific lawyer specialty (e.g. "You should consult a Family Law specialist") and invite them to view our verified lawyers in the 'Find a Lawyer' tab.

Structure:
- **Summary**: 1-2 sentences.
- **Law References**: Bullet points only.
- **Action**: One clear next step.
- **Consultation**: Proactive nudge to a lawyer category.`;

const LAWYER_COPILOT_INSTRUCTION = `You are a highly technical UAE Legal Research Assistant for professional lawyers.

GOALS:
1. Provide deep technical analysis, case law references (if applicable), and procedural nuances.
2. Cite specific laws, executive regulations, and ministerial decrees with precision.
3. Help with legal drafting suggestions, memorandum outlines, and strategy brainstorming.
4. Maintain a professional, peer-to-peer scholarly tone.

RULES:
1. Exhaustive Citations: Always provide full Law names and Year of issuance.
2. Nuanced Analysis: Discuss exceptions, time limits (limitation periods), and jurisdictional differences (e.g. Mainland vs Free Zones vs DIFC/ADGM).
3. Formatting: Use clear headings and structured sections.
4. Language: professional legal terminology in both English and Arabic as needed.

Structure:
- **Technical Analysis**: Detailed breakdown of the legal issue.
- **Regulatory Framework**: List of applicable laws, articles, and decrees.
- **Procedural Guidance**: Steps, timelines, and jurisdictional notes.
- **Strategic Considerations**: Potential risks, counter-arguments, or drafting tips.`;

export async function getLawyerCoPilotAdvice(
  userPrompt: string, 
  history: { role: string; text: string }[] = [], 
  context: string = "", 
  language: string = "en"
) {
  const augmentedInstruction = `${LAWYER_COPILOT_INSTRUCTION}
    
    IMPORTANT: The current user preference is ${language.toUpperCase()}.
    
    ${context ? `ENHANCED KNOWLEDGE BASE (TECHNICAL RAG):
    ${context}` : "Note: Rely on your internal advanced knowledge of UAE Law systems."}`;

  try {
    const text = await generateGeminiContent({
      model: MODELS.pro,
      contents: [
        ...history.map(m => ({ role: m.role as "user" | "model", parts: [{ text: m.text }] })),
        { role: "user", parts: [{ text: userPrompt }] }
      ],
      systemInstruction: augmentedInstruction,
      generationConfig: {
        temperature: 0.3,
      },
      usageLabel: 'gemini_query'
    });

    return text || "I'm sorry, I couldn't generate a technical response.";
  } catch (error) {
    console.error("Gemini Technical Error:", error);
    return "Error: Technical co-pilot bridge failed.";
  }
}

export async function getLegalAdvice(
  userPrompt: string, 
  history: { role: string; text: string }[] = [], 
  context: string = "", 
  language: string = "en",
  imageData?: string // base64 string
) {
  const augmentedInstruction = `${SYSTEM_INSTRUCTION}
    
    IMPORTANT: The current user preference is ${language.toUpperCase()}. 
    If the user has been speaking in ${language === 'en' ? 'Arabic' : 'English'}, respect their session flow, but prioritize ${language === 'en' ? 'English' : 'Arabic'} for this response if their message is in that language.
    
    ${context ? `ADDITIONAL LOCAL DATABASE KNOWLEDGE (RAG):
    ${context}` : "Note: No specific local database matches found. Rely on your internal knowledge of UAE Law."}`;

  try {
    const userParts: any[] = [{ text: userPrompt }];
    if (imageData) {
      userParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageData.split(",")[1] || imageData
        }
      });
    }

    const text = await generateGeminiContent({
      model: MODELS.flash,
      contents: [
        ...history.map(m => ({ role: m.role as "user" | "model", parts: [{ text: m.text }] })),
        { role: "user", parts: userParts }
      ],
      systemInstruction: augmentedInstruction,
      generationConfig: {
        temperature: 0.7,
      },
      usageLabel: 'gemini_query'
    });

    return text || "I'm sorry, I couldn't generate a response at this time.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    const errorStr = JSON.stringify(error).toUpperCase();
    if (error?.status === 503 || errorStr.includes("503") || errorStr.includes("UNAVAILABLE")) {
      return "The AI service is currently experiencing high demand or is temporarily unavailable (503). Please try again in a few moments.";
    }
    
    if (errorStr.includes("403")) {
        return "I'm sorry, there seems to be a permission issue with the AI service. Please check if your API key is correctly configured and has access to the requested model.";
    }
    return "Error: Unable to connect to the legal advisor. Please try again.";
  }
}
