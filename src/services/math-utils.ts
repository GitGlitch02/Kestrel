export class MathUtils {
  static average(data: number[]): number {
    if (data.length === 0) return 0;
    return data.reduce((a, b) => a + b, 0) / data.length;
  }

  static sma(data: number[], period: number): number | null {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    return this.average(slice);
  }

  static stdDev(data: number[]): number {
    if (data.length < 2) return 0;
    const avg = this.average(data);
    const squareDiffs = data.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = this.average(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }

  static rsi(data: number[], period: number = 14): number | null {
    if (data.length < period + 1) return null;
    
    // Calculate changes
    const changes: number[] = [];
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i] - data[i - 1]);
    }

    // Need enough changes for the period
    if (changes.length < period) return null;

    // Use simple average for RS calculation (simplified for performance vs EMA)
    const recentChanges = changes.slice(-period);
    
    let gains = 0;
    let losses = 0;

    recentChanges.forEach(chg => {
      if (chg > 0) gains += chg;
      else losses += Math.abs(chg);
    });

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) {
      // Fix: if flat line (avgGain is also 0), return 50 (neutral), else 100 (max bull)
      return avgGain === 0 ? 50 : 100;
    }
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // Linear Regression for Prediction Engine
  // Returns slope (m), y-intercept (b), and R-squared (r2) for y = mx + b
  static linearRegression(data: number[]): { m: number, b: number, r2: number } | null {
    const n = data.length;
    if (n < 2) return null;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumXX += i * i;
    }

    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const b = (sumY - m * sumX) / n;

    // Calculate R-squared
    let ss_tot = 0;
    let ss_res = 0;
    const y_mean = this.average(data);
    for (let i = 0; i < n; i++) {
      const y_pred = m * i + b;
      ss_tot += (data[i] - y_mean) ** 2;
      ss_res += (data[i] - y_pred) ** 2;
    }
    
    const r2 = ss_tot === 0 ? 1 : 1 - (ss_res / ss_tot);

    return { m, b, r2 };
  }
}