import { ai, MODELS } from "../lib/gemini";

const SYSTEM_INSTRUCTION = `You are a concise UAE Legal AI Advisor. 

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

export async function getLegalAdvice(
  userPrompt: string, 
  history: { role: string; text: string }[] = [], 
  context: string = "", 
  language: string = "en",
  imageData?: string // base64 string
) {
  try {
    const contents = [];
    
    const augmentedInstruction = `${SYSTEM_INSTRUCTION}
    
    IMPORTANT: The current user preference is ${language.toUpperCase()}. 
    If the user has been speaking in ${language === 'en' ? 'Arabic' : 'English'}, respect their session flow, but prioritize ${language === 'en' ? 'English' : 'Arabic'} for this response if their message is in that language.
    
    ${context ? `ADDITIONAL LOCAL DATABASE KNOWLEDGE (RAG):
    ${context}` : "Note: No specific local database matches found. Rely on your internal knowledge of UAE Law."}`;

    // Concatenate instruction to first user message or add as first message
    if (history.length > 0 && history[0].role === 'user') {
      contents.push({
        role: "user",
        parts: [{ text: `INSTRUCTION: ${augmentedInstruction}\n\nUSER QUESTION: ${history[0].text}` }]
      });
      // Add rest of history starting from index 1
      for (let i = 1; i < history.length; i++) {
        contents.push({ role: history[i].role, parts: [{ text: history[i].text }] });
      }
    } else if (history.length === 0) {
      const parts: any[] = [{ text: `INSTRUCTION: ${SYSTEM_INSTRUCTION}\n\nUSER QUESTION: ${userPrompt}` }];
      if (imageData) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: imageData.split(",")[1] || imageData
          }
        });
      }
      contents.push({
        role: "user",
        parts
      });
    } else {
      // History starts with model or roles are mixed
      contents.push({ role: "user", parts: [{ text: SYSTEM_INSTRUCTION }] });
      contents.push(...history.map(m => ({ role: m.role as "user" | "model", parts: [{ text: m.text }] })));
    }

    // Add current prompt if it wasn't combined above
    if (history.length > 0) {
      const parts: any[] = [{ text: userPrompt }];
      if (imageData) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: imageData.split(",")[1] || imageData
          }
        });
      }
      contents.push({ role: "user", parts });
    }

    const response = await ai.models.generateContent({
      model: MODELS.flash,
      contents,
      config: {
        temperature: 0.7,
      },
    });

    return response.text || "I'm sorry, I couldn't generate a response at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    if (JSON.stringify(error).includes("403")) {
        return "I'm sorry, there seems to be a permission issue with the AI service. Please check if your API key is correctly configured and has access to the requested model.";
    }
    return "Error: Unable to connect to the legal advisor.";
  }
}
