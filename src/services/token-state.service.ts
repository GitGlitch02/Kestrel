import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Token, Signal, SignalType, MarketRegime, PriceAlert, AlgoIconType } from './types';
import { MathUtils } from './math-utils';
import * as d3 from 'd3';
import { NotificationService } from './notification.service';
import { GeminiService } from './gemini.service';
import { UserPrefsService } from './user-prefs.service';

export interface PriceUpdateInfo {
  symbol: string;
  direction: 'up' | 'down' | 'same';
}

@Injectable({
  providedIn: 'root'
})
export class TokenStateService {
  private notificationService = inject(NotificationService);
  private geminiService = inject(GeminiService);
  private prefs = inject(UserPrefsService);

  // --- CONFIG ---
  private readonly SIGNAL_TTL = 30000; // 30 seconds

  // --- STATE ---
  readonly tokens = signal<Token[]>([]);
  readonly marketRegime = signal<MarketRegime>({ status: 'NEUTRAL', volatility: 0, correlation: 0 });
  readonly selectedTokenSymbol = signal<string | null>(null);
  readonly priceAlerts = signal<Map<string, PriceAlert>>(new Map());
  readonly activeSignals = signal<Signal[]>([]);
  readonly btcToken = signal<Token | null>(null);
  
  // For UI flash effect on real-time price updates
  readonly lastPriceUpdate = signal<PriceUpdateInfo | null>(null);
  private lastUpdateTimeout: any;
  
  constructor() {
    // This effect runs the synchronous signal generation on every data tick.
    effect(() => {
        this.tokens(); // Establish dependency
        this._updateSyncSignals();
    });
  }
  
  // --- COMPUTED DERIVATIONS ---

  readonly filteredSignals = computed(() => {
    const signals = this.activeSignals();
    const selected = this.selectedTokenSymbol();
    if (!selected) return signals;
    return signals.filter(s => s.tokenSymbol === selected);
  });
  
  readonly marketSummary = computed(() => {
    const summary = { advancing: 0, declining: 0, unchanged: 0 };
    this.tokens().forEach(token => {
        if (token.priceHistory.length < 2) {
            summary.unchanged++;
            return;
        }
        const currentPrice = token.price;
        const prevPrice = token.priceHistory[token.priceHistory.length - 2].value;
        if (currentPrice > prevPrice) summary.advancing++;
        else if (currentPrice < prevPrice) summary.declining++;
        else summary.unchanged++;
    });
    return summary;
  });

  // --- ACTIONS ---

  updateTokens(newTokens: Token[]) {
    this.tokens.set(newTokens);
    this.updateRegime(newTokens);
  }
  
  setBtcToken(token: Token | null) {
    this.btcToken.set(token);
  }

  updateBtcToken(summary: { price: number; change24h?: number }) {
    this.btcToken.update(current => {
      // If BTC token doesn't exist, create it from the summary.
      if (!current) {
        return {
          symbol: 'BTC',
          name: 'Bitcoin',
          price: summary.price,
          change24h: summary.change24h ?? 0,
          priceHistory: [{ time: Date.now(), value: summary.price }],
          // Dummy data for fields not in summary
          entryPrice: 0,
          volume: 0,
          yield: 0,
          volumeHistory: [],
          liquidityDepth: 0,
          cgId: 'bitcoin',
          imageUrl: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
        };
      }
      
      // If it exists, update it.
      return {
        ...current,
        price: summary.price,
        change24h: summary.change24h ?? current.change24h,
        priceHistory: [...current.priceHistory, { time: Date.now(), value: summary.price }].slice(-60)
      };
    });
  }

  // Efficiently update multiple token prices from a batched WebSocket stream
  batchUpdateTokenPrices(updates: Map<string, number>) {
    // Handle BTC separately as it's not in the main watchlist
    if (updates.has('BTC')) {
      const newBtcPrice = updates.get('BTC')!;
      this.btcToken.update(current => {
        if (!current || newBtcPrice === current.price) return current;
        
        const oldPrice = current.price;
        const direction = newBtcPrice > oldPrice ? 'up' : 'down';
        this.triggerPriceFlash({ symbol: 'BTC', direction });

        return {
          ...current,
          price: newBtcPrice,
          priceHistory: [...current.priceHistory, { time: Date.now(), value: newBtcPrice }].slice(-60)
        };
      });
      updates.delete('BTC');
    }

    if (updates.size === 0) return;

    this.tokens.update(currentTokens => {
      let hasChanged = false;
      
      const updatedTokens = currentTokens.map(token => {
        if (updates.has(token.symbol)) {
          const newPrice = updates.get(token.symbol)!;
          if (token.price !== newPrice) {
            hasChanged = true;
            const oldPrice = token.price;
            const direction = newPrice > oldPrice ? 'up' : 'down';

            this.triggerPriceFlash({ symbol: token.symbol, direction });

            return {
              ...token,
              price: newPrice,
              priceHistory: [...token.priceHistory, { time: Date.now(), value: newPrice }].slice(-60)
            };
          }
        }
        return token;
      });

      return hasChanged ? updatedTokens : currentTokens;
    });
  }
  
