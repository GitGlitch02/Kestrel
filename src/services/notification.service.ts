import { Injectable, signal } from '@angular/core';
import { Notification, AlgoIconType } from './types';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  readonly notifications = signal<Notification[]>([]);
  private readonly NOTIFICATION_TTL = 6000; // 6 seconds

  show(title: string, message: string, type: 'success' | 'info' | 'warning' | 'danger', icon: AlgoIconType | 'INFO') {
    const newNotification: Notification = {
      id: Date.now(),
      title,
      message,
      type,
      icon
    };

    this.notifications.update(current => {
        // Limit to 3 notifications on screen at once for usability
        const limited = current.slice(0, 2); 
        return [newNotification, ...limited];
    });

    setTimeout(() => {
      this.remove(newNotification.id);
    }, this.NOTIFICATION_TTL);
  }

  remove(id: number) {
    this.notifications.update(current => current.filter(n => n.id !== id));
  }
}