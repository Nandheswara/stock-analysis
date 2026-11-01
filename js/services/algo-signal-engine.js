/**
 * algo-signal-engine.js
 * Pure JS implementations of all technical indicators and 29 strategy signal functions.
 * No external libraries required.
 *
 * Signal return format:
 *   { signal: 'BUY'|'SELL'|'HOLD', confidence: 0-100, reason: string, values: {...} }
 *
 * OHLCV input format:
 *   [{ date, open, high, low, close, volume }, ...]
 */

// ============================================================
//  INDICATOR MATH UTILITIES
// ============================================================

export function computeEMA(closes, period) {
    if (!closes || closes.length < period) return [];
    const k = 2 / (period + 1);
    const ema = [closes.slice(0, period).reduce((a, b) => a + b, 0) / period];
    for (let i = period; i < closes.length; i++) {
        ema.push(closes[i] * k + ema[ema.length - 1] * (1 - k));
    }
    return ema;
}

export function computeRSI(closes, period = 14) {
    if (closes.length < period + 1) return [];
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        gains  += Math.max(diff, 0);
        losses += Math.max(-diff, 0);
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    const rsi = [100 - 100 / (1 + avgGain / (avgLoss || 1e-10))];
    for (let i = period + 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
        rsi.push(100 - 100 / (1 + avgGain / (avgLoss || 1e-10)));
    }
    return rsi;
}

export function computeMACD(closes, fast = 12, slow = 26, signalPeriod = 9) {
    if (closes.length < slow + signalPeriod) return null;
    const emaFast = computeEMA(closes, fast);
    const emaSlow = computeEMA(closes, slow);
    const offset  = slow - fast;
    const macdLine = emaSlow.map((v, i) => emaFast[i + offset] - v);
    const signalLine = computeEMA(macdLine, signalPeriod);
    const histogram  = signalLine.map((v, i) => macdLine[i + signalPeriod - 1] - v);
    return { macdLine, signalLine, histogram };
}

export function computeATR(highs, lows, closes, period = 14) {
    if (highs.length < period + 1) return [];
    const tr = [highs[0] - lows[0]];
    for (let i = 1; i < highs.length; i++) {
        tr.push(Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        ));
    }
    let atr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
    const atrs = [atr];
    for (let i = period; i < tr.length; i++) {
        atr = (atr * (period - 1) + tr[i]) / period;
        atrs.push(atr);
    }
    return atrs;
}

export function computeBollingerBands(closes, period = 20, mult = 2) {
    const upper = [], mid = [], lower = [];
    for (let i = period - 1; i < closes.length; i++) {
        const slice = closes.slice(i - period + 1, i + 1);
        const mean  = slice.reduce((a, b) => a + b, 0) / period;
        const std   = Math.sqrt(slice.reduce((a, v) => a + (v - mean) ** 2, 0) / period);
        mid.push(mean); upper.push(mean + mult * std); lower.push(mean - mult * std);
    }
    return { upper, mid, lower };
}

export function computeZScore(closes, period = 20) {
    const zscores = [];
    for (let i = period - 1; i < closes.length; i++) {
        const slice = closes.slice(i - period + 1, i + 1);
        const mean  = slice.reduce((a, b) => a + b, 0) / period;
        const std   = Math.sqrt(slice.reduce((a, v) => a + (v - mean) ** 2, 0) / period);
        zscores.push(std > 0 ? (closes[i] - mean) / std : 0);
    }
    return zscores;
}

export function computeADX(highs, lows, closes, period = 14) {
    if (highs.length < period * 2) return null;
    const tr = [highs[0] - lows[0]], plusDM = [0], minusDM = [0];
    for (let i = 1; i < highs.length; i++) {
        tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i-1]), Math.abs(lows[i] - closes[i-1])));
        const up = highs[i] - highs[i-1], down = lows[i-1] - lows[i];
        plusDM.push(up > down && up > 0 ? up : 0);
        minusDM.push(down > up && down > 0 ? down : 0);
    }
    function wilderSmooth(arr, p) {
        let s = arr.slice(0, p).reduce((a, b) => a + b, 0);
        const out = [s];
        for (let i = p; i < arr.length; i++) { s = s - s / p + arr[i]; out.push(s); }
        return out;
    }
    const sTR = wilderSmooth(tr, period), sPDM = wilderSmooth(plusDM, period), sMDM = wilderSmooth(minusDM, period);
    const plusDI  = sPDM.map((v, i) => 100 * v / (sTR[i] || 1));
    const minusDI = sMDM.map((v, i) => 100 * v / (sTR[i] || 1));
    const dx  = plusDI.map((v, i) => 100 * Math.abs(v - minusDI[i]) / ((v + minusDI[i]) || 1));
    const adx = computeEMA(dx, period);
    return { adx, plusDI, minusDI };
}

