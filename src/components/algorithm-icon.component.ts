import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlgoIconType } from '../services/types';

@Component({
  selector: 'app-algorithm-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    @switch (name()) {
      @case ('BURST_HUNTER') {
        <svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.5 L13 6 L16.5 5.5 L16 8.5 L19.5 9 L18 12 L19.5 15 L16 15.5 L16.5 18.5 L13 18 L12 21.5 L11 18 L7.5 18.5 L8 15.5 L4.5 15 L6 12 L4.5 9 L8 8.5 L7.5 5.5 L11 6 Z" />
        </svg>
      }
      @case ('VOLATILITY_SQUEEZE') {
        <svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 12l5 5V7l-5 5zm11-5v10l5-5-5-5z" />
        </svg>
      }
      @case ('GAIN_LOCK') {
        <svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
        </svg>
      }
      @case ('TREND_VECTOR') {
        <svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.09-4-4L2 17.08l1.5 1.41z"/>
        </svg>
      }
      @case ('HYPE_PULSE') {
        <svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 13h2l2-8 2 14 3-10 3 5h5v-2H17l-3-5-3 10-2-14-2 8H2z" />
        </svg>
      }
      @case ('PATTERN_SCANNER') {
        <svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L4.5 6.5v9L12 20l7.5-4.5v-9L12 2zm0 2.69L17.5 8v2.1l-5.5 3.19L6.5 10.1V8l5.5-3.31zM6.5 12.81L12 16l5.5-3.19V14l-5.5 3.19L6.5 14v-1.19z"/>
        </svg>
      }
      @case ('STABLE_ANCHOR') {
        <svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
           <path d="M12,2A2,2 0 1,1 10,4A2,2 0 0,1 12,2M12,5.5V14.2C10.5,14.2 8.7,15 8.4,16.5C8,18 9.3,19 10.5,19C11.1,19 12,18.7 12,18.7V22H13V18.7C13,18.7 13.9,19 14.5,19C15.7,19 17,18 16.6,16.5C16.3,15 14.5,14.2 13,14.2V5.5H12Z" />
        </svg>
      }
      @case ('VENUE_SHIELD') {
        <svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
        </svg>
      }
      @case ('JERRY_REVERSION') {
         <svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 12 H22" opacity="0.5"/>
          <path d="M4 12 C 8 18, 12 18, 16 13" />
        </svg>
      }
      @case ('NEWS_SPIKE') {
         <svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
           <path d="M4.43,10.05c-0.27,0-0.53-0.1-0.74-0.31c-0.42-0.42-0.42-1.1,0-1.52L5.8,6.11c0.42-0.42,1.1-0.42,1.52,0 c0.42,0.42,0.42,1.1,0,1.52L5.17,9.74C4.96,9.95,4.7,10.05,4.43,10.05z M20.43,14.79l-8.54,8.54c-1.56,1.56-4.09,1.56-5.66,0 l-5.66-5.66c-1.56-1.56-1.56-4.09,0-5.66l8.54-8.54c0.78-0.78,1.8-1.17,2.83-1.17s2.05,0.39,2.83,1.17l5.66,5.66 c1.56,1.56,1.56,4.09,0,5.66z M12.61,10.33c-0.27,0-0.53-0.1-0.74-0.31L8.7,6.85c-0.42-0.42-0.42-1.1,0-1.52 c0.42-0.42,1.1-0.42,1.52,0l3.18,3.18c0.42,0.42,0.42,1.1,0,1.52C13.14,10.23,12.88,10.33,12.61,10.33z M18.3,16.02 c-0.27,0-0.53-0.1-0.74-0.31l-3.18-3.18c-0.42-0.42-0.42-1.1,0-1.52c0.42-0.42,1.1-0.42,1.52,0l3.18,3.18 c0.42,0.42,0.42,1.1,0,1.52C18.83,15.92,18.56,16.02,18.3,16.02z"/>
         </svg>
      }
    }
  `
})
export class AlgorithmIconComponent {
  name = input.required<AlgoIconType>();
}