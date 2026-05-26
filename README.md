# Kestrel Terminal - Architectural & Algorithmic Deductions

This document provides detailed explanations of the mathematical models and algorithms deployed within the Kestrel Terminal for market analysis, signal generation, and prediction.

## Core Mathematical Models

The application computes several standard quantitative indicators on-the-fly using the `MathUtils` service. These feed into our primary signal detection state machine (`TokenStateService`).

### 1. Simple Moving Average (SMA)

The SMA smoothens out price data by creating a constantly updated average price.

**Mathematical Formula:**
```
SMA = (A1 + A2 + ... + An) / n
```
Where:
- `A` = Price at period `n`
- `n` = Number of total periods

**Implementation Details:**
We take the most recent `period` values from the price history and calculate the mean.

### 2. Standard Deviation (Volatility)

Standard deviation is applied to the rolling price array to define the localized volatility of a given asset.

**Mathematical Formula:**
```
σ = √[ Σ(xi - μ)² / N ]
```
Where:
- `xi = each value from the population`
- `μ = the population mean`
- `N = the size of the population`

### 3. Relative Strength Index (RSI)

RSI is a momentum oscillator that measures the speed and change of price movements. Kestrel uses a 14-period standard for defining "overbought" or "oversold" market conditions.

**Mathematical Formula:**
```
RSI = 100 - (100 / (1 + RS))
RS = Average Gain / Average Loss
```

**Implementation Details:**
- We calculate the changes in price `P(t) - P(t-1)`.
- If the change > 0, it's a gain. If < 0, it's a loss (absolute value).
- `Average Gain` = Sum of gains over 14 periods / 14
- `Average Loss` = Sum of losses over 14 periods / 14
- If `Average Loss` is 0, the RSI evaluates to 100 (if there are gains) or 50 (if the price is completely flat). 

_See `MathUtils.rsi(data, period)` for exact TypeScript implementation._

### 4. Linear Regression (Trajectory Prediction)

To determine the local trend vector and coefficient of determination (momentum sustainability), Kestrel fits the recent price history to a straight line using the least squares approach.

**Mathematical Formula:**
Using the equation of a line: `y = mx + b`

Slope (`m`):
```
m = (N(Σxy) - (Σx)(Σy)) / (N(Σx²) - (Σx)²)
```
Intercept (`b`):
```
b = (Σy - m(Σx)) / N
```
R-squared (`R²`):
```
R² = 1 - (SS_res / SS_tot)
```
Where `SS_res` is the sum of squares of residuals and `SS_tot` is the total sum of squares.

**Implementation Details:**
`MathUtils.linearRegression` calculates `m`, `b`, and `r2`. 
- `m` gives us the trajectory (upward slope > 0, downward < 0).
- `r2` gives us the confidence in this trend. If `R²` is near 1, it's a strong, clean trend. If near 0, the price action is choppy and the regression line shouldn't be trusted for signals.

## Algorithmic Strategy (The Brain)

Kestrel analyzes tokens in a continuous update loop. Each time price data is injected (either via WebSockets, REST APIs, or simulated ticks), the engine computes the current Market Regime and individually scores every token.

### Market Regime Detection
Calculates the aggregate volatility and directional slope across all tokens to declare a "Bull", "Bear", "Chop", or "Volatile" regime.

### Signal Generation Rules
*   **Whale Activity (Volume Spike):** Triggered if the latest volume is >2 standard deviations above the recent volume SMA.
*   **Momentum Shift:** Triggered if short-term MA crosses long-term MA.
*   **Overbought / Oversold:** Triggered if RSI > 75 (Overbought danger) or RSI < 25 (Oversold opportunity). 
*   **Trend Confirmation:** Uses the `r2` check from Linear Regression to validate the above signals before presenting them.

By combining deterministic mathematical bounds, we filter out noise and pipe high-confidence events to the Gemini AI module for contextual human-readable narratives.
