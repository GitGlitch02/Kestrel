import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserPrefsService } from '../services/user-prefs.service';

const SEGMENT_COUNT = 12;

@Component({
  selector: 'app-sync-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-3 font-mono">
      <div class="text-right hidden md:block w-28">
        <div class="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Next Pulse</div>
        <div class="text-xs font-bold text-green-600 dark:text-teal-400 leading-none mt-1 min-h-[12px] tabular-nums">
          @if (isUpdating()) {
            <span class="animate-pulse">ACQUIRING...</span>
          } @else {
            <span>AWAITING PULSE</span>
          }
        </div>
      </div>

      <!-- Radial Progress - Polished "Circle 12" Style -->
      <div class="relative w-8 h-8 flex items-center justify-center">
        <svg class="w-full h-full" viewBox="0 0 32 32">
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <!-- Static Segments -->
          @for(segment of segments; track segment.index) {
            <path 
              d="M 15.5 2 L 16.5 2 L 17 7 L 15 7 Z"
              [attr.transform]="'rotate(' + segment.rotation + ' 16 16)'"
              class="transition-colors duration-300"
              [class.fill-green-500]="progress() >= segment.threshold && !isUpdating()"
              [class.dark:fill-teal-400]="progress() >= segment.threshold && !isUpdating()"
              [attr.filter]="(progress() >= segment.threshold && !isUpdating() && !prefs.reducedMotion()) ? 'url(#glow)' : null"
              [class.fill-slate-200]="progress() < segment.threshold && !isUpdating()"
              [class.dark:fill-slate-800]="progress() < segment.threshold && !isUpdating()"
              [class.fill-slate-300]="isUpdating()"
              [class.dark:fill-slate-700]="isUpdating()"
              [class.opacity-50]="isUpdating()"
            />
          }

          <!-- Animated Chaser on Update -->
          @if(isUpdating() && !prefs.reducedMotion()) {
            <path 
                d="M 15.5 2 L 16.5 2 L 17 7 L 15 7 Z"
                class="fill-green-400 dark:fill-teal-300"
                [attr.filter]="!prefs.reducedMotion() ? 'url(#glow)' : null"
            >
                <animateTransform 
                    attributeName="transform"
                    type="rotate"
                    from="0 16 16"
                    to="360 16 16"
                    dur="1.2s"
                    repeatCount="indefinite"
                />
            </path>
          }
        </svg>
        
        <!-- Center Dot/Pulse -->
        <div class="absolute inset-0 flex items-center justify-center">
           <div 
             class="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-teal-400"
             [class.animate-ping]="isUpdating()"
             [class.animate-heartbeat]="!isUpdating() && !prefs.reducedMotion()"
           ></div>
        </div>
      </div>
    </div>
  `
})
export class SyncIndicatorComponent {
  progress = input.required<number>(); // 0 to 100
  isUpdating = input.required<boolean>();

  public prefs = inject(UserPrefsService);

  segments = Array.from({ length: SEGMENT_COUNT }, (_, i) => ({
    index: i,
    rotation: i * (360 / SEGMENT_COUNT),
    threshold: (i + 1) * (100 / SEGMENT_COUNT)
  }));
}