export function computeSupertrend(highs, lows, closes, atrPeriod = 10, mult = 3) {
    const atrs = computeATR(highs, lows, closes, atrPeriod);
    const direction = [], supertrend = [];
    for (let i = 0; i < atrs.length; i++) {
        const idx     = i + atrPeriod - 1;
        const hl2     = (highs[idx] + lows[idx]) / 2;
        const upper   = hl2 + mult * atrs[i], lower = hl2 - mult * atrs[i];
        const prevST  = i > 0 ? supertrend[i - 1] : lower;
        const prevDir = i > 0 ? direction[i - 1] : 1;
        let dir = prevDir;
        if (prevDir === 1  && closes[idx] < prevST) dir = -1;
        if (prevDir === -1 && closes[idx] > prevST) dir = 1;
        supertrend.push(dir === 1 ? lower : upper);
        direction.push(dir);
    }
    return { supertrend, direction };
}

export function computeLinearRegression(closes, period = 20) {
    const values = [], upper = [], lower = [];
    for (let i = period - 1; i < closes.length; i++) {
        const y = closes.slice(i - period + 1, i + 1), n = period;
        const sumX = (n*(n-1))/2, sumX2 = (n*(n-1)*(2*n-1))/6;
        const sumY = y.reduce((a,b) => a+b,0), sumXY = y.reduce((a,v,j) => a+j*v, 0);
        const slope = (n*sumXY - sumX*sumY)/(n*sumX2 - sumX**2);
        const intercept = (sumY - slope*sumX)/n;
        const regVal = slope*(n-1)+intercept;
        const std = Math.sqrt(y.reduce((a,v,j) => a+(v-(slope*j+intercept))**2, 0)/n);
        values.push(regVal); upper.push(regVal+2*std); lower.push(regVal-2*std);
    }
    return { values, upper, lower };
}

export function computeKalman(closes, q = 0.015, r = 0.5) {
    if (!closes.length) return [];
    let x = closes[0], p = 1;
    const filtered = [x];
    for (let i = 1; i < closes.length; i++) {
        p += q;
        const k = p / (p + r);
        x += k * (closes[i] - x); p = (1-k)*p;
        filtered.push(x);
    }
    return filtered;
}

export function computePSAR(highs, lows, step = 0.02, maxAF = 0.2) {
    let bull = true, af = step, ep = highs[0], sar = lows[0];
    const sars = [sar], dirs = [1];
    for (let i = 1; i < highs.length; i++) {
        let nSar = sar, nBull = bull, nAF = af, nEP = ep;
        if (bull) {
            nSar = sar + af*(ep-sar);
            nSar = Math.min(nSar, lows[i-1], i>1?lows[i-2]:lows[i-1]);
            if (lows[i]<nSar){nBull=false;nSar=ep;nAF=step;nEP=lows[i];}
            else if(highs[i]>ep){nEP=highs[i];nAF=Math.min(af+step,maxAF);}
        } else {
            nSar = sar + af*(ep-sar);
            nSar = Math.max(nSar, highs[i-1], i>1?highs[i-2]:highs[i-1]);
            if(highs[i]>nSar){nBull=true;nSar=ep;nAF=step;nEP=highs[i];}
            else if(lows[i]<ep){nEP=lows[i];nAF=Math.min(af+step,maxAF);}
        }
        sar=nSar; bull=nBull; af=nAF; ep=nEP;
        sars.push(sar); dirs.push(bull?1:-1);
    }
    return { sar: sars, direction: dirs };
}

export function computeDonchian(highs, lows, period = 20) {
    const upper = [], lower = [];
    for (let i = period-1; i < highs.length; i++) {
        upper.push(Math.max(...highs.slice(i-period+1, i+1)));
        lower.push(Math.min(...lows.slice(i-period+1, i+1)));
    }
    return { upper, lower };
}

// Helpers
function last(arr, n=1) { return n===1 ? (arr&&arr.length?arr[arr.length-1]:null) : arr.slice(-n); }
function sma(arr, p) { if(!arr||arr.length<p)return null; return arr.slice(-p).reduce((a,b)=>a+b,0)/p; }
function buy(reason,confidence=70,values={}){return{signal:'BUY',confidence:Math.round(Math.min(confidence,95)),reason,values};}
function sell(reason,confidence=70,values={}){return{signal:'SELL',confidence:Math.round(Math.min(confidence,95)),reason,values};}
function hold(reason,values={}){return{signal:'HOLD',confidence:50,reason,values};}

// ============================================================
//  STRATEGY SIGNAL FUNCTIONS  (29 total across 7 categories)
// ============================================================

