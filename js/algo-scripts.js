/**
 * algo-scripts.js
 * Main page controller for the Algo Scripts page.
 * Defines STRATEGIES data, renders cards, runs signals, manages UI.
 */

import { fetchOHLCV, getDemoData, startAutoRefresh, stopAutoRefresh, DEMO_SYMBOLS, refreshProxyStatus, getProxyStatus, getOHLCVStats } from './services/algo-data-service.js';
import { loadConfig, saveConfig, updateBrokerKeys, clearConfig, initiateKiteAuth, initiateGrowwAuth, isConnected, pingProxy } from './services/algo-api-config.js';
import * as SE from './services/algo-signal-engine.js';

// ============================================================
//  STRATEGIES DATA  (29 strategies across 7 categories)
// ============================================================

const CATEGORIES = [
    { id: 1, name: 'Mean Reversion',       icon: '🔄', color: 'cat-1', desc: 'Buy low, sell high — price returns to its average' },
    { id: 2, name: 'Momentum / Breakout',  icon: '🚀', color: 'cat-2', desc: 'Buy/sell when price breaks a range with momentum' },
    { id: 3, name: 'Trend-Following',      icon: '📈', color: 'cat-3', desc: 'Stay aligned with the dominant market trend' },
    { id: 4, name: 'Volatility / Risk',    icon: '⚡', color: 'cat-4', desc: 'Size positions based on volatility, focus on risk' },
    { id: 5, name: 'Statistical / Quant',  icon: '📊', color: 'cat-5', desc: 'Mathematical and data-driven trading models' },
    { id: 6, name: 'Machine Learning',     icon: '🤖', color: 'cat-6', desc: 'Pattern learning from historical and live data' },
    { id: 7, name: 'Hybrid / Smart',       icon: '🧠', color: 'cat-7', desc: 'Combine multiple types for improved stability' },
];

