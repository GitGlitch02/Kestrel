import { Injectable, inject, signal, effect } from '@angular/core';
import { TokenStateService } from './token-state.service';
import { Signal, SignalType, PerformanceData } from './types';

interface PendingSignal {
    signal: Signal;
    entryPrice: number;
    startTick: number;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceTrackerService {
    private tokenState = inject(TokenStateService);

    readonly stats = signal<Map<SignalType, PerformanceData>>(new Map());
    
    private pendingSignals = new Map<string, PendingSignal>();
    private processedSignalIds = new Set<string>();
    private tickCounter = 0;
    private readonly RESOLUTION_TICKS = 5; // Resolve after 5 ticks

    constructor() {
        effect(() => {
            this.tokenState.tokens(); // Depend on tokens to trigger effect on each data update
            this.tickCounter++;
            
            // It's important to process new signals *before* resolving old ones
            // to correctly capture the entry price on the tick the signal appeared.
            this.processNewSignals(this.tokenState.activeSignals());
            this.resolvePendingSignals();
        });
    }

    private processNewSignals(signals: Signal[]): void {
        const trackableSignals = signals.filter(s => this.isTrackable(s));

        for (const signal of trackableSignals) {
            if (!this.processedSignalIds.has(signal.id)) {
                const token = this.tokenState.tokens().find(t => t.symbol === signal.tokenSymbol);
                if (token) {
                    this.pendingSignals.set(signal.id, {
                        signal,
                        entryPrice: token.price,
                        startTick: this.tickCounter
                    });
                    this.processedSignalIds.add(signal.id);
                }
            }
        }
    }

    private resolvePendingSignals(): void {
        if (this.pendingSignals.size === 0) return;

        for (const [id, pending] of this.pendingSignals.entries()) {
            if (this.tickCounter >= pending.startTick + this.RESOLUTION_TICKS) {
                const token = this.tokenState.tokens().find(t => t.symbol === pending.signal.tokenSymbol);
                if (token) {
                    this.calculateOutcome(pending, token.price);
                }
                // Always remove the signal after its resolution period to prevent memory leaks,
                // even if the token was removed from the watchlist before resolution.
                this.pendingSignals.delete(id);
            }
        }
    }
    
    private calculateOutcome(pending: PendingSignal, exitPrice: number): void {
        const { signal, entryPrice } = pending;
        if (entryPrice === 0) return; // Avoid division by zero

        const returnPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
        
        // For this simulation, all trackable signals are 'success' oriented, meaning they predict a price increase.
        const isWin = returnPercent > 0.05; // Consider it a win only if it's a meaningful gain (>0.05%)

        this.stats.update(currentStats => {
            const newStats = new Map(currentStats);

            const existing: PerformanceData = newStats.get(signal.type) || this.getInitialData();
            
            const wins = existing.wins + (isWin ? 1 : 0);
            const losses = existing.losses + (isWin ? 0 : 1);
            const totalSignals = existing.totalSignals + 1;
            const totalPnlPercent = existing.totalPnlPercent + returnPercent;
            
            const updatedData: PerformanceData = {
                totalSignals,
                wins,
                losses,
                winRate: (wins / totalSignals) * 100,
                totalPnlPercent,
                averageReturn: totalPnlPercent / totalSignals,
            };

            newStats.set(signal.type, updatedData);
            return newStats;
        });
    }

    resetStats(): void {
        this.stats.set(new Map());
        this.pendingSignals.clear();
        this.processedSignalIds.clear();
        console.log('KESTREL: Performance audit data has been reset.');
    }
    
    private isTrackable(signal: Signal): boolean {
        const trackableTypes = [
            SignalType.BURST_HUNTER,
            SignalType.SUPPORT_BOUNCE,
            SignalType.JERRY_REVERSION,
            SignalType.VOLATILITY_SQUEEZE,
            SignalType.TREND_VECTOR,
            SignalType.NEWS_SPIKE
        ];
        // For TREND_VECTOR, only track 'UP' predictions.
        if (signal.type === SignalType.TREND_VECTOR && signal.severity === 'danger') {
            return false;
        }
        return trackableTypes.includes(signal.type);
    }

    // FIX: The getInitialData method was returning an empty object, causing a type error.
    // It now returns a complete PerformanceData object with all properties initialized to 0.
    private getInitialData(): PerformanceData {
        return { totalSignals: 0, wins: 0, losses: 0, winRate: 0, totalPnlPercent: 0, averageReturn: 0 };
    }
}