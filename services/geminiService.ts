import { GoogleGenAI } from "@google/genai";
import { QueueStats, Department } from "../types";

// Initialize Gemini Client
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateQueueAnalysis = async (
  stats: Record<Department, QueueStats>
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "AI Insights unavailable: API Key missing.";

  const prompt = `
    Analyze the following hospital queue statistics and provide a brief, professional operational report (max 100 words).
    Focus on wait times and resource allocation suggestions.
    
    Data:
    ${JSON.stringify(stats, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate AI analysis. Please check system logs.";
  }
};
