import { Injectable, inject } from '@angular/core';
import { GoogleGenAI, GenerateContentConfig } from "@google/genai";
import { Token, MarketRegime, Signal, GroundingChunk, HistoryPoint } from './types';
import { MathUtils } from './math-utils';
import { NotificationService } from './notification.service';

interface NewsSpikeResponse {
  isSignificantNews: boolean;
  articleTitle?: string;
  articleUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private isAvailable = false;
  private notificationService = inject(NotificationService);

  constructor() {
    const key = process.env['API_KEY'];
    if (key) {
      this.ai = new GoogleGenAI({ apiKey: key });
      this.isAvailable = true;
    } else {
      console.warn('KESTREL: API_KEY not found. AI features disabled.');
    }
  }

  async generateMarketNarrative(
    tokens: Token[], 
    regime: MarketRegime, 
    signals: Signal[], 
    useGrounding: boolean
  ): Promise<{ narrative: string; sources: GroundingChunk[] }> {
    const defaultResponse = { narrative: "AI MODULE OFFLINE. KEY MISSING.", sources: [] };
    if (!this.isAvailable || !this.ai) {
      return defaultResponse;
    }

    const tokenSummary = tokens.map(t => 
      `${t.symbol}: $${t.price.toFixed(4)}`
    ).join(', ');
    
    const signalSummary = signals.slice(0, 5).map(s => 
      `[${s.type}] ${s.tokenSymbol}: ${s.message}`
    ).join('; ');

    const styleInstruction = "Style: Cyberpunk, Concise, Analytical. High clarity.";

    const prompt = `
      You are Kestrel, a crypto market intelligence system.
      Market Regime: ${regime.status} (Vol: ${regime.volatility.toFixed(2)}).
      Snapshot: ${tokenSummary}.
      Active Signals: ${signalSummary}.
      
      Generate a concise, 2-sentence market narrative. If recent news is relevant, incorporate it.
      ${styleInstruction}
      Do not use markdown. Just plain text.
    `;
    
    const config: GenerateContentConfig = {};
    if (useGrounding) {
      config.tools = [{googleSearch: {}}];
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: config
      });
      
      const narrative = response.text || "NO NARRATIVE GENERATED";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources: GroundingChunk[] = (Array.isArray(groundingChunks) ? groundingChunks : []) as GroundingChunk[];
      
      return { narrative, sources };
    } catch (e: any) {
      console.error('Gemini Narrative Error', e);
      
      let toastMsg = 'Could not generate market analysis. The AI module may be temporarily unavailable.';
      if (e?.status === 429 || (e?.message && e.message.includes('429'))) {
         toastMsg = 'API Quota Exceeded (429). Please check your billing details and rate limits.';
      }

      this.notificationService.show(
        'AI Narrative Failed',
        toastMsg,
        'danger',
        'INFO'
      );
      return { narrative: "SYSTEM ERROR: AI UNREACHABLE", sources: [] };
    }
  }

  // FIX: Updated to align with Gemini API guidelines for using the googleSearch tool.
  // The `responseMimeType` and `responseSchema` properties are not compatible with `tools: [{googleSearch: {}}]`
  // and have been removed. The prompt has been updated to explicitly request a JSON object in the text response,
  // and parsing logic has been added to safely extract it.
  async checkForNewsSpike(token: Token): Promise<NewsSpikeResponse | null> {
    if (!this.isAvailable || !this.ai) return null;

    const prompt = `
      Search for significant news in the last 24 hours for the cryptocurrency '${token.name} (${token.symbol})'.
      'Significant news' includes major partnerships, CEX listings, protocol upgrades, security vulnerabilities, or major regulatory actions.
      If you find such news, provide the article title and URL.
      Respond with a JSON object matching this schema: { "isSignificantNews": boolean, "articleTitle"?: string, "articleUrl"?: string }.
      If no significant news is found, \`isSignificantNews\` must be false.
    `;
    
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{googleSearch: {}}],
        }
      });

      const jsonText = response.text?.trim();
      if (jsonText) {
        try {
          // The response might be wrapped in markdown, so we extract the JSON object.
          const match = jsonText.match(/\{[\s\S]*\}/);
          if (match) {
            return JSON.parse(match[0]) as NewsSpikeResponse;
          }
        } catch (e) {
          console.error(`Error parsing JSON from news spike response for ${token.symbol}:`, e, `Response: "${jsonText}"`);
        }
      }
      return null;
    } catch (e: any) {
      console.error(`News Spike check failed for ${token.symbol}`, e);
      
      let toastMsg = `Could not scan for news updates for ${token.symbol}.`;
      if (e?.status === 429 || (e?.message && e.message.includes('429'))) {
         toastMsg = 'API Quota Exceeded (429). Please check your Gemini API plan.';
      }

      this.notificationService.show(
        'AI News Check Failed',
        toastMsg,
        'danger',
        'INFO'
      );
      return null;
    }
  }

  // NEW: Analyze specific signal context
  async analyzeSignalContext(signal: Signal, token: Token): Promise<string> {
    if (!this.isAvailable || !this.ai) return "AI OFFLINE";

    // Format volume history for context
    const recentVolumes = token.volumeHistory.slice(-20).map(v => Math.round(v.value)).join(', ');

    const prompt = `
      Analyze this specific trading signal for ${token.symbol}.
      Signal Type: ${signal.type}
      Message: ${signal.message}
      Confidence Score: ${signal.confidence}/100
      
      Context:
      Price: ${token.price}
      RSI (14): ${this.getRSI(token.priceHistory)}
      Current Volume: ${token.volume}
      Volume History (Last 20 periods): [${recentVolumes}]
      
      Provide a tactical, 1-sentence prediction or recommendation. 
      Is this a false positive or a valid move? 
      Keep it under 20 words. 
      Style: Military/Terminal.
    `;

    try {
       const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text || "ANALYSIS FAILED";
    } catch (e: any) {
      console.error(`Gemini tactical analysis failed for ${signal.tokenSymbol}`, e);
      
      let toastMsg = 'The AI module could not generate a tactical analysis for the signal.';
      if (e?.status === 429 || (e?.message && e.message.includes('429'))) {
         toastMsg = 'API Quota Exceeded (429). Tactical analysis unavailable.';
      }

      this.notificationService.show(
        'AI Tactical Analysis Failed',
        toastMsg,
        'danger',
        'INFO'
      );
      return "AI ERROR";
    }
  }

  private getRSI(history: HistoryPoint[]): string {
    const values = history.map(p => p.value);
    const rsi = MathUtils.rsi(values, 14);
    return rsi ? rsi.toFixed(2) : "N/A"; 
  }
}