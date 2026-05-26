import { Injectable } from '@angular/core';
import { Token, HistoryPoint } from '../types';

@Injectable({
  providedIn: 'root'
})
export class SimulationDataSource {
  private btcPrice = 68000;

  updateTokens(currentTokens: Token[]): Token[] {
    const updatedTokens = currentTokens.map(token => {
      if (token.price === 0) {
        token.price = Math.random() * 10;
      }

      const volatility = (token.symbol === 'USDC' || token.symbol === 'USDT') ? 0.001 : 0.015;
      const change = (Math.random() - 0.5) * volatility * 2;
      const newPrice = token.price * (1 + change);
      
      const isBurst = Math.random() > 0.95;
      const newVolume = isBurst 
        ? token.volume * (3 + Math.random()) 
        : token.volume * (0.8 + Math.random() * 0.4);

      const newLiquidity = Math.random() > 0.9 ? 500000 : 5000000 + Math.random() * 5000000;

      const now = Date.now();
      const newPriceHistory = [...token.priceHistory, { time: now, value: newPrice }].slice(-60);
      const newVolumeHistory = [...token.volumeHistory, { time: now, value: newVolume }].slice(-60);

      return {
        ...token,
        price: newPrice,
        volume: newVolume,
        liquidityDepth: newLiquidity,
        priceHistory: newPriceHistory,
        volumeHistory: newVolumeHistory
      };
    });

    return updatedTokens;
  }
  
  getBtcSummary(): { price: number; change24h: number } {
    const change = (Math.random() - 0.5) * 0.005; // +/- 0.25% per tick
    this.btcPrice *= (1 + change);
    return {
      price: this.btcPrice,
      change24h: (Math.random() - 0.45) * 10 // random 24h change between -4.5% and +5.5%
    };
  }

  getBtcDetail(): Token {
    const HISTORY_POINTS = 60;
    const now = Date.now();
    const interval = (3 * 24 * 60 * 60 * 1000) / HISTORY_POINTS; // 3 days of history
  
    // Generate a price path backwards from the current price
    const prices = [this.btcPrice];
    for (let i = 0; i < HISTORY_POINTS - 1; i++) {
      const lastPrice = prices[prices.length - 1];
      const change = (Math.random() - 0.5) * 0.02;
      prices.push(lastPrice / (1 + change)); // Calculate previous price
    }
    prices.reverse(); // Sort from oldest to newest
  
    const priceHistory: HistoryPoint[] = prices.map((price, i) => ({
      time: now - (HISTORY_POINTS - 1 - i) * interval,
      value: price,
    }));

    return {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: this.btcPrice,
      entryPrice: 0,
      volume: 35_000_000_000 + Math.random() * 10_000_000_000,
      yield: 0,
      priceHistory: priceHistory,
      volumeHistory: priceHistory.map(p => ({ time: p.time, value: p.value * (1000 + Math.random() * 500) })),
      liquidityDepth: 1_300_000_000_000,
      cgId: 'bitcoin',
      imageUrl: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
    };
  }
}