  private triggerPriceFlash(info: PriceUpdateInfo) {
    clearTimeout(this.lastUpdateTimeout);
    this.lastPriceUpdate.set(info);
    this.lastUpdateTimeout = setTimeout(() => this.lastPriceUpdate.set(null), 750);
  }

  toggleSelectedToken(symbol: string) {
    this.selectedTokenSymbol.update(current => current === symbol ? null : symbol);
  }
  
  clearSelection() {
    this.selectedTokenSymbol.set(null);
  }

  setPriceAlert(symbol: string, targetPrice: number, condition: 'ABOVE' | 'BELOW') {
    if (!targetPrice || targetPrice <= 0) {
      this.removePriceAlert(symbol);
      return;
    }
    this.priceAlerts.update(alerts => {
      const newAlerts = new Map(alerts);
      newAlerts.set(symbol, { targetPrice, condition });
      return newAlerts;
    });
  }

  removePriceAlert(symbol: string) {
    this.priceAlerts.update(alerts => {
      const newAlerts = new Map(alerts);
      newAlerts.delete(symbol);
      return newAlerts;
    });
  }

  // --- SIGNAL GENERATION ENGINE ---

  private _updateSyncSignals(): void {
    // 1. Generate all signals that are valid for the current state.
    const liveSignals: Signal[] = [];
    this.tokens().forEach(token => {
      // FIX: Although TypeScript types should prevent this, adding a guard ensures malformed token objects don't crash the signal generation loop.
      if (!token) return;
      
      const tokenSignals = [
        this._generatePriceAlertSignal(token),
        this._generateBurstHunterSignal(token),
        this._generateGainLockSignal(token),
        this._generateHypePulseSignal(token),
        this._generateTrendVectorSignal(token),
        this._generateStableAnchorSignal(token),
        this._generateVenueShieldSignal(token),
        this._generateSupportBounceSignal(token),
        this._generateVolatilitySqueezeSignal(token),
        this._generateJerryReversionSignal(token)
      ].filter((s): s is Signal => s !== null);
      liveSignals.push(...tokenSignals);
    });

    const liveSignalMap = new Map<string, Signal>();
    liveSignals.forEach(s => liveSignalMap.set(`${s.tokenSymbol}:${s.type}`, s));

    this.activeSignals.update(currentSignals => {
      // 2. Refresh existing signals and identify those that are no longer live.
      const refreshedAndStaleSignals = currentSignals
        .filter(s => s.type !== SignalType.NEWS_SPIKE) // Don't process async signals here
        .map(existingSignal => {
          const key = `${existingSignal.tokenSymbol}:${existingSignal.type}`;
          const liveVersion = liveSignalMap.get(key);

          if (liveVersion) {
            // Signal is still live. Update its data, preserve its unique ID, and refresh its timestamp.
            liveSignalMap.delete(key); 
            return { ...liveVersion, id: existingSignal.id, timestamp: Date.now() }; 
          } else {
            // Signal is no longer live, return it as is to check its TTL.
            return existingSignal;
          }
        });

      // 3. Filter out stale signals that have exceeded their TTL.
      const activeOrGracePeriodSignals = refreshedAndStaleSignals.filter(s => 
        Date.now() - s.timestamp < this.SIGNAL_TTL
      );

      // 4. Add any brand new signals, ensuring they get a unique ID.
      const newSignals = Array.from(liveSignalMap.values()).map(s => ({
        ...s,
        id: `${s.tokenSymbol}:${s.type}:${Date.now()}`
      }));
      
      // 5. Trigger notifications for new PRICE_ALERT signals only.
      newSignals.forEach(signal => {
        if (signal.type === SignalType.PRICE_ALERT) {
            if (!this.prefs.notificationsEnabled()) return;
            if (this.prefs.disabledSignalTypesForNotifications().has(signal.type)) return;
            this.notificationService.show(
              `${signal.tokenSymbol}: ${this.formatSignalType(signal.type)}`,
              signal.message,
              signal.severity,
              this.getIconForSignal(signal.type)
            );
        }
      });
      
      // 6. Re-integrate async signals and sort.
      const asyncSignals = currentSignals.filter(s => s.type === SignalType.NEWS_SPIKE);
      const finalSignals = [...activeOrGracePeriodSignals, ...newSignals, ...asyncSignals];
      return finalSignals.sort((a, b) => b.timestamp - a.timestamp);
    });
  }
  