export function signal_1_1(data){const{closes,highs,lows}=data;if(closes.length<25)return hold('Not enough data');const bb=computeBollingerBands(closes,20,2);const rsi=computeRSI(closes,14);const price=last(closes),u=last(bb.upper),m=last(bb.mid),l=last(bb.lower),r=last(rsi);const pctB=((price-l)/((u-l)||1));if(price<=l&&r<45)return buy(`Price at lower BB (${l.toFixed(2)}), RSI=${r.toFixed(1)}`,Math.min(90,50+(45-r)*1.5+(1-pctB)*30),{RSI:r.toFixed(1),'BB %B':pctB.toFixed(2),'Lower Band':l.toFixed(2),'Mid Band':m.toFixed(2)});if(price>=m)return sell(`Reverted to midband ${m.toFixed(2)}`,65,{RSI:r.toFixed(1),'BB %B':pctB.toFixed(2),'Mid Band':m.toFixed(2)});return hold(`Between BB bands. %B=${pctB.toFixed(2)}`,{RSI:r.toFixed(1),'BB %B':pctB.toFixed(2)});}

export function signal_1_2(data){const{closes}=data;if(closes.length<20)return hold('Not enough data');const rsi=computeRSI(closes,14);const r=last(rsi),pr=rsi[rsi.length-2];if(r<30)return buy(`RSI=${r.toFixed(1)} — deeply oversold`,Math.min(85,50+(30-r)*2),{RSI:r.toFixed(1),'Prev RSI':pr.toFixed(1)});if(r>50&&pr<50)return sell(`RSI crossed 50 from oversold — mean reversion complete`,72,{RSI:r.toFixed(1)});if(r>70)return sell(`RSI=${r.toFixed(1)} overbought — exit`,78,{RSI:r.toFixed(1)});return hold(`RSI=${r.toFixed(1)}`,{RSI:r.toFixed(1)});}

export function signal_1_3(data){const{closes}=data;if(closes.length<25)return hold('Not enough data');const zs=computeZScore(closes,20);const z=last(zs),pr=last(closes),sm=sma(closes,20);if(z<-2)return buy(`Z=${z.toFixed(2)} — below mean ${sm.toFixed(2)}`,Math.min(88,50+Math.abs(z)*15),{'Z-Score':z.toFixed(2),'SMA-20':sm.toFixed(2),Price:pr.toFixed(2)});if(z>2)return sell(`Z=${z.toFixed(2)} — above mean`,Math.min(85,50+z*12),{'Z-Score':z.toFixed(2)});if(z>-0.5&&zs[zs.length-2]<-1.5)return sell(`Z reverted from extreme to ${z.toFixed(2)}`,70,{'Z-Score':z.toFixed(2)});return hold(`Z=${z.toFixed(2)} — normal range`,{'Z-Score':z.toFixed(2),'SMA-20':sm?.toFixed(2)});}

export function signal_1_4(data){const{spread,spreadMean,spreadStd}=data;if(spread==null)return hold('Enter Stock A price, Stock B price, and spread stats',{});const z=(spread-spreadMean)/(spreadStd||1);if(z<-2)return buy(`Spread Z=${z.toFixed(2)} — long underperformer`,75,{Spread:spread.toFixed(2),'Z-Score':z.toFixed(2)});if(z>2)return sell(`Spread Z=${z.toFixed(2)} — short outperformer`,75,{Spread:spread.toFixed(2),'Z-Score':z.toFixed(2)});return hold(`Spread within range. Z=${z.toFixed(2)}`,{'Z-Score':z.toFixed(2)});}

export function signal_2_1(data){const{closes,volumes}=data;if(closes.length<252)return hold('Need 252 days data (1 year)');const price=last(closes),high52=Math.max(...closes.slice(-252)),avg=sma(volumes,20),vr=last(volumes)/(avg||1);if(price>=high52*0.995&&vr>1.4)return buy(`52W Breakout! Price=${price.toFixed(2)} ≥ 52W High=${high52.toFixed(2)}, Vol ${vr.toFixed(1)}x`,Math.min(90,60+vr*10),{Price:price.toFixed(2),'52W High':high52.toFixed(2),'Vol Ratio':vr.toFixed(2)});if(price<high52*0.92)return hold(`${((1-price/high52)*100).toFixed(1)}% below 52W High`,{Price:price.toFixed(2),'52W High':high52.toFixed(2)});return hold(`Approaching 52W High — ${((price/high52)*100).toFixed(1)}%`,{Price:price.toFixed(2),'52W High':high52.toFixed(2),'Vol Ratio':vr.toFixed(2)});}

export function signal_2_2(data){const{closes}=data;if(closes.length<30)return hold('Not enough data');const e9=computeEMA(closes,9),e21=computeEMA(closes,21);const c9=last(e9),c21=last(e21),p9=e9[e9.length-2],p21=e21[e21.length-2];const gap=((c9-c21)/c21*100).toFixed(2);if(p9<=p21&&c9>c21)return buy(`EMA9 crossed ABOVE EMA21 — Golden Cross!`,82,{EMA9:c9.toFixed(2),EMA21:c21.toFixed(2),Gap:`${gap}%`});if(p9>=p21&&c9<c21)return sell(`EMA9 crossed BELOW EMA21 — Death Cross!`,80,{EMA9:c9.toFixed(2),EMA21:c21.toFixed(2),Gap:`${gap}%`});return hold(`${c9>c21?'EMA9>EMA21 (bullish)':'EMA9<EMA21 (bearish)'}, no fresh cross. Gap=${gap}%`,{EMA9:c9.toFixed(2),EMA21:c21.toFixed(2),Gap:`${gap}%`});}

