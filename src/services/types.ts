export interface HistoryPoint {
  time: number;
  value: number;
}

export interface Token {
  symbol: string;
  name: string;
  price: number;
  entryPrice: number; // For Gain Lock-100
  volume: number;
  yield: number; // APY for Stable Anchor
  priceHistory: HistoryPoint[]; // For SMAs, RSI, Volatility
  volumeHistory: HistoryPoint[]; // For Burst Hunter
  liquidityDepth: number; // For Venue Shield
  cgId?: string; // CoinGecko ID
  imageUrl?: string; // Token icon URL
  change24h?: number; // Optional 24h change for summary views
}

export enum SignalType {
  BURST_HUNTER = 'BURST_HUNTER', // Conviction
  GAIN_LOCK = 'GAIN_LOCK', // Risk Mgmt
  HYPE_PULSE_BUY = 'HYPE_PULSE_BUY', // Momentum
  HYPE_PULSE_SELL = 'HYPE_PULSE_SELL',
  STABLE_ANCHOR = 'STABLE_ANCHOR', // Capital Preservation
  VENUE_SHIELD = 'VENUE_SHIELD', // Execution
  TREND_VECTOR = 'TREND_VECTOR', // Linear Regression Prediction
  SUPPORT_BOUNCE = 'SUPPORT_BOUNCE', // Geometric/Candle Patterns
  VOLATILITY_SQUEEZE = 'VOLATILITY_SQUEEZE', // Bollinger Squeeze (Prediction)
  PRICE_ALERT = 'PRICE_ALERT', // User-defined price alert
  JERRY_REVERSION = 'JERRY_REVERSION', // Systematic Mean Reversion
  NEWS_SPIKE = 'NEWS_SPIKE' // AI-driven News Event
}

export interface Signal {
  id: string;
  timestamp: number;
  type: SignalType;
  tokenSymbol: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'danger';
  confidence: number; // 0 to 100
  aiAnalysis?: string; // Populated on demand
  isAnalyzing?: boolean; // UI state
  // FIX: Replaced `any` with a more specific type to improve type safety and prevent inference errors.
  // By making the type more specific to current usage, we can avoid potential type inference issues with `unknown`.
  meta?: Record<string, string | number | undefined>; // For extra data like projected price
}

export interface MarketRegime {
  status: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE';
  volatility: number;
  correlation: number;
}

export interface PriceAlert {
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
}

export interface PerformanceData {
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number; // as a percentage
  totalPnlPercent: number;
  averageReturn: number; // as a percentage
}

export interface GroundingChunk {
  web: {
    uri: string;
    title: string;
  };
}

// Centralized type for algorithm icons to avoid circular dependencies.
export type AlgoIconType = 
  'BURST_HUNTER' | 'VOLATILITY_SQUEEZE' | 'GAIN_LOCK' | 
  'TREND_VECTOR' | 'HYPE_PULSE' | 'PATTERN_SCANNER' | 
  'STABLE_ANCHOR' | 'VENUE_SHIELD' | 'JERRY_REVERSION' | 'NEWS_SPIKE';

// Defines the structure for a toast notification.
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'danger';
  icon: AlgoIconType | 'INFO';
}