  async triggerAsyncSignalGeneration() {
    const mode = this.prefs.dataSourceMode();
    if (mode === 'SIMULATION') {
      await this.runSimulatedNewsSpike();
    } else {
      await this.runLiveNewsSpikeCheck();
    }
  }

  private async runSimulatedNewsSpike() {
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
    
    const currentTokens = this.tokens();
    if (currentTokens.length === 0 || Math.random() > 0.15) {
      return; // 15% chance per cycle
    }

    const randomToken = currentTokens[Math.floor(Math.random() * currentTokens.length)];
    const hasExistingSignal = this.activeSignals().some(s => s.tokenSymbol === randomToken.symbol && s.type === SignalType.NEWS_SPIKE);
    
    if (hasExistingSignal) {
      return;
    }

    const isPositiveNews = Math.random() > 0.5;
    const event = isPositiveNews ? "a strategic partnership" : "a potential exploit";
    const title = `Unconfirmed reports suggest ${randomToken.name} is involved in ${event}.`;
    const newSignal = this._generateNewsSpikeSignal(randomToken, title, '#');

    if (newSignal) {
      this.addNewsSpikeSignal(newSignal);
    }
  }

  private async runLiveNewsSpikeCheck() {
    const currentTokens = this.tokens();
    if (currentTokens.length === 0) return;

    // Check a small, random subset of tokens to avoid API spam.
    // FIX: Explicitly type `tokensToCheck` as `Token[]` to resolve incorrect type inference to `unknown[]`.
    const tokensToCheck: Token[] = this.getRandomSubset(currentTokens, 3);

    for (const token of tokensToCheck) {
      const hasExistingSignal = this.activeSignals().some(s => s.tokenSymbol === token.symbol && s.type === SignalType.NEWS_SPIKE);
      if (hasExistingSignal) {
        continue;
      }

      const newsResponse = await this.geminiService.checkForNewsSpike(token);
      if (newsResponse?.isSignificantNews && newsResponse.articleTitle) {
        const newSignal = this._generateNewsSpikeSignal(token, newsResponse.articleTitle, newsResponse.articleUrl);
        if (newSignal) {
          this.addNewsSpikeSignal(newSignal);
        }
      }
    }
  }

  private addNewsSpikeSignal(newSignal: Signal) {
    // Toast notifications for signals are disabled.
    this.activeSignals.update(currentSignals => {
      const activeAsyncSignals = currentSignals
        .filter(s => s.type === SignalType.NEWS_SPIKE)
        .filter(s => Date.now() - s.timestamp < this.SIGNAL_TTL);
      const otherSignals = currentSignals.filter(s => s.type !== SignalType.NEWS_SPIKE);
      const combined = [...otherSignals, ...activeAsyncSignals, newSignal];
      return combined.sort((a, b) => b.timestamp - a.timestamp);
    });
  }

  private updateRegime(tokens: Token[]) {
    if (tokens.length === 0) return;
    const avgVol = tokens.reduce((acc, t) => {
        const history = t.priceHistory.slice(-10).map(p => p.value);
        if (history.length === 0) return acc;
        const avg = MathUtils.average(history);
        const vol = avg === 0 ? 0 : MathUtils.stdDev(history) / avg;
        return acc + vol;
    }, 0) / tokens.length;

    const upMoves = tokens.filter(t => t.priceHistory.length > 1 && t.price > t.priceHistory[t.priceHistory.length - 2].value).length;
    const correlationFactor = Math.abs((upMoves / tokens.length) - 0.5) * 2; 

    let status: MarketRegime['status'] = 'NEUTRAL';
    if (avgVol > 0.015) status = 'VOLATILE'; 
    else if (correlationFactor > 0.6 && upMoves > tokens.length / 2) status = 'BULLISH';
    else if (correlationFactor > 0.6 && upMoves < tokens.length / 2) status = 'BEARISH';

    this.marketRegime.set({ status, volatility: avgVol, correlation: correlationFactor });
  }
  
