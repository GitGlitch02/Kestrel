import { Injectable, inject, OnDestroy, effect, signal } from '@angular/core';
import { TokenStateService } from './token-state.service';
import { UserPrefsService, DataSourceMode, RefreshRate, ApiProvider, WebSocketProvider } from './user-prefs.service';
import { Token, HistoryPoint } from './types';
import { SimulationDataSource } from './data-sources/simulation-data.source';
import { LiveDataSource } from './data-sources/live-data.source';
import { WebSocketService, PriceUpdate } from './web-socket.service';
import { Subscription, bufferTime } from 'rxjs';

export interface TokenDefinition {
  symbol: string;
  name: string;
  price?: number; 
  cgId?: string;
  imageUrl?: string;
  isExternal?: boolean;
}

const SOLANA_TOKEN_DB: TokenDefinition[] = [
  { symbol: 'SOL', name: 'Solana', price: 145.50, cgId: 'solana', imageUrl: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
  { symbol: 'MOBILE', name: 'Helium Mobile', price: 0.001626, cgId: 'helium-mobile', imageUrl: 'https://assets.coingecko.com/coins/images/31221/large/_y2G2P6b_400x400.jpg' },
  { symbol: 'HNT', name: 'Helium', price: 6.50, cgId: 'helium', imageUrl: 'https://assets.coingecko.com/coins/images/4284/large/Helium_HNT.png' },
  { symbol: 'IOT', name: 'Helium IOT', price: 0.00092, cgId: 'helium-iot', imageUrl: 'https://assets.coingecko.com/coins/images/28114/large/8o4w1i3g_400x400.jpeg' },
  { symbol: 'JUP', name: 'Jupiter', price: 0.98, cgId: 'jupiter-exchange-solana', imageUrl: 'https://assets.coingecko.com/coins/images/34188/large/jup.png' },
  { symbol: 'PYTH', name: 'Pyth Network', price: 0.35, cgId: 'pyth-network', imageUrl: 'https://assets.coingecko.com/coins/images/32328/large/pyth-network-pyth-logo-vertical-color-dark-background.png' },
  { symbol: 'JTO', name: 'Jito', price: 2.85, cgId: 'jito-governance-token', imageUrl: 'https://assets.coingecko.com/coins/images/33262/large/jto.png' },
  { symbol: 'WIF', name: 'dogwifhat', price: 2.45, cgId: 'dogwifcoin', imageUrl: 'https://assets.coingecko.com/coins/images/33566/large/dogwifhat.jpg' },
  { symbol: 'BONK', name: 'Bonk', price: 0.000022, cgId: 'bonk', imageUrl: 'https://assets.coingecko.com/coins/images/28600/large/bonk.jpg' },
  { symbol: 'RAY', name: 'Raydium', price: 1.65, cgId: 'raydium', imageUrl: 'https://assets.coingecko.com/coins/images/13928/large/VZj3_2t.png' },
  { symbol: 'RENDER', name: 'Render', price: 7.20, cgId: 'render-token', imageUrl: 'https://assets.coingecko.com/coins/images/11636/large/rndr.png' },
  { symbol: 'ORCA', name: 'Orca', price: 2.10, cgId: 'orca', imageUrl: 'https://assets.coingecko.com/coins/images/17548/large/orca_logo.png' },
  { symbol: 'MSOL', name: 'Marinade Staked SOL', price: 162.00, cgId: 'marinade-staked-sol', imageUrl: 'https://assets.coingecko.com/coins/images/19156/large/msol_logo_square.png' },
  { symbol: 'BOME', name: 'Book of Meme', price: 0.0095, cgId: 'book-of-meme', imageUrl: 'https://assets.coingecko.com/coins/images/35930/large/bome.jpg' },
  { symbol: 'POPCAT', name: 'Popcat', price: 0.45, cgId: 'popcat', imageUrl: 'https://assets.coingecko.com/coins/images/33785/large/popcat-logo.png' },
  { symbol: 'MEW', name: 'Cat in a dogs world', price: 0.0045, cgId: 'cat-in-a-dogs-world', imageUrl: 'https://assets.coingecko.com/coins/images/36214/large/mew.jpg' },
  { symbol: 'USDC', name: 'USD Coin', price: 1.00, cgId: 'usd-coin', imageUrl: 'https://assets.coingecko.com/coins/images/6319/large/usdc.png' },
  { symbol: 'USDT', name: 'Tether', price: 1.00, cgId: 'tether', imageUrl: 'https://assets.coingecko.com/coins/images/325/large/Tether-logo.png' },
  { symbol: 'DRIFT', name: 'Drift Protocol', price: 0.65, cgId: 'drift-protocol', imageUrl: 'https://assets.coingecko.com/coins/images/36979/large/drift.jpg' },
  { symbol: 'KMNO', name: 'Kamino', price: 0.045, cgId: 'kamino', imageUrl: 'https://assets.coingecko.com/coins/images/36809/large/kamino.png' },
  { symbol: 'TNSR', name: 'Tensor', price: 0.85, cgId: 'tensor', imageUrl: 'https://assets.coingecko.com/coins/images/36495/large/tensor.jpg' },
  { symbol: 'CLOUD', name: 'Sanctum', price: 0.22, cgId: 'sanctum-cloud' },
  { symbol: 'IO', name: 'io.net', price: 2.15, cgId: 'io-net', imageUrl: 'https://assets.coingecko.com/coins/images/38029/large/io_net_logo.jpeg' },
  { symbol: 'NOS', name: 'Nosana', price: 3.40, cgId: 'nosana', imageUrl: 'https://assets.coingecko.com/coins/images/29087/large/nosana-logo.png' },
  { symbol: 'SHDW', name: 'Shadow Token', price: 0.45, cgId: 'shadow-token', imageUrl: 'https://assets.coingecko.com/coins/images/21921/large/shdw-logo-200.png' },
  { symbol: 'SLERF', name: 'Slerf', price: 0.25, cgId: 'slerf', imageUrl: 'https://assets.coingecko.com/coins/images/36021/large/slerf.jpg' },
  { symbol: 'SAMO', name: 'Samoyedcoin', price: 0.009, cgId: 'samoyedcoin', imageUrl: 'https://assets.coingecko.com/coins/images/15357/large/samo-logo-200.png' },
  { symbol: 'BERN', name: 'BonkEarn', price: 0.004 }
];

const DEFAULT_WATCHLIST = ['SOL', 'JUP', 'WIF', 'USDC'];

/**
 * @class MarketDataService
 * @description Acts as the "Y-Junction Box" for market data.
 * It is responsible for managing the current watchlist state and orchestrating data updates.
 * Based on user preferences, it delegates the actual data fetching/generation to specialized
 * data source services (`SimulationDataSource` for mock data, `LiveDataSource` for real-world APIs).
 * This keeps the core application logic agnostic to the data's origin.
 */
@Injectable({
  providedIn: 'root'
})
export class MarketDataService implements OnDestroy {
  private stateService = inject(TokenStateService);
  private prefs = inject(UserPrefsService);
  private simulationDataSource = inject(SimulationDataSource);
  private liveDataSource = inject(LiveDataSource);
  private webSocketService = inject(WebSocketService);
  
  private tokens: Token[] = [];
  private webSocketSub: Subscription | null = null;
  
  // Heartbeat State
  readonly timerProgress = signal(0); // 0 to 100
  readonly isUpdating = signal(false);
  readonly currentDuration = signal(5000); // Default Sim duration

  private timerId: any;
  private startTime = 0;
  private duration = 5000;

  constructor() {
    this.initializeWatchlist();
    
    // React to configuration changes
    effect(() => {
      const mode = this.prefs.dataSourceMode();
      const rate = this.prefs.refreshRate();
      const apiProvider = this.prefs.apiProvider();
      const wsProvider = this.prefs.webSocketProvider();
      this.configureHeartbeat(mode, rate, apiProvider, wsProvider);
    });
  }

  private initializeWatchlist() {
    const savedOrder = this.prefs.watchlistOrder();
    const symbolsToLoad = savedOrder.length > 0 ? savedOrder : DEFAULT_WATCHLIST;
    
    symbolsToLoad.forEach(symbol => {
      const dbToken = SOLANA_TOKEN_DB.find(t => t.symbol === symbol);
      if (dbToken) {
        this.addToken(dbToken.symbol, dbToken.cgId, dbToken.name, dbToken.imageUrl, false);
      }
    });
    this.stateService.updateTokens([...this.tokens]);
  }

  // --- PUBLIC API ---

  async searchTokens(query: string): Promise<TokenDefinition[]> {
    const q = query.toUpperCase().trim();
    if (!q) return [];
    const queryWords = q.split(' ').filter(w => w);

    const scoredMatches = SOLANA_TOKEN_DB.map(t => {
      const upperSymbol = t.symbol.toUpperCase();
      const upperName = t.name.toUpperCase();
      const cgIdString = (t.cgId || '').toUpperCase().replace(/-/g, ' ');

      // Combined text for checking if all words exist
      const combinedForExistenceCheck = `${upperSymbol} ${upperName} ${cgIdString}`;
      if (!queryWords.every(word => combinedForExistenceCheck.includes(word))) {
        return { token: t, score: 0 };
      }
      
      // Text blocks for scoring
      const nameWords = upperName.split(' ');
      const cgIdWords = cgIdString.split(' ');
      const allSearchableWords = [...new Set([...nameWords, ...cgIdWords])];

      let score = 0;
      queryWords.forEach(qw => {
        // Strongest match: exact symbol
        if (upperSymbol === qw) {
          score += 100;
        } 
        // Strong match: symbol starts with query word
        else if (upperSymbol.startsWith(qw)) {
          score += 50;
        }

        // Good match: exact word in name/cgId
        if (allSearchableWords.includes(qw)) {
          score += 30;
        }
        // Decent match: word in name/cgId starts with query word
        else if (allSearchableWords.some(sw => sw.startsWith(qw))) {
          score += 20;
        }

        // Basic containment match in name or cgId string
        if (upperName.includes(qw)) {
          score += 5;
        }
        if (cgIdString.includes(qw)) {
          score += 5;
        }
      });
      
      // Bonus for exact match on full query string to symbol
      if (upperSymbol === q) {
        score += 100;
      }

      return { token: t, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

    const localMatches = scoredMatches.map(item => item.token);

    if (this.prefs.dataSourceMode() === 'SIMULATION' || this.prefs.apiProvider() === 'COINMARKETCAP') {
      return localMatches;
    }
    
    // Only CoinGecko supports live search for now
    return this.liveDataSource.searchTokens(query, localMatches);
  }

  addToken(symbol: string, cgId?: string, name?: string, imageUrl?: string, save = true) {
    const s = symbol.toUpperCase().trim();
    if (!s || this.tokens.find(t => t.symbol === s)) return;

    const dbToken = SOLANA_TOKEN_DB.find(t => t.symbol === s);
    const finalCgId = cgId || dbToken?.cgId;
    const finalName = name || dbToken?.name || `${s} (Custom)`;
    const finalImageUrl = imageUrl || dbToken?.imageUrl;
    
    let startPrice = dbToken?.price || 0;
    
    if (!dbToken && !cgId && this.prefs.dataSourceMode() === 'SIMULATION') {
      startPrice = Math.random() * 10 + 0.1;
    }

    const newToken = this.createToken(
      s, finalName, startPrice, 
      startPrice > 0 ? startPrice * 0.95 : 0, 0, finalCgId, finalImageUrl
    );

    this.fillTokenHistory(newToken);
    this.tokens.push(newToken);
    this.stateService.updateTokens([...this.tokens]);
    
    if (save) {
      this.saveWatchlistOrder();
    }

    if (this.prefs.dataSourceMode() !== 'SIMULATION') {
      this.performUpdate();
    }
    // After adding a token, reconfigure heartbeat to include it in WS subscription
    this.configureHeartbeat(
      this.prefs.dataSourceMode(), this.prefs.refreshRate(), 
      this.prefs.apiProvider(), this.prefs.webSocketProvider()
    );
  }

  removeToken(symbol: string) {
    this.tokens = this.tokens.filter(t => t.symbol !== symbol);
    this.stateService.updateTokens([...this.tokens]);
    this.saveWatchlistOrder();
     // After removing a token, reconfigure heartbeat
    this.configureHeartbeat(
      this.prefs.dataSourceMode(), this.prefs.refreshRate(),
      this.prefs.apiProvider(), this.prefs.webSocketProvider()
    );
  }

  reorderTokens(fromSymbol: string, toSymbol: string) {
    const fromIndex = this.tokens.findIndex(t => t.symbol === fromSymbol);
    const toIndex = this.tokens.findIndex(t => t.symbol === toSymbol);

    if (fromIndex === -1 || toIndex === -1) return;

    const [movedToken] = this.tokens.splice(fromIndex, 1);
    this.tokens.splice(toIndex, 0, movedToken);

    this.stateService.updateTokens([...this.tokens]);
    this.saveWatchlistOrder();
  }

  private saveWatchlistOrder() {
    const symbols = this.tokens.map(t => t.symbol);
    this.prefs.saveWatchlistOrder(symbols);
  }

  // --- HEARTBEAT ENGINE ---

  private configureHeartbeat(mode: DataSourceMode, rate: RefreshRate, _apiProvider: ApiProvider, wsProvider: WebSocketProvider) {
    // Universal Cleanup
    if (this.timerId) clearInterval(this.timerId);
    this.webSocketService.disconnect();
    if (this.webSocketSub) this.webSocketSub.unsubscribe();
    this.webSocketSub = null;

    let pollIntervalMs = 5000; // Default for simulation

    if (mode === 'LIVE') {
      // Connect to websocket for both watchlist tokens and BTC
      const btcForWs: Token = { 
        symbol: 'BTC', name: 'Bitcoin', cgId: 'bitcoin', 
        price: 0, entryPrice: 0, volume: 0, yield: 0, priceHistory: [], volumeHistory: [], liquidityDepth: 0
      };
      this.webSocketService.connect(wsProvider, [...this.tokens, btcForWs]);
      
      this.webSocketSub = this.webSocketService.priceUpdates$
        .pipe(
          bufferTime(250) // Batch updates every 250ms for a smooth but performant feel
        )
        .subscribe((updates: PriceUpdate[]) => {
          if (updates.length > 0) {
            this.handleBatchedPriceUpdates(updates);
          }
        });

      switch (rate) {
        case 'HYPER': pollIntervalMs = 5000; break;
        case 'AGGRESSIVE': pollIntervalMs = 30000; break;
        case 'STANDARD': pollIntervalMs = 60000; break;
        case 'SAFE': pollIntervalMs = 120000; break;
      }
    }

    this.duration = pollIntervalMs;
    this.currentDuration.set(this.duration);
    this.startTime = Date.now();
    
    this.performUpdate();

    this.timerId = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      if (elapsed >= this.duration) {
        this.performUpdate();
        this.startTime = Date.now();
        this.timerProgress.set(0);
      } else {
        this.timerProgress.set((elapsed / this.duration) * 100);
      }
    }, 100);
  }

  private handleBatchedPriceUpdates(updates: PriceUpdate[]) {
    // This will hold the latest price for each symbol from the batch.
    const latestPrices = new Map<string, number>();
    const provider = this.prefs.webSocketProvider();

    if (provider === 'COINCAP') {
        const cgIdToSymbolMap = new Map<string, string>();
        this.tokens.forEach(token => {
            if (token.cgId) cgIdToSymbolMap.set(token.cgId, token.symbol);
        });
        cgIdToSymbolMap.set('bitcoin', 'BTC');

        for (const update of updates) {
            for (const assetId in update) {
                const symbol = cgIdToSymbolMap.get(assetId);
                if (symbol) {
                    const newPrice = parseFloat(update[assetId]);
                    if (!isNaN(newPrice)) {
                        latestPrices.set(symbol, newPrice);
                    }
                }
            }
        }
    } else if (provider === 'BITSTAMP') {
        for (const update of updates) {
            for (const symbol in update) {
                const newPrice = parseFloat(update[symbol]);
                if (!isNaN(newPrice)) {
                    latestPrices.set(symbol, newPrice);
                }
            }
        }
    }

    if (latestPrices.size > 0) {
        this.stateService.batchUpdateTokenPrices(latestPrices);
    }
  }

  private async performUpdate() {
    this.isUpdating.set(true);
    
    const mode = this.prefs.dataSourceMode();
    
    try {
      let apiTokens: Token[] = this.tokens; // Default to current tokens
      let btcData: { price: number; change24h: number } | null = null;
      
      if (mode === 'SIMULATION') {
        apiTokens = this.simulationDataSource.updateTokens(this.tokens);
        btcData = this.simulationDataSource.getBtcSummary();
      } else { // LIVE mode
        const apiProvider = this.prefs.apiProvider();

        if (apiProvider === 'COINGECKO') {
          const marketData = await this.liveDataSource.fetchCoinGeckoMarketData(this.tokens);
          apiTokens = marketData.updatedTokens;
          btcData = marketData.btcData;
        } else if (apiProvider === 'COINMARKETCAP') {
          const apiKey = this.prefs.coinMarketCapApiKey();
          if (apiKey) {
            // Fetch both in parallel
            const [tokensResult, btcResult] = await Promise.all([
              this.liveDataSource.fetchCoinMarketCapData(this.tokens, apiKey),
              this.liveDataSource.fetchBtcSummaryFromCoinMarketCap(apiKey)
            ]);
            apiTokens = tokensResult;
            btcData = btcResult;
          }
        }
      }

      // If in LIVE mode, merge API data with real-time price data from state
      if (mode === 'LIVE') {
          const currentPriceMap = new Map<string, { price: number; priceHistory: HistoryPoint[] }>();
          // Use this.tokens because it contains the latest websocket prices
          this.stateService.tokens().forEach(t => { 
              currentPriceMap.set(t.symbol, { price: t.price, priceHistory: t.priceHistory });
          });
          
          apiTokens = apiTokens.map(apiToken => {
              const livePriceData = currentPriceMap.get(apiToken.symbol);
              if (livePriceData) {
                  return {
                      ...apiToken,
                      price: livePriceData.price,
                      priceHistory: livePriceData.priceHistory
                  };
              }
              return apiToken; // New token, use API price initially
          });
      }

      this.tokens = apiTokens;
      this.stateService.updateTokens([...this.tokens]); // Use spread to ensure new array reference
      if (btcData) {
          this.stateService.updateBtcToken(btcData);
      }

    } catch (error) {
        console.error("Error during market data update:", error);
    }
    finally {
      setTimeout(() => this.isUpdating.set(false), 500);
    }
  }

  // --- DATA HELPERS ---

  private createToken(symbol: string, name: string, price: number, entry: number, apy: number, cgId?: string, imageUrl?: string): Token {
    return {
      symbol, name, price,
      entryPrice: entry,
      volume: 1000000 + Math.random() * 5000000,
      yield: apy,
      priceHistory: [],
      volumeHistory: [],
      liquidityDepth: 5000000 + Math.random() * 5000000,
      cgId, imageUrl
    };
  }

  private fillTokenHistory(token: Token) {
    const HISTORY_POINTS = 60;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
  
    // Create a series of prices that ends with the token's current price.
    const prices: number[] = [token.price];
    for (let i = 0; i < HISTORY_POINTS - 1; i++) {
      const lastPrice = prices[prices.length - 1];
      const change = (Math.random() - 0.5) * 0.02; // Simulate a small random walk
      // To get the previous price, we reverse the change logic: prev = current / (1 + change)
      const prevPrice = lastPrice / (1 + change);
      prices.push(prevPrice);
    }
    prices.reverse(); // Now prices are chronologically sorted [oldest, ..., newest]
  
    // Create a corresponding series of volumes.
    const volumes: number[] = [];
    let currentVol = token.volume;
    for (let i = 0; i < HISTORY_POINTS; i++) {
      volumes.push(currentVol);
      currentVol *= (0.9 + Math.random() * 0.2); // Volume also walks randomly
    }
    volumes.reverse();
  
    // Assign timestamps to the generated points
    for (let i = 0; i < HISTORY_POINTS; i++) {
      const timestamp = now - (HISTORY_POINTS - 1 - i) * fiveMinutes;
      token.priceHistory.push({ time: timestamp, value: prices[i] });
      token.volumeHistory.push({ time: timestamp, value: volumes[i] });
    }
  }

  ngOnDestroy() {
    if (this.timerId) clearInterval(this.timerId);
    this.webSocketService.disconnect();
    if (this.webSocketSub) this.webSocketSub.unsubscribe();
  }
}
