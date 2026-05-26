import { Component, input, signal, inject, computed, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Signal, SignalType, Token, AlgoIconType } from '../services/types';
import { GeminiService } from '../services/gemini.service';
import { AlgorithmIconComponent } from './algorithm-icon.component';

type FilterType = 'ALL' | 'HIGH_CONFIDENCE' | 'OPPORTUNITY' | 'RISK' | 'PREDICTION';

interface FilterConfig {
  id: FilterType;
  label: string;
  classes: string;
}

@Component({
  selector: 'app-signal-feed',
  standalone: true,
  imports: [CommonModule, AlgorithmIconComponent],
  template: `
    <div class="flex flex-col h-full bg-white dark:bg-slate-925 rounded-lg overflow-hidden">
      
      <!-- Tool Header / Filters -->
      <div class="flex items-center gap-2 p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 overflow-x-auto custom-scrollbar">
        @for(f of filters; track f.id) {
          <button 
            (click)="setFilter(f.id)" 
            class="px-3 py-1 text-[10px] font-bold rounded transition-colors border whitespace-nowrap"
            [class.text-slate-500]="filter() !== f.id"
            [class.hover:bg-slate-100]="filter() !== f.id"
            [class.dark:hover:bg-slate-800]="filter() !== f.id"
            [class]="filter() === f.id ? f.classes : 'border-slate-300 dark:border-slate-700'"
          >
            {{ f.label }}
          </button>
        }
      </div>

      <!-- Feed List -->
      <div class="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-2">
        @for (sig of displayedSignals(); track sig.id) {
          @let currentPrice = getCurrentPrice(sig.tokenSymbol);
          @let delta = getDelta(sig, currentPrice);
          <div 
            class="group border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900/40 p-3 transition-all duration-200 ease-out shadow-sm signal-enter-active"
            [class.new-signal-highlight]="newSignalIds().has(sig.id)"
            [class.border-l-4]="true"
            [class.border-l-green-500]="sig.severity === 'success'"
            [class.border-l-yellow-500]="sig.severity === 'warning'"
            [class.border-l-red-500]="sig.severity === 'danger'"
            [class.border-l-blue-500]="sig.severity === 'info'"
            [class.border-l-slate-400]="sig.type === 'JERRY_REVERSION'"
          >
            <!-- Top Row: Type, Symbol, and Time -->
            <div class="flex justify-between items-center mb-2">
              <div class="flex items-center gap-4">
                <div 
                  class="flex items-center gap-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded text-white dark:text-black uppercase tracking-wider"
                  [class.bg-green-600]="sig.severity === 'success' && sig.type !== 'JERRY_REVERSION'"
                  [class.dark:bg-green-500]="sig.severity === 'success' && sig.type !== 'JERRY_REVERSION'"
                  [class.bg-yellow-600]="sig.severity === 'warning'"
                  [class.dark:bg-yellow-500]="sig.severity === 'warning'"
                  [class.bg-red-600]="sig.severity === 'danger'"
                  [class.dark:bg-red-500]="sig.severity === 'danger'"
                  [class.bg-blue-600]="sig.severity === 'info'"
                  [class.dark:bg-blue-500]="sig.severity === 'info'"
                  [class.bg-slate-500]="sig.type === 'JERRY_REVERSION'"
                  [class.dark:bg-slate-400]="sig.type === 'JERRY_REVERSION'"
                >
                  <app-algorithm-icon [name]="getIconForSignal(sig.type)" class="w-3 h-3" />
                  <span>{{ formatType(sig.type) }}</span>
                </div>
                <button 
                  (click)="inspectSignal(sig)"
                  title="Inspect {{sig.tokenSymbol}} in Market Grid"
                  class="text-lg font-bold text-left text-green-600 dark:text-teal-400 hover:text-green-500 dark:hover:text-teal-300 transition-colors font-mono tracking-tighter"
                >
                  {{ sig.tokenSymbol }}
                </button>
              </div>
              <span class="text-[10px] text-slate-400 font-mono">{{ sig.timestamp | date:'HH:mm:ss' }}</span>
            </div>
            
            <!-- Price Context Row -->
            <div class="text-xs font-mono text-slate-500 dark:text-slate-400 grid grid-cols-3 gap-2 border-y border-slate-200 dark:border-slate-800 my-2 py-2">
                <div class="truncate" title="Price at time of signal">
                  <span class="text-[9px] uppercase">@ Signal</span>
                  <div class="text-slate-700 dark:text-slate-300 font-bold">\${{ sig.meta?.priceAtSignal | number:'1.2-5' }}</div>
                </div>
                <div class="truncate" title="Current price">
                  <span class="text-[9px] uppercase">Current</span>
                  <div class="text-slate-700 dark:text-slate-300 font-bold">\${{ currentPrice | number:'1.2-5' }}</div>
                </div>
                <div class="truncate text-right" title="Change since signal">
                  <span class="text-[9px] uppercase">Delta</span>
                   @if (delta !== null) {
                    <div 
                      class="font-bold"
                      [class.text-green-600]="delta >= 0" [class.dark:text-green-400]="delta >= 0"
                      [class.text-red-600]="delta < 0" [class.dark:text-red-400]="delta < 0"
                    >
                      {{ delta >= 0 ? '+' : '' }}{{ delta | number:'1.2-2' }}%
                    </div>
                  } @else {
                    <div class="text-slate-500">--</div>
                  }
                </div>
            </div>

            <!-- Message -->
            <div class="text-xs font-mono text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
              {{ sig.message }}
            </div>

            <!-- Metadata: Confidence -->
            <div class="flex items-center gap-2 mb-2" title="Algorithm Confidence Score">
                <div class="flex items-center gap-0.5">
                  @for (i of segments; track i) {
                    <div 
                      class="w-1.5 h-4 rounded-sm transition-colors duration-300"
                      [class]="getSegmentColor(sig.confidence, i)"
                    ></div>
                  }
                </div>
                <span class="text-[10px] text-slate-500 dark:text-slate-400 font-mono text-right tabular-nums w-10">
                  {{ sig.confidence }}%
                </span>
            </div>

            <!-- Action / Analysis Area -->
            <div class="flex items-start gap-2 min-h-[20px] mt-2 border-t border-slate-100 dark:border-slate-800/50 pt-2">
               @if (!analysisMap().get(sig.id) && !analyzingState().has(sig.id)) {
                 <button 
                   (click)="analyze(sig)"
                   class="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" /></svg>
                   [AI_TACTICAL_ANALYSIS]
                 </button>
               }
               
               @if (analyzingState().has(sig.id)) {
                 <span class="text-[10px] text-slate-400 animate-pulse flex items-center gap-1">
                   <div class="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></div> COMPUTING STRATEGY...
                 </span>
               }

               @if (analysisMap().get(sig.id); as result) {
                 <div class="bg-slate-100 dark:bg-slate-800/80 p-2 rounded w-full border border-slate-200 dark:border-slate-700">
                    <div class="flex justify-between items-start mb-1">
                      <span class="text-[10px] text-blue-600 dark:text-blue-400 font-bold">GEMINI TACTICAL:</span>
                      <button (click)="clearAnalysis(sig.id)" class="text-[10px] text-slate-400 hover:text-slate-200">x</button>
                    </div>
                    <p class="text-[11px] text-slate-700 dark:text-slate-300 font-mono leading-tight">{{ result }}</p>
                 </div>
               }
            </div>
          </div>
        } @empty {
          <div class="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-600">
             <div class="text-2xl mb-2 opacity-20 flex justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
             </div>
             <div class="text-xs font-mono">NO SIGNALS MATCHING FILTER</div>
          </div>
        }
      </div>
      
      <div class="p-1 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-[10px] text-center text-slate-500 font-mono">
        {{ displayedSignals().length }} SIGNALS ACTIVE — PREDICTION ENGINE V3 (SQUEEZE)
      </div>
    </div>
  `
})
export class SignalFeedComponent {
  signals = input.required<Signal[]>();
  tokens = input.required<Token[]>();
  inspect = output<string>(); // Emit symbol
  