const STRATEGIES = [
    // --- Category 1: Mean Reversion ---
    { id:'1_1', cat:1, name:'Bollinger Band Reversion', difficulty:'Intermediate', indicators:['BB(20,2)','RSI-14'],
      desc:'Buy when price touches or breaks below the lower Bollinger Band with RSI confirmation, then exit when price reverts to the middle band (20-period SMA).',
      entry:['Price ≤ Lower BB (20,2)','RSI < 45 (not overbought on entry)'],
      exit: ['Price ≥ Middle Band (SMA-20)','RSI > 65'],
      stop: ['Close below Lower BB by more than 1%'],
      risk: 'Use 1% capital risk per trade. Avoid in trending markets (ADX > 25).',
      signalFn: SE.signal_1_1,
      pseudocode: `<span class="kw">import</span> pandas <span class="kw">as</span> pd
<span class="kw">import</span> numpy <span class="kw">as</span> np

<span class="kw">def</span> <span class="fn">bollinger_reversion</span>(df, period=<span class="num">20</span>, std_mult=<span class="num">2</span>):
    df[<span class="str">'sma'</span>]   = df[<span class="str">'close'</span>].rolling(period).mean()
    df[<span class="str">'std'</span>]   = df[<span class="str">'close'</span>].rolling(period).std()
    df[<span class="str">'upper'</span>] = df[<span class="str">'sma'</span>] + std_mult * df[<span class="str">'std'</span>]
    df[<span class="str">'lower'</span>] = df[<span class="str">'sma'</span>] - std_mult * df[<span class="str">'std'</span>]
    df[<span class="str">'rsi'</span>]   = <span class="fn">compute_rsi</span>(df[<span class="str">'close'</span>], <span class="num">14</span>)

    df[<span class="str">'signal'</span>] = <span class="num">0</span>
    buy  = (df[<span class="str">'close'</span>] &lt;= df[<span class="str">'lower'</span>]) &amp; (df[<span class="str">'rsi'</span>] &lt; <span class="num">45</span>)
    sell = (df[<span class="str">'close'</span>] &gt;= df[<span class="str">'sma'</span>])
    df.loc[buy,  <span class="str">'signal'</span>] = <span class="num">1</span>   <span class="cmt"># BUY</span>
    df.loc[sell, <span class="str">'signal'</span>] = -<span class="num">1</span>  <span class="cmt"># SELL</span>
    <span class="kw">return</span> df` },

    { id:'1_2', cat:1, name:'RSI Oversold Snap', difficulty:'Beginner', indicators:['RSI-14'],
      desc:'Enter long when RSI-14 falls into oversold territory (< 30) — exploiting the statistical tendency for sharp bounces. Exit when RSI crosses back above 50.',
      entry:['RSI-14 < 30 (oversold zone)'],
      exit: ['RSI-14 > 50 (reversion confirmed)','RSI-14 > 70 (overbought — exit immediately)'],
      stop: ['RSI closes below 20 for 2 consecutive days'],
      risk: 'Risk 1-1.5% of capital. Works well in high-beta NSE midcaps.',
      signalFn: SE.signal_1_2,
      pseudocode: `<span class="kw">def</span> <span class="fn">rsi_snap</span>(closes, period=<span class="num">14</span>):
    rsi = <span class="fn">compute_rsi</span>(closes, period)
    signals = []
    <span class="kw">for</span> i <span class="kw">in</span> <span class="fn">range</span>(<span class="num">1</span>, <span class="fn">len</span>(rsi)):
        <span class="kw">if</span>   rsi[i] &lt; <span class="num">30</span>:  signals.append(<span class="str">'BUY'</span>)
        <span class="kw">elif</span> rsi[i] &gt; <span class="num">50</span> <span class="kw">and</span> rsi[i-<span class="num">1</span>] &lt; <span class="num">50</span>:
                          signals.append(<span class="str">'SELL'</span>)  <span class="cmt"># exit</span>
        <span class="kw">elif</span> rsi[i] &gt; <span class="num">70</span>: signals.append(<span class="str">'SELL'</span>)
        <span class="kw">else</span>:             signals.append(<span class="str">'HOLD'</span>)
    <span class="kw">return</span> signals` },

    { id:'1_3', cat:1, name:'Z-Score Mean Reversion', difficulty:'Intermediate', indicators:['Z-Score','SMA-20'],
      desc:'Calculate the rolling Z-score of price relative to its 20-day mean. Enter when Z < -2 (price significantly below mean), exit when Z returns to 0.',
      entry:['Z-Score < -2 (2 std below mean)'],
      exit: ['Z-Score ≥ 0 (reverted to mean)'],
      stop: ['Z-Score extends to < -3'],
      risk: 'Best for range-bound large-cap stocks. Avoid when ADX > 25.',
      signalFn: SE.signal_1_3,
      pseudocode: `<span class="kw">def</span> <span class="fn">zscore_reversion</span>(closes, period=<span class="num">20</span>):
    mean = <span class="fn">pd.Series</span>(closes).rolling(period).mean()
    std  = <span class="fn">pd.Series</span>(closes).rolling(period).std()
    z    = (closes - mean) / std

    signals = []
    <span class="kw">for</span> z_val <span class="kw">in</span> z:
        <span class="kw">if</span>   z_val &lt; -<span class="num">2</span>: signals.append(<span class="str">'BUY'</span>)
        <span class="kw">elif</span> z_val &gt;  <span class="num">2</span>: signals.append(<span class="str">'SELL'</span>)
        <span class="kw">elif</span> z_val &gt;  <span class="num">0</span>: signals.append(<span class="str">'EXIT'</span>)
        <span class="kw">else</span>:            signals.append(<span class="str">'HOLD'</span>)
    <span class="kw">return</span> signals` },

    { id:'1_4', cat:1, name:'Pair Trading (Beta-Adjusted)', difficulty:'Advanced', indicators:['Correlation','Spread','Z-Score'],
      desc:'Select two highly correlated stocks (e.g. TCS & INFY). Compute the price spread adjusted for beta. When spread Z-score diverges > 2, long the underperformer, short the outperformer.',
      entry:['Spread Z-Score > 2: Short outperformer, Long underperformer','Spread Z-Score < -2: vice versa'],
      exit: ['Spread Z-Score returns to 0'],
      stop: ['Spread Z-Score extends beyond ±3 (false divergence)'],
      risk: 'Market-neutral — not affected by broad market direction. Use equal capital on both legs.',
      signalFn: SE.signal_1_4,
      manualInputs: [
        { key:'spread', label:'Current Spread (Stock A Price - Stock B Price)', placeholder:'e.g. 200.5' },
        { key:'spreadMean', label:'Mean Spread (20-day average)', placeholder:'e.g. 180.0' },
        { key:'spreadStd', label:'Spread Std Dev (20-day)', placeholder:'e.g. 15.0' },
      ],
      pseudocode: `<span class="kw">def</span> <span class="fn">pair_trade</span>(price_a, price_b, beta, period=<span class="num">20</span>):
    spread = price_a - beta * price_b
    mean   = spread.rolling(period).mean()
    std    = spread.rolling(period).std()
    z      = (spread - mean) / std

    <span class="kw">if</span>   z &gt;  <span class="num">2</span>: <span class="kw">return</span> <span class="str">'SHORT_A_LONG_B'</span>
    <span class="kw">elif</span> z &lt; -<span class="num">2</span>: <span class="kw">return</span> <span class="str">'LONG_A_SHORT_B'</span>
    <span class="kw">elif</span> <span class="fn">abs</span>(z) &lt; <span class="num">0.5</span>: <span class="kw">return</span> <span class="str">'EXIT'</span>
    <span class="kw">else</span>: <span class="kw">return</span> <span class="str">'HOLD'</span>` },

    // --- Category 2: Momentum / Breakout ---
    { id:'2_1', cat:2, name:'52-Week High Breakout', difficulty:'Beginner', indicators:['Price vs 52W High','Volume Ratio'],
      desc:'Buy when price breaks above its 52-week high with volume 1.5x above average. Institutions chase such breakouts — this captures the "new high" momentum effect documented in NSE data.',
      entry:['Price ≥ 52-Week High (current session)','Volume > 1.5× 20-day average'],
      exit: ['Trailing stop: 7% below entry','Target: +15 to +25%'],
      stop: ['Close below breakout day low'],
      risk: 'Only trade first breakout attempt. Ignore weak-volume re-tests.',
      signalFn: SE.signal_2_1,
      pseudocode: `<span class="kw">def</span> <span class="fn">breakout_52w</span>(df):
    df[<span class="str">'52w_high'</span>] = df[<span class="str">'high'</span>].rolling(<span class="num">252</span>).max()
    df[<span class="str">'avg_vol'</span>]  = df[<span class="str">'volume'</span>].rolling(<span class="num">20</span>).mean()

    buy = (
        (df[<span class="str">'close'</span>] &gt;= df[<span class="str">'52w_high'</span>]) &amp;
        (df[<span class="str">'volume'</span>] &gt; <span class="num">1.5</span> * df[<span class="str">'avg_vol'</span>])
    )
    df[<span class="str">'signal'</span>] = <span class="fn">np.where</span>(buy, <span class="str">'BUY'</span>, <span class="str">'HOLD'</span>)
    <span class="kw">return</span> df` },

    { id:'2_2', cat:2, name:'EMA Crossover (9/21)', difficulty:'Beginner', indicators:['EMA-9','EMA-21'],
      desc:'The classic Golden/Death Cross using short EMAs (9 and 21 periods) for faster signals vs the traditional 50/200. Captures momentum on daily or hourly charts.',
      entry:['EMA-9 crosses ABOVE EMA-21 (Golden Cross)'],
      exit: ['EMA-9 crosses BELOW EMA-21 (Death Cross)'],
      stop: ['Close below EMA-21'],
      risk: 'Add ADX > 20 filter to avoid whipsaws in sideways markets.',
      signalFn: SE.signal_2_2,
      pseudocode: `<span class="kw">def</span> <span class="fn">ema_crossover</span>(closes, fast=<span class="num">9</span>, slow=<span class="num">21</span>):
    ema9  = closes.ewm(span=fast,  adjust=<span class="kw">False</span>).mean()
    ema21 = closes.ewm(span=slow, adjust=<span class="kw">False</span>).mean()

    signals = []
    <span class="kw">for</span> i <span class="kw">in</span> <span class="fn">range</span>(<span class="num">1</span>, <span class="fn">len</span>(ema9)):
        <span class="kw">if</span>   ema9[i] &gt; ema21[i] <span class="kw">and</span> ema9[i-<span class="num">1</span>] &lt;= ema21[i-<span class="num">1</span>]:
            signals.append(<span class="str">'BUY'</span>)   <span class="cmt"># Golden Cross</span>
        <span class="kw">elif</span> ema9[i] &lt; ema21[i] <span class="kw">and</span> ema9[i-<span class="num">1</span>] &gt;= ema21[i-<span class="num">1</span>]:
            signals.append(<span class="str">'SELL'</span>)  <span class="cmt"># Death Cross</span>
        <span class="kw">else</span>:
            signals.append(<span class="str">'HOLD'</span>)
    <span class="kw">return</span> signals` },

    { id:'2_3', cat:2, name:'MACD Signal Cross', difficulty:'Intermediate', indicators:['MACD(12,26,9)','Signal Line','Histogram'],
      desc:'Gerald Appel\'s MACD: buy when MACD line crosses above the 9-period signal line, especially when the cross happens below the zero line (stronger signal).',
      entry:['MACD Line crosses ABOVE Signal Line','Strong signal: Cross occurs below zero line'],
      exit: ['MACD Line crosses BELOW Signal Line','Histogram reverses from peak'],
      stop: ['MACD drops sharply below signal by > 0.5%'],
      risk: 'Histogram divergence from price is a leading signal — watch for MACD making lower highs while price makes higher highs.',
      signalFn: SE.signal_2_3,
      pseudocode: `<span class="kw">def</span> <span class="fn">macd_cross</span>(closes):
    ema12 = closes.ewm(span=<span class="num">12</span>).mean()
    ema26 = closes.ewm(span=<span class="num">26</span>).mean()
    macd  = ema12 - ema26
    signal = macd.ewm(span=<span class="num">9</span>).mean()
    hist   = macd - signal

    buy  = (macd &gt; signal) &amp; (macd.shift() &lt;= signal.shift())
    sell = (macd &lt; signal) &amp; (macd.shift() &gt;= signal.shift())
    <span class="kw">return</span> <span class="fn">np.select</span>([buy, sell], [<span class="str">'BUY'</span>, <span class="str">'SELL'</span>], <span class="str">'HOLD'</span>)` },

    { id:'2_4', cat:2, name:'Volume-Price Surge (VPS)', difficulty:'Beginner', indicators:['Volume Ratio','% Candle Change'],
      desc:'Detect explosive candles where volume > 2× the 20-day average AND price moves > 3% in a single session. This is the footprint of institutional buying.',
      entry:['Volume > 2× 20-day average AND candle body > 3%'],
      exit: ['Trailing stop: 1 ATR below entry','Target: 2× the surge candle size'],
      stop: ['Close below surge candle low'],
      risk: 'Best on Nifty 50/Nifty Next 50 stocks. Avoid earnings days.',
      signalFn: SE.signal_2_4,
      pseudocode: `<span class="kw">def</span> <span class="fn">volume_price_surge</span>(df):
    df[<span class="str">'avg_vol'</span>]  = df[<span class="str">'volume'</span>].rolling(<span class="num">20</span>).mean()
    df[<span class="str">'vol_ratio'</span>] = df[<span class="str">'volume'</span>] / df[<span class="str">'avg_vol'</span>]
    df[<span class="str">'candle_pct'</span>] = (df[<span class="str">'close'</span>] - df[<span class="str">'open'</span>]) / df[<span class="str">'open'</span>] * <span class="num">100</span>

    bullish = (df[<span class="str">'vol_ratio'</span>] &gt; <span class="num">2</span>) &amp; (df[<span class="str">'candle_pct'</span>] &gt;  <span class="num">3</span>)
    bearish = (df[<span class="str">'vol_ratio'</span>] &gt; <span class="num">2</span>) &amp; (df[<span class="str">'candle_pct'</span>] &lt; -<span class="num">3</span>)
    <span class="kw">return</span> <span class="fn">np.select</span>([bullish, bearish], [<span class="str">'BUY'</span>, <span class="str">'SELL'</span>], <span class="str">'HOLD'</span>)` },

    { id:'2_5', cat:2, name:'Opening Range Breakout (ORB)', difficulty:'Intermediate', indicators:['9:15–9:30 High','9:15–9:30 Low'],
      desc:'Define the High and Low of the first 15 minutes after NSE open (9:15–9:30 AM). Buy on a close above that range, short on a close below. Best on large-cap liquid stocks.',
      entry:['Price closes above ORB High → BUY','Price closes below ORB Low → SHORT'],
      exit: ['Target: 2× the ORB range width from breakout point'],
      stop: ['Close back inside the ORB range'],
      risk: 'Intraday only — square off before 3:15 PM. Skip on high India VIX days.',
      signalFn: SE.signal_2_5,
      manualInputs: [
        { key:'orbHigh', label:'ORB High (9:15–9:30 AM candle high)', placeholder:'e.g. 2450.50' },
        { key:'orbLow',  label:'ORB Low (9:15–9:30 AM candle low)',  placeholder:'e.g. 2420.00' },
        { key:'currentPrice', label:'Current Price', placeholder:'e.g. 2465.00' },
      ],
      pseudocode: `<span class="kw">def</span> <span class="fn">orb_strategy</span>(df_intraday):
    <span class="cmt"># df_intraday = 1-minute OHLCV data for the trading day</span>
    orb_period = df_intraday.between_time(<span class="str">'09:15'</span>, <span class="str">'09:30'</span>)
    orb_high   = orb_period[<span class="str">'high'</span>].max()
    orb_low    = orb_period[<span class="str">'low'</span>].min()

    post_orb = df_intraday.after(<span class="str">'09:31'</span>)
    buy  = post_orb[<span class="str">'close'</span>] &gt; orb_high
    sell = post_orb[<span class="str">'close'</span>] &lt; orb_low
    <span class="kw">return</span> <span class="fn">np.select</span>([buy, sell], [<span class="str">'BUY'</span>, <span class="str">'SELL'</span>], <span class="str">'HOLD'</span>)` },

    // --- Category 3: Trend-Following ---
    { id:'3_1', cat:3, name:'Supertrend Trailing Stop', difficulty:'Intermediate', indicators:['ATR-10','Supertrend(10,3)'],
      desc:'The Supertrend indicator uses ATR to compute a dynamic trailing stop. When price closes above the stop → bullish. When it closes below → bearish. Widely used on NSE daily charts.',
      entry:['Supertrend flips from red to green (direction change to bullish)'],
      exit: ['Supertrend flips from green to red'],
      stop: ['The Supertrend line itself is the trailing stop'],
      risk: 'Works best on trending stocks. Combine with ADX > 20 filter.',
      signalFn: SE.signal_3_1,
      pseudocode: `<span class="kw">def</span> <span class="fn">supertrend</span>(df, atr_period=<span class="num">10</span>, mult=<span class="num">3</span>):
    hl2 = (df[<span class="str">'high'</span>] + df[<span class="str">'low'</span>]) / <span class="num">2</span>
    atr = <span class="fn">compute_atr</span>(df, atr_period)
    upper = hl2 + mult * atr
    lower = hl2 - mult * atr

    direction, st = [], []
    <span class="kw">for</span> i <span class="kw">in</span> <span class="fn">range</span>(<span class="fn">len</span>(df)):
        <span class="kw">if</span> i == <span class="num">0</span>: direction.append(<span class="num">1</span>); st.append(lower[i]); <span class="kw">continue</span>
        <span class="kw">if</span>   direction[-<span class="num">1</span>] ==  <span class="num">1</span> <span class="kw">and</span> df[<span class="str">'close'</span>][i] &lt; st[-<span class="num">1</span>]: direction.append(-<span class="num">1</span>)
        <span class="kw">elif</span> direction[-<span class="num">1</span>] == -<span class="num">1</span> <span class="kw">and</span> df[<span class="str">'close'</span>][i] &gt; st[-<span class="num">1</span>]: direction.append( <span class="num">1</span>)
        <span class="kw">else</span>: direction.append(direction[-<span class="num">1</span>])
        st.append(lower[i] <span class="kw">if</span> direction[-<span class="num">1</span>]==<span class="num">1</span> <span class="kw">else</span> upper[i])
    <span class="kw">return</span> direction, st` },

    { id:'3_2', cat:3, name:'ADX Trend Filter', difficulty:'Intermediate', indicators:['ADX-14','+DI-14','-DI-14'],
      desc:'ADX measures trend strength (not direction). Only take trades when ADX > 25 (strong trend). Use +DI and -DI crossovers to determine direction.',
      entry:['+DI crosses above -DI AND ADX > 25 → BUY','-DI crosses above +DI AND ADX > 25 → SELL/SHORT'],
      exit: ['ADX drops below 20 (trend weakening)'],
      stop: ['ADX reverses from peak AND price retraces 2 ATR'],
      risk: 'ADX < 20: use mean-reversion strategies instead. ADX > 40: trend very mature, reduce position.',
      signalFn: SE.signal_3_2,
      pseudocode: `<span class="kw">from</span> ta.trend <span class="kw">import</span> ADXIndicator

<span class="kw">def</span> <span class="fn">adx_trend</span>(df):
    adx_obj = <span class="fn">ADXIndicator</span>(df[<span class="str">'high'</span>], df[<span class="str">'low'</span>], df[<span class="str">'close'</span>], window=<span class="num">14</span>)
    adx    = adx_obj.<span class="fn">adx</span>()
    plus_di  = adx_obj.<span class="fn">adx_pos</span>()
    minus_di = adx_obj.<span class="fn">adx_neg</span>()

    strong = adx &gt; <span class="num">25</span>
    buy  = strong &amp; (plus_di  &gt; minus_di)
    sell = strong &amp; (minus_di &gt; plus_di)
    <span class="kw">return</span> <span class="fn">np.select</span>([buy, sell], [<span class="str">'BUY'</span>, <span class="str">'SELL'</span>], <span class="str">'HOLD'</span>)` },

    { id:'3_3', cat:3, name:'Triple EMA System', difficulty:'Beginner', indicators:['EMA-20','EMA-50','EMA-200'],
      desc:'The ultimate trend confluence filter. All three EMAs must be in alignment: Price > EMA-20 > EMA-50 > EMA-200 for a valid long setup. This eliminates most false signals.',
      entry:['Price > EMA-20 > EMA-50 > EMA-200 → Long bias','Add pullback to EMA-20 entry for better R:R'],
      exit: ['Price crosses below EMA-20','EMA-20 crosses below EMA-50'],
      stop: ['Close below EMA-50'],
      risk: 'This is a regime filter — combine with a trigger (RSI dip, BB touch) for precise entries.',
      signalFn: SE.signal_3_3,
      pseudocode: `<span class="kw">def</span> <span class="fn">triple_ema</span>(closes):
    ema20  = closes.ewm(span=<span class="num">20</span>).mean()
    ema50  = closes.ewm(span=<span class="num">50</span>).mean()
    ema200 = closes.ewm(span=<span class="num">200</span>).mean()

    bull_align = (closes > ema20) &amp; (ema20 > ema50) &amp; (ema50 > ema200)
    bear_align = (closes < ema20) &amp; (ema20 < ema50) &amp; (ema50 < ema200)

    <span class="kw">return</span> <span class="fn">np.select</span>(
        [bull_align, bear_align],
        [<span class="str">'BUY'</span>, <span class="str">'SELL'</span>], default=<span class="str">'HOLD'</span>
    )` },

    { id:'3_4', cat:3, name:'Parabolic SAR Flip', difficulty:'Beginner', indicators:['PSAR(0.02,0.2)'],
      desc:'The Parabolic SAR places dots above (bearish) or below (bullish) price. When the dots flip from above to below price, it signals a trend reversal — a clean entry trigger.',
      entry:['PSAR flips from above to below price (bullish flip)'],
      exit: ['PSAR flips from below to above price'],
      stop: ['The SAR dot itself is the trailing stop'],
      risk: 'Noisy in choppy markets. Filter with ADX > 20 or use on daily timeframe only.',
      signalFn: SE.signal_3_4,
      pseudocode: `<span class="kw">def</span> <span class="fn">psar_flip</span>(df, step=<span class="num">0.02</span>, max_af=<span class="num">0.2</span>):
    <span class="kw">from</span> ta.trend <span class="kw">import</span> PSARIndicator
    psar = <span class="fn">PSARIndicator</span>(df[<span class="str">'high'</span>], df[<span class="str">'low'</span>], df[<span class="str">'close'</span>],
                          step=step, max_step=max_af)
    sar   = psar.<span class="fn">psar</span>()
    above = psar.<span class="fn">psar_up</span>()   <span class="cmt"># SAR when bearish</span>
    below = psar.<span class="fn">psar_down</span>() <span class="cmt"># SAR when bullish</span>

    bull_flip = below.notna() &amp; above.shift().notna()
    bear_flip = above.notna() &amp; below.shift().notna()
    <span class="kw">return</span> <span class="fn">np.select</span>([bull_flip, bear_flip], [<span class="str">'BUY'</span>, <span class="str">'SELL'</span>], <span class="str">'HOLD'</span>)` },

    // --- Category 4: Volatility ---
    { id:'4_1', cat:4, name:'ATR Position Sizer', difficulty:'Beginner', indicators:['ATR-14'],
      desc:'Size your position so that a 1-ATR adverse move equals exactly 1% of your capital. This normalises risk across all trades regardless of price level or volatility.',
      entry:['Use as position sizing for ANY strategy'],
      exit: ['Stop = Entry ± 1 ATR (direction dependent)'],
      stop: ['Hard stop at 1 ATR from entry'],
      risk: 'Formula: Shares = (Capital × Risk%) / ATR. Reduce capital at risk to 0.5% in high-VIX environments.',
      signalFn: SE.signal_4_1,
      manualInputs: [
        { key:'capital',   label:'Total Trading Capital (₹)', placeholder:'e.g. 500000' },
        { key:'riskPct',   label:'Risk per Trade (%)',        placeholder:'e.g. 1' },
      ],
      pseudocode: `<span class="kw">def</span> <span class="fn">atr_position_size</span>(capital, risk_pct, atr, price):
    risk_amount = capital * (risk_pct / <span class="num">100</span>)
    shares      = <span class="fn">int</span>(risk_amount / atr)
    position    = shares * price
    stop_loss   = price - atr   <span class="cmt"># for long</span>

    <span class="kw">return</span> {
        <span class="str">'shares'</span>:     shares,
        <span class="str">'position_value'</span>: position,
        <span class="str">'stop_loss'</span>:  stop_loss,
        <span class="str">'risk_amount'</span>: risk_amount
    }

<span class="cmt"># Example: ₹5L capital, 1% risk, ATR=45</span>
<span class="fn">atr_position_size</span>(<span class="num">500000</span>, <span class="num">1</span>, <span class="num">45</span>, <span class="num">2800</span>)` },

    { id:'4_2', cat:4, name:'Keltner Channel Breakout', difficulty:'Intermediate', indicators:['EMA-20','ATR-10','Keltner Bands'],
      desc:'Keltner Channels use ATR (not std dev like Bollinger Bands) to set bands around EMA-20. A close above the upper band (EMA + 2×ATR) signals a volatility breakout.',
      entry:['Price closes above Upper Keltner (EMA + 2×ATR) → BUY'],
      exit: ['Price closes below EMA-20','Target = Upper band + 1×ATR'],
      stop: ['Close below EMA-20'],
      risk: 'Keltner Channels are more adaptive than Bollinger Bands during trending regimes.',
      signalFn: SE.signal_4_2,
      pseudocode: `<span class="kw">def</span> <span class="fn">keltner_breakout</span>(df, ema_p=<span class="num">20</span>, atr_p=<span class="num">10</span>, mult=<span class="num">2</span>):
    ema   = df[<span class="str">'close'</span>].ewm(span=ema_p).mean()
    atr   = <span class="fn">compute_atr</span>(df, atr_p)
    upper = ema + mult * atr
    lower = ema - mult * atr

    buy  = df[<span class="str">'close'</span>] &gt; upper
    sell = df[<span class="str">'close'</span>] &lt; lower
    <span class="kw">return</span> <span class="fn">np.select</span>([buy, sell], [<span class="str">'BUY'</span>, <span class="str">'SELL'</span>], <span class="str">'HOLD'</span>)` },

    { id:'4_3', cat:4, name:'VIX-Based Entry Filter', difficulty:'Beginner', indicators:['India VIX'],
      desc:'India VIX measures the market\'s expectation of 30-day volatility. Above 20 = high fear → pause new entries, widen stops. Below 15 = calm → normal position sizing. Above 25 = extreme fear → exit.',
      entry:['VIX < 15: Full position size','VIX 15–20: Half position size'],
      exit: ['VIX > 25: Exit all positions or add hedges'],
      stop: ['Position-size based: 1.5× normal stop when VIX > 18'],
      risk: 'VIX-based risk management is regime-aware. Combine with any entry strategy.',
      signalFn: SE.signal_4_3,
      manualInputs: [{ key:'vix', label:'India VIX Current Value', placeholder:'e.g. 14.5' }],
      pseudocode: `<span class="kw">def</span> <span class="fn">vix_filter</span>(vix_value, base_signal):
    <span class="kw">if</span>   vix_value &gt; <span class="num">25</span>: <span class="kw">return</span> <span class="str">'EXIT_ALL'</span>
    <span class="kw">elif</span> vix_value &gt; <span class="num">20</span>:
        size_mult = <span class="num">0</span>    <span class="cmt"># pause new entries</span>
        <span class="kw">return</span> <span class="str">'HOLD'</span>
    <span class="kw">elif</span> vix_value &gt; <span class="num">15</span>:
        size_mult = <span class="num">0.5</span>  <span class="cmt"># half size</span>
    <span class="kw">else</span>:
        size_mult = <span class="num">1.0</span>  <span class="cmt"># full size</span>

    <span class="kw">return</span> base_signal <span class="kw">if</span> size_mult &gt; <span class="num">0</span> <span class="kw">else</span> <span class="str">'HOLD'</span>` },

    { id:'4_4', cat:4, name:'Donchian Channel System', difficulty:'Intermediate', indicators:['Donchian(20)','Donchian(10)'],
      desc:'Richard Donchian\'s classic breakout system (popularized by Turtle Traders). Buy on a new 20-day high, set stop at the 10-day low. Simple but effective for trending NSE stocks.',
      entry:['Price hits 20-day Donchian high → BUY'],
      exit: ['Price hits 10-day Donchian low → EXIT'],
      stop: ['10-day Donchian low (updated daily)'],
      risk: 'The original Turtle Trading system. Works best on index ETFs and large-caps with strong sector trends.',
      signalFn: SE.signal_4_4,
      pseudocode: `<span class="kw">def</span> <span class="fn">donchian_system</span>(df, entry_p=<span class="num">20</span>, exit_p=<span class="num">10</span>):
    high_n = df[<span class="str">'high'</span>].rolling(entry_p).max()
    low_n  = df[<span class="str">'low'</span>].rolling(exit_p).min()

    buy  = df[<span class="str">'close'</span>] &gt;= high_n.shift(<span class="num">1</span>)
    sell = df[<span class="str">'close'</span>] &lt;= low_n.shift(<span class="num">1</span>)

    df[<span class="str">'signal'</span>] = <span class="fn">np.select</span>([buy, sell], [<span class="str">'BUY'</span>, <span class="str">'SELL'</span>], <span class="str">'HOLD'</span>)
    df[<span class="str">'stop'</span>]   = low_n  <span class="cmt"># trailing stop level</span>
    <span class="kw">return</span> df` },

    // --- Category 5: Statistical / Quant ---
    { id:'5_1', cat:5, name:'Z-Score Momentum', difficulty:'Advanced', indicators:['Z-Score of Returns','Rolling 20-day'],
      desc:'Instead of applying Z-score to price, apply it to daily returns. A return Z-score > 2 means abnormally strong positive momentum — trade it in the direction of the anomaly.',
      entry:['Return Z-Score > 2 → BUY momentum'],
      exit: ['Return Z-Score drops to 0 or reverses'],
      stop: ['Z-Score turns negative'],
      risk: 'This works on cross-sectional data too — rank all Nifty 500 stocks by Z-score daily and buy top 10.',
      signalFn: SE.signal_5_1,
      pseudocode: `<span class="kw">def</span> <span class="fn">zscore_momentum</span>(closes, period=<span class="num">20</span>):
    returns = closes.pct_change()
    mean_r  = returns.rolling(period).mean()
    std_r   = returns.rolling(period).std()
    z       = (returns - mean_r) / std_r

    buy  = z &gt;  <span class="num">2</span>
    sell = z &lt; -<span class="num">2</span>
    <span class="kw">return</span> <span class="fn">np.select</span>([buy, sell], [<span class="str">'BUY'</span>, <span class="str">'SELL'</span>], <span class="str">'HOLD'</span>)` },

    { id:'5_2', cat:5, name:'Linear Regression Channel', difficulty:'Advanced', indicators:['LinReg(20)','StdDev Channel'],
      desc:'Fit a linear regression line through the last 20 closes, then draw 2-standard-deviation channels. Price at the lower channel in an upward-sloping regression = high-probability long entry.',
      entry:['Price ≤ Lower LinReg Channel AND regression slope > 0'],
      exit: ['Price = LinReg center line','Price ≥ Upper LinReg Channel'],
      stop: ['Price breaks below lower channel by 1%'],
      risk: 'The slope of the regression line is the key — only buy dips in rising channels.',
      signalFn: SE.signal_5_2,
      pseudocode: `<span class="kw">import</span> numpy <span class="kw">as</span> np
<span class="kw">from</span> scipy.stats <span class="kw">import</span> linregress

<span class="kw">def</span> <span class="fn">linreg_channel</span>(closes, period=<span class="num">20</span>):
    results = []
    <span class="kw">for</span> i <span class="kw">in</span> range(period-<span class="num">1</span>, len(closes)):
        y = closes[i-period+<span class="num">1</span>:i+<span class="num">1</span>]
        x = np.arange(period)
        slope, intercept, _, _, _ = linregress(x, y)
        reg_val = slope*(period-<span class="num">1</span>) + intercept
        residuals = y - (slope*x + intercept)
        std = residuals.std()
        results.append({
            <span class="str">'value'</span>: reg_val,
            <span class="str">'upper'</span>: reg_val + <span class="num">2</span>*std,
            <span class="str">'lower'</span>: reg_val - <span class="num">2</span>*std,
            <span class="str">'slope'</span>: slope
        })
    <span class="kw">return</span> results` },

    { id:'5_3', cat:5, name:'Kalman Filter Trend', difficulty:'Expert', indicators:['Kalman Filter','State Estimate'],
      desc:'The Kalman Filter is an optimal linear estimator that removes noise from price data using a predict-update cycle. Trade the direction of the filtered trend with no look-ahead bias.',
      entry:['Kalman filtered price trending UP (slope > 0) AND raw price > filter value'],
      exit: ['Kalman filter slope turns negative'],
      stop: ['Price drops below Kalman value by 1 ATR'],
      risk: 'Tune Q (process noise) and R (measurement noise) for your stock\'s volatility. Higher R = smoother filter.',
      signalFn: SE.signal_5_3,
      pseudocode: `<span class="kw">def</span> <span class="fn">kalman_filter</span>(closes, Q=<span class="num">0.015</span>, R=<span class="num">0.5</span>):
    <span class="cmt"># Q = process noise, R = measurement noise</span>
    x, P = closes[<span class="num">0</span>], <span class="num">1.0</span>
    filtered = [x]

    <span class="kw">for</span> z <span class="kw">in</span> closes[<span class="num">1</span>:]:
        P  += Q                 <span class="cmt"># Predict</span>
        K   = P / (P + R)      <span class="cmt"># Kalman Gain</span>
        x  += K * (z - x)      <span class="cmt"># Update state</span>
        P   = (<span class="num">1</span> - K) * P      <span class="cmt"># Update covariance</span>
        filtered.append(x)

    slope = [filtered[i] - filtered[i-<span class="num">1</span>]
             <span class="kw">for</span> i <span class="kw">in</span> range(<span class="num">1</span>, len(filtered))]
    <span class="kw">return</span> filtered, slope` },

    { id:'5_4', cat:5, name:'Factor Model (Value + Momentum)', difficulty:'Expert', indicators:['P/E Ratio','ROE','20D Momentum'],
      desc:'A multi-factor model inspired by Fama-French. Rank stocks by a composite score combining value (low P/E), quality (high ROE), and momentum (20D returns). Buy top decile.',
      entry:['Composite Factor Score > 65/100'],
      exit: ['Score drops below 40/100'],
      stop: ['Fundamentals deteriorate significantly (next quarter)'],
      risk: 'Factor models work best with a portfolio of 15–30 stocks, rebalanced monthly.',
      signalFn: SE.signal_5_4,
      manualInputs: [
        { key:'pe',         label:'P/E Ratio',               placeholder:'e.g. 18.5' },
        { key:'roe',        label:'ROE % (Return on Equity)',placeholder:'e.g. 22' },
        { key:'momentum20d',label:'20-Day Momentum %',       placeholder:'e.g. 8.5' },
        { key:'avgPE',      label:'Sector Avg P/E',          placeholder:'e.g. 25' },
      ],
      pseudocode: `<span class="kw">def</span> <span class="fn">factor_score</span>(stock, universe):
    <span class="cmt"># Value: low P/E relative to sector</span>
    value_rank = stock[<span class="str">'pe_ratio'</span>].rank(pct=<span class="kw">True</span>, ascending=<span class="kw">False</span>)

    <span class="cmt"># Quality: high ROE</span>
    quality_rank = stock[<span class="str">'roe'</span>].rank(pct=<span class="kw">True</span>)

    <span class="cmt"># Momentum: 20-day return</span>
    mom_rank = stock[<span class="str">'momentum_20d'</span>].rank(pct=<span class="kw">True</span>)

    <span class="cmt"># Composite score (weights)</span>
    score = (<span class="num">0.35</span>*value_rank + <span class="num">0.35</span>*quality_rank + <span class="num">0.30</span>*mom_rank)
    <span class="kw">return</span> score[score &gt; <span class="num">0.65</span>]  <span class="cmt"># top 35% → BUY</span>` },

    // --- Category 6: Machine Learning ---
    { id:'6_1', cat:6, name:'Random Forest Signal', difficulty:'Expert', indicators:['RSI','EMA Bias','Momentum','Volume Ratio','ATR%'],
      desc:'Train a Random Forest classifier on historical OHLCV features to predict next-day direction. Feature importances reveal which indicators matter most for each stock.',
      entry:['Model outputs BUY probability > 65%'],
      exit: ['Model probability drops < 40% or SELL probability > 60%'],
      stop: ['1 ATR from entry (regardless of model output)'],
      risk: 'Retrain model monthly. Avoid overfitting — use walk-forward validation only.',
      signalFn: SE.signal_6_1,
      pseudocode: `<span class="kw">from</span> sklearn.ensemble <span class="kw">import</span> RandomForestClassifier
<span class="kw">import</span> pandas <span class="kw">as</span> pd

<span class="kw">def</span> <span class="fn">rf_signal</span>(df):
    df[<span class="str">'rsi'</span>]     = <span class="fn">compute_rsi</span>(df[<span class="str">'close'</span>], <span class="num">14</span>)
    df[<span class="str">'ema_cross'</span>] = df[<span class="str">'close'</span>].ewm(<span class="num">9</span>).mean() > df[<span class="str">'close'</span>].ewm(<span class="num">21</span>).mean()
    df[<span class="str">'mom_5d'</span>]   = df[<span class="str">'close'</span>].pct_change(<span class="num">5</span>)
    df[<span class="str">'vol_ratio'</span>] = df[<span class="str">'volume'</span>] / df[<span class="str">'volume'</span>].rolling(<span class="num">20</span>).mean()
    df[<span class="str">'atr_pct'</span>]   = <span class="fn">compute_atr</span>(df, <span class="num">14</span>) / df[<span class="str">'close'</span>]

    features = [<span class="str">'rsi'</span>, <span class="str">'ema_cross'</span>, <span class="str">'mom_5d'</span>, <span class="str">'vol_ratio'</span>, <span class="str">'atr_pct'</span>]
    target   = (df[<span class="str">'close'</span>].shift(-<span class="num">1</span>) > df[<span class="str">'close'</span>]).astype(<span class="fn">int</span>)

    model = <span class="fn">RandomForestClassifier</span>(n_estimators=<span class="num">100</span>)
    model.<span class="fn">fit</span>(df[features].dropna(), target.dropna())
    proba = model.<span class="fn">predict_proba</span>(df[features])[:, <span class="num">1</span>]
    <span class="kw">return</span> proba  <span class="cmt"># probability of next-day UP move</span>` },

    { id:'6_2', cat:6, name:'LSTM Price Predictor', difficulty:'Expert', indicators:['LSTM','OHLCV Sequences','Kalman Trend Proxy'],
      desc:'Long Short-Term Memory neural networks capture temporal patterns in price sequences. Train on 60-day OHLCV windows to predict 5-day ahead returns.',
      entry:['5-day predicted return > +2%'],
      exit: ['5-day predicted return < 0 or position duration exceeded'],
      stop: ['1.5 ATR from entry'],
      risk: 'LSTM models are sensitive to market regime shifts. Always paper-trade for 1 month before live.',
      signalFn: SE.signal_6_2,
      pseudocode: `<span class="kw">from</span> tensorflow.keras.models <span class="kw">import</span> Sequential
<span class="kw">from</span> tensorflow.keras.layers <span class="kw">import</span> LSTM, Dense, Dropout

<span class="kw">def</span> <span class="fn">build_lstm</span>(seq_len=<span class="num">60</span>, features=<span class="num">5</span>):
    model = <span class="fn">Sequential</span>([
        <span class="fn">LSTM</span>(<span class="num">128</span>, return_sequences=<span class="kw">True</span>,
             input_shape=(seq_len, features)),
        <span class="fn">Dropout</span>(<span class="num">0.2</span>),
        <span class="fn">LSTM</span>(<span class="num">64</span>, return_sequences=<span class="kw">False</span>),
        <span class="fn">Dropout</span>(<span class="num">0.2</span>),
        <span class="fn">Dense</span>(<span class="num">32</span>, activation=<span class="str">'relu'</span>),
        <span class="fn">Dense</span>(<span class="num">1</span>)  <span class="cmt"># 5-day return prediction</span>
    ])
    model.<span class="fn">compile</span>(optimizer=<span class="str">'adam'</span>, loss=<span class="str">'mse'</span>)
    <span class="kw">return</span> model

<span class="cmt"># Training: Use walk-forward validation!</span>
<span class="cmt"># X shape: (samples, 60, 5) — 60 days × OHLCV</span>
<span class="cmt"># y shape: (samples,) — 5-day forward return</span>` },

    { id:'6_3', cat:6, name:'K-Means Regime Detector', difficulty:'Expert', indicators:['ATR%','20D Momentum','Volume Ratio','K-Means'],
      desc:'Use K-Means clustering to identify market regimes (Bull Trend, Bear Trend, High Volatility, Sideways) from multi-dimensional feature space. Apply different strategies per regime.',
      entry:['In Bull Trend regime → use trend strategies','In Sideways regime → use mean-reversion'],
      exit: ['Regime shift detected → switch strategy'],
      stop: ['Regime-specific stops'],
      risk: 'Regime detection with 3–5 clusters. Retrain monthly. Use PCA to reduce feature dimensions.',
      signalFn: SE.signal_6_3,
      pseudocode: `<span class="kw">from</span> sklearn.cluster <span class="kw">import</span> KMeans
<span class="kw">from</span> sklearn.preprocessing <span class="kw">import</span> StandardScaler

<span class="kw">def</span> <span class="fn">detect_regime</span>(df, n_regimes=<span class="num">4</span>):
    features = pd.DataFrame({
        <span class="str">'atr_pct'</span>:   <span class="fn">compute_atr_pct</span>(df),
        <span class="str">'momentum'</span>:  df[<span class="str">'close'</span>].pct_change(<span class="num">20</span>),
        <span class="str">'vol_ratio'</span>: df[<span class="str">'volume'</span>] / df[<span class="str">'volume'</span>].rolling(<span class="num">20</span>).mean(),
        <span class="str">'rsi'</span>:       <span class="fn">compute_rsi</span>(df[<span class="str">'close'</span>], <span class="num">14</span>),
    }).dropna()

    scaler = <span class="fn">StandardScaler</span>()
    X = scaler.<span class="fn">fit_transform</span>(features)
    kmeans = <span class="fn">KMeans</span>(n_clusters=n_regimes, random_state=<span class="num">42</span>)
    labels = kmeans.<span class="fn">fit_predict</span>(X)
    <span class="kw">return</span> labels  <span class="cmt"># 0=Bull, 1=Bear, 2=HighVol, 3=Sideways</span>` },

    { id:'6_4', cat:6, name:'Sentiment-Driven Entry', difficulty:'Advanced', indicators:['NLP Sentiment Score','RSI-14'],
      desc:'Combine NLP-derived news/social media sentiment scores (0–100) with price-based RSI for a dual-confirmation entry. High sentiment + oversold RSI = strong buy signal.',
      entry:['Sentiment Score > 65 AND RSI < 55'],
      exit: ['Sentiment Score drops < 40 OR RSI > 70'],
      stop: ['1 ATR from entry'],
      risk: 'News sentiment APIs (Refinitiv, Alphasense, or free: NewsAPI + VADER) provide the score. Update intraday.',
      signalFn: SE.signal_6_4,
      manualInputs: [{ key:'sentimentScore', label:'Sentiment Score (0=Bearish, 100=Bullish)', placeholder:'e.g. 72' }],
      pseudocode: `<span class="kw">from</span> vaderSentiment.vaderSentiment <span class="kw">import</span> SentimentIntensityAnalyzer
<span class="kw">import</span> requests

<span class="kw">def</span> <span class="fn">get_sentiment</span>(symbol):
    <span class="cmt"># Fetch recent news headlines</span>
    news = requests.<span class="fn">get</span>(
        <span class="str">f'https://newsapi.org/v2/everything?q={symbol}&apiKey=YOUR_KEY'</span>
    ).json()[<span class="str">'articles'</span>][:<span class="num">20</span>]

    sid = <span class="fn">SentimentIntensityAnalyzer</span>()
    scores = [sid.<span class="fn">polarity_scores</span>(a[<span class="str">'title'</span>])[<span class="str">'compound'</span>]
              <span class="kw">for</span> a <span class="kw">in</span> news]
    <span class="cmt"># Normalize to 0–100</span>
    <span class="kw">return</span> (<span class="fn">sum</span>(scores) / <span class="fn">len</span>(scores) + <span class="num">1</span>) / <span class="num">2</span> * <span class="num">100</span>

<span class="kw">def</span> <span class="fn">sentiment_entry</span>(sentiment_score, rsi):
    <span class="kw">if</span>   sentiment_score &gt; <span class="num">65</span> <span class="kw">and</span> rsi &lt; <span class="num">55</span>: <span class="kw">return</span> <span class="str">'BUY'</span>
    <span class="kw">elif</span> sentiment_score &lt; <span class="num">35</span> <span class="kw">and</span> rsi &gt; <span class="num">45</span>: <span class="kw">return</span> <span class="str">'SELL'</span>
    <span class="kw">else</span>: <span class="kw">return</span> <span class="str">'HOLD'</span>` },

    // --- Category 7: Hybrid / Smart ---
    { id:'7_1', cat:7, name:'RSI + MACD Confluence', difficulty:'Intermediate', indicators:['RSI-14','MACD(12,26,9)'],
      desc:'Only enter when both RSI and MACD agree on direction. Eliminates many false signals by requiring dual confirmation. The strongest setup is RSI oversold + MACD bullish cross.',
      entry:['RSI < 40 AND MACD bullish cross → strong BUY','RSI > 60 AND MACD > Signal → trend continuation BUY'],
      exit: ['Either RSI > 70 OR MACD bearish cross'],
      stop: ['2% below entry'],
      risk: 'Confluence reduces trade frequency but dramatically improves win rate.',
      signalFn: SE.signal_7_1,
      pseudocode: `<span class="kw">def</span> <span class="fn">rsi_macd_confluence</span>(closes):
    rsi  = <span class="fn">compute_rsi</span>(closes, <span class="num">14</span>)
    macd, signal, hist = <span class="fn">compute_macd</span>(closes)

    results = []
    <span class="kw">for</span> i <span class="kw">in</span> range(<span class="num">1</span>, min(len(rsi), len(macd))):
        bull_cross = macd[i] &gt; signal[i] <span class="kw">and</span> macd[i-<span class="num">1</span>] &lt;= signal[i-<span class="num">1</span>]
        bear_cross = macd[i] &lt; signal[i] <span class="kw">and</span> macd[i-<span class="num">1</span>] &gt;= signal[i-<span class="num">1</span>]

        <span class="kw">if</span>   rsi[i] &lt; <span class="num">40</span> <span class="kw">and</span> bull_cross: results.append(<span class="str">'STRONG_BUY'</span>)
        <span class="kw">elif</span> rsi[i] &gt; <span class="num">60</span> <span class="kw">and</span> bear_cross: results.append(<span class="str">'STRONG_SELL'</span>)
        <span class="kw">elif</span> bull_cross:                 results.append(<span class="str">'BUY'</span>)
        <span class="kw">elif</span> bear_cross:                 results.append(<span class="str">'SELL'</span>)
        <span class="kw">else</span>:                            results.append(<span class="str">'HOLD'</span>)
    <span class="kw">return</span> results` },

    { id:'7_2', cat:7, name:'Trend + Reversion Switcher', difficulty:'Advanced', indicators:['ADX-14','BB(20,2)','Supertrend'],
      desc:'Intelligently switch between trend-following and mean-reversion based on ADX. If ADX > 25 (strong trend) → use Supertrend. If ADX < 20 (choppy) → use Bollinger Band Reversion.',
      entry:['ADX > 25: Supertrend flip → BUY','ADX < 20: Price at Lower BB → BUY'],
      exit: ['Mode-specific exit rules'],
      stop: ['Mode-specific stops'],
      risk: 'This meta-strategy avoids the classic trap of using trend strategies in ranging markets.',
      signalFn: SE.signal_7_2,
      pseudocode: `<span class="kw">def</span> <span class="fn">adaptive_strategy</span>(df):
    adx = <span class="fn">compute_adx</span>(df, <span class="num">14</span>)
    signals = []

    <span class="kw">for</span> i <span class="kw">in</span> range(len(df)):
        <span class="kw">if</span> adx[i] &gt; <span class="num">25</span>:
            <span class="cmt"># Trend-following mode</span>
            sig = <span class="fn">supertrend_signal</span>(df, i)
        <span class="kw">elif</span> adx[i] &lt; <span class="num">20</span>:
            <span class="cmt"># Mean-reversion mode</span>
            sig = <span class="fn">bollinger_reversion_signal</span>(df, i)
        <span class="kw">else</span>:
            <span class="cmt"># Transition zone — stay flat</span>
            sig = <span class="str">'HOLD'</span>
        signals.append(sig)
    <span class="kw">return</span> signals` },

    { id:'7_3', cat:7, name:'Multi-Timeframe Momentum', difficulty:'Advanced', indicators:['Weekly EMA-10/20','Daily MACD'],
      desc:'Higher timeframe confirms the macro trend, lower timeframe provides the entry. Weekly EMA alignment + daily MACD bullish cross = high-conviction trade.',
      entry:['Weekly EMA-10 > EMA-20 (uptrend) AND Daily MACD bullish cross'],
      exit: ['Daily MACD bearish cross OR Weekly EMA-10 crosses below EMA-20'],
      stop: ['Below weekly EMA-10'],
      risk: 'Multi-timeframe confluence is the single highest-impact technique to improve signal quality.',
      signalFn: SE.signal_7_3,
      pseudocode: `<span class="kw">def</span> <span class="fn">multi_timeframe</span>(daily_df, weekly_df):
    <span class="cmt"># Weekly trend filter</span>
    w_ema10 = weekly_df[<span class="str">'close'</span>].ewm(span=<span class="num">10</span>).mean()
    w_ema20 = weekly_df[<span class="str">'close'</span>].ewm(span=<span class="num">20</span>).mean()
    weekly_bull = w_ema10.iloc[-<span class="num">1</span>] &gt; w_ema20.iloc[-<span class="num">1</span>]

    <span class="cmt"># Daily entry trigger</span>
    d_macd, d_sig, _ = <span class="fn">compute_macd</span>(daily_df[<span class="str">'close'</span>])
    daily_cross = (d_macd[-<span class="num">1</span>] &gt; d_sig[-<span class="num">1</span>]) <span class="kw">and</span> (d_macd[-<span class="num">2</span>] &lt;= d_sig[-<span class="num">2</span>])

    <span class="kw">if</span>   weekly_bull <span class="kw">and</span> daily_cross: <span class="kw">return</span> <span class="str">'STRONG_BUY'</span>
    <span class="kw">elif</span> <span class="kw">not</span> weekly_bull <span class="kw">and</span> daily_cross: <span class="kw">return</span> <span class="str">'HOLD'</span>  <span class="cmt"># fade the bounce</span>
    <span class="kw">else</span>: <span class="kw">return</span> <span class="str">'HOLD'</span>` },

    { id:'7_4', cat:7, name:'Smart Trailing + Volume Exit', difficulty:'Advanced', indicators:['Supertrend','Volume MA','Volume Exhaustion'],
      desc:'Enter on a Supertrend bullish flip. Use the Supertrend line as a trailing stop BUT add an early exit rule: if volume declines to < 60% of its 5-day average while in a trend, exit early to protect profits.',
      entry:['Supertrend flips bullish'],
      exit: ['Supertrend flips bearish (normal) OR Volume < 60% of 5-day avg (early exit)'],
      stop: ['Supertrend line (dynamic trailing)'],
      risk: 'Volume exhaustion early exit preserves profits in distribution phases before the official trend reversal.',
      signalFn: SE.signal_7_4,
      pseudocode: `<span class="kw">def</span> <span class="fn">smart_trailing_exit</span>(df):
    st_dir, st_val = <span class="fn">supertrend</span>(df, <span class="num">10</span>, <span class="num">3</span>)
    vol_5d_avg = df[<span class="str">'volume'</span>].rolling(<span class="num">5</span>).mean()

    signals = []
    in_trade = <span class="kw">False</span>
    <span class="kw">for</span> i <span class="kw">in</span> range(len(df)):
        vol_ratio = df[<span class="str">'volume'</span>].iloc[i] / vol_5d_avg.iloc[i]
        trend_flip_up   = st_dir[i]==<span class="num">1</span> <span class="kw">and</span> (i==<span class="num">0</span> <span class="kw">or</span> st_dir[i-<span class="num">1</span>]==-<span class="num">1</span>)
        trend_flip_down = st_dir[i]==-<span class="num">1</span>

        <span class="kw">if</span> trend_flip_up:
            signals.append(<span class="str">'BUY'</span>); in_trade=<span class="kw">True</span>
        <span class="kw">elif</span> in_trade <span class="kw">and</span> vol_ratio &lt; <span class="num">0.6</span>:
            signals.append(<span class="str">'SELL'</span>)  <span class="cmt"># volume exhaustion early exit</span>
            in_trade=<span class="kw">False</span>
        <span class="kw">elif</span> trend_flip_down:
            signals.append(<span class="str">'SELL'</span>); in_trade=<span class="kw">False</span>
        <span class="kw">else</span>:
            signals.append(<span class="str">'HOLD'</span>)
    <span class="kw">return</span> signals` },
];

