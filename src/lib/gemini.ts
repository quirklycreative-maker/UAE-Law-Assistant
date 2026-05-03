import { GoogleGenAI } from "@google/genai";

export const MODELS = {
  flash: "gemini-flash-latest", 
  pro: "gemini-3.1-pro-preview",
};

// Initialize the SDK
// Note: process.env.GEMINI_API_KEY is injected by the platform
export const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "" 
});
