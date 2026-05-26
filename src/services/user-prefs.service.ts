import { Injectable, signal } from '@angular/core';
import { SignalType } from './types';

export type WidgetId = 'INTEL' | 'MARKET' | 'SIGNALS' | null;
export type DataSourceMode = 'SIMULATION' | 'LIVE';
export type ApiProvider = 'COINGECKO' | 'COINMARKETCAP';
export type WebSocketProvider = 'COINCAP' | 'BITSTAMP';
export type RefreshRate = 'HYPER' | 'AGGRESSIVE' | 'STANDARD' | 'SAFE'; // 5s, 30s, 60s, 120s
export type AppTheme = 'DARK' | 'MONOKAI' | 'ARCTIC' | 'EMBER';
export type TimeFormat = '12H' | '24H';

const WATCHLIST_ORDER_KEY = 'cygnus_watchlist_order';
const COINMARKETCAP_API_KEY_KEY = 'cygnus_cmc_api_key';
const NOTIFICATIONS_ENABLED_KEY = 'cygnus_notifications_enabled';
const NOTIFICATION_CONFIDENCE_THRESHOLD_KEY = 'cygnus_notif_confidence_threshold';
const DISABLED_SIGNAL_TYPES_NOTIFICATIONS_KEY = 'cygnus_disabled_signal_types_notifs';

@Injectable({
  providedIn: 'root'
})
export class UserPrefsService {
  // Cognitive Settings
  readonly reducedMotion = signal<boolean>(false);
  
  // Appearance Settings
  readonly theme = signal<AppTheme>(this.loadString('cygnus_theme', 'DARK') as AppTheme);
  readonly timeFormat = signal<TimeFormat>('24H');
  readonly showSeconds = signal<boolean>(true);
  readonly blinkingColon = signal<boolean>(false);
  
  // Data Settings
  readonly dataSourceMode = signal<DataSourceMode>(this.loadString('cygnus_data_source_mode', 'LIVE') as DataSourceMode);
  readonly apiProvider = signal<ApiProvider>('COINGECKO');
  readonly webSocketProvider = signal<WebSocketProvider>('COINCAP');
  readonly refreshRate = signal<RefreshRate>('STANDARD');
  readonly coinMarketCapApiKey = signal<string>(this.loadString(COINMARKETCAP_API_KEY_KEY, ''));
  readonly useSearchGrounding = signal<boolean>(false);

  // Notification Settings
  readonly notificationsEnabled = signal<boolean>(this.loadBoolean(NOTIFICATIONS_ENABLED_KEY, true));
  readonly notificationConfidenceThreshold = signal<number>(this.loadNumber(NOTIFICATION_CONFIDENCE_THRESHOLD_KEY, 0));
  readonly disabledSignalTypesForNotifications = signal<Set<SignalType>>(this.loadSet<SignalType>(DISABLED_SIGNAL_TYPES_NOTIFICATIONS_KEY));
  
  // Layout State (Focus Mode)
  readonly focusedWidget = signal<WidgetId>(null);
  
  // Watchlist State
  readonly watchlistOrder = signal<string[]>(this.loadArray<string>(WATCHLIST_ORDER_KEY));

  // --- Loaders with Type Safety ---
  private loadString(key: string, defaultValue: string): string {
    try {
      return localStorage.getItem(key) || defaultValue;
    } catch (e) {
      console.error(`Failed to load string from localStorage for key "${key}"`, e);
      return defaultValue;
    }
  }

  private loadBoolean(key: string, defaultValue: boolean): boolean {
    try {
      const stored = localStorage.getItem(key);
      return stored ? stored === 'true' : defaultValue;
    } catch (e) {
      console.error(`Failed to load boolean from localStorage for key "${key}"`, e);
      return defaultValue;
    }
  }