const GLOSSARY = [
    { term:'EMA', def:'Exponential Moving Average — gives more weight to recent prices, responds faster than SMA.' },
    { term:'RSI', def:'Relative Strength Index — oscillator (0–100) measuring speed of price change. <30=oversold, >70=overbought.' },
    { term:'MACD', def:'Moving Average Convergence Divergence — trend-following momentum indicator using EMA differences.' },
    { term:'ATR', def:'Average True Range — measures market volatility by averaging the true price range over N periods.' },
    { term:'ADX', def:'Average Directional Index — measures trend strength (not direction). >25=strong trend, <20=ranging.' },
    { term:'BB', def:'Bollinger Bands — SMA ± 2 standard deviations. Bands expand in volatile markets, contract in calm ones.' },
    { term:'Z-Score', def:'Standard score = (value - mean) / std_dev. How many standard deviations above/below the mean.' },
    { term:'PSAR', def:'Parabolic SAR — trailing stop indicator that places dots above (bearish) or below (bullish) price.' },
    { term:'Supertrend', def:'ATR-based trailing stop indicator. Direction flip signals trend reversal.' },
    { term:'+DI / -DI', def:'Directional Indicators (+DI, -DI) — components of ADX showing direction of trend.' },
    { term:'Donchian', def:'Donchian Channel — highest high and lowest low over N periods. Used by Turtle Traders.' },
    { term:'Keltner', def:'Keltner Channel — EMA ± (ATR × multiplier). Similar to BB but uses ATR for bandwidth.' },
    { term:'LinReg', def:'Linear Regression — fits a best-fit line through N candles. Slope indicates trend direction.' },
    { term:'Kalman', def:'Kalman Filter — statistical filter that removes noise from price data using predict-update cycles.' },
    { term:'VIX', def:'India VIX — CBOE-style fear gauge for NSE. >20=high fear, <15=calm, >25=panic.' },
    { term:'ORB', def:'Opening Range Breakout — High/Low of first N minutes after market open used as breakout levels.' },
    { term:'OHLCV', def:'Open, High, Low, Close, Volume — the standard format for price data.' },
    { term:'Spread (Pairs)', def:'Price difference between two correlated stocks. Used in pair trading strategies.' },
];

