import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../services/notification.service';
import { AlgorithmIconComponent } from './algorithm-icon.component';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule, AlgorithmIconComponent],
  template: `
    <div class="fixed top-44 right-4 z-[45] flex flex-col items-end gap-3 w-80">
      @for (notification of notifications(); track notification.id) {
        <div class="w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl p-4 toast-enter cygnus-border flex items-start gap-4"
             [class.border-l-4]="true"
             [class.border-l-green-500]="notification.type === 'success'"
             [class.dark:border-l-teal-500]="notification.type === 'success'"
             [class.border-l-red-500]="notification.type === 'danger'"
             [class.dark:border-l-red-500]="notification.type === 'danger'"
             [class.border-l-yellow-500]="notification.type === 'warning'"
             [class.dark:border-l-amber-500]="notification.type === 'warning'"
             [class.border-l-blue-500]="notification.type === 'info'"
             [class.dark:border-l-sky-500]="notification.type === 'info'"
        >
            <!-- Icon -->
            <div class="flex-shrink-0 w-6 h-6 mt-1" 
                 [class.text-green-500]="notification.type === 'success'"
                 [class.dark:text-teal-400]="notification.type === 'success'"
                 [class.text-red-500]="notification.type === 'danger'"
                 [class.dark:text-red-400]="notification.type === 'danger'"
                 [class.text-yellow-500]="notification.type === 'warning'"
                 [class.dark:text-amber-400]="notification.type === 'warning'"
                 [class.text-blue-500]="notification.type === 'info'"
                 [class.dark:text-sky-400]="notification.type === 'info'"
            >
              @if(notification.icon !== 'INFO') {
                 <app-algorithm-icon [name]="notification.icon" />
              } @else {
                  <svg class="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>
              }
            </div>

            <!-- Content -->
            <div class="flex-grow">
              <h4 class="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">{{ notification.title }}</h4>
              <p class="font-mono text-xs text-slate-600 dark:text-slate-400 mt-1">{{ notification.message }}</p>
            </div>
          
            <!-- Close Button -->
            <button (click)="notificationService.remove(notification.id)" class="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
            </button>
        </div>
      }
    </div>
  `
})
export class NotificationListComponent {
  notificationService = inject(NotificationService);
  notifications = this.notificationService.notifications;
}