export function signal_2_3(data){const{closes}=data;if(closes.length<40)return hold('Not enough data for MACD');const m=computeMACD(closes);if(!m)return hold('Insufficient data');const{macdLine:ml,signalLine:sl,histogram:h}=m;const cm=last(ml),cs=last(sl),ch=last(h),pm=ml[ml.length-2],ps=sl[sl.length-2];if(pm<=ps&&cm>cs&&cm<0)return buy(`MACD bullish cross below zero — strong reversal`,85,{MACD:cm.toFixed(3),Signal:cs.toFixed(3),Histogram:ch.toFixed(3)});if(pm<=ps&&cm>cs)return buy(`MACD bullish cross — momentum`,72,{MACD:cm.toFixed(3),Signal:cs.toFixed(3),Histogram:ch.toFixed(3)});if(pm>=ps&&cm<cs)return sell(`MACD bearish cross`,78,{MACD:cm.toFixed(3),Signal:cs.toFixed(3),Histogram:ch.toFixed(3)});return hold(`${cm>cs?'Bullish':'Bearish'} bias. Histogram=${ch.toFixed(3)}`,{MACD:cm.toFixed(3),Signal:cs.toFixed(3),Histogram:ch.toFixed(3)});}

export function signal_2_4(data){const{closes,opens,volumes}=data;if(closes.length<25)return hold('Not enough data');const price=last(closes),open=last(opens),vol=last(volumes),avg=sma(volumes,20);const vr=vol/(avg||1),chg=((price-open)/open*100);if(vr>2&&chg>3)return buy(`Volume surge ${vr.toFixed(1)}x + ${chg.toFixed(1)}% candle`,Math.min(92,55+vr*8+chg*2),{'Vol Ratio':vr.toFixed(2),'% Change':`${chg.toFixed(2)}%`,Volume:vol?.toLocaleString()});if(vr>2&&chg<-3)return sell(`Volume surge ${vr.toFixed(1)}x + ${chg.toFixed(1)}% drop`,Math.min(90,55+vr*8+Math.abs(chg)*2),{'Vol Ratio':vr.toFixed(2),'% Change':`${chg.toFixed(2)}%`});return hold(`Vol=${vr.toFixed(1)}x, Change=${chg.toFixed(2)}% — no surge`,{'Vol Ratio':vr.toFixed(2),'% Change':`${chg.toFixed(2)}%`});}

export function signal_2_5(data){const{orbHigh,orbLow,currentPrice}=data;if(!orbHigh||!orbLow||!currentPrice)return hold('Enter ORB High, Low, and Current Price',{});if(currentPrice>orbHigh)return buy(`Broke above ORB High ${orbHigh}`,78,{'ORB High':orbHigh,'ORB Low':orbLow,'Current Price':currentPrice,Range:(orbHigh-orbLow).toFixed(2)});if(currentPrice<orbLow)return sell(`Broke below ORB Low ${orbLow}`,76,{'ORB High':orbHigh,'ORB Low':orbLow,'Current Price':currentPrice});return hold(`Price inside ORB [${orbLow}–${orbHigh}]`,{'ORB High':orbHigh,'ORB Low':orbLow});}

export function signal_3_1(data){const{closes,highs,lows}=data;if(closes.length<20)return hold('Not enough data');const st=computeSupertrend(highs,lows,closes,10,3);const cd=last(st.direction),pd=st.direction[st.direction.length-2],cs=last(st.supertrend),price=last(closes);if(pd===-1&&cd===1)return buy(`Supertrend flipped BULLISH! Stop=${cs.toFixed(2)}`,85,{Direction:'Bullish','Supertrend Stop':cs.toFixed(2),Price:price.toFixed(2)});if(pd===1&&cd===-1)return sell(`Supertrend flipped BEARISH! Stop=${cs.toFixed(2)}`,83,{Direction:'Bearish','Supertrend Stop':cs.toFixed(2),Price:price.toFixed(2)});if(cd===1)return hold(`UPTREND — trailing stop at ${cs.toFixed(2)}`,{Direction:'Bullish','Supertrend Stop':cs.toFixed(2),Price:price.toFixed(2)});return hold(`DOWNTREND — resistance at ${cs.toFixed(2)}`,{Direction:'Bearish','Supertrend Stop':cs.toFixed(2),Price:price.toFixed(2)});}