// ============================================================
//  STATE
// ============================================================

let currentSymbol = 'RELIANCE';
let currentOHLCV  = null;
let currentSource = 'demo';
let activeCategory = 0; // 0 = all

// ============================================================
//  RENDER ENGINE
// ============================================================

function renderAll() {
    renderCategoryTabs();
    renderStrategies();
    renderGlossary();
}

function renderCategoryTabs() {
    const container = document.getElementById('algoCategoryTabs');
    if (!container) return;
    const allBtn = `<button class="algo-cat-tab ${activeCategory===0?'active':''}" data-cat="0" onclick="setCategory(0)">
        All <span class="tab-count">${STRATEGIES.length}</span></button>`;
    const catBtns = CATEGORIES.map(c => {
        const count = STRATEGIES.filter(s => s.cat === c.id).length;
        return `<button class="algo-cat-tab ${activeCategory===c.id?'active':''}" data-cat="${c.id}" onclick="setCategory(${c.id})">
            ${c.icon} ${c.name} <span class="tab-count">${count}</span></button>`;
    }).join('');
    container.innerHTML = allBtn + catBtns;
}

function renderStrategies() {
    const container = document.getElementById('algoStrategiesContainer');
    if (!container) return;
    const visible = activeCategory === 0 ? STRATEGIES : STRATEGIES.filter(s => s.cat === activeCategory);
    const grouped  = {};
    visible.forEach(s => { if (!grouped[s.cat]) grouped[s.cat] = []; grouped[s.cat].push(s); });

    container.innerHTML = Object.entries(grouped).map(([catId, strategies]) => {
        const cat = CATEGORIES.find(c => c.id === parseInt(catId));
        return `
        <section class="category-section" id="cat-section-${catId}">
            <div class="category-section-header cat-header-${catId}">
                <span>${cat.icon} ${cat.name}</span>
                <span class="text-opacity-70" style="font-size:0.78rem;font-weight:400;">${cat.desc}</span>
                <span class="cat-strategy-count">${strategies.length} strategies</span>
            </div>
            ${strategies.map(s => renderStrategyCard(s)).join('')}
        </section>`;
    }).join('');

    // Re-run signals if OHLCV data is available
    if (currentOHLCV) {
        STRATEGIES.forEach(s => updateSignalPanel(s.id, currentOHLCV));
    }
}

