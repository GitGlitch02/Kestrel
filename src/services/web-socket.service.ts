import { Injectable, OnDestroy, signal } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject, tap, catchError, EMPTY, retry, timer } from 'rxjs';
import { WebSocketProvider } from './user-prefs.service';
import { Token } from './types';

export interface PriceUpdate {
  [assetIdOrSymbol: string]: string;
}

export type WebSocketStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private socket$: WebSocketSubject<any> | null = null;
  private priceUpdatesSubject = new Subject<PriceUpdate>();
  
  public priceUpdates$ = this.priceUpdatesSubject.asObservable();
  readonly status = signal<WebSocketStatus>('DISCONNECTED');
  private currentProvider: WebSocketProvider | null = null;

  private readonly symbolToBitstampChannel = new Map<string, string>([
    ['BTC', 'live_trades_btcusd'],
    ['SOL', 'live_trades_solusd'],
  ]);

  connect(provider: WebSocketProvider, tokens: Token[]) {
    this.disconnect();
    this.currentProvider = provider;

    if (provider === 'COINCAP') {
      this.connectCoinCap(tokens);
    } else if (provider === 'BITSTAMP') {
      this.connectBitstamp(tokens);
    }
  }

  private connectCoinCap(tokens: Token[]) {
    const assetIds = tokens.map(t => t.cgId).filter((id): id is string => !!id);
    if (assetIds.length === 0) return;
    
    this.status.set('CONNECTING');
    const assets = assetIds.join(',');
    const url = `wss://ws.coincap.io/prices?assets=${assets}`;

    this.socket$ = webSocket<PriceUpdate>({
      url,
      openObserver: {
        next: () => {
          console.log('KESTREL: CoinCap WebSocket connection established.');
          this.status.set('CONNECTED');
        }
      }
    });

    this.socket$.pipe(
      tap(data => this.priceUpdatesSubject.next(data)),
      this.commonPipeHandlers()
    ).subscribe();
  }

  private connectBitstamp(tokens: Token[]) {
    this.status.set('CONNECTING');
    const url = 'wss://ws.bitstamp.net';

    this.socket$ = webSocket<any>({
      url,
      openObserver: {
        next: () => {
          console.log('KESTREL: Bitstamp WebSocket connection established.');
          this.status.set('CONNECTED');
          tokens.forEach(token => {
            const channel = this.symbolToBitstampChannel.get(token.symbol);
            if (channel) {
              this.socket$?.next({
                "event": "bts:subscribe",
                "data": { "channel": channel }
              });
              console.log(`KESTREL: Subscribed to Bitstamp channel: ${channel}`);
            }
          });
        }
      }
    });

    this.socket$.pipe(
      tap(message => {
        const normalized = this.normalizeBitstampMessage(message);
        if (normalized) {
          this.priceUpdatesSubject.next(normalized);
        }
      }),
      this.commonPipeHandlers()
    ).subscribe();
  }

  private normalizeBitstampMessage(message: any): PriceUpdate | null {
    if (message.event === 'trade' && message.data?.price_str && message.channel) {
      const symbol = [...this.symbolToBitstampChannel.entries()]
        .find(([_, val]) => val === message.channel)?.[0];
      
      if (symbol) {
        return { [symbol]: message.data.price_str };
      }
    }
    return null;
  }

  private commonPipeHandlers<T>() {
    return (source: import('rxjs').Observable<T>) => source.pipe(
      retry({ 
        delay: (_error, retryCount) => {
          this.status.set('CONNECTING');
          console.warn(`KESTREL: WebSocket disconnected (${this.currentProvider}). Reconnecting (attempt #${retryCount})...`);
          return timer(Math.min(1000 * Math.pow(2, retryCount), 30000));
        }
      }),
      catchError(error => {
        console.error(`KESTREL: WebSocket Error (${this.currentProvider}):`, error);
        this.status.set('ERROR');
        this.socket$ = null; 
        return EMPTY;
      })
    );
  }

  disconnect() {
    if (this.socket$) {
      this.socket$.complete();
      this.socket$ = null;
    }
    this.status.set('DISCONNECTED');
  }

  ngOnDestroy() {
    this.disconnect();
  }
}