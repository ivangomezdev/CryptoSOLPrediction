export interface TradingData {
  price: number;
  volume: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  rsi: number;
  atr: number;
  ema9?: number;
  ema20?: number;
  bollingerBands?: {
    upper: number;
    middle: number;
    lower: number;
  };
}

export interface TradingRecommendation {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  targetPrice: number;
  stopLoss: number;
  reason: string;
  isScalping?: boolean;
}