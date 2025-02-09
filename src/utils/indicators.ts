import { MACD, RSI, ATR, EMA, BollingerBands } from "technicalindicators";

export const calculateMACD = (prices: number[]) => {
  const macdInput = {
    values: prices,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
  };

  return MACD.calculate(macdInput);
};

export const calculateRSI = (prices: number[]) => {
  const rsiInput = {
    values: prices,
    period: 14,
  };

  return RSI.calculate(rsiInput);
};

export const calculateATR = (
  high: number[],
  low: number[],
  close: number[]
) => {
  const atrInput = {
    high,
    low,
    close,
    period: 14,
  };

  return ATR.calculate(atrInput);
};

export const calculateEMA = (prices: number[], period: number) => {
  const emaInput = {
    values: prices,
    period: period,
  };

  return EMA.calculate(emaInput);
};

export const calculateBollingerBands = (prices: number[]) => {
  const bbInput = {
    values: prices,
    period: 20,
    stdDev: 2,
  };

  return BollingerBands.calculate(bbInput);
};

export const analyzeTradingSignals = (data: any): TradingRecommendation => {
  const { price, macd, rsi, atr } = data;

  let action: "BUY" | "SELL" | "HOLD" = "HOLD";
  let confidence = 0;
  let reason = "";

  // MACD Analysis
  const macdCrossover = macd.macd > macd.signal;
  const macdStrength = Math.abs(macd.histogram);

  // RSI Analysis
  const isOversold = rsi < 30;
  const isOverbought = rsi > 70;

  // Combined Analysis
  if (macdCrossover && isOversold) {
    action = "BUY";
    confidence = 0.8;
    reason = "Fuerte señal de compra: cruce del MACD con RSI sobrevendido";
  } else if (!macdCrossover && isOverbought) {
    action = "SELL";
    confidence = 0.8;
    reason = "Fuerte señal de venta: MACD bajista con RSI sobrecomprado";
  } else if (macdCrossover && rsi > 40 && rsi < 60) {
    action = "BUY";
    confidence = 0.6;
    reason = "Señal de compra moderada: cruce MACD con RSI neutral";
  } else if (!macdCrossover && rsi > 40 && rsi < 60) {
    action = "SELL";
    confidence = 0.6;
    reason = "Señal de venta moderada: MACD bajista con RSI neutral";
  } else {
    action = "HOLD";
    confidence = 0.5;
    reason = "No hay señales claras: a la espera de mejores condiciones";
  }

  // Calcular precios objetivo mas conservador
  // Para COMPRAR: el objetivo está entre un 2 y un 3 % por encima del precio actual, el stop loss está entre un 1 y un 1,5 % por debajo
  // Para VENDER: el objetivo está entre un 2 y un 3 % por debajo del precio actual, el stop loss está entre un 1 y un 1,5 % por encima
  const targetMultiplier = action === "BUY" ? 1.025 : 0.975;
  const stopMultiplier = action === "BUY" ? 0.985 : 1.015;

  const targetPrice = price * targetMultiplier;
  const stopLoss = price * stopMultiplier;

  return {
    action,
    confidence,
    targetPrice,
    stopLoss,
    reason,
  };
};

export const analyzeScalpingSignals = (data: any): TradingRecommendation => {
  const { price, rsi, ema9, ema20, bollingerBands, volume } = data;

  let action: "BUY" | "SELL" | "HOLD" = "HOLD";
  let confidence = 0;
  let reason = "";

  // EMA Cross Analysis
  const emaCrossover = ema9 > ema20;

  // Bollinger Bands Analysis
  const isBandsSqueeze =
    (bollingerBands.upper - bollingerBands.lower) / bollingerBands.middle <
    0.02;
  const priceNearUpper =
    price >
    bollingerBands.upper - (bollingerBands.upper - bollingerBands.middle) * 0.2;
  const priceNearLower =
    price <
    bollingerBands.lower + (bollingerBands.middle - bollingerBands.lower) * 0.2;

  // Volume Analysis
  const isHighVolume = volume > data.averageVolume * 1.5;

  // Scalping Analysis
  if (emaCrossover && priceNearLower && isHighVolume) {
    action = "BUY";
    confidence = 0.8;
    reason =
      "Scalping BUY: Cruce de EMA con precio cerca de la banda inferior y alto volumen";
  } else if (!emaCrossover && priceNearUpper && isHighVolume) {
    action = "SELL";
    confidence = 0.8;
    reason =
      "Scalping Sell: EMA bajista con precio cerca de la banda superior y alto volumen";
  } else if (isBandsSqueeze) {
    action = "HOLD";
    confidence = 0.7;
    reason =
      "Posible ruptura entrante: se detecta contracción de las Bandas de Bollinger";
  } else {
    action = "HOLD";
    confidence = 0.5;
    reason = "No hay situacion de scalping clara";
  }

  // Scalping (0.5-1%)
  const targetMultiplier = action === "BUY" ? 1.008 : 0.992;
  const stopMultiplier = action === "BUY" ? 0.995 : 1.005;

  const targetPrice = price * targetMultiplier;
  const stopLoss = price * stopMultiplier;

  return {
    action,
    confidence,
    targetPrice,
    stopLoss,
    reason,
    isScalping: true,
  };
};
