import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
      <!-- Head -->
      <path d="M12 2 L14 7 L12 9 L10 7 Z" />
      <!-- Wings -->
      <path d="M12 8 L2 14 L12 22 L22 14 Z" />
    </svg>
  `
})
export class LogoComponent {}