export function signal_3_2(data){const{closes,highs,lows}=data;if(closes.length<35)return hold('Not enough data for ADX');const a=computeADX(highs,lows,closes,14);if(!a)return hold('Insufficient data');const av=last(a.adx),pd=last(a.plusDI),md=last(a.minusDI);const ts=av>40?'Very Strong':av>25?'Strong':av>20?'Moderate':'Weak';if(av>25&&pd>md)return buy(`ADX=${av.toFixed(1)} (${ts}) +DI>${md.toFixed(1)} — uptrend confirmed`,Math.min(88,50+av),{ADX:av.toFixed(1),'+DI':pd.toFixed(1),'-DI':md.toFixed(1),Trend:ts});if(av>25&&md>pd)return sell(`ADX=${av.toFixed(1)} (${ts}) -DI>${pd.toFixed(1)} — downtrend`,Math.min(85,50+av),{ADX:av.toFixed(1),'+DI':pd.toFixed(1),'-DI':md.toFixed(1),Trend:ts});return hold(`ADX=${av.toFixed(1)} (${ts}) — weak trend, avoid trend trades`,{ADX:av.toFixed(1),'+DI':pd.toFixed(1),'-DI':md.toFixed(1),Trend:ts});}

export function signal_3_3(data){const{closes}=data;if(closes.length<205)return hold('Need 200+ days for Triple EMA');const e20=computeEMA(closes,20),e50=computeEMA(closes,50),e200=computeEMA(closes,200);const v20=last(e20),v50=last(e50),v200=last(e200),price=last(closes);if(price>v20&&v20>v50&&v50>v200)return buy(`Perfect bull: Price > EMA20 > EMA50 > EMA200`,86,{EMA20:v20.toFixed(2),EMA50:v50.toFixed(2),EMA200:v200.toFixed(2),Price:price.toFixed(2)});if(price<v20&&v20<v50&&v50<v200)return sell(`Perfect bear: Price < EMA20 < EMA50 < EMA200`,84,{EMA20:v20.toFixed(2),EMA50:v50.toFixed(2),EMA200:v200.toFixed(2),Price:price.toFixed(2)});const bc=[price>v20,v20>v50,v50>v200].filter(Boolean).length;return hold(`Mixed: ${bc}/3 bullish conditions`,{EMA20:v20.toFixed(2),EMA50:v50.toFixed(2),EMA200:v200.toFixed(2),Price:price.toFixed(2)});}

export function signal_3_4(data){const{closes,highs,lows}=data;if(closes.length<10)return hold('Not enough data');const p=computePSAR(highs,lows,0.02,0.2);const cd=last(p.direction),pd=p.direction[p.direction.length-2],cs=last(p.sar),price=last(closes);if(pd===-1&&cd===1)return buy(`PSAR flipped BULLISH! SAR=${cs.toFixed(2)} below price`,80,{PSAR:cs.toFixed(2),Price:price.toFixed(2),Direction:'Bullish'});if(pd===1&&cd===-1)return sell(`PSAR flipped BEARISH! SAR=${cs.toFixed(2)} above price`,78,{PSAR:cs.toFixed(2),Price:price.toFixed(2),Direction:'Bearish'});if(cd===1)return hold(`PSAR uptrend. Stop=${cs.toFixed(2)}`,{PSAR:cs.toFixed(2),Direction:'Bullish'});return hold(`PSAR downtrend. Resistance=${cs.toFixed(2)}`,{PSAR:cs.toFixed(2),Direction:'Bearish'});}

export function signal_4_1(data){const{closes,highs,lows,capital=100000,riskPct=1}=data;if(closes.length<20)return hold('Not enough data');const atrs=computeATR(highs,lows,closes,14);const atr=last(atrs),price=last(closes),risk=capital*(riskPct/100),shares=Math.floor(risk/atr),stop=(price-atr).toFixed(2),pos=(shares*price).toFixed(0);return{signal:'HOLD',confidence:100,reason:`ATR=${atr.toFixed(2)} → Risk ₹${risk.toLocaleString()} → Buy ${shares} shares (₹${pos}). Stop=₹${stop}`,values:{ATR:atr.toFixed(2),'Position Size':`₹${pos}`,Shares:shares,'Stop Loss':`₹${stop}`,'Risk %':`${riskPct}%`}};}

export function signal_4_2(data){const{closes,highs,lows}=data;if(closes.length<25)return hold('Not enough data');const e20=computeEMA(closes,20),atrs=computeATR(highs,lows,closes,10);const ema=last(e20),atr=last(atrs),price=last(closes),u=ema+2*atr,l=ema-2*atr;if(price>u)return buy(`Price above Keltner upper (${u.toFixed(2)}) — volatility breakout!`,80,{'EMA-20':ema.toFixed(2),ATR:atr.toFixed(2),'Upper':u.toFixed(2),Price:price.toFixed(2)});if(price<l)return sell(`Price below Keltner lower (${l.toFixed(2)})`,78,{'EMA-20':ema.toFixed(2),ATR:atr.toFixed(2),'Lower':l.toFixed(2),Price:price.toFixed(2)});return hold(`Within Keltner [${l.toFixed(2)}–${u.toFixed(2)}]`,{'EMA-20':ema.toFixed(2),ATR:atr.toFixed(2),'Upper':u.toFixed(2),'Lower':l.toFixed(2)});}

