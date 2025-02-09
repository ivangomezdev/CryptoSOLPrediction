import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { TrendingUp, TrendingDown, AlertCircle, Timer } from 'lucide-react';
import { TradingData, TradingRecommendation } from '../types/trading';
import { analyzeTradingSignals, analyzeScalpingSignals, calculateMACD, calculateRSI, calculateATR, calculateEMA, calculateBollingerBands } from '../utils/indicators';

const TradingDashboard: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [tradingData, setTradingData] = useState<TradingData | null>(null);
  const [recommendation, setRecommendation] = useState<TradingRecommendation | null>(null);
  const [scalpingMode, setScalpingMode] = useState(false);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [lastSignalPrice, setLastSignalPrice] = useState<number | null>(null);
  
  // Fetch historical data
  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        const response = await fetch('https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1m&limit=100');
        const data = await response.json();
        setHistoricalData(data);
        
        // Process historical data
        const prices = data.map((candle: any[]) => parseFloat(candle[4])); // Close prices
        const highs = data.map((candle: any[]) => parseFloat(candle[2]));
        const lows = data.map((candle: any[]) => parseFloat(candle[3]));
        const volumes = data.map((candle: any[]) => parseFloat(candle[5]));
        
        // Calculate indicators
        const macdResult = calculateMACD(prices);
        const rsiResult = calculateRSI(prices);
        const atrResult = calculateATR(highs, lows, prices);
        const ema9Result = calculateEMA(prices, 9);
        const ema20Result = calculateEMA(prices, 20);
        const bbResult = calculateBollingerBands(prices);
        
        const currentPrice = prices[prices.length - 1];
        const currentVolume = volumes[volumes.length - 1];
        const averageVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        
        const technicalData: TradingData = {
          price: currentPrice,
          volume: currentVolume,
          macd: {
            macd: macdResult[macdResult.length - 1].MACD,
            signal: macdResult[macdResult.length - 1].signal,
            histogram: macdResult[macdResult.length - 1].histogram
          },
          rsi: rsiResult[rsiResult.length - 1],
          atr: atrResult[atrResult.length - 1],
          ema9: ema9Result[ema9Result.length - 1],
          ema20: ema20Result[ema20Result.length - 1],
          bollingerBands: {
            upper: bbResult[bbResult.length - 1].upper,
            middle: bbResult[bbResult.length - 1].middle,
            lower: bbResult[bbResult.length - 1].lower
          }
        };
        
        setTradingData({ ...technicalData, averageVolume });
      } catch (error) {
        console.error('Error fetching historical data:', error);
      }
    };

    fetchHistoricalData();
    const interval = setInterval(fetchHistoricalData, 60000); //Hacer update cada 1 min
    
    return () => clearInterval(interval);
  }, []);
  
  // Real-time price updates
  useEffect(() => {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/solusdt@ticker');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (tradingData) {
        setTradingData(prev => ({
          ...prev!,
          price: parseFloat(data.c),
          volume: parseFloat(data.v)
        }));
      }
    };
    
    return () => ws.close();
  }, [tradingData]);
  
  useEffect(() => {
    if (tradingData) {
      // Solo actualiza la recomendación si:
      // No hay una recomendación previa
      //  El precio ha cambiado significativamente (>2% para trading normal, >0.5% para scalping)
      // Hay un cambio en el modo de trading
      const priceChangeThreshold = scalpingMode ? 0.005 : 0.02;
      const significantPriceChange = lastSignalPrice 
        ? Math.abs(tradingData.price - lastSignalPrice) / lastSignalPrice > priceChangeThreshold
        : true;

      if (!recommendation || significantPriceChange || !lastSignalPrice) {
        const newRecommendation = scalpingMode 
          ? analyzeScalpingSignals(tradingData)
          : analyzeTradingSignals(tradingData);

        // Solo actualiza si hay un cambio en la acción o no hay recomendación previa
        if (!recommendation || newRecommendation.action !== recommendation.action) {
          setRecommendation(newRecommendation);
          setLastSignalPrice(tradingData.price);
        }
      }
    }
  }, [tradingData, scalpingMode, lastSignalPrice, recommendation]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Solana Trading</h1>
          <button
            onClick={() => {
              setScalpingMode(!scalpingMode);
              setLastSignalPrice(null); // Reset a la señal cuando cambio a scalping/normal
              setRecommendation(null); // Reset a la señal cuando cambio a scalping/normal
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              scalpingMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 hover:bg-gray-700'
            } transition-colors`}
          >
            <Timer className="w-5 h-5" />
            {scalpingMode ? 'Scalping Mode' : 'Normal Mode'}
          </button>
        </div>
        
        {/* Price and Recommendation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Precio actual</h2>
            <div className="text-4xl font-bold text-green-400">
              ${tradingData?.price.toFixed(2)}
            </div>
            <div className="text-gray-400 mt-2">
              Volume: {tradingData?.volume.toLocaleString()} USDT
            </div>
            {lastSignalPrice && (
              <div className="text-sm text-gray-400 mt-2">
                Precio señal: ${lastSignalPrice.toFixed(2)}
              </div>
            )}
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              {scalpingMode ? 'Scalping Recommendation' : 'Trading Recommendation'}
            </h2>
            {recommendation && (
              <div>
                <div className="flex items-center gap-2 text-2xl font-bold mb-2">
                  {recommendation.action === 'BUY' && (
                    <TrendingUp className="text-green-400" />
                  )}
                  {recommendation.action === 'SELL' && (
                    <TrendingDown className="text-red-400" />
                  )}
                  {recommendation.action === 'HOLD' && (
                    <AlertCircle className="text-yellow-400" />
                  )}
                  {recommendation.action}
                </div>
                <p className="text-gray-400 mb-2">{recommendation.reason}</p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <div className="text-sm text-gray-400">TP Price</div>
                    <div className="text-xl font-semibold text-green-400">
                      ${recommendation.targetPrice.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Stop Loss</div>
                    <div className="text-xl font-semibold text-red-400">
                      ${recommendation.stopLoss.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Technical Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">MACD</h3>
            <div className="space-y-2">
              <div>
                <span className="text-gray-400">Linea MACD:</span>
                <span className="float-right">{tradingData?.macd.macd.toFixed(4)}</span>
              </div>
              <div>
                <span className="text-gray-400">Linea de señal:</span>
                <span className="float-right">{tradingData?.macd.signal.toFixed(4)}</span>
              </div>
              <div>
                <span className="text-gray-400">Histogram:</span>
                <span className="float-right">{tradingData?.macd.histogram.toFixed(4)}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">RSI</h3>
            <div className="text-2xl font-bold mb-2">{tradingData?.rsi.toFixed(2)}</div>
            <div className="text-sm text-gray-400">
              {tradingData?.rsi < 30 ? 'Oversold' : tradingData?.rsi > 70 ? 'Overbought' : 'Neutral'}
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">ATR</h3>
            <div className="text-2xl font-bold mb-2">{tradingData?.atr.toFixed(4)}</div>
            <div className="text-sm text-gray-400">
             Indicador de volatilidad
            </div>
          </div>
        </div>
        
        {/* Scalping Indicators */}
        {scalpingMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">EMAs</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-400">EMA 9:</span>
                  <span className="float-right">{tradingData?.ema9?.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-400">EMA 20:</span>
                  <span className="float-right">{tradingData?.ema20?.toFixed(2)}</span>
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  {tradingData?.ema9 && tradingData?.ema20 && (
                    tradingData.ema9 > tradingData.ema20 
                      ? 'Bullish Trend' 
                      : 'Bearish Trend'
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Bandas de Bollinger</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-400">Banda Up:</span>
                  <span className="float-right">{tradingData?.bollingerBands?.upper.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Banda Mid:</span>
                  <span className="float-right">{tradingData?.bollingerBands?.middle.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Banda Low:</span>
                  <span className="float-right">{tradingData?.bollingerBands?.lower.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Chart */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div ref={chartContainerRef} className="h-[400px]" />
        </div>
      </div>
    </div>
  );
};

export default TradingDashboard;