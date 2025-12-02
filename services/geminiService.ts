import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { SummaryData, Transaction } from "../types";

// Helper to get client - ALWAYS create new instance to ensure key is fresh if changed
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please set your Google Gemini API Key.");
  }
  return new GoogleGenAI({ apiKey });
};

const MODEL_NAME = "gemini-2.5-flash";

interface GeminContext {
  transactions: Transaction[];
  period?: { month: string; label: string };
  precomputed?: any;
}

// Generic wrapper to send formatted payload
async function sendToGemini(mode: string, context: GeminContext, extraFields: object = {}) {
  const ai = getClient();
  
  const payload = {
    mode,
    context,
    ...extraFields
  };

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: JSON.stringify(payload),
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.2, // Low temperature for consistent JSON
    }
  });

  return response.text;
}

export async function categorizeTransactions(transactions: Transaction[]): Promise<{id: string, category: string, nature: string}[]> {
  const responseText = await sendToGemini("CATEGORIZE_TRANSACTIONS", { transactions });
  
  try {
    // Clean up markdown code blocks if present
    const cleanJson = responseText?.replace(/```json/g, '').replace(/```/g, '').trim();
    if (!cleanJson) return [];
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Failed to parse Gemini response for categorization", e);
    return [];
  }
}

export async function getMonthlySummary(transactions: Transaction[], month: string): Promise<SummaryData | null> {
  const responseText = await sendToGemini("SUMMARY_MONTH", { 
    transactions,
    period: { month, label: month }
  });

  try {
    const cleanJson = responseText?.replace(/```json/g, '').replace(/```/g, '').trim();
    if (!cleanJson) return null;
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Failed to parse Gemini response for summary", e);
    return null;
  }
}

export async function getInsights(transactions: Transaction[], month: string): Promise<string> {
  const text = await sendToGemini("INSIGHTS_MONTH", {
    transactions,
    period: { month, label: month }
  });
  return text || "Não foi possível gerar insights no momento.";
}

export async function chatWithFinanceAI(question: string, transactions: Transaction[], summary?: SummaryData): Promise<string> {
  const text = await sendToGemini("QNA", {
    transactions,
    precomputed: { summary }
  }, { question }); // Add question to payload
  
  return text || "Desculpe, não consegui processar sua pergunta.";
}