  private gemini = inject(GeminiService);

  filter = signal<FilterType>('ALL');
  
  analysisMap = signal<Map<string, string>>(new Map());
  analyzingState = signal<Set<string>>(new Set());
  
  // --- New Signal Highlight Logic ---
  private newSignalIds = signal<Set<string>>(new Set());
  private trackedSignalIds = new Set<string>();

  readonly segments = Array.from({length: 10}, (_, i) => i);

  tokenMap = computed(() => new Map(this.tokens().map(t => [t.symbol, t])));

  readonly filters: FilterConfig[] = [
    { id: 'ALL', label: 'ALL', classes: 'bg-slate-200 dark:bg-slate-700 border-transparent' },
    { id: 'HIGH_CONFIDENCE', label: 'HIGH CONFIDENCE', classes: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-transparent' },
    { id: 'OPPORTUNITY', label: 'OPPORTUNITY', classes: 'bg-green-100 dark:bg-teal-900/30 text-green-600 dark:text-teal-400 border-transparent' },
    { id: 'RISK', label: 'RISK ALERT', classes: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-transparent' },
    { id: 'PREDICTION', label: 'PREDICTIONS', classes: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-transparent' }
  ];

  constructor() {
    effect(() => {
      const currentSignals = this.signals();
      const newlyArrivedSignals: string[] = [];

      // Identify signals that we haven't seen before in this component instance
      for (const sig of currentSignals) {
        if (!this.trackedSignalIds.has(sig.id)) {
          newlyArrivedSignals.push(sig.id);
          this.trackedSignalIds.add(sig.id);
        }
      }

      // If we found new ones, add them to the highlight set and schedule their removal
      if (newlyArrivedSignals.length > 0) {
        this.newSignalIds.update(currentIds => {
          const newSet = new Set(currentIds);
          newlyArrivedSignals.forEach(id => newSet.add(id));
          return newSet;
        });

        // The CSS animation for the highlight lasts 6 seconds.
        // We'll remove the IDs from the set after that duration to clean up.
        setTimeout(() => {
          this.newSignalIds.update(currentIds => {
            const newSet = new Set(currentIds);
            newlyArrivedSignals.forEach(id => newSet.delete(id));
            return newSet;
          });
        }, 6000);
      }
    });
  }

  displayedSignals = computed(() => {
    const list = this.signals();
    const mode = this.filter();

    switch (mode) {
      case 'HIGH_CONFIDENCE':
        return list.filter(s => s.confidence >= 80);
      case 'OPPORTUNITY':
        return list.filter(s => s.severity === 'success' || s.severity === 'info');
      case 'RISK':
        return list.filter(s => s.severity === 'warning' || s.severity === 'danger');
      case 'PREDICTION':
        return list.filter(s => 
          s.type === SignalType.TREND_VECTOR || 
          s.type === SignalType.SUPPORT_BOUNCE ||
          s.type === SignalType.VOLATILITY_SQUEEZE ||
          s.type === SignalType.JERRY_REVERSION
        );
      default:
        return list;
    }
  });

  getCurrentPrice(symbol: string): number | undefined {
    return this.tokenMap().get(symbol)?.price;
  }

  getDelta(signal: Signal, currentPrice: number | undefined): number | null {
    const priceAtSignal = signal.meta?.priceAtSignal as number;
    if (priceAtSignal && currentPrice && priceAtSignal > 0) {
      return ((currentPrice - priceAtSignal) / priceAtSignal) * 100;
    }
    return null;
  }

  getSegmentColor(confidence: number, index: number): string {
    const isFilled = confidence >= (index + 1) * 10;
    if (!isFilled) {
      return 'bg-slate-200 dark:bg-slate-800';
    }

    if (confidence < 50) {
      return 'bg-yellow-500 dark:bg-yellow-400';
    }
    if (confidence <= 80) {
      return 'bg-blue-500 dark:bg-blue-400';
    }
    return 'bg-green-500 dark:bg-teal-400';
  }

  setFilter(f: FilterType) {
    this.filter.set(f);
  }

  inspectSignal(sig: Signal) {
    this.inspect.emit(sig.tokenSymbol);
  }

  formatType(type: string): string {
    return type.replace(/_/g, ' ').replace('BUY', '').replace('SELL', '');
  }

  getIconForSignal(type: SignalType): AlgoIconType {
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

  async analyze(sig: Signal) {
    const token = this.tokenMap().get(sig.tokenSymbol);
    if (!token) return;

    this.analyzingState.update(s => new Set(s).add(sig.id));

    try {
      const analysis = await this.gemini.analyzeSignalContext(sig, token);
      this.analysisMap.update(m => new Map(m).set(sig.id, analysis));
    } finally {
       this.analyzingState.update(s => {
        const n = new Set(s);
        n.delete(sig.id);
        return n;
      });
    }
  }

  clearAnalysis(id: string) {
    this.analysisMap.update(m => {
      const n = new Map(m);
      n.delete(id);
      return n;
    });
  }
}