function renderStrategyCard(s) {
    const cat = CATEGORIES.find(c => c.id === s.cat);
    const indicators = s.indicators.map(i => `<span class="indicator-chip">${i}</span>`).join('');
    const entryRules = s.entry.map(r => `<tr><td class="pe-2 rule-entry py-1">ENTRY</td><td class="py-1">${r}</td></tr>`).join('');
    const exitRules  = s.exit.map(r  => `<tr><td class="pe-2 rule-exit py-1">EXIT</td><td class="py-1">${r}</td></tr>`).join('');
    const stopRules  = s.stop.map(r  => `<tr><td class="pe-2 rule-stop py-1">STOP</td><td class="py-1">${r}</td></tr>`).join('');

    const manualOverride = s.manualInputs ? `
    <div class="override-panel mt-3">
        <div class="d-flex align-items-center gap-2 mb-2">
            <i class="bi bi-sliders text-muted" style="font-size:0.85rem;"></i>
            <span style="font-size:0.75rem;color:var(--text-muted);">Manual Override / Additional Inputs</span>
        </div>
        <div class="row g-2">
            ${s.manualInputs.map(inp => `
            <div class="col-sm-6">
                <label class="form-label" style="font-size:0.72rem;color:var(--text-muted);">${inp.label}</label>
                <input type="number" class="override-input" id="override-${s.id}-${inp.key}" placeholder="${inp.placeholder}" data-strategy="${s.id}" data-key="${inp.key}" oninput="runManualOverride('${s.id}')">
            </div>`).join('')}
        </div>
    </div>` : '';

    return `
    <div class="strategy-card cat-${s.cat}" id="card-${s.id}" data-cat="${s.cat}">
        <div class="strategy-card-header" onclick="toggleCard('${s.id}')">
            <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="strategy-card-title">${s.name}</span>
                <span class="badge border font-monospace card-symbol-badge" style="font-size:0.68rem;padding:2px 6px;border-color:rgba(129,140,248,0.3);color:#818cf8;background:rgba(129,140,248,0.08);">${currentSymbol}</span>
                <div class="strategy-card-badges">
                    <span class="badge-difficulty difficulty-${s.difficulty.toLowerCase()}">${s.difficulty}</span>
                    <span class="badge-category" style="--category-color:var(--cat-${s.cat}-color);--category-color-muted:var(--cat-${s.cat}-muted);">${cat.name}</span>
                </div>
            </div>
            <div class="d-flex align-items-center gap-3">
                <div class="indicator-chips d-none d-md-flex">${indicators}</div>
                <div class="signal-badge loading" id="signal-badge-${s.id}">
                    <i class="bi bi-hourglass-split"></i> –
                </div>
                <i class="bi bi-chevron-down card-chevron"></i>
            </div>
        </div>
        <div class="strategy-card-body">
            <p class="text-secondary mb-3" style="font-size:0.85rem;">${s.desc}</p>
            <div class="row g-3 mb-3">
                <div class="col-md-5">
                    <h6 class="fw-bold mb-2" style="font-size:0.8rem;color:var(--text-muted);">ENTRY / EXIT / STOP RULES</h6>
                    <table class="rules-table w-100">
                        <tbody>${entryRules}${exitRules}${stopRules}</tbody>
                    </table>
                </div>
                <div class="col-md-7">
                    <h6 class="fw-bold mb-2 signal-panel-heading" style="font-size:0.8rem;color:var(--text-muted);">LIVE SIGNAL — <span class="current-stock-label text-white font-monospace">${currentSymbol}</span></h6>
                    <div class="signal-panel" id="signal-panel-${s.id}">
                        <div class="d-flex align-items-center gap-3 mb-2">
                            <div class="signal-badge loading" id="signal-badge-lg-${s.id}">
                                <i class="bi bi-hourglass-split"></i> Computing...
                            </div>
                            <small class="text-muted" id="signal-confidence-${s.id}">–</small>
                        </div>
                        <div class="confidence-bar"><div class="confidence-fill HOLD" id="conf-bar-${s.id}" style="width:0%"></div></div>
                        <p class="text-secondary mt-2 mb-2" id="signal-reason-${s.id}" style="font-size:0.78rem;">Running analysis...</p>
                        <div class="signal-values-grid" id="signal-values-${s.id}"></div>
                    </div>
                    ${manualOverride}
                </div>
            </div>
            <div class="mb-3">
                <h6 class="fw-bold mb-2" style="font-size:0.8rem;color:var(--text-muted);">PYTHON PSEUDOCODE</h6>
                <div class="code-terminal">
                    <div class="code-terminal-header">
                        <div class="d-flex align-items-center gap-2">
                            <div class="code-terminal-dots">
                                <span class="dot-r"></span><span class="dot-y"></span><span class="dot-g"></span>
                            </div>
                            <span class="code-terminal-filename">${s.name.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z_]/g,'')}.py</span>
                        </div>
                        <button class="code-terminal-copy" onclick="copyCode('${s.id}')">
                            <i class="bi bi-clipboard"></i> Copy
                        </button>
                    </div>
                    <div class="code-terminal-body">
                        <pre id="code-${s.id}"><code>${s.pseudocode}</code></pre>
                    </div>
                </div>
            </div>
            <div class="risk-note">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <span><strong>Risk Note:</strong> ${s.risk}</span>
            </div>
        </div>
    </div>`;
}