  private loadNumber(key: string, defaultValue: number): number {
    try {
      const stored = localStorage.getItem(key);
      return stored ? parseInt(stored, 10) : defaultValue;
    } catch (e) {
      console.error(`Failed to load number from localStorage for key "${key}"`, e);
      return defaultValue;
    }
  }

  private loadArray<T>(key: string): T[] {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error(`Failed to load array from localStorage for key "${key}"`, e);
      return [];
    }
  }
  
  private loadSet<T>(key: string): Set<T> {
    try {
      const stored = localStorage.getItem(key);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch(e) {
      console.error(`Failed to load Set from localStorage for key "${key}"`, e);
      return new Set();
    }
  }

  // --- Savers ---
  private save(key: string, value: string | number | boolean) {
    try {
      localStorage.setItem(key, String(value));
    } catch (e) {
      console.error(`Failed to save to localStorage for key "${key}"`, e);
    }
  }
  
  private saveArray<T>(key: string, value: T[]) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to save array to localStorage for key "${key}"`, e);
    }
  }
  
  private saveSet<T>(key: string, value: Set<T>) {
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(value)));
    } catch (e) {
      console.error(`Failed to save Set to localStorage for key "${key}"`, e);
    }
  }

  // --- Watchlist Order Persistence ---
  saveWatchlistOrder(symbols: string[]) {
    this.saveArray(WATCHLIST_ORDER_KEY, symbols);
    this.watchlistOrder.set(symbols);
  }

  // --- Other Methods ---
  toggleMotion() {
    this.reducedMotion.update(v => !v);
  }

  setTheme(theme: AppTheme) {
    this.theme.set(theme);
    this.save('cygnus_theme', theme);
  }

  setTimeFormat(format: TimeFormat) {
    this.timeFormat.set(format);
  }

  toggleShowSeconds() {
    this.showSeconds.update(v => !v);
  }

  toggleBlinkingColon() {
    this.blinkingColon.update(v => !v);
  }

  setDataSourceMode(mode: DataSourceMode) {
    this.dataSourceMode.set(mode);
    this.save('cygnus_data_source_mode', mode);
  }

  setApiProvider(provider: ApiProvider) {
    this.apiProvider.set(provider);
  }

  setWebSocketProvider(provider: WebSocketProvider) {
    this.webSocketProvider.set(provider);
  }

  setRefreshRate(rate: RefreshRate) {
    this.refreshRate.set(rate);
  }

  setCoinMarketCapApiKey(key: string) {
    this.coinMarketCapApiKey.set(key);
    this.save(COINMARKETCAP_API_KEY_KEY, key);
  }
  
  toggleSearchGrounding() {
    this.useSearchGrounding.update(v => !v);
  }

  setFocus(widgetId: WidgetId) {
    this.focusedWidget.update(current => current === widgetId ? null : widgetId);
  }

  clearFocus() {
    this.focusedWidget.set(null);
  }

  // --- Notification Preferences ---
  toggleNotifications() {
    this.notificationsEnabled.update(v => {
      const newValue = !v;
      this.save(NOTIFICATIONS_ENABLED_KEY, newValue);
      return newValue;
    });
  }

  setNotificationConfidenceThreshold(threshold: number) {
    this.notificationConfidenceThreshold.set(threshold);
    this.save(NOTIFICATION_CONFIDENCE_THRESHOLD_KEY, threshold);
  }
  
  setSignalTypeNotification(signalType: SignalType, enabled: boolean) {
    this.disabledSignalTypesForNotifications.update(currentSet => {
      const newSet = new Set(currentSet);
      if (enabled) {
        newSet.delete(signalType);
      } else {
        newSet.add(signalType);
      }
      this.saveSet(DISABLED_SIGNAL_TYPES_NOTIFICATIONS_KEY, newSet);
      return newSet;
    });
  }
  
  toggleSignalTypeNotification(signalType: SignalType) {
    const isDisabled = this.disabledSignalTypesForNotifications().has(signalType);
    this.setSignalTypeNotification(signalType, isDisabled);
  }
}