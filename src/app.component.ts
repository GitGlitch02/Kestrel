import { Component, inject, signal, computed, effect, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { TokenStateService } from './services/token-state.service';
import { MarketDataService, TokenDefinition } from './services/market-data.service';
import { UserPrefsService, WidgetId } from './services/user-prefs.service';
import { Token, SignalType, AlgoIconType } from './services/types';
import { IntelPanelComponent } from './components/intel-panel.component';
import { MarketGridComponent } from './components/market-grid.component';
import { SignalFeedComponent } from './components/signal-feed.component';
import { TokenDetailComponent } from './components/token-detail.component';
import { SyncIndicatorComponent } from './components/sync-indicator.component';
import { LogoComponent } from './components/logo.component';
import { AlgorithmDocsComponent } from './components/algorithm-docs.component';
import { AlgorithmIconComponent } from './components/algorithm-icon.component';
import { PerformanceDashboardComponent } from './components/performance-dashboard.component';
import { NotificationListComponent } from './components/notification-list.component';
import { WebSocketService } from './services/web-socket.service';
import { LiveDataSource } from './services/data-sources/live-data.source';
import { SimulationDataSource } from './services/data-sources/simulation-data.source';
import { PerformanceTrackerService } from './services/performance-tracker.service';

type SettingsTab = 'DATA' | 'INTERFACE' | 'SYSTEM' | 'NOTIFICATIONS' | 'ACCESSIBILITY';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    IntelPanelComponent,
    MarketGridComponent,
    SignalFeedComponent,
    TokenDetailComponent,
    SyncIndicatorComponent,
    LogoComponent,
    AlgorithmDocsComponent,
    AlgorithmIconComponent,
    PerformanceDashboardComponent,
    NotificationListComponent
  ],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnDestroy {
  public stateService = inject(TokenStateService);
  private dataService = inject(MarketDataService);
  public prefs = inject(UserPrefsService);
  private document = inject(DOCUMENT) as Document;
  private elementRef = inject(ElementRef);
  private webSocketService = inject(WebSocketService);
  private liveDataSource = inject(LiveDataSource);
  private simulationDataSource = inject(SimulationDataSource);
  
  // Expose signals for template
  tokens = this.stateService.tokens;
  regime = this.stateService.marketRegime;
  activeSignals = this.stateService.filteredSignals;
  selectedTokenSymbol = this.stateService.selectedTokenSymbol;
  marketSummary = this.stateService.marketSummary;
  
  btcReference = computed(() => {
    const btc = this.stateService.btcToken();
    if (!btc) return null;
    return {
      price: btc.price,
      change24h: btc.change24h ?? 0
    };
  });

  // Heartbeat Signals
  timerProgress = this.dataService.timerProgress;
  isUpdating = this.dataService.isUpdating;
  
  // Data Source Status
  webSocketStatus = this.webSocketService.status;
  apiStatus = this.liveDataSource.apiStatus;

  // Real-time clock
  currentTime = signal(new Date());
  private clockInterval: any;

  webSocketLinkStatus = computed(() => {
    const wsStatus = this.webSocketStatus();
    const provider = this.prefs.webSocketProvider();
    const providerName = provider === 'COINCAP' ? 'CoinCap' : 'Bitstamp';

    switch (wsStatus) {
      case 'CONNECTED':
        return { text: 'LIVE', color: 'text-blue-500 dark:text-blue-400', dotColor: 'bg-blue-500', pulse: true, title: `Receiving real-time price updates from ${providerName} via WebSocket.` };
      case 'CONNECTING':
        return { text: 'CONN...', color: 'text-yellow-600 dark:text-amber-400', dotColor: 'bg-yellow-500 dark:bg-amber-500', pulse: true, title: `Attempting to establish ${providerName} WebSocket connection.` };
      case 'ERROR':
        return { text: 'ERROR', color: 'text-red-500', dotColor: 'bg-red-500', pulse: true, title: `${providerName} WebSocket connection error.` };
      default:
        return { text: 'OFFLINE', color: 'text-slate-500', dotColor: 'bg-slate-500', pulse: false, title: `${providerName} WebSocket is disconnected.` };
    }
  });

  apiLinkStatus = computed(() => {
    const apiStatus = this.apiStatus();
    const provider = this.prefs.apiProvider();
    const providerName = provider === 'COINGECKO' ? 'CoinGecko' : 'CoinMarketCap';
    const cmcKey = this.prefs.coinMarketCapApiKey();

    if (provider === 'COINMARKETCAP' && !cmcKey.trim()) {
      return { text: 'KEY MISSING', color: 'text-yellow-600 dark:text-amber-400', dotColor: 'bg-yellow-500 dark:bg-amber-500', pulse: false, title: 'Please enter a CoinMarketCap API key in System Config.' };
    }

    if(this.isUpdating()) {
        return { text: 'FETCHING', color: 'text-purple-500 dark:text-purple-400', dotColor: 'bg-purple-500', pulse: true, title: `Fetching latest market data from ${providerName} via API.` };
    }
    switch (apiStatus) {
      case 'SUCCESS':
        return { text: 'OK', color: 'text-green-500 dark:text-teal-400', dotColor: 'bg-green-500 dark:bg-teal-500', pulse: false, title: `Last ${providerName} API poll was successful.` };
      case 'ERROR':
        return { text: 'FAIL', color: 'text-red-500', dotColor: 'bg-red-500', pulse: false, title: `Last ${providerName} API poll failed.` };
      default: // IDLE
        return { text: 'IDLE', color: 'text-slate-500', dotColor: 'bg-slate-500', pulse: false, title: `${providerName} API is idle, awaiting next poll.` };
    }
  });

  dataLinkStatus = computed(() => {
    const mode = this.prefs.dataSourceMode();
    if (mode === 'SIMULATION') {
      return { text: 'SIMULATION', color: 'text-green-500 dark:text-teal-400', dotColor: 'bg-green-500 dark:bg-teal-500', pulse: false, title: 'Using internal simulated market data.' };
    }
    // Fallback for any other modes or unexpected states
    return { text: 'OFFLINE', color: 'text-slate-500', dotColor: 'bg-slate-500', pulse: false, title: 'Data source is offline or not yet connected.' };
  });

  terminalId = Math.random().toString(36).substring(7).toUpperCase();

  // Modal States
  showSettings = signal(false);
  activeSettingsTab = signal<SettingsTab>('DATA');
  showDocs = signal(false);
  showPerformanceAudit = signal(false);
  showWatchlistEditor = signal(false);
  
  // BTC Detail Modal State
  showBtcDetail = signal(false);
  isFetchingBtcDetail = signal(false);

  // Watchlist Editor State
  tokenSearchTerm = signal('');
  tokenSuggestions = signal<TokenDefinition[]>([]);
  isSearching = signal(false);
  private searchTimeout: any;
  private draggedSymbol: string | null = null;
  
  // API Key State
  apiKeySaved = signal(false);
  private apiKeySaveTimeout: any;
  cmcApiKeyValidation = signal<'VALID' | 'INVALID' | 'UNTESTED'>('UNTESTED');
  private readonly CMC_API_KEY_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  // Notification settings UI
  public readonly configurableSignalTypes: { type: SignalType; name: string; icon: AlgoIconType }[] = [
    { type: SignalType.BURST_HUNTER, name: 'Burst Hunter', icon: 'BURST_HUNTER' },
    { type: SignalType.VOLATILITY_SQUEEZE, name: 'Volatility Squeeze', icon: 'VOLATILITY_SQUEEZE' },
    { type: SignalType.NEWS_SPIKE, name: 'News Spike', icon: 'NEWS_SPIKE' },
    { type: SignalType.GAIN_LOCK, name: 'Gain Lock', icon: 'GAIN_LOCK' },
    { type: SignalType.TREND_VECTOR, name: 'Trend Vector', icon: 'TREND_VECTOR' },
    { type: SignalType.HYPE_PULSE_BUY, name: 'Hype Pulse', icon: 'HYPE_PULSE' },
    { type: SignalType.SUPPORT_BOUNCE, name: 'Support Bounce', icon: 'PATTERN_SCANNER' },
    { type: SignalType.STABLE_ANCHOR, name: 'Stable Anchor', icon: 'STABLE_ANCHOR' },
    { type: SignalType.VENUE_SHIELD, name: 'Venue Shield', icon: 'VENUE_SHIELD' },
    { type: SignalType.JERRY_REVERSION, name: 'Jerry Reversion', icon: 'JERRY_REVERSION' },
  ];

  constructor() {
    // Instantiate it for its side effects
    inject(PerformanceTrackerService);

    effect(() => {
      const theme = this.prefs.theme();
      const isDark = theme === 'DARK' || theme === 'MONOKAI' || theme === 'EMBER';
      this.document.documentElement.classList.toggle('dark', isDark);

      // Clean up all possible theme classes
      this.document.documentElement.classList.remove('monokai', 'arctic', 'ember');
      
      // Add the specific theme class if it's not the default dark theme
      if (theme === 'MONOKAI') {
          this.document.documentElement.classList.add('monokai');
      } else if (theme === 'ARCTIC') {
          this.document.documentElement.classList.add('arctic');
      } else if (theme === 'EMBER') {
          this.document.documentElement.classList.add('ember');
      }
    });

    effect(() => {
      const key = this.prefs.coinMarketCapApiKey();
      this.validateCmcApiKey(key);
    });

    this.clockInterval = setInterval(() => this.currentTime.set(new Date()), 1000);
  }

  ngOnDestroy() {
    clearInterval(this.clockInterval);
    clearTimeout(this.apiKeySaveTimeout);
  }

  private validateCmcApiKey(key: string) {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
        this.cmcApiKeyValidation.set('UNTESTED');
        return;
    }
    if (this.CMC_API_KEY_REGEX.test(trimmedKey)) {
        this.cmcApiKeyValidation.set('VALID');
    } else {
        this.cmcApiKeyValidation.set('INVALID');
    }
  }

  // --- Modal Toggles ---
  toggleSettings() { this.showSettings.update(v => !v); }
  toggleDocs() { this.showDocs.update(v => !v); }
  togglePerformanceAudit() { this.showPerformanceAudit.update(v => !v); }

  toggleWatchlistEditor() {
    this.showWatchlistEditor.update(v => !v);
    this.tokenSearchTerm.set('');
    this.tokenSuggestions.set([]);
  }

  async toggleBtcDetail() {
    const isOpening = !this.showBtcDetail();
    this.showBtcDetail.set(isOpening);

    // Fetch full data only when opening and if it's not already loaded OR has insufficient history
    const btc = this.stateService.btcToken();
    if (isOpening && (!btc || btc.priceHistory.length < 50)) {
      this.isFetchingBtcDetail.set(true);
      try {
        let btcData: Token | null = null;
        if (this.prefs.dataSourceMode() === 'SIMULATION') {
          await new Promise(res => setTimeout(res, 250)); // Simulate network
          btcData = this.simulationDataSource.getBtcDetail();
        } else {
          // Use CoinGecko for detailed chart data regardless of API provider choice
          btcData = await this.liveDataSource.fetchBtcDetail();
        }
        this.stateService.setBtcToken(btcData);
      } finally {
        this.isFetchingBtcDetail.set(false);
      }
    }
  }
  
  // --- Watchlist Management ---
  updateSearchTerm(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.tokenSearchTerm.set(val);

    clearTimeout(this.searchTimeout);
    if (!val.trim()) {
      this.tokenSuggestions.set([]);
      this.isSearching.set(false);
      return;
    }

    this.isSearching.set(true);
    this.searchTimeout = setTimeout(async () => {
      const results = await this.dataService.searchTokens(val);
      const currentSymbols = new Set(this.tokens().map(t => t.symbol.toUpperCase()));
      const filtered = results.filter(r => !currentSymbols.has(r.symbol.toUpperCase()));
      this.tokenSuggestions.set(filtered);
      this.isSearching.set(false);
    }, 300); 
  }

  handleAddToken(suggestion: TokenDefinition) {
    this.dataService.addToken(suggestion.symbol, suggestion.cgId, suggestion.name, suggestion.imageUrl);
    this.tokenSearchTerm.set('');
    this.tokenSuggestions.set([]);
  }
  
  handleManualAdd(term: string) {
    if(!term) return;
    const suggestions = this.tokenSuggestions();
    const match = suggestions.length > 0 ? suggestions[0] : { symbol: term, name: term };
    this.handleAddToken(match);
  }

  handleRemoveToken(symbol: string) {
    this.dataService.removeToken(symbol);
  }
  
  handleReorder(event: { fromSymbol: string; toSymbol: string }) {
    this.dataService.reorderTokens(event.fromSymbol, event.toSymbol);
  }

  // --- Grid/Detail Interaction ---
  handleTokenSelect(symbol: string) {
    this.stateService.toggleSelectedToken(symbol);
  }

  deselectToken() {
    this.stateService.clearSelection();
  }

  // --- Layout Focus ---
  toggleFocus(id: WidgetId) {
    this.prefs.setFocus(id);
  }

  // --- Settings ---
  handleCmcApiKeyInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.prefs.setCoinMarketCapApiKey(value);
    
    this.apiKeySaved.set(true);
    clearTimeout(this.apiKeySaveTimeout);
    this.apiKeySaveTimeout = setTimeout(() => {
      this.apiKeySaved.set(false);
    }, 2000);
  }

  handleConfidenceChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.prefs.setNotificationConfidenceThreshold(value);
  }

  isSignalNotificationEnabled(type: SignalType): boolean {
    return !this.prefs.disabledSignalTypesForNotifications().has(type);
  }

  toggleSignalNotification(type: SignalType) {
    // Special handling for Hype Pulse, which has BUY and SELL types
    if (type === SignalType.HYPE_PULSE_BUY || type === SignalType.HYPE_PULSE_SELL) {
      const isDisabled = this.prefs.disabledSignalTypesForNotifications().has(SignalType.HYPE_PULSE_BUY);
      this.prefs.setSignalTypeNotification(SignalType.HYPE_PULSE_BUY, isDisabled); // if it was disabled, enable it
      this.prefs.setSignalTypeNotification(SignalType.HYPE_PULSE_SELL, isDisabled);
    } else {
      this.prefs.toggleSignalTypeNotification(type);
    }
  }

  // --- Drag and Drop Handlers (for Modal) ---
  onDragStart(event: DragEvent, symbol: string) {
    this.draggedSymbol = symbol;
    (event.target as HTMLElement).classList.add('dragging-item');
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onDragOver(event: DragEvent) { event.preventDefault(); }

  onDragEnter(event: DragEvent) {
    const target = (event.currentTarget as HTMLElement);
    if (target && this.draggedSymbol) target.classList.add('drag-over-indicator');
  }

  onDragLeave(event: DragEvent) {
    (event.currentTarget as HTMLElement).classList.remove('drag-over-indicator');
  }
  
  onDrop(event: DragEvent, toSymbol: string) {
    event.preventDefault();
    if (this.draggedSymbol && this.draggedSymbol !== toSymbol) {
      this.handleReorder({ fromSymbol: this.draggedSymbol, toSymbol });
    }
    this.cleanupDragStyles();
  }

  onDragEnd() {
    this.cleanupDragStyles();
  }

  private cleanupDragStyles() {
    this.draggedSymbol = null;
    const nativeEl = this.elementRef.nativeElement;
    nativeEl.querySelectorAll('.dragging-item').forEach((el: HTMLElement) => el.classList.remove('dragging-item'));
    nativeEl.querySelectorAll('.drag-over-indicator').forEach((el: HTMLElement) => el.classList.remove('drag-over-indicator'));
  }
}