function renderGlossary() {
    const container = document.getElementById('algoGlossaryGrid');
    if (!container) return;
    container.innerHTML = GLOSSARY.map(g => `
    <div class="glossary-item">
        <div class="glossary-term">${g.term}</div>
        <div class="glossary-def">${g.def}</div>
    </div>`).join('');
}

// ============================================================
//  SIGNAL COMPUTATION & UI UPDATE
// ============================================================

function buildSignalData(ohlcv) {
    return {
        closes:  ohlcv.map(d => d.close),
        highs:   ohlcv.map(d => d.high),
        lows:    ohlcv.map(d => d.low),
        opens:   ohlcv.map(d => d.open),
        volumes: ohlcv.map(d => d.volume),
    };
}

async function runAllSignals(ohlcv) {
    const data = buildSignalData(ohlcv);
    for (const s of STRATEGIES) {
        try {
            const result = s.signalFn(data);
            updateSignalPanel(s.id, null, result);
        } catch (e) {
            console.warn(`Signal error for ${s.id}:`, e);
        }
    }
}

function updateSignalPanel(strategyId, ohlcv, result) {
    if (ohlcv && !result) {
        const s = STRATEGIES.find(x => x.id === strategyId);
        if (!s) return;
        try { result = s.signalFn(buildSignalData(ohlcv)); } catch { return; }
    }
    if (!result) return;

    const badge    = document.getElementById(`signal-badge-${strategyId}`);
    const badgeLg  = document.getElementById(`signal-badge-lg-${strategyId}`);
    const confBar  = document.getElementById(`conf-bar-${strategyId}`);
    const reason   = document.getElementById(`signal-reason-${strategyId}`);
    const confText = document.getElementById(`signal-confidence-${strategyId}`);
    const valGrid  = document.getElementById(`signal-values-${strategyId}`);

    const icon = result.signal === 'BUY' ? '🟢' : result.signal === 'SELL' ? '🔴' : '🟡';
    const html = `${icon} ${result.signal}`;

    [badge, badgeLg].forEach(el => {
        if (!el) return;
        el.className = `signal-badge ${result.signal}`;
        el.innerHTML = html;
    });

    if (confBar) {
        confBar.className = `confidence-fill ${result.signal}`;
        confBar.style.width = `${result.confidence}%`;
    }
    if (reason) reason.textContent = result.reason;
    if (confText) confText.textContent = `Confidence: ${result.confidence}%`;

    if (valGrid && result.values && Object.keys(result.values).length) {
        valGrid.innerHTML = Object.entries(result.values).map(([k, v]) => `
        <div class="signal-value-item">
            <span class="signal-value-label">${k}</span>
            <span class="signal-value-val">${v}</span>
        </div>`).join('');
    }
}