  // --- Individual Algorithm Implementations ---

  private _generateNewsSpikeSignal(token: Token, title: string, url?: string): Signal | null {
    return {
      id: `NEWS_SPIKE:${token.symbol}:${Date.now()}`, // Make ID unique
      timestamp: Date.now(),
      type: SignalType.NEWS_SPIKE,
      tokenSymbol: token.symbol,
      message: `NEWS: ${title}`,
      severity: 'warning',
      confidence: 95,
      meta: { url, priceAtSignal: token.price }
    };
  }

  private _generatePriceAlertSignal(token: Token): Signal | null {
    const alert = this.priceAlerts().get(token.symbol);
    if (!alert) return null;

    const conditionMet = 
      (alert.condition === 'ABOVE' && token.price > alert.targetPrice) ||
      (alert.condition === 'BELOW' && token.price < alert.targetPrice);

    if (conditionMet) {
      return {
        id: `PRICE_ALERT:${token.symbol}`,
        timestamp: Date.now(),
        type: SignalType.PRICE_ALERT,
        tokenSymbol: token.symbol,
        message: `Price crossed ${alert.condition.toLowerCase()} alert at $${alert.targetPrice.toFixed(4)}.`,
        severity: 'warning',
        confidence: 100,
        meta: { priceAtSignal: token.price }
      };
    }
    return null;
  }

  private _generateBurstHunterSignal(token: Token): Signal | null {
    const priceHistory = token.priceHistory.map(p => p.value);
    const volumeHistory = token.volumeHistory.map(p => p.value);
    const smaVol20 = MathUtils.sma(volumeHistory, 20);
    const sma20 = MathUtils.sma(priceHistory, 20);
    if (!smaVol20 || priceHistory.length < 3 || !sma20) return null;
    
    const lastPrice = priceHistory[priceHistory.length - 2];
    const prevLastPrice = priceHistory[priceHistory.length - 3];
    
    // FIX: Add a guard to prevent division-by-zero errors if historical price data is 0.
    if (!lastPrice || !prevLastPrice) return null;

    const priceChange = (token.price - lastPrice) / lastPrice;
    const prevPriceChange = (lastPrice - prevLastPrice) / prevLastPrice;
    const isAccelerating = priceChange > prevPriceChange;
    const ratio = token.volume / smaVol20;
    const inUptrend = token.price > sma20;

    if (ratio > 3.5 && priceChange > 0.02 && isAccelerating && inUptrend) {
      const marketSummary = this.marketSummary();
      let conf = Math.min(Math.round((ratio / 10) * 100), 85) + 5;
      const marketBreadth = marketSummary.advancing / (marketSummary.advancing + marketSummary.declining || 1);
      if (marketBreadth > 0.6) conf = Math.min(conf + 10, 99);
      
      return {
        id: `BURST:${token.symbol}`,
        timestamp: Date.now(),
        type: SignalType.BURST_HUNTER,
        tokenSymbol: token.symbol,
        message: `Macro-Confirmed Volume Burst: ${ratio.toFixed(1)}x normal.`,
        severity: 'success',
        confidence: conf,
        meta: { priceAtSignal: token.price }
      };
    }
    return null;
  }

  private _generateGainLockSignal(token: Token): Signal | null {
    // FIX: Add a guard to prevent runtime errors if the token object is malformed or entryPrice is zero.
    // This addresses potential issues with unknown data types and prevents division-by-zero errors.
    if (!token || !token.symbol || token.entryPrice <= 0) return null;

    const profitMargin = (token.price - token.entryPrice) / token.entryPrice;
    const priceHistory = token.priceHistory.map(p => p.value);
    const sma10 = MathUtils.sma(priceHistory, 10);
    const sma50 = MathUtils.sma(priceHistory, 50);

    if (profitMargin > 1.0 && sma10 && sma50 && sma10 < sma50) {
       return {
          id: `LOCK:${token.symbol}`,
          timestamp: Date.now(),
          type: SignalType.GAIN_LOCK,
          tokenSymbol: token.symbol,
          message: `Take Profit: +${(profitMargin * 100).toFixed(0)}% gain with Momentum Death Cross.`,
          severity: 'warning',
          confidence: 90,
          meta: { priceAtSignal: token.price }
        };
    }
    return null;
  }
  
