import { Component, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerformanceTrackerService } from '../services/performance-tracker.service';
import { SignalType, AlgoIconType } from '../services/types';
import { AlgorithmIconComponent } from './algorithm-icon.component';

@Component({
  selector: 'app-performance-dashboard',
  standalone: true,
  imports: [CommonModule, AlgorithmIconComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-black/80 backdrop-blur-sm p-4" (click)="close.emit()">
      <div class="w-full max-w-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-lg flex flex-col max-h-[90vh] relative cygnus-border" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-t-lg">
          <div>
            <h3 class="text-slate-600 dark:text-slate-400 font-bold font-sans text-sm uppercase tracking-widest flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-emerald-500">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
               </svg>
               ALGORITHM PERFORMANCE AUDIT
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">LIVE VALIDATION REPORT (RESOLVED AFTER 5 TICKS)</p>
          </div>
          <button (click)="close.emit()" class="text-slate-500 hover:text-red-500 transition-colors font-mono text-sm">
            [CLOSE_REPORT]
          </button>
        </div>

        <!-- Content -->
        <div class="overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-950">
          <table class="w-full text-left text-sm font-mono">
            <thead class="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="px-4 py-3">Algorithm</th>
                <th class="px-4 py-3 text-center">Win Rate</th>
                <th class="px-4 py-3 text-center">Trades</th>
                <th class="px-4 py-3 text-right">Avg. Return</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (stat of stats(); track stat.type) {
                <tr class="group hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors">
                  <td class="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                    <div class="flex items-center gap-3">
                      <app-algorithm-icon [name]="getIconForSignal(stat.type)" class="w-4 h-4" 
                        [class.text-green-600]="stat.winRate >= 50" [class.dark:text-teal-400]="stat.winRate >= 50"
                        [class.text-red-500]="stat.winRate < 50" [class.dark:text-red-400]="stat.winRate < 50"
                      />
                      <span class="font-bold">{{ formatType(stat.type) }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-center tabular-nums">
                    <span class="font-bold text-lg" 
                      [class.text-green-600]="stat.winRate >= 50" [class.dark:text-teal-400]="stat.winRate >= 50"
                      [class.text-red-500]="stat.winRate < 50" [class.dark:text-red-400]="stat.winRate < 50"
                    >
                      {{ stat.winRate | number:'1.1-1' }}%
                    </span>
                    <span class="text-xs text-slate-500 ml-1"> ({{ stat.wins }}/{{ stat.losses }})</span>
                  </td>
                  <td class="px-4 py-3 text-center text-slate-500 tabular-nums">
                    {{ stat.totalSignals }}
                  </td>
                  <td class="px-4 py-3 text-right tabular-nums font-bold"
                    [class.text-green-600]="stat.averageReturn >= 0" [class.dark:text-teal-400]="stat.averageReturn >= 0"
                    [class.text-red-500]="stat.averageReturn < 0" [class.dark:text-red-400]="stat.averageReturn < 0"
                  >
                    {{ stat.averageReturn >= 0 ? '+' : '' }}{{ stat.averageReturn | number:'1.2-2' }}%
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="text-center p-8 text-slate-500 dark:text-slate-600">
                    <p class="text-sm font-semibold tracking-wider opacity-70">AWAITING SIGNAL RESOLUTION</p>
                    <p class="text-xs mt-2">Performance data will populate as signals are generated and outcomes are observed.</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        
        <!-- Footer -->
        <div class="p-2 border-t border-slate-200 dark:border-slate-800 text-center bg-slate-50 dark:bg-slate-900/50">
          <button (click)="performanceTracker.resetStats()" class="font-mono text-xs text-red-500 hover:underline">[RESET_AUDIT_DATA]</button>
        </div>

      </div>
    </div>
  `
})
export class PerformanceDashboardComponent {
  performanceTracker = inject(PerformanceTrackerService);
  close = output<void>();

  stats = computed(() => {
    const map = this.performanceTracker.stats();
    return Array.from(map.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.totalSignals - a.totalSignals);
  });

  formatType(type: string): string {
    return type.replace(/_/g, ' ');
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
}