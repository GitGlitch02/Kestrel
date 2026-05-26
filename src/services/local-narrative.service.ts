import { Injectable } from '@angular/core';
import { Token, MarketRegime, Signal, SignalType, GroundingChunk } from './types';
import { MathUtils } from './math-utils';

@Injectable({
  providedIn: 'root'
})
export class LocalNarrativeService {

  generateMarketNarrative(
    tokens: Token[], 
    regime: MarketRegime, 
    signals: Signal[]
  ): { narrative: string; sources: GroundingChunk[] } {
    if (tokens.length === 0) {
      return { narrative: "Awaiting market data...", sources: [] };
    }

    const firstSentence = this.getRegimeSentence(regime);
    const secondSentence = this.getKeyMoverSentence(tokens, signals);

    return { narrative: `${firstSentence} ${secondSentence}`, sources: [] };
  }

  private getRegimeSentence(regime: MarketRegime): string {
    switch(regime.status) {
      case 'BULLISH':
        return "Broad market strength continues as bullish sentiment prevails, with advancing assets outpacing decliners.";
      case 'BEARISH':
        return "Defensive posturing is advised as bearish pressure mounts across the board, testing key support levels.";
      case 'NEUTRAL':
        return "The market is in a consolidation phase, with most assets trading within a tight, predictable range.";
      case 'VOLATILE':
        return `High volatility (avg. ${(regime.volatility * 100).toFixed(1)}%) is creating significant price swings, presenting both risk and opportunity.`;
      default:
        return "The market is currently stable, awaiting a catalyst.";
    }
  }

  private getKeyMoverSentence(tokens: Token[], signals: Signal[]): string {
    // Priority 1: High-confidence, actionable signal
    const highConfSignal = signals.find(s => 
      s.confidence > 90 && 
      (s.type === SignalType.BURST_HUNTER || s.type === SignalType.TREND_VECTOR)
    );

    if (highConfSignal) {
      return `A high-conviction ${highConfSignal.type.replace('_', ' ')} signal on ${highConfSignal.tokenSymbol} is a key point of interest.`;
    }

    // Priority 2: Find the biggest gainer/loser
    let biggestMover: Token | null = null;
    let maxChange = 0;

    for (const token of tokens) {
      if (token.priceHistory.length < 2) continue;
      // FIX: Access the `.value` property of the HistoryPoint object for arithmetic operations.
      const change = (token.price - token.priceHistory[token.priceHistory.length - 2].value) / token.priceHistory[token.priceHistory.length - 2].value;
      if (Math.abs(change) > Math.abs(maxChange)) {
        maxChange = change;
        biggestMover = token;
      }
    }

    if (biggestMover && Math.abs(maxChange) > 0.03) { // more than 3% change
      const direction = maxChange > 0 ? 'upward momentum' : 'downward pressure';
      return `Attention is currently on ${biggestMover.symbol}, which is showing significant ${direction} with a recent ${(maxChange * 100).toFixed(1)}% price movement.`;
    }
    
    // Priority 3: Fallback sentence
    const mostVolatile = tokens.reduce((prev, curr) => {
        // FIX: Map `HistoryPoint[]` to `number[]` to match the expected parameter type of `MathUtils.stdDev`.
        const prevVol = MathUtils.stdDev(prev.priceHistory.map(p => p.value)) / prev.price;
        // FIX: Map `HistoryPoint[]` to `number[]` to match the expected parameter type of `MathUtils.stdDev`.
        const currVol = MathUtils.stdDev(curr.priceHistory.map(p => p.value)) / curr.price;
        return (currVol > prevVol) ? curr : prev;
    });

    return `Traders are closely watching ${mostVolatile.symbol} as it exhibits the highest relative volatility in the current session.`;
  }
}