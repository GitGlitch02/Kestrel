import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlgorithmIconComponent } from './algorithm-icon.component';

// FIX: Define the array as a constant outside the class.
// This allows TypeScript to infer the string literals for 'iconName' correctly,
// preventing the type-widening that causes the assignment error.
// FIX: Removed explicit AlgoDoc[] type to prevent type widening on iconName property.
const ALGORITHMS = [
  {
    id: '01',
    name: 'BURST HUNTER',
    iconName: 'BURST_HUNTER',
    sub: 'CONVICTION DETECTOR',
    logic: 'Triggers on accelerating volume and price in an uptrend. Confidence is boosted if the broader market is also advancing (>60% of assets).',
    math: 'Vol>SMA20(V)*3.5 & Price>SMA20(P) & Conf+=(MarketAdv>60%)',
    color: 'text-green-600 dark:text-teal-400'
  },
  {
    id: '02',
    name: 'VOLATILITY SQUEEZE',
    iconName: 'VOLATILITY_SQUEEZE',
    sub: 'PREDICTION ENGINE V3',
    logic: 'Identifies periods of extreme volatility compression (tight Bollinger Bands) and neutral momentum, signaling a potential breakout. Confidence is higher when bands are tighter.',
    math: 'BB_Bandwidth < 0.025 AND 40 < RSI(14) < 60',
    color: 'text-purple-600 dark:text-purple-400'
  },
   {
    id: '03',
    name: 'NEWS SPIKE',
    iconName: 'NEWS_SPIKE',
    sub: 'EVENT-DRIVEN ANALYSIS',
    logic: 'An AI-driven check that uses Google Search to find significant, token-specific news in the last 24 hours. Triggers on events like partnerships, listings, or regulatory changes.',
    math: 'AI.GoogleSearch("{token} news last 24h") -> {isSignificant: true}',
    color: 'text-orange-600 dark:text-orange-400'
  },
  {
    id: '04',
    name: 'GAIN LOCK-100',
    iconName: 'GAIN_LOCK',
    sub: 'RISK MANAGEMENT',
    logic: 'Advises exit when a position is up >100% and short-term momentum crosses below long-term trend (Death Cross).',
    math: 'Profit > 100% AND SMA_10 < SMA_50',
    color: 'text-yellow-600 dark:text-yellow-400'
  },
  {
    id: '05',
    name: 'TREND VECTOR',
    iconName: 'TREND_VECTOR',
    sub: 'LINEAR REGRESSION',
    logic: 'Projects future price based on a strong regression fit (R² > 0.6). Deactivates during high global market volatility to avoid chaotic predictions.',
    math: 'Regression(R² > 0.6) AND Global_Vol < 2.5%',
    color: 'text-blue-600 dark:text-blue-400'
  },
  {
    id: '06',
    name: 'HYPE PULSE',
    iconName: 'HYPE_PULSE',
    sub: 'MOMENTUM GAUGE',
    logic: 'Uses dynamic RSI thresholds that adapt to the market regime. (e.g., Overbought level is 70 in Neutral markets, but 80 in Bullish markets).',
    math: 'RSI(14) > (Regime === BULL ? 80 : 70)',
    color: 'text-red-600 dark:text-red-400'
  },
  {
    id: '07',
    name: 'SUPPORT BOUNCE',
    iconName: 'PATTERN_SCANNER',
    sub: 'PRICE ACTION PATTERN',
    logic: 'Detects V-shape recoveries from a local low, now requiring confirmation from increasing volume to validate the bounce.',
    math: '(Price - Min_20)/Min_20 < 5% & RSI < 65 & Vol > Prev_Vol',
    color: 'text-indigo-600 dark:text-indigo-400'
  },
  {
    id: '08',
    name: 'STABLE ANCHOR',
    iconName: 'STABLE_ANCHOR',
    sub: 'CAPITAL PRESERVATION',
    logic: 'Identifies assets with low volatility and acceptable yield for safe capital parking.',
    math: 'StdDev(Price, 20) / Price < 0.05 AND APY > 5%',
    color: 'text-cyan-600 dark:text-cyan-400'
  },
  {
    id: '09',
    name: 'VENUE SHIELD',
    iconName: 'VENUE_SHIELD',
    sub: 'EXECUTION OPTIMIZER',
    logic: 'Warns against trading assets with insufficient liquidity depth to prevent slippage.',
    math: 'Liquidity_Depth < $1,000,000 USD',
    color: 'text-red-600 dark:text-red-400'
  },
  {
    id: '10',
    name: 'JERRY',
    iconName: 'JERRY_REVERSION',
    sub: 'SYSTEMATIC MEAN REVERSION',
    logic: 'Identifies oversold assets showing recovery signs. Automatically deactivates in strong trending markets (BULLISH or BEARISH regimes) to avoid "catching a falling knife".',
    math: 'Regime !== (BULLISH || BEARISH) && Price < SMA20*0.95',
    color: 'text-slate-500 dark:text-slate-400'
  }
].sort((a,b) => parseInt(a.id) - parseInt(b.id));


@Component({
  selector: 'app-algorithm-docs',
  standalone: true,
  imports: [CommonModule, AlgorithmIconComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-black/80 backdrop-blur-sm p-4" (click)="close.emit()">
      <div class="w-full max-w-4xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-lg flex flex-col max-h-[90vh] relative cygnus-border" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-t-lg">
          <div>
            <h3 class="text-slate-600 dark:text-slate-400 font-bold font-sans text-sm uppercase tracking-widest flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-emerald-500">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              ALGORITHMIC BLUEPRINT
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">LOGIC GATES & SIGNAL DEFINITIONS</p>
          </div>
          <button (click)="close.emit()" class="text-slate-500 hover:text-red-500 transition-colors font-mono text-sm">
            [CLOSE_ARCHIVE]
          </button>
        </div>

        <!-- Content -->
        <div class="overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-950">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            @for (algo of algorithms; track algo.id) {
              <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group">
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-center gap-4">
                    <app-algorithm-icon [name]="algo.iconName" [class]="algo.color" class="w-8 h-8 opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div>
                      <h4 class="font-bold font-mono text-slate-800 dark:text-slate-200 group-hover:text-green-600 dark:group-hover:text-teal-400 transition-colors">
                        {{ algo.name }}
                      </h4>
                      <span class="text-[10px] uppercase tracking-wider font-bold" [class]="algo.color">
                        {{ algo.sub }}
                      </span>
                    </div>
                  </div>
                  <div class="text-xs font-mono text-slate-300 dark:text-slate-700">ID: {{ algo.id }}</div>
                </div>
                
                <div class="space-y-3 font-mono text-xs">
                  <div>
                    <span class="text-slate-400 uppercase text-[10px]">Logic Gate:</span>
                    <p class="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{{ algo.logic }}</p>
                  </div>
                  <div class="bg-slate-100 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800/50">
                    <span class="text-slate-400 uppercase text-[10px] block mb-1">Arithmetic:</span>
                    <code class="text-slate-700 dark:text-slate-300 break-words">{{ algo.math }}</code>
                  </div>
                </div>
              </div>
            }
          </div>

          <div class="mt-8 border-t border-slate-200 dark:border-slate-800 pt-4 text-center">
            <p class="text-[10px] text-slate-400 font-mono">
              SYSTEM NOTE: All signals are probabilistic. No algorithm guarantees future performance. 
              Execution is local.
            </p>
          </div>

        </div>
      </div>
    </div>
  `
})
export class AlgorithmDocsComponent {
  close = output<void>();

  readonly algorithms = ALGORITHMS;
}