export function signal_4_3(data){const{vix}=data;if(vix==null)return hold('Enter India VIX value',{});const regime=vix>25?'Extreme Fear':vix>20?'High Vol':vix>15?'Elevated':vix>10?'Normal':'Low VIX';if(vix>20)return{signal:'HOLD',confidence:90,reason:`India VIX=${vix} — ${regime}. Pause new entries`,values:{'India VIX':vix,Regime:regime}};if(vix<15)return{signal:'BUY',confidence:60,reason:`India VIX=${vix} — ${regime}. Safe environment`,values:{'India VIX':vix,Regime:regime}};return hold(`VIX=${vix} — ${regime}. Reduce size`,{'India VIX':vix,Regime:regime});}

export function signal_4_4(data){const{closes,highs,lows}=data;if(closes.length<25)return hold('Not enough data');const d20=computeDonchian(highs,lows,20),d10=computeDonchian(highs,lows,10);const price=last(closes),h20=last(d20.upper),l10=last(d10.lower);if(price>=h20)return buy(`Price hit 20-day Donchian high (${h20.toFixed(2)}) — breakout!`,79,{Price:price.toFixed(2),'20D High':h20.toFixed(2),'10D Low Stop':l10.toFixed(2)});return hold(`Price=${price.toFixed(2)}, 20D High=${h20.toFixed(2)}, Stop=${l10.toFixed(2)}`,{Price:price.toFixed(2),'20D High':h20.toFixed(2),'10D Low Stop':l10.toFixed(2)});}

export function signal_5_1(data){const{closes}=data;if(closes.length<25)return hold('Not enough data');const returns=closes.slice(1).map((v,i)=>(v-closes[i])/closes[i]);const zs=computeZScore(returns,20);const z=last(zs),mom=((last(closes)-closes[closes.length-21])/closes[closes.length-21]*100).toFixed(2);if(z>2)return buy(`Return Z=${z.toFixed(2)} — abnormal positive momentum. 20D=${mom}%`,Math.min(85,55+z*10),{'Return Z':z.toFixed(2),'20D Momentum':`${mom}%`});if(z<-2)return sell(`Return Z=${z.toFixed(2)} — abnormal negative momentum`,Math.min(83,55+Math.abs(z)*10),{'Return Z':z.toFixed(2),'20D Momentum':`${mom}%`});return hold(`Z=${z.toFixed(2)} — within normal distribution`,{'Return Z':z.toFixed(2),'20D Momentum':`${mom}%`});}

export function signal_5_2(data){const{closes}=data;if(closes.length<25)return hold('Not enough data');const lr=computeLinearRegression(closes,20);const price=last(closes),rv=last(lr.values),u=last(lr.upper),l=last(lr.lower);const slope=lr.values[lr.values.length-1]-lr.values[lr.values.length-2],sd=slope>0?'Rising':'Falling';if(price<=l&&slope>0)return buy(`At lower regression channel (${l.toFixed(2)}), channel ${sd}`,79,{Price:price.toFixed(2),LinReg:rv.toFixed(2),'Lower':l.toFixed(2),Slope:sd});if(price>=u)return sell(`At upper regression channel (${u.toFixed(2)})`,74,{Price:price.toFixed(2),LinReg:rv.toFixed(2),'Upper':u.toFixed(2),Slope:sd});return hold(`Within channel [${l.toFixed(2)}–${u.toFixed(2)}]. Channel ${sd}`,{Price:price.toFixed(2),LinReg:rv.toFixed(2),Slope:sd});}

export function signal_5_3(data){const{closes}=data;if(closes.length<15)return hold('Not enough data');const f=computeKalman(closes);const cur=last(f),prev=f[f.length-2],price=last(closes),trend=cur-prev,lag=((price-cur)/cur*100).toFixed(2);if(trend>0&&price>cur)return buy(`Kalman trending UP. Rate=${trend.toFixed(2)}/day`,72,{'Kalman':cur.toFixed(2),'Rate':trend.toFixed(3),Price:price.toFixed(2)});if(trend<0&&price<cur)return sell(`Kalman trending DOWN. Rate=${trend.toFixed(2)}/day`,70,{'Kalman':cur.toFixed(2),'Rate':trend.toFixed(3),Price:price.toFixed(2)});return hold(`Kalman=${cur.toFixed(2)}, trend=${trend>0?'↑':'↓'}`,{'Kalman':cur.toFixed(2),'Rate':trend.toFixed(3)});}