// ============================================================
//  DATA FETCH & STATUS
// ============================================================

// ============================================================
//  DATA FETCH & STATUS
// ============================================================

function updateStockMetricStrip(symbol, ohlcv, source) {
    const symBadge    = document.getElementById('stripSymbolBadge');
    const ltpEl       = document.getElementById('stripLTP');
    const changeBadge = document.getElementById('stripChangeBadge');
    const metaText    = document.getElementById('stripMetaText');
    const highEl      = document.getElementById('stripHigh');
    const lowEl       = document.getElementById('stripLow');
    const f52wEl      = document.getElementById('strip52w');
    const volEl       = document.getElementById('stripVolume');

    if (symBadge) symBadge.textContent = `NSE: ${symbol}`;

    const stats = getOHLCVStats(ohlcv);
    if (!stats) return;

    if (ltpEl) ltpEl.textContent = `₹${stats.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (changeBadge) {
        const isUp = stats.change >= 0;
        const sign = isUp ? '+' : '';
        changeBadge.textContent = `${sign}₹${stats.change.toFixed(2)} (${sign}${stats.changePercent.toFixed(2)}%)`;
        changeBadge.style.background = isUp ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';
        changeBadge.style.color = isUp ? '#22c55e' : '#ef4444';
    }

    if (highEl) highEl.textContent = `₹${stats.high.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (lowEl) lowEl.textContent = `₹${stats.low.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (f52wEl) f52wEl.textContent = `₹${stats.low52w.toLocaleString('en-IN', { maximumFractionDigits: 0 })} - ₹${stats.high52w.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    if (volEl) {
        const vol = stats.volume;
        volEl.textContent = vol >= 1e7 ? `${(vol / 1e7).toFixed(2)} Cr` : vol >= 1e5 ? `${(vol / 1e5).toFixed(2)} L` : vol >= 1e3 ? `${(vol / 1e3).toFixed(1)} K` : `${vol}`;
    }

    if (metaText) {
        const srcLabels = {
            kite: 'Real-time Zerodha Kite tick stream',
            groww: 'Real-time Groww trading data',
            yahoo: 'Yahoo Finance (15m delayed)',
            nse: 'NSE Official Historical endpoint',
            demo: 'Simulated high-frequency OHLCV walk'
        };
        const srcText = srcLabels[source] || 'Client-side engine';
        metaText.textContent = `Analyzed ${stats.count} daily bars in-browser via algo-signal-engine.js | Source: ${srcText}`;
    }

    // Instantly sync all card stock badges and live signal headings
    document.querySelectorAll('.current-stock-label').forEach(el => el.textContent = symbol);
    document.querySelectorAll('.card-symbol-badge').forEach(el => el.textContent = symbol);

    // Highlight active quick pill
    document.querySelectorAll('.algo-stock-chip').forEach(chip => {
        chip.classList.toggle('active', chip.getAttribute('data-symbol') === symbol);
    });
}

async function loadData(symbol) {
    const targetSymbol = (symbol || 'RELIANCE').toUpperCase().trim();
    currentSymbol = targetSymbol;

    const input = document.getElementById('algoSymbolInput');
    if (input && input.value !== targetSymbol) {
        input.value = targetSymbol;
    }

    // Stop previous auto-refresh so it doesn't overwrite with old symbol
    stopAutoRefresh();

    const btn = document.getElementById('algoRunBtn');
    if (btn) { btn.classList.add('loading'); btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Fetching...'; }
    updateStatusBar('loading');

    // Immediate UI feedback on symbol
    document.querySelectorAll('.current-stock-label').forEach(el => el.textContent = targetSymbol);
    document.querySelectorAll('.card-symbol-badge').forEach(el => el.textContent = targetSymbol);
    const symBadge = document.getElementById('stripSymbolBadge');
    if (symBadge) symBadge.textContent = `NSE: ${targetSymbol}`;

    try {
        const result = await fetchOHLCV(targetSymbol, '1y');
        currentOHLCV  = result.ohlcv;
        currentSymbol = result.symbol;
        currentSource = result.source;

        updateStatusBar(result.source, result.delayed);
        updateStockMetricStrip(currentSymbol, result.ohlcv, result.source);
        await runAllSignals(result.ohlcv);

        document.querySelectorAll('[id^="signal-panel-"] .text-muted').forEach(el => {
            if (el.textContent === 'Running analysis...') el.textContent = '';
        });

        // Restart auto-refresh for the newly active stock
        startAutoRefresh(currentSymbol, '1y', (refreshResult) => {
            currentOHLCV = refreshResult.ohlcv;
            updateStatusBar(refreshResult.source, refreshResult.delayed);
            updateStockMetricStrip(currentSymbol, refreshResult.ohlcv, refreshResult.source);
            runAllSignals(refreshResult.ohlcv);
        });
    } catch (e) {
        console.error('[AlgoScripts] Data load error:', e);
        updateStatusBar('error');
    }

    if (btn) { btn.classList.remove('loading'); btn.innerHTML = '<i class="bi bi-play-fill"></i> Run Signals'; }
}

function updateStatusBar(source, delayed) {
    const bar   = document.getElementById('algoStatusBar');
    const label = document.getElementById('algoStatusLabel');
    const dot   = document.getElementById('algoStatusDot');
    const ts    = document.getElementById('algoStatusTime');
    if (!bar) return;

    const sourceMap = {
        kite:    { text: '🟢 Kite Live (Real-time)',     cls: 'status-live' },
        groww:   { text: '🟢 Groww Live (Real-time)',    cls: 'status-live' },
        yahoo:   { text: '🟠 Yahoo Finance (15m Delay)', cls: 'status-delayed' },
        nse:     { text: '🟠 NSE India (15m Delay)',     cls: 'status-delayed' },
        demo:    { text: '⚪ Demo Mode (Sample Data)',   cls: 'status-demo' },
        loading: { text: '⏳ Fetching data...',          cls: 'status-demo' },
        error:   { text: '❌ Data fetch failed',         cls: 'status-demo' },
    };
    const info = sourceMap[source] || sourceMap.demo;
    if (label) label.textContent = info.text;
    bar.className = `algo-status-bar ${info.cls}`;
    if (ts) ts.textContent = `Updated: ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`;
}

// ============================================================
//  INTERACTIONS
// ============================================================

window.setCategory = function(catId) {
    activeCategory = catId;
    renderCategoryTabs();
    renderStrategies();
    if (currentOHLCV) {
        runAllSignals(currentOHLCV);
        updateStockMetricStrip(currentSymbol, currentOHLCV, currentSource);
    }
};

window.toggleCard = function(id) {
    const card = document.getElementById(`card-${id}`);
    if (card) card.classList.toggle('expanded');
};

window.copyCode = function(id) {
    const pre = document.getElementById(`code-${id}`);
    if (!pre) return;
    const text = pre.innerText;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector(`#card-${id} .code-terminal-copy`);
        if (btn) { btn.classList.add('copied'); btn.innerHTML = '<i class="bi bi-check-lg"></i> Copied!'; }
        setTimeout(() => { if (btn) { btn.classList.remove('copied'); btn.innerHTML = '<i class="bi bi-clipboard"></i> Copy'; } }, 2000);
    });
};

window.runManualOverride = function(strategyId) {
    const s = STRATEGIES.find(x => x.id === strategyId);
    if (!s || !s.manualInputs) return;
    const extraData = {};
    s.manualInputs.forEach(inp => {
        const el = document.getElementById(`override-${strategyId}-${inp.key}`);
        if (el && el.value) extraData[inp.key] = parseFloat(el.value);
    });
    const baseData = currentOHLCV ? buildSignalData(currentOHLCV) : { closes: getDemoData(currentSymbol).map(d => d.close), highs: [], lows: [], opens: [], volumes: [] };
    try {
        const result = s.signalFn({ ...baseData, ...extraData });
        updateSignalPanel(strategyId, null, result);
    } catch (e) { console.warn('Override error:', e); }
};

window.selectStock = function(sym) {
    loadData(sym);
};

// ============================================================
//  API SETTINGS MODAL
// ============================================================

window.openAPISettings = function() {
    const modal = document.getElementById('algoApiModal');
    if (!modal) return;
    const cfg = loadConfig();
    populateAPIForm(cfg);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
};

function populateAPIForm(cfg) {
    const z = cfg.zerodha, g = cfg.groww;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('zerodhaApiKey', z.apiKey); set('zerodhaApiSecret', z.apiSecret);
    set('growwApiKey',   g.apiKey); set('growwApiSecret',   g.apiSecret);
    const updateStatus = (broker, connected) => {
        const el = document.getElementById(`${broker}Status`);
        if (el) { el.textContent = connected ? '● Connected' : '● Not Connected'; el.className = `broker-status-badge ${connected?'connected':'disconnected'}`; }
    };
    updateStatus('zerodha', isConnected('zerodha'));
    updateStatus('groww', isConnected('groww'));
}

window.saveAPISettings = function() {
    const get = (id) => document.getElementById(id)?.value.trim() || '';
    updateBrokerKeys('zerodha', get('zerodhaApiKey'), get('zerodhaApiSecret'));
    updateBrokerKeys('groww',   get('growwApiKey'),   get('growwApiSecret'));
    document.getElementById('algoApiModal')?.querySelector('[data-bs-dismiss]')?.click();
    refreshProxyStatus().then(() => loadData(currentSymbol));
};

window.clearAPISettings = function() {
    if (confirm('Clear all stored API keys and tokens?')) {
        clearConfig();
        populateAPIForm({ zerodha: {}, groww: {} });
        loadData(currentSymbol);
    }
};

window.connectKite  = function() { initiateKiteAuth(); };
window.connectGroww = function() { initiateGrowwAuth(); };

// ============================================================
//  INIT
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Banner count
    const banner = document.getElementById('algoStrategyCount');
    if (banner) banner.textContent = STRATEGIES.length;

    // Render UI
    renderAll();

    // Check proxy
    const proxyOk = await pingProxy();

    // Stock selector
    const input = document.getElementById('algoSymbolInput');
    if (input) {
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                const sym = input.value.toUpperCase().trim() || 'RELIANCE';
                loadData(sym);
            }
        });
        input.addEventListener('change', () => {
            const sym = input.value.toUpperCase().trim() || 'RELIANCE';
            loadData(sym);
        });
    }

    const runBtn = document.getElementById('algoRunBtn');
    if (runBtn) {
        runBtn.addEventListener('click', () => {
            const sym = document.getElementById('algoSymbolInput')?.value.toUpperCase().trim() || 'RELIANCE';
            loadData(sym);
        });
    }

    // Quick stock switcher pills
    const quickPills = document.getElementById('algoQuickPills');
    if (quickPills) {
        quickPills.addEventListener('click', (e) => {
            const btn = e.target.closest('.algo-stock-chip');
            if (btn) {
                const sym = btn.getAttribute('data-symbol');
                if (sym) {
                    if (input) input.value = sym;
                    loadData(sym);
                }
            }
        });
    }

    // API config event listener
    window.addEventListener('algoApiConfigChanged', (e) => {
        populateAPIForm(loadConfig());
        loadData(currentSymbol);
    });

    // Initial data load (also handles auto-refresh internally)
    loadData(currentSymbol);

    // Typewriter hero
    const tw = document.getElementById('algoTypewriter');
    if (tw) {
        const text = 'algo-scripts --category=all --live';
        let i = 0;
        const typer = setInterval(() => { tw.textContent += text[i++]; if (i >= text.length) clearInterval(typer); }, 60);
    }
});

// CSS for spin animation
const style = document.createElement('style');
style.textContent = `.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`;
document.head.appendChild(style);
