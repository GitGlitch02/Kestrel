import { Component, input, output, computed, inject, signal, ElementRef, viewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Token } from '../services/types';
import { MathUtils } from '../services/math-utils';
import { TokenStateService } from '../services/token-state.service';
import { UserPrefsService } from '../services/user-prefs.service';
import * as d3 from 'd3';

@Component({
  selector: 'app-token-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cygnus-border bg-white dark:bg-slate-950 p-6 rounded-lg shadow-2xl relative overflow-hidden">
      <!-- Header -->
      <div class="flex justify-between items-start mb-4 border-b border-slate-200 dark:border-slate-800 pb-4 relative z-10">
        <div class="flex items-center gap-4">
           @if (token().imageUrl && !imageError()) {
              <img 
                [src]="token().imageUrl" 
                (error)="imageError.set(true)" 
                alt="{{token().symbol}} logo" 
                class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 object-cover"
              >
            } @else {
              <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg font-bold text-slate-500">
                {{ token().symbol[0] }}
              </div>
            }
          <div>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              {{ token().symbol }} 
              <span class="text-sm font-mono text-slate-500 font-normal ml-2"> {{ token().name }}</span>
            </h2>
            <div class="flex flex-wrap gap-4 mt-1 font-mono text-xs items-center">
              <span class="text-green-600 dark:text-teal-400">PRICE: \${{ token().price | number:'1.2-6' }}</span>
              <span class="text-slate-500 dark:text-slate-400">ENTRY: \${{ token().entryPrice | number:'1.2-6' }}</span>
              
              <div class="flex items-center gap-2 ml-2 pl-3 border-l border-slate-200 dark:border-slate-800" title="Neural Data Link">
                 <div class="relative w-2 h-2">
                    <div class="absolute inset-0 bg-green-500 dark:bg-teal-500 rounded-full" 
                         [class.animate-ping]="isUpdating()" 
                         [class.opacity-0]="!isUpdating()"></div>
                    <div class="relative w-2 h-2 rounded-full bg-green-500 dark:bg-teal-500"></div>
                 </div>
                 <span class="text-[10px] font-bold tracking-wider text-green-600 dark:text-teal-400">
                   LINK_ACTIVE
                 </span>
              </div>
            </div>
          </div>
        </div>
        <button (click)="close.emit()" class="text-slate-500 hover:text-red-500 font-mono transition-colors">
          [CLOSE_PANEL]
        </button>
      </div>

      <!-- Chart Area -->
      <div #chartContainer (mousemove)="onChartHover($event)" (mouseleave)="onChartLeave()" class="w-full h-64 mb-6 bg-slate-50 dark:bg-slate-900/20 rounded border border-slate-200 dark:border-slate-800/50 relative">
        @if (chartData(); as c) {
          <svg class="w-full h-full" preserveAspectRatio="none" [attr.viewBox]="'0 0 ' + c.width + ' ' + c.height">
            <defs>
              <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#22c55e" stop-opacity="0.3" />
                <stop offset="100%" stop-color="#22c55e" stop-opacity="0" />
              </linearGradient>
              <linearGradient id="chartGradientDark" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0.3" /> <!-- Teal -->
                <stop offset="100%" stop-color="#2dd4bf" stop-opacity="0" />
              </linearGradient>
              
              <filter id="dotGlowLight" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="dotGlowDark" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <!-- Axis Titles -->
            <g class="text-[8px] font-mono fill-slate-500 dark:fill-slate-500 uppercase tracking-wider">
              <text [attr.transform]="'rotate(-90)'" [attr.y]="c.axisTitles.price.y" [attr.x]="c.axisTitles.price.x" text-anchor="middle">
                Price
              </text>
              <text [attr.transform]="'rotate(-90)'" [attr.y]="c.axisTitles.volume.y" [attr.x]="c.axisTitles.volume.x" text-anchor="middle">
                Volume
              </text>
            </g>

            <!-- Price Y-Axis Grid Lines & Labels -->
            <g class="text-[8px] font-mono fill-slate-400 dark:fill-slate-600">
              @for(tick of c.priceTicks; track tick.value) {
                <line [attr.x1]="c.margin.left" [attr.x2]="c.width - c.margin.right" [attr.y1]="tick.y" [attr.y2]="tick.y" class="stroke-slate-200 dark:stroke-slate-800" stroke-width="0.5" />
                <text [attr.x]="c.margin.left - 5" [attr.y]="tick.y" text-anchor="end" alignment-baseline="middle">
                  {{ tick.value | number:'1.2-4' }}
                </text>
              }
            </g>

            <!-- Volume Y-Axis Labels -->
             <g class="text-[8px] font-mono fill-slate-400 dark:fill-slate-600">
              @for(tick of c.volumeTicks; track tick.value) {
                <text [attr.x]="c.margin.left - 5" [attr.y]="tick.y" text-anchor="end" alignment-baseline="middle">
                  {{ formatVolume(tick.value) }}
                </text>
              }
            </g>
            
            <!-- Time X-Axis Labels -->
            <g class="text-[8px] font-mono fill-slate-400 dark:fill-slate-600" [attr.transform]="'translate(0, ' + (c.height - c.margin.bottom) + ')'">
              @for(tick of c.timeTicks; track tick.time) {
                <text [attr.x]="tick.x" [attr.y]="10" text-anchor="middle">
                  {{ tick.time | date:'HH:mm' }}
                </text>
              }
            </g>

            <!-- Separator line -->
            <line [attr.x1]="c.margin.left" [attr.x2]="c.width - c.margin.right" [attr.y1]="c.dividerLineY" [attr.y2]="c.dividerLineY" class="stroke-slate-200 dark:stroke-slate-800" stroke-width="0.5" stroke-dasharray="2,2" />

            <!-- Volume Bars -->
            @for (bar of c.volumeBars; track $index) {
              <rect 
                [attr.x]="bar.x" 
                [attr.y]="bar.y" 
                [attr.width]="bar.width" 
                [attr.height]="bar.height" 
                class="fill-slate-300 dark:fill-slate-700 opacity-60" 
              />
            }

            <path [attr.d]="c.areaPath" class="fill-[url(#chartGradient)] dark:fill-[url(#chartGradientDark)] transition-all duration-500 ease-in-out" />
            <path [attr.d]="c.linePath" 
                  [id]="'chartLinePath-' + token().symbol"
                  fill="none" 
                  stroke-width="0.75"
                  class="stroke-green-500 dark:stroke-teal-400 transition-all duration-500 ease-in-out"
            />
            
            <!-- Crosshair and Hover Dot -->
            @if (isTooltipVisible() && tooltipData(); as tt) {
              <line 
                [attr.x1]="tt.svgX" 
                [attr.y1]="c.margin.top" 
                [attr.x2]="tt.svgX" 
                [attr.y2]="c.height - c.margin.bottom" 
                class="stroke-slate-400 dark:stroke-slate-600" 
                stroke-width="0.5" 
                stroke-dasharray="2,2" 
              />
              <circle [attr.cx]="tt.svgX" [attr.cy]="tt.svgY" r="2.5" class="fill-slate-900 dark:fill-white" stroke-width="0.75" [attr.stroke]="prefs.theme() === 'DARK' || prefs.theme() === 'MONOKAI' ? '#2dd4bf' : '#22c55e'" />
            }
            
            @if (!prefs.reducedMotion()) {
              <g>
                <circle r="1.5" class="fill-green-300 dark:fill-teal-200" 
                        [attr.filter]="prefs.theme() === 'DARK' || prefs.theme() === 'MONOKAI' ? 'url(#dotGlowDark)' : 'url(#dotGlowLight)'">
                  <animateMotion dur="5.0s" repeatCount="indefinite" calcMode="linear">
                    <mpath [attr.href]="'#chartLinePath-' + token().symbol"></mpath>
                  </animateMotion>
                  <animate attributeName="opacity" values="0; 1; 1; 0" keyTimes="0; 0.1; 0.9; 1" dur="5.0s" repeatCount="indefinite" />
                  <animate attributeName="r" values="1.5; 2.5; 1.5" dur="2.5s" repeatCount="indefinite" />
                </circle>
              </g>
            }
          </svg>
        } @else {
          <div class="w-full h-full flex items-center justify-center text-slate-500 font-mono text-xs">
              NO PRICE HISTORY DATA
          </div>
        }
        <!-- Tooltip -->
        @if (tooltipData(); as tt) {
          <div #tooltip 
              class="absolute top-0 left-0 bg-slate-800/80 dark:bg-black/80 backdrop-blur-sm text-white rounded p-2 font-mono text-xs pointer-events-none transition-all duration-200 ease-out"
              [style.left]="tooltipPosition().left"
              [style.top]="tooltipPosition().top"
              [style.opacity]="tooltipPosition().opacity"
              [style.transform]="tooltipPosition().transform">
                <div class="font-bold mb-1">{{ tt.time | date:'MMM d, HH:mm' }}</div>
                <div class="grid grid-cols-[auto,1fr] gap-x-2">
                  <span class="text-slate-400">Price:</span> <span class="text-right">\${{ tt.price | number:'1.2-6' }}</span>
                  <span class="text-slate-400">Vol:</span> <span class="text-right">{{ tt.volume | number:'1.0-0' }}</span>
                </div>
          </div>
        }
      </div>

      <!-- Metrics Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs relative z-10">
        
        <div class="bg-slate-50 dark:bg-slate-900/80 p-3 rounded border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
          <div class="flex items-center gap-2 text-slate-500 mb-1">
             <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 011.5 1.5v2.333a1.5 1.5 0 11-3 0V5A1.5 1.5 0 0110 3.5z" /><path d="M9 10a1 1 0 00-1 1v.001a1 1 0 001 1h2a1 1 0 001-1V11a1 1 0 00-1-1H9z" /><path d="M10 6.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" /><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clip-rule="evenodd" /></svg>
             <span class="text-xs">RSI (14)</span>
          </div>
          <div class="text-xl font-bold" 
            [class.text-red-600]="metrics().rsi > 70" 
            [class.dark:text-red-500]="metrics().rsi > 70"
            [class.text-green-600]="metrics().rsi < 30"
            [class.dark:text-green-500]="metrics().rsi < 30"
            [class.text-slate-800]="metrics().rsi >= 30 && metrics().rsi <= 70"
            [class.dark:text-slate-200]="metrics().rsi >= 30 && metrics().rsi <= 70">
            {{ metrics().rsi | number:'1.0-0' }}
          </div>
        </div>

        <div class="bg-slate-50 dark:bg-slate-900/80 p-3 rounded border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
           <div class="flex items-center gap-2 text-slate-500 mb-1">
             <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.527-1.973 6.012 6.012 0 011.912 2.706C16.27 8.57 16 9.026 16 9.5a1.5 1.5 0 01-3 0 2 2 0 00-4 0 2 2 0 01-1.527 1.973 6.012 6.012 0 01-1.912-2.706C3.73 9.43 4 8.974 4 8.5a1.5 1.5 0 01.332-.973z" clip-rule="evenodd" /></svg>
             <span class="text-xs">VOLATILITY</span>
          </div>
          <div class="text-xl font-bold text-slate-800 dark:text-slate-200">
            {{ metrics().volatility | percent:'1.2-2' }}
          </div>
        </div>

        <div class="bg-slate-50 dark:bg-slate-900/80 p-3 rounded border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
           <div class="flex items-center gap-2 text-slate-500 mb-1">
             <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12 7a1 1 0 11-2 0 1 1 0 012 0zm-4 4a1 1 0 100 2h8a1 1 0 100-2H8z" clip-rule="evenodd" /></svg>
             <span class="text-xs">TREND (20)</span>
          </div>
          <div class="text-xl font-bold" 
               [class.text-green-600]="metrics().trend === 'BULLISH'"
               [class.dark:text-green-400]="metrics().trend === 'BULLISH'"
               [class.text-red-600]="metrics().trend === 'BEARISH'"
               [class.dark:text-red-400]="metrics().trend === 'BEARISH'">
            {{ metrics().trend }}
          </div>
        </div>

        <div class="bg-slate-50 dark:bg-slate-900/80 p-3 rounded border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
           <div class="flex items-center gap-2 text-slate-500 mb-1">
             <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
             <span class="text-xs">VOL. INTENSITY</span>
          </div>
          <div class="text-xl font-bold text-slate-800 dark:text-slate-200">
            {{ metrics().volRatio | number:'1.1-1' }}x
          </div>
        </div>
      </div>
      
      <!-- Price Alert Section -->
      <div class="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 relative z-10">
        <h3 class="font-sans font-bold text-xs uppercase text-slate-500 mb-3 tracking-wider flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          PRICE ALERT
        </h3>
        @if (currentAlert(); as alert) {
          <div class="bg-slate-50 dark:bg-slate-900/80 p-3 rounded border border-slate-200 dark:border-slate-800 flex justify-between items-center font-mono">
            <div>
              <span class="text-slate-500 text-sm">Monitoring for price to cross</span>
              <span class="font-bold text-lg text-slate-800 dark:text-slate-200 ml-2">{{ alert.condition === 'ABOVE' ? '>' : '<' }} \${{ alert.targetPrice | number:'1.2-4' }}</span>
            </div>
            <button (click)="clearAlert()" class="font-mono text-xs text-red-500 hover:underline">[CLEAR_ALERT]</button>
          </div>
        } @else {
          <div>
            <div class="flex items-stretch gap-2 font-mono">
              <input 
                #priceInput 
                type="text" 
                placeholder="Enter Price or % (e.g., +5%)"
                (keydown.enter)="setAlert(priceInput.value); priceInput.value = ''"
                class="flex-grow w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-sm px-3 py-2 rounded focus:outline-none focus:border-green-500 dark:focus:border-teal-500 tabular-nums"
              >
              <div class="flex bg-slate-200 dark:bg-slate-800 rounded p-1 border border-slate-300 dark:border-slate-700">
                <button 
                  (click)="alertCondition.set('ABOVE')"
                  class="px-3 py-1 text-xs rounded transition-colors font-bold"
                  [class.bg-green-200]="alertCondition() === 'ABOVE'"
                  [class.dark:bg-teal-800]="alertCondition() === 'ABOVE'"
                  [class.text-green-800]="alertCondition() === 'ABOVE'"
                  [class.dark:text-teal-200]="alertCondition() === 'ABOVE'"
                  [class.text-slate-500]="alertCondition() !== 'ABOVE'"
                >ABOVE</button>
                <button 
                  (click)="alertCondition.set('BELOW')"
                  class="px-3 py-1 text-xs rounded transition-colors font-bold"
                  [class.bg-red-200]="alertCondition() === 'BELOW'"
                  [class.dark:bg-red-800]="alertCondition() === 'BELOW'"
                  [class.text-red-800]="alertCondition() === 'BELOW'"
                  [class.dark:text-red-200]="alertCondition() !== 'BELOW'"
                  [class.text-slate-500]="alertCondition() !== 'BELOW'"
                >BELOW</button>
              </div>
              <button (click)="setAlert(priceInput.value); priceInput.value = ''" class="bg-green-600 dark:bg-teal-500 text-white dark:text-black px-4 rounded text-xs font-bold hover:bg-green-700 dark:hover:bg-teal-400 transition-colors">
                [SET]
              </button>
            </div>
            
            <div class="flex items-center gap-2 mt-2 font-mono">
              <span class="text-[10px] text-slate-500">QUICK SET:</span>
              @for (s of alertSuggestions(); track s.label) {
                <button 
                  (click)="setQuickAlert(s.price, s.condition)"
                  class="px-2 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  {{ s.label }}
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class TokenDetailComponent {
  symbol = input.required<string>();
  isUpdating = input<boolean>(false);
  close = output<void>();

  private stateService = inject(TokenStateService);
  public prefs = inject(UserPrefsService);
  
  alertCondition = signal<'ABOVE' | 'BELOW'>('ABOVE');
  
  // --- Image Error State ---
  imageError = signal(false);

  // Tooltip and chart interaction state
  isTooltipVisible = signal(false);
  tooltipData = signal<{ svgX: number, svgY: number, offsetX: number, offsetY: number, price: number, volume: number, time: number } | null>(null);
  
  chartContainer = viewChild<ElementRef<HTMLDivElement>>('chartContainer');
  tooltipRef = viewChild<ElementRef<HTMLDivElement>>('tooltip');

  constructor() {
    effect(() => {
      // This effect will run whenever the token() signal changes.
      this.token(); // Establish a dependency on the computed signal.
      // Reset the error state for the new token.
      this.imageError.set(false);
    });
  }

  // This is the key change: derive the token reactively from the global state
  token = computed(() => {
    const sym = this.symbol();
    let foundToken: Token | null | undefined;

    if (sym === 'BTC') {
      foundToken = this.stateService.btcToken();
    } else {
      foundToken = this.stateService.tokens().find(t => t.symbol === sym);
    }
    
    // Provide a fallback to prevent crashes if the token is not found.
    return foundToken || this.createFallbackToken(sym);
  });

  private createFallbackToken(symbol: string): Token {
    return { 
      symbol: symbol, 
      name: 'Data not available', 
      price: 0, 
      entryPrice: 0, 
      volume: 0, 
      yield: 0, 
      priceHistory: [], 
      volumeHistory: [], 
      liquidityDepth: 0 
    };
  }

  currentAlert = computed(() => this.stateService.priceAlerts().get(this.token().symbol));

  alertSuggestions = computed(() => {
    const price = this.token().price;
    if (!price || price === 0) return [];
    return [
      { label: '+5%', price: price * 1.05, condition: 'ABOVE' as const },
      { label: '-5%', price: price * 0.95, condition: 'BELOW' as const },
      { label: '+10%', price: price * 1.10, condition: 'ABOVE' as const },
      { label: '-10%', price: price * 0.90, condition: 'BELOW' as const }
    ];
  });

  setAlert(priceStr: string) {
    const value = priceStr.trim();
    if (!value) return;

    let targetPrice: number | null = null;
    let condition = this.alertCondition();
    const currentPrice = this.token().price;

    if (value.endsWith('%')) {
      const percentage = parseFloat(value.slice(0, -1)) / 100;
      if (!isNaN(percentage) && currentPrice > 0) {
        targetPrice = currentPrice * (1 + percentage);
        condition = percentage >= 0 ? 'ABOVE' : 'BELOW';
      }
    } else {
      const parsedPrice = parseFloat(value);
      if (!isNaN(parsedPrice)) {
        targetPrice = parsedPrice;
      }
    }

    if (targetPrice !== null && targetPrice > 0) {
      this.stateService.setPriceAlert(this.token().symbol, targetPrice, condition);
    }
  }

  setQuickAlert(price: number, condition: 'ABOVE' | 'BELOW') {
    this.stateService.setPriceAlert(this.token().symbol, price, condition);
  }

  clearAlert() {
    this.stateService.removePriceAlert(this.token().symbol);
  }

  chartData = computed(() => {
    const history = this.token().priceHistory;
    const volumeHistory = this.token().volumeHistory;
    if (!history || history.length < 2 || !volumeHistory || volumeHistory.length < 2) return null;

    const data = history.map((point, i) => ({
      price: point.value,
      time: point.time,
      volume: volumeHistory[i]?.value || 0,
      index: i
    }));

    const width = 400;
    const height = 200;
    const margin = { top: 10, right: 10, bottom: 20, left: 55 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const priceChartHeight = innerHeight * 0.7;
    const volumeChartHeight = innerHeight * 0.2;
    const gap = innerHeight * 0.1;

    const priceDomain = d3.extent(data, (d: { price: number }) => d.price) as [number, number];
    const volumeDomain = [0, d3.max(data, (d: { volume: number }) => d.volume) as number];
    const timeDomain = [0, data.length - 1];

    const xScale = d3.scaleLinear().domain(timeDomain).range([margin.left, width - margin.right]);
    const priceYScale = d3.scaleLinear().domain(priceDomain).range([margin.top + priceChartHeight, margin.top]);
    const volumeYScale = d3.scaleLinear().domain(volumeDomain).range([height - margin.bottom, height - margin.bottom - volumeChartHeight]);

    const lineGenerator = d3.line<{price: number, index: number}>().x((d) => xScale(d.index)).y((d) => priceYScale(d.price)).curve(d3.curveMonotoneX);
    const areaGenerator = d3.area<{price: number, index: number}>().x((d) => xScale(d.index)).y0(margin.top + priceChartHeight).y1((d) => priceYScale(d.price)).curve(d3.curveMonotoneX);
    
    const barWidth = Math.max(0.5, innerWidth / data.length * 0.7);
    const volumeBars = data.map((d: { volume: number, index: number }) => ({
        x: xScale(d.index) - barWidth / 2,
        y: volumeYScale(d.volume),
        width: barWidth,
        height: (height - margin.bottom) - volumeYScale(d.volume)
    }));

    const priceTicks = priceYScale.ticks(4).map((value: number) => ({ value, y: priceYScale(value) }));
    const volumeTicks = volumeYScale.ticks(2).map((value: number) => ({ value, y: volumeYScale(value) }));
    const timeTicks = xScale.ticks(4).map((index: number) => {
        const i = Math.round(index);
        if (data[i]) return { time: data[i].time, x: xScale(i) };
        return null;
    }).filter((t: any) => t !== null) as {time: number, x: number}[];

    const priceTitleY = margin.top + priceChartHeight / 2;
    const volumeTitleY = height - margin.bottom - volumeChartHeight / 2;
    const axisTitleX = 15;

    return {
      width, height, margin,
      linePath: lineGenerator(data.map(d => ({price: d.price, index: d.index}))) || '',
      areaPath: areaGenerator(data.map(d => ({price: d.price, index: d.index}))) || '',
      volumeBars,
      xScale, priceYScale,
      fullData: data,
      priceTicks, volumeTicks, timeTicks,
      dividerLineY: margin.top + priceChartHeight + gap / 2,
      axisTitles: {
          price: {
              x: -priceTitleY,
              y: axisTitleX,
          },
          volume: {
              x: -volumeTitleY,
              y: axisTitleX,
          }
      }
    };
  });

  tooltipPosition = computed(() => {
    const tt = this.tooltipData();
    const chartEl = this.chartContainer()?.nativeElement;
    if (!tt || !chartEl) {
        const defaultLeft = chartEl ? chartEl.getBoundingClientRect().width / 2 : 0;
        const defaultTop = chartEl ? chartEl.getBoundingClientRect().height / 2 : 0;
        return { left: `${defaultLeft}px`, top: `${defaultTop}px`, opacity: 0, transform: 'scale(0.9) translateY(-10px)' };
    }
    
    const tooltipEl = this.tooltipRef()?.nativeElement;
    if (!tooltipEl) return { left: '0px', top: '0px', opacity: 0, transform: 'scale(0.9) translateY(-10px)'};

    const chartRect = chartEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();
    
    let left = tt.offsetX + 15;
    let top = tt.offsetY - (tooltipRect.height / 2); // Center vertically on pointer

    // Adjust position to prevent going off-screen
    if (left + tooltipRect.width > chartRect.width) {
      left = tt.offsetX - tooltipRect.width - 15;
    }
    if (top + tooltipRect.height > chartRect.height) {
      top = chartRect.height - tooltipRect.height;
    }
    if (top < 0) top = 0;

    return {
      left: `${left}px`,
      top: `${top}px`,
      opacity: this.isTooltipVisible() ? 1 : 0,
      transform: this.isTooltipVisible() ? 'scale(1) translateY(0px)' : 'scale(0.9) translateY(-10px)'
    };
  });


  onChartHover(event: MouseEvent) {
    const data = this.chartData();
    if (!data || data.fullData.length === 0) return;

    const chartEl = event.currentTarget as HTMLElement;
    const bounds = chartEl.getBoundingClientRect();
    
    const svgX = (event.offsetX / bounds.width) * data.width;

    const index = Math.min(data.fullData.length -1, Math.max(0, Math.round(data.xScale.invert(svgX))));
    const pointData = data.fullData[index];

    if (pointData) {
      const xPos = data.xScale(pointData.index);
      const yPos = data.priceYScale(pointData.price);
      
      this.isTooltipVisible.set(true);
      this.tooltipData.set({
        svgX: xPos,
        svgY: yPos,
        offsetX: event.offsetX,
        offsetY: event.offsetY,
        price: pointData.price,
        volume: pointData.volume,
        time: pointData.time
      });
    }
  }

  onChartLeave() {
    this.isTooltipVisible.set(false);
  }

  metrics = computed(() => {
    const t = this.token();
    const priceHistoryValues = t.priceHistory.map(p => p.value);
    const volumeHistoryValues = t.volumeHistory.map(p => p.value);

    const rsiVal = MathUtils.rsi(priceHistoryValues, 14) || 50;
    const vol = MathUtils.stdDev(priceHistoryValues.slice(-20)) / t.price;
    const sma20 = MathUtils.sma(priceHistoryValues, 20);
    const trend = sma20 && t.price > sma20 ? 'BULLISH' : 'BEARISH';
    const volSma = MathUtils.sma(volumeHistoryValues, 20) || 1;
    const volRatio = t.volume / volSma;

    return { rsi: rsiVal, volatility: vol, trend, volRatio };
  });

  formatVolume(num: number): string {
    if (num >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1_000) {
      return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toFixed(0);
  }
}