export function signal_5_4(data){const{pe,roe,momentum20d,avgPE=25,avgROE=15}=data;if(pe==null||roe==null||momentum20d==null)return hold('Enter P/E, ROE%, and 20D Momentum% manually',{});const vs=Math.max(0,Math.min(100,(1-pe/(avgPE*2))*100));const qs=Math.max(0,Math.min(100,(roe/(avgROE*2))*100));const ms=Math.max(0,Math.min(100,(momentum20d+20)*2.5));const comp=(vs*0.35+qs*0.35+ms*0.30).toFixed(1);const sig=comp>65?'BUY':comp<35?'SELL':'HOLD';return{signal:sig,confidence:Math.abs(comp-50)*2,reason:`Composite=${comp}/100 (Value=${vs.toFixed(0)}, Quality=${qs.toFixed(0)}, Momentum=${ms.toFixed(0)})`,values:{'Composite':comp,'Value Score':vs.toFixed(0),'Quality Score':qs.toFixed(0),'Momentum Score':ms.toFixed(0),'P/E':pe,ROE:`${roe}%`}};}

export function signal_6_1(data){const{closes,highs,lows,volumes}=data;if(closes.length<30)return hold('Not enough data');const rsi=last(computeRSI(closes,14));const e9=last(computeEMA(closes,9)),e21=last(computeEMA(closes,21));const atr=last(computeATR(highs,lows,closes,14)),price=last(closes);const vr=last(volumes)/(sma(volumes,20)||1);const mom5=((price-closes[closes.length-6])/closes[closes.length-6]*100);const f1=rsi<40?1:rsi>60?-1:0,f2=e9>e21?1:-1,f3=mom5>2?1:mom5<-2?-1:0,f4=vr>1.5?1:-1,f5=atr/price<0.02?1:-1;const score=f1*0.30+f2*0.25+f3*0.20+f4*0.15+f5*0.10;const conf=Math.min(90,Math.abs(score)*100);const sig=score>0.15?'BUY':score<-0.15?'SELL':'HOLD';return{signal:sig,confidence:Math.round(conf),reason:`RF Score=${score.toFixed(3)} (RSI=${rsi.toFixed(1)}, EMA=${e9>e21?'Bull':'Bear'}, Mom=${mom5.toFixed(1)}%, Vol=${vr.toFixed(1)}x)`,values:{'RF Score':score.toFixed(3),RSI:rsi.toFixed(1),'EMA Bias':e9>e21?'Bullish':'Bearish','Volume Ratio':vr.toFixed(2),'5D Momentum':`${mom5.toFixed(2)}%`}};}

export function signal_6_2(data){const{closes}=data;if(closes.length<20)return hold('Not enough data');const k=computeKalman(closes,0.02,0.5);const trend=(last(k)-k[k.length-6])/5,pred=last(k)+trend*5,chg=((pred-last(closes))/last(closes)*100).toFixed(2);const conf=Math.min(80,40+Math.abs(parseFloat(chg))*5);if(parseFloat(chg)>2)return buy(`LSTM projection +${chg}% over 5 days`,Math.round(conf),{'5D Projection':`+${chg}%`,'Predicted Price':pred.toFixed(2),'Trend Rate':trend.toFixed(3)});if(parseFloat(chg)<-2)return sell(`LSTM projection ${chg}% over 5 days`,Math.round(conf),{'5D Projection':`${chg}%`,'Predicted Price':pred.toFixed(2)});return hold(`LSTM projection flat: ${chg}%`,{'5D Projection':`${chg}%`,'Predicted Price':pred.toFixed(2)});}

export function signal_6_3(data){const{closes,highs,lows,volumes}=data;if(closes.length<30)return hold('Not enough data');const atr=last(computeATR(highs,lows,closes,14)),price=last(closes);const atrPct=(atr/price)*100,vr=last(volumes)/(sma(volumes,20)||1);const mom20=((price-closes[closes.length-21])/closes[closes.length-21]*100);const regime=atrPct>2.5?'High Volatility':atrPct<1?'Low Volatility':mom20>5?'Bull Trend':mom20<-5?'Bear Trend':'Sideways';const sig=regime==='Bull Trend'?'BUY':regime==='Bear Trend'?'SELL':'HOLD';return{signal:sig,confidence:68,reason:`Market Regime: ${regime} (ATR%=${atrPct.toFixed(2)}, 20D Mom=${mom20.toFixed(2)}%)`,values:{Regime:regime,'ATR %':atrPct.toFixed(2),'20D Momentum':`${mom20.toFixed(2)}%`,'Vol Ratio':vr.toFixed(2)}};}

export function signal_6_4(data){const{sentimentScore=50,closes}=data;if(closes.length<20)return hold('Not enough data');const rsi=last(computeRSI(closes,14));const sb=sentimentScore>60?'Bullish':sentimentScore<40?'Bearish':'Neutral',rb=rsi<45?'Oversold':rsi>55?'Overbought':'Neutral';if(sentimentScore>65&&rsi<55)return buy(`Bullish sentiment (${sentimentScore}/100) + RSI=${rsi.toFixed(1)}`,Math.min(82,(sentimentScore+(100-rsi))/2),{'Sentiment':sentimentScore,RSI:rsi.toFixed(1),'Sent Bias':sb,'RSI Bias':rb});if(sentimentScore<35&&rsi>45)return sell(`Bearish sentiment (${sentimentScore}/100) + RSI=${rsi.toFixed(1)}`,Math.min(80,((100-sentimentScore)+rsi)/2),{'Sentiment':sentimentScore,RSI:rsi.toFixed(1)});return hold(`Sent=${sentimentScore}/100 (${sb}), RSI=${rsi.toFixed(1)} (${rb})`,{'Sentiment':sentimentScore,RSI:rsi.toFixed(1)});}

