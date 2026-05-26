import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocalNarrativeService } from '../services/local-narrative.service';
import { TokenStateService } from '../services/token-state.service';
import { UserPrefsService } from '../services/user-prefs.service';
import { GeminiService } from '../services/gemini.service';
import { GroundingChunk } from '../services/types';

@Component({
  selector: 'app-intel-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col cygnus-border bg-white dark:bg-slate-900/50 p-4 rounded-lg transition-all duration-300">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-slate-600 dark:text-slate-400 font-bold font-sans text-sm uppercase tracking-widest flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-teal-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          KESTREL TERMINAL INTEL
        </h2>
        <div class="flex items-center gap-2">
           @if (loading()) {
             <div class="w-2 h-2 bg-green-500 dark:bg-teal-400 rounded-full" [class.animate-ping]="!prefs.reducedMotion()"></div>
           }
           <span class="text-xs text-slate-500">KESTREL-SYNTH-V1 {{ prefs.dataSourceMode() === 'SIMULATION' ? '(SIMULATED)' : '' }}</span>
        </div>
      </div>

      <div class="flex-grow font-mono text-sm leading-relaxed text-slate-800 dark:text-slate-300 overflow-y-auto pr-2">
        @if (narrative()) {
          <div class="border-l-2 border-green-600/20 dark:border-teal-400/20 pl-3">
            <p>{{ narrative() }}</p>
          </div>
        } @else {
          <p class="text-slate-500 dark:text-slate-600" [class.animate-pulse]="!prefs.reducedMotion()">Synthesizing market narrative...</p>
        }
      </div>
      
      @if(sources().length > 0) {
        <div class="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] font-mono">
          <span class="text-slate-500 uppercase">Sources (via Google Search):</span>
          <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            @for(source of sources(); track source.web.uri; let i = $index) {
              <a [href]="source.web.uri" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                <span>[{{ i + 1 }}] {{ source.web.title }}</span>
              </a>
            }
          </div>
        </div>
      }
      
      <div class="mt-4 pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-xs text-slate-500">
        <span>STATUS: {{ loading() ? 'COMPUTING' : 'ONLINE' }}</span>
        <div class="flex gap-4">
           <button (click)="refreshIntel()" class="hover:text-green-600 dark:hover:text-teal-400 transition-colors">[REFRESH]</button>
        </div>
      </div>
    </div>
  `
})
export class IntelPanelComponent {
  private localNarrative = inject(LocalNarrativeService);
  private state = inject(TokenStateService);
  public prefs = inject(UserPrefsService);
  private gemini = inject(GeminiService);

  narrative = signal<string>('');
  sources = signal<GroundingChunk[]>([]);
  loading = signal<boolean>(false);

  constructor() {
    // Initial fetch
    this.refreshIntel();
  }

  async refreshIntel() {
    if (this.loading()) return;
    
    this.loading.set(true);
    this.narrative.set('');
    this.sources.set([]);
    
    // Trigger async signals check (e.g., NEWS_SPIKE)
    this.state.triggerAsyncSignalGeneration();

    try {
      let result;
      if (this.prefs.dataSourceMode() === 'SIMULATION') {
        // Simulate a slight delay for the local "LLM"
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
        result = this.localNarrative.generateMarketNarrative(
          this.state.tokens(),
          this.state.marketRegime(),
          this.state.activeSignals()
        );
      } else {
        result = await this.gemini.generateMarketNarrative(
          this.state.tokens(),
          this.state.marketRegime(),
          this.state.activeSignals(),
          this.prefs.useSearchGrounding()
        );
      }
      this.narrative.set(result.narrative);
      this.sources.set(result.sources);
    } catch (err) {
      this.narrative.set("ERR: SYNTH_FAILURE");
      this.sources.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}