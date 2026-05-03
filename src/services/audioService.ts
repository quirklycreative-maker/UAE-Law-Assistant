import { ai, MODELS } from "../lib/gemini";
import { Modality } from "@google/genai";

export async function transcribeAudioText(base64Audio: string, mimeType: string, language: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: Object.values(MODELS)[0] || "gemini-3.1-flash-preview",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: base64Audio.split(",")[1] || base64Audio } },
          { text: `Transcribe this audio precisely. ${language === 'ar' ? 'Output purely Arabic transcription.' : 'Output purely English transcription.'}` }
        ]
      }
    ]
  });
  return response.text || "";
}

export async function generateSpeechTTS(text: string, language: string): Promise<string | null> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-tts-preview",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: ["AUDIO"] as any,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: language === 'ar' ? 'Charon' : 'Kore' }
        }
      }
    }
  });
  
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio || null;
}

export async function playPCM16Audio(base64Audio: string, sampleRate = 24000): Promise<AudioBufferSourceNode> {
  const binary = atob(base64Audio);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const buffer = bytes.buffer;

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
  const dataView = new DataView(buffer);
  const length = buffer.byteLength / 2;
  const audioBuffer = audioContext.createBuffer(1, length, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    channelData[i] = dataView.getInt16(i * 2, true) / 32768.0;
  }
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start(0);
  return source;
}