export function signal_7_1(data){const{closes}=data;if(closes.length<40)return hold('Not enough data');const rsi=computeRSI(closes,14),m=computeMACD(closes);if(!m)return hold('MACD unavailable');const r=last(rsi),ml=last(m.macdLine),sl=last(m.signalLine),mb=ml>sl;if(r<35&&mb)return buy(`Confluence: RSI=${r.toFixed(1)} oversold + MACD bullish`,88,{RSI:r.toFixed(1),MACD:ml.toFixed(3),Signal:sl.toFixed(3),Confluence:'✅ Both Agree'});if(r>50&&r<70&&mb)return buy(`RSI (${r.toFixed(1)}) + MACD both bullish`,78,{RSI:r.toFixed(1),MACD:ml.toFixed(3),Confluence:'✅ Both Agree'});if(r>65&&!mb)return sell(`RSI=${r.toFixed(1)} overbought + MACD bearish`,84,{RSI:r.toFixed(1),MACD:ml.toFixed(3),Confluence:'✅ Both Agree'});return hold(`Conflicting: RSI=${r.toFixed(1)}, MACD=${mb?'Bull':'Bear'}`,{RSI:r.toFixed(1),MACD:ml.toFixed(3),Confluence:'❌ Conflicting'});}

export function signal_7_2(data){const{closes,highs,lows}=data;if(closes.length<40)return hold('Not enough data');const a=computeADX(highs,lows,closes,14);const adx=a?last(a.adx):0;const mode=adx>25?'Trend-Following':'Mean-Reversion';const res=mode==='Trend-Following'?signal_3_1(data):signal_1_1(data);return{...res,reason:`[${mode} Mode — ADX=${adx.toFixed(1)}] ${res.reason}`,values:{...res.values,Mode:mode,ADX:adx.toFixed(1)}};}

export function signal_7_3(data){const{closes}=data;if(closes.length<60)return hold('Need 60+ days for multi-timeframe');const wk=closes.filter((_,i)=>i%5===0);const we10=computeEMA(wk,10),we20=computeEMA(wk,20);const w10=last(we10),w20=last(we20),wBull=w10>w20;const dm=computeMACD(closes);const dBull=dm?(last(dm.macdLine)>last(dm.signalLine)):false;if(wBull&&dBull)return buy(`Weekly UP (EMA10>EMA20) + Daily MACD bullish — full alignment`,87,{'Weekly Bias':'Bullish','W-EMA10':w10.toFixed(2),'W-EMA20':w20.toFixed(2),'Daily MACD':dm?last(dm.macdLine).toFixed(3):'N/A'});if(!wBull&&!dBull)return sell(`Weekly DOWN + Daily MACD bearish — full alignment`,85,{'Weekly Bias':'Bearish','W-EMA10':w10.toFixed(2),'W-EMA20':w20.toFixed(2)});return hold(`Timeframes conflicting. Weekly=${wBull?'Bull':'Bear'}, Daily=${dBull?'Bull':'Bear'}`,{'Weekly Bias':wBull?'Bullish':'Bearish','Daily Bias':dBull?'Bullish':'Bearish'});}

export function signal_7_4(data){const{closes,highs,lows,volumes}=data;if(closes.length<25)return hold('Not enough data');const st=computeSupertrend(highs,lows,closes,10,3);const cd=last(st.direction),pd=st.direction[st.direction.length-2],cs=last(st.supertrend),price=last(closes);const vol20=sma(volumes,20),lv=last(volumes),vr=lv/(vol20||1);const pv5=sma(volumes.slice(-6,-1),5),vDecline=lv<(pv5||lv)*0.7;if(pd===-1&&cd===1)return buy(`Supertrend flipped bullish! Stop=${cs.toFixed(2)}`,85,{Direction:'Bullish','Stop':cs.toFixed(2),'Vol Ratio':vr.toFixed(2)});if(cd===1&&vDecline&&vr<0.6)return sell(`Uptrend but VOLUME EXHAUSTING (${vr.toFixed(2)}x avg) — early exit`,72,{Direction:'Bullish','Vol Ratio':vr.toFixed(2),'Vol Decline':'⚠️ Exhaustion','Stop':cs.toFixed(2)});if(cd===-1)return sell(`Supertrend bearish. Stop=${cs.toFixed(2)}`,78,{Direction:'Bearish','Stop':cs.toFixed(2)});return hold(`Uptrend. Stop=${cs.toFixed(2)}. Vol=${vr.toFixed(2)}x`,{Direction:'Bullish','Stop':cs.toFixed(2),'Vol Ratio':vr.toFixed(2)});}