  private _generateHypePulseSignal(token: Token): Signal | null {
    const priceHistory = token.priceHistory.map(p => p.value);
    const rsi = MathUtils.rsi(priceHistory, 14);
    if (!rsi) return null;

    let overboughtThreshold = 70;
    const marketRegime = this.marketRegime();

    if (marketRegime.status === 'BULLISH') overboughtThreshold = 80;
    else if (marketRegime.status === 'BEARISH') overboughtThreshold = 60;

    if (rsi > overboughtThreshold) {
      const conf = Math.min(Math.round(((rsi - overboughtThreshold) / (100 - overboughtThreshold)) * 100) + 50, 95);
      return {
          id: `HYPE_BUY:${token.symbol}`,
          timestamp: Date.now(),
          type: SignalType.HYPE_PULSE_BUY,
          tokenSymbol: token.symbol,
          message: `Overbought (RSI > ${overboughtThreshold}): ${rsi.toFixed(0)}.`,
          severity: 'info',
          confidence: conf,
          meta: { priceAtSignal: token.price }
      };
    }
    return null;
  }
  
  private _generateTrendVectorSignal(token: Token): Signal | null {
      const priceHistory = token.priceHistory.map(p => p.value);
      const historyShort = priceHistory.slice(-15);
      const regression = MathUtils.linearRegression(historyShort);
      const sma50 = MathUtils.sma(priceHistory, 50);
      const currentVolatility = this.marketRegime().volatility;
      const rSquaredThreshold = currentVolatility > 0.015 ? 0.75 : 0.60;

      if (token.price > 0 && regression && sma50 && regression.r2 > rSquaredThreshold && currentVolatility < 0.025) {
        const slopePercent = regression.m / token.price;
        if (Math.abs(slopePercent) > 0.005) {
           const direction = slopePercent > 0 ? 'UP' : 'DOWN';
           const isConfirmed = (direction === 'UP' && token.price > sma50) || (direction === 'DOWN' && token.price < sma50);

           if (isConfirmed) {
              const projected = token.price + (regression.m * 5); 
              const conf = 85 + Math.round(((regression.r2 - rSquaredThreshold) / (1.0 - rSquaredThreshold)) * 14);
              return {
                id: `VECTOR:${token.symbol}`,
                timestamp: Date.now(),
                type: SignalType.TREND_VECTOR,
                tokenSymbol: token.symbol,
                message: `Strong Trend Vector (R²=${regression.r2.toFixed(2)}): Projecting ${projected.toFixed(2)}`,
                severity: direction === 'UP' ? 'success' : 'danger',
                confidence: Math.min(conf, 99),
                meta: { projectedPrice: projected, priceAtSignal: token.price }
              };
           }
        }
      }
      return null;
  }

  private _generateStableAnchorSignal(token: Token): Signal | null {
      if (token.price <= 0) return null;
      const priceHistory = token.priceHistory.map(p => p.value);
      const volatility = MathUtils.stdDev(priceHistory.slice(-20)) / token.price; 
      if (volatility < 0.05 && token.yield > 5.0) {
         return {
            id: `ANCHOR:${token.symbol}`,
            timestamp: Date.now(),
            type: SignalType.STABLE_ANCHOR,
            tokenSymbol: token.symbol,
            message: `Yield Safe Haven: ${token.yield.toFixed(2)}% APY.`,
            severity: 'success',
            confidence: 85,
            meta: { priceAtSignal: token.price }
          };
      }
      return null;
  }
  
  private _generateVenueShieldSignal(token: Token): Signal | null {
      if (token.liquidityDepth < 1000000) { 
         return {
            id: `VENUE:${token.symbol}`,
            timestamp: Date.now(),
            type: SignalType.VENUE_SHIELD,
            tokenSymbol: token.symbol,
            message: `High Slippage Risk: Low Liquidity.`,
            severity: 'danger',
            confidence: 100,
            meta: { priceAtSignal: token.price }
          };
      }
      return null;
  }

