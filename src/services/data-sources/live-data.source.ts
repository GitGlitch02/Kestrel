import { Injectable, inject, signal } from '@angular/core';
import { Token, HistoryPoint } from '../types';
import { TokenDefinition } from '../market-data.service';
import { NotificationService } from '../notification.service';

export type ApiStatus = 'IDLE' | 'SUCCESS' | 'ERROR';

@Injectable({
  providedIn: 'root'
})
export class LiveDataSource {
  private notificationService = inject(NotificationService);
  readonly apiStatus = signal<ApiStatus>('IDLE');

  async fetchCoinGeckoMarketData(tokens: Token[]): Promise<{ updatedTokens: Token[], btcData: { price: number; change24h: number } | null }> {
    const tokensWithIds = tokens.filter(t => t.cgId);
    const ids = new Set(tokensWithIds.map(t => t.cgId as string));
    ids.add('bitcoin'); // Always include bitcoin

    if (ids.size === 1 && ids.has('bitcoin') && tokens.length === 0) {
        // Only fetch BTC if it's the only thing requested and the watchlist is empty.
    } else if (tokensWithIds.length === 0) {
        if (this.apiStatus() !== 'IDLE') this.apiStatus.set('IDLE');
        return { updatedTokens: tokens, btcData: null };
    }

    const idString = Array.from(ids).join(',');

    try {
        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${idString}`;
        const response = await fetch(url, { cache: 'no-store' });

        if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);

        const data: any[] = await response.json();
        this.apiStatus.set('SUCCESS');

        const dataMap = new Map<string, any>(data.map(item => [item.id, item]));

        let btcData: { price: number; change24h: number } | null = null;
        const btcApiData = dataMap.get('bitcoin');
        if (btcApiData) {
            btcData = {
                price: btcApiData.current_price,
                change24h: btcApiData.price_change_percentage_24h
            };
        }

        const updatedTokens = tokens.map(token => {
            const apiData = token.cgId ? dataMap.get(token.cgId) : null;
            if (apiData) {
                const newPrice = apiData.current_price;
                const newVol = apiData.total_volume;
                const now = Date.now();

                return {
                    ...token,
                    price: newPrice,
                    volume: newVol,
                    priceHistory: [...token.priceHistory, { time: now, value: newPrice }].slice(-60),
                    volumeHistory: [...token.volumeHistory, { time: now, value: newVol }].slice(-60)
                };
            }
            return token;
        });

        return { updatedTokens, btcData };

    } catch (err) {
        console.error('KESTREL: CoinGecko market data fetch failed.', err);
        this.notificationService.show(
            'Live Data Feed Failed',
            'Could not fetch market data from CoinGecko. Check connection or API status.',
            'danger',
            'INFO'
        );
        this.apiStatus.set('ERROR');
        return { updatedTokens: tokens, btcData: null };
    }
  }

  async fetchCoinMarketCapData(tokens: Token[], apiKey: string): Promise<Token[]> {
    if (!apiKey.trim()) {
      if (this.apiStatus() !== 'IDLE') this.apiStatus.set('IDLE');
      return tokens;
    }
    
    const symbols = tokens.map(t => t.symbol).join(',');
    if (!symbols) return tokens;

    const targetUrl = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${symbols}`;
    const url = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    
    const headers = new Headers();
    headers.append('X-CMC_PRO_API_KEY', apiKey);

    try {
      const response = await fetch(url, { headers, cache: 'no-store' });
      if (!response.ok) throw new Error(`CoinMarketCap API Error: ${response.status} ${response.statusText}`);
      
      const result = await response.json();
      this.apiStatus.set('SUCCESS');
      
      const dataRoot = result.data;
      if (typeof dataRoot !== 'object' || dataRoot === null) {
        throw new Error("Invalid response structure from CoinMarketCap");
      }

      return tokens.map(token => {
        const symbolData = dataRoot[token.symbol];
        if (symbolData && symbolData[0]?.quote?.USD) { // CMC API wraps symbols in an array
          const quote = symbolData[0].quote.USD;
          const newPrice = Number(quote.price) || token.price;
          const newVol = Number(quote.volume_24h) || token.volume;
          const now = Date.now();

          return {
             ...token,
             price: newPrice,
             volume: newVol,
             priceHistory: [...token.priceHistory, { time: now, value: newPrice }].slice(-60),
             volumeHistory: [...token.volumeHistory, { time: now, value: newVol }].slice(-60)
           };
        }
        return token;
      });

    } catch (err) {
      console.error('KESTREL: CoinMarketCap fetch failed.', err);
      this.notificationService.show(
        'CoinMarketCap Feed Failed',
        'Could not connect. Please verify your API key and network connection.',
        'danger',
        'INFO'
      );
      this.apiStatus.set('ERROR');
      return tokens;
    }
  }
  
  async fetchBtcSummaryFromCoinMarketCap(apiKey: string): Promise<{ price: number; change24h: number } | null> {
      if (!apiKey.trim()) return null;
      try {
          const targetUrl = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=BTC`;
          const url = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
          const headers = new Headers();
          headers.append('X-CMC_PRO_API_KEY', apiKey);
          headers.append('Accept', 'application/json');

          const response = await fetch(url, { headers, cache: 'no-store' });
          if (!response.ok) throw new Error('CoinMarketCap BTC fetch failed');
          const result = await response.json();
          const btcData = result.data?.BTC;
          
          if (btcData && btcData[0]?.quote?.USD) {
              const quote = btcData[0].quote.USD;
              return {
                  price: quote.price,
                  change24h: quote.percent_change_24h
              };
          }
          return null;
      } catch (err) {
          console.error('KESTREL: BTC fetch from CoinMarketCap failed.', err);
          return null;
      }
  }
  
  async fetchBtcDetail(): Promise<Token | null> {
    try {
      const marketTargetUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin';
      const chartTargetUrl = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=3';

      const [marketPromise, chartPromise] = [
        fetch(marketTargetUrl, { cache: 'no-store' }),
        fetch(chartTargetUrl, { cache: 'no-store' })
      ];

      const [marketResponse, chartResponse] = await Promise.all([marketPromise, chartPromise]);

      if (!marketResponse.ok) throw new Error('CoinGecko BTC market fetch failed');
      if (!chartResponse.ok) throw new Error('CoinGecko BTC chart fetch failed');
      
      const marketData = await marketResponse.json();
      const chartData = await chartResponse.json();

      if (marketData && marketData.length > 0 && chartData && chartData.prices) {
          const btc = marketData[0];
          const priceHistory: HistoryPoint[] = chartData.prices.map((p: [number, number]) => ({ time: p[0], value: p[1] }));
          const volumeHistory: HistoryPoint[] = chartData.total_volumes.map((v: [number, number]) => ({ time: v[0], value: v[1] }));

          const btcToken: Token = {
            symbol: 'BTC',
            name: 'Bitcoin',
            price: btc.current_price,
            entryPrice: 0, // Not applicable
            volume: btc.total_volume,
            yield: 0, // Not applicable
            priceHistory: priceHistory,
            volumeHistory: volumeHistory,
            liquidityDepth: btc.market_cap, // Use market cap as a proxy
            cgId: 'bitcoin',
            imageUrl: btc.image,
            change24h: btc.price_change_percentage_24h
          };
          return btcToken;
      }
      return null;
    } catch (err) {
      console.error('KESTREL: Detailed BTC fetch from CoinGecko failed.', err);
      this.notificationService.show(
        'BTC Data Failed',
        'Could not fetch detailed Bitcoin data from CoinGecko.',
        'danger',
        'INFO'
      );
      return null;
    }
  }

  async searchTokens(query: string, localMatches: TokenDefinition[]): Promise<TokenDefinition[]> {
      try {
        const url = `https://api.coingecko.com/api/v3/search?query=${query}`;
        const response = await fetch(url, { cache: 'no-store' });
        
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        const remoteMatches: TokenDefinition[] = (data.coins || []).slice(0, 8).map((c: any) => ({
          symbol: c.symbol,
          name: c.name,
          cgId: c.id,
          imageUrl: c.large,
          price: undefined,
          isExternal: true
        }));
  
        const localSymbols = new Set(localMatches.map(t => t.symbol.toUpperCase()));
        const newRemote = remoteMatches.filter(r => !localSymbols.has(r.symbol.toUpperCase()));
  
        return [...localMatches, ...newRemote];
      } catch (err) {
        console.error('Live search failed', err);
        this.notificationService.show(
            'Token Search Failed',
            'Could not fetch token suggestions from CoinGecko.',
            'warning',
            'INFO'
        );
        return localMatches;
      }
  }
}