  private _generateSupportBounceSignal(token: Token): Signal | null {
      const priceHistory = token.priceHistory.map(p => p.value);
      const volumeHistory = token.volumeHistory.map(p => p.value);
      const rsi = MathUtils.rsi(priceHistory, 14);
      if (priceHistory.length > 20 && volumeHistory.length > 2 && rsi && rsi < 65) {
         const recent = priceHistory.slice(-20);
         const minPrice = d3.min(recent) || 0;
         const current = token.price;
         const prev = priceHistory[priceHistory.length - 2];
         const volumeConf = token.volume > volumeHistory[volumeHistory.length - 2];
         
         if (minPrice > 0 && current > prev && (current - minPrice) / minPrice < 0.05 && current > minPrice && volumeConf) {
            return {
              id: `SUPPORT_BOUNCE:${token.symbol}`,
              timestamp: Date.now(),
              type: SignalType.SUPPORT_BOUNCE,
              tokenSymbol: token.symbol,
              message: `Volume-Confirmed Bounce off 20-period low.`,
              severity: 'success',
              confidence: 75,
              meta: { priceAtSignal: token.price }
            };
         }
      }
      return null;
  }

  private _generateVolatilitySqueezeSignal(token: Token): Signal | null {
      const priceHistory = token.priceHistory.map(p => p.value);
      const rsi = MathUtils.rsi(priceHistory, 14);
      const sma20 = MathUtils.sma(priceHistory, 20);
      if (priceHistory.length > 20 && rsi && rsi > 40 && rsi < 60) {
         const period = 20;
         const recent = priceHistory.slice(-period);
         const sma = sma20 || token.price;
         const stdDev = MathUtils.stdDev(recent);
         
         const upper = sma + (2 * stdDev);
         const lower = sma - (2 * stdDev);
         const bandwidth = sma > 0 ? (upper - lower) / sma : 0;

         if (bandwidth < 0.025) {
            const conf = 80 + Math.round(((0.025 - bandwidth) / 0.025) * 19);
            return {
              id: `SQUEEZE:${token.symbol}`,
              timestamp: Date.now(),
              type: SignalType.VOLATILITY_SQUEEZE,
              tokenSymbol: token.symbol,
              message: `High-Compression Squeeze: (Bandwidth ${(bandwidth*100).toFixed(2)}%).`,
              severity: 'warning',
              confidence: Math.min(conf, 99),
              meta: { priceAtSignal: token.price }
            };
         }
      }
      return null;
  }

  private _generateJerryReversionSignal(token: Token): Signal | null {
    const marketRegime = this.marketRegime();
    const priceHistory = token.priceHistory.map(p => p.value);
    if ((marketRegime.status === 'NEUTRAL' || marketRegime.status === 'VOLATILE') && priceHistory.length > 20) {
      const sma20 = MathUtils.sma(priceHistory, 20);
      const stdDev20 = MathUtils.stdDev(priceHistory.slice(-20));
      const prevPrice = priceHistory[priceHistory.length - 2];
      const prevPrevPrice = priceHistory[priceHistory.length - 3];

      if (token.price > 0 && sma20 && stdDev20 && prevPrice && prevPrevPrice) {
        const currentVolatility = stdDev20 / token.price;
        const priceDeviation = (sma20 - token.price) / sma20;
        const isBelowMean = priceDeviation > 0.05;
        const isLowVolatility = currentVolatility < 0.10;
        const isReverting = token.price > prevPrice && prevPrice > prevPrevPrice;

        if (isBelowMean && isLowVolatility && isReverting) {
          let conf = 75;
          if (priceDeviation > 0.1) conf += 10;
          if (currentVolatility < 0.05) conf += 10;
          
          return {
            id: `JERRY:${token.symbol}`,
            timestamp: Date.now(),
            type: SignalType.JERRY_REVERSION,
            tokenSymbol: token.symbol,
            message: `Confirmed Reversion: ${(priceDeviation * 100).toFixed(0)}% below mean.`,
            severity: 'success',
            confidence: Math.min(conf, 99),
            meta: { priceAtSignal: token.price }
          };
        }
      }
    }
    return null;
  }
  
  // --- Helpers ---
  private getRandomSubset<T>(arr: T[], size: number): T[] {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(size, arr.length));
  }

  private formatSignalType(type: SignalType): string {
    return type.replace(/_/g, ' ').replace('BUY', '').replace('SELL', '').trim();
  }

  private getIconForSignal(type: SignalType): AlgoIconType {
    if (type === SignalType.HYPE_PULSE_BUY || type === SignalType.HYPE_PULSE_SELL) {
      return 'HYPE_PULSE';
    }
    if (type === SignalType.PRICE_ALERT) {
      return 'GAIN_LOCK';
    }
    if (type === SignalType.SUPPORT_BOUNCE) {
      return 'PATTERN_SCANNER';
    }
    return type as AlgoIconType;
  }
}