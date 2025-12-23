# API Vendors for Dashboard Data Integration

## Consolidated Vendor List

### Top 3 Recommended All-in-One Providers

#### 1. **Polygon.io** (Best Overall)
- **Website**: https://polygon.io/
- **Pricing**:
  - Starter: $29/month
  - Developer: $99/month
  - Advanced: $199/month
- **Coverage**:
  - ✅ Real-time & historical stock data (US markets)
  - ✅ 30+ years of historical data
  - ✅ Company news & press releases
  - ✅ Options, forex, crypto
  - ✅ Corporate actions (splits, dividends)
  - ⚠️ SPACs like CRAQ, RAAQ, DAAQ: YES (if listed on NASDAQ/NYSE)
- **Data Provided**:
  - Stock prices (real-time & historical)
  - News headlines
  - Company financials
  - Insider trades (via SEC filings)
- **Best For**: Production apps, real-time needs, comprehensive coverage

#### 2. **Alpha Vantage** (Best Value)
- **Website**: https://www.alphavantage.co/
- **Pricing**:
  - Free: 5 calls/min, 500 calls/day
  - Premium: $49.99/month (75 calls/min)
  - Pro: $149.99/month (600 calls/min)
- **Coverage**:
  - ✅ Real-time & historical stock data
  - ✅ Economic indicators (CPI, PPI, GDP, etc.)
  - ✅ News & sentiment analysis
  - ✅ Earnings data & calendar
  - ✅ Technical indicators
  - ⚠️ SPACs like CRAQ, RAAQ, DAAQ: YES (major exchanges)
- **Data Provided**:
  - Stock prices & technical indicators
  - Economic calendar events
  - News with sentiment scores
  - Earnings calendar
- **Best For**: Budget-conscious projects, economic data needs

#### 3. **Financial Modeling Prep** (Best Value for Fundamentals)
- **Website**: https://financialmodelingprep.com/
- **Pricing**:
  - Starter: $14/month (250 requests/min)
  - Professional: $39/month (300 requests/min)
  - Enterprise: $99/month (350 requests/min)
- **Coverage**:
  - ✅ Stock prices (15-min delayed, historical)
  - ✅ Financial statements (income, balance sheet, cash flow)
  - ✅ Earnings calendar & transcripts
  - ✅ IPO calendar
  - ✅ Economic calendar
  - ✅ Institutional ownership (13F filings)
  - ⚠️ SPACs like CRAQ, RAAQ, DAAQ: YES
- **Data Provided**:
  - Stock prices
  - Calendar events (earnings, IPO, economic)
  - Institutional ownership
  - Company financials
- **Best For**: Fundamental analysis, institutional data, corporate events

---

## Coverage for Your Specific Issuers (CRAQ, RAAQ, DAAQ)

### What are these tickers?
- **CRAQ**: Possibly a SPAC (Special Purpose Acquisition Company)
- **RAAQ**: Likely a SPAC ticker
- **DAAQ**: Appears to be a SPAC ticker

### API Coverage:
Most major providers cover **all publicly traded securities on major exchanges** (NYSE, NASDAQ, AMEX):

| API Provider | SPAC Coverage | Notes |
|--------------|---------------|-------|
| **Polygon.io** | ✅ YES | Full coverage for all US exchange-listed securities |
| **Alpha Vantage** | ✅ YES | Covers all major exchange tickers |
| **Financial Modeling Prep** | ✅ YES | Includes SPACs on major exchanges |
| **IEX Cloud** | ✅ YES | US exchanges fully covered |
| **Finnhub** | ✅ YES | US stock coverage comprehensive |
| **Twelve Data** | ✅ YES | Global market coverage |

**Important Notes:**
- If these tickers are **delisted** or moved to **OTC markets**, coverage may be limited
- Real-time data providers (Polygon, IEX) have better coverage than delayed providers
- Check specific ticker availability via API documentation endpoints before committing

---

## Vendor Comparison by Data Type

### Stock Market Data

| Vendor | Real-time | Historical | Price | SPAC Coverage |
|--------|-----------|------------|-------|---------------|
| Polygon.io | ✅ Yes | 30+ years | $99/mo | ✅ Excellent |
| Alpha Vantage | ✅ Yes | 20+ years | $49.99/mo | ✅ Good |
| IEX Cloud | ✅ Yes | 15 years | $99/mo | ✅ Excellent |
| Finnhub | ✅ Yes | 10 years | $39.99/mo | ✅ Good |
| Financial Modeling Prep | ⚠️ 15-min delay | 20+ years | $39/mo | ✅ Good |

### News & Headlines

| Vendor | Coverage | Price | Quality |
|--------|----------|-------|---------|
| Polygon.io | Company news | Included | ⭐⭐⭐⭐ |
| Alpha Vantage | News + Sentiment | $49.99/mo | ⭐⭐⭐⭐ |
| Finnhub | Company + Market | $39.99/mo | ⭐⭐⭐⭐ |
| Benzinga | Premium financial | ~$500/mo | ⭐⭐⭐⭐⭐ |
| NewsAPI | General + Financial | $449/mo | ⭐⭐⭐ |

### Economic Calendar (CPI, PPI, Fed Events)

| Vendor | Coverage | Price | Notes |
|--------|----------|-------|-------|
| Alpha Vantage | US indicators | $49.99/mo | 50+ indicators |
| Trading Economics | Global (196 countries) | $300/mo | Most comprehensive |
| Financial Modeling Prep | US + Major economies | $39/mo | Good value |
| **FRED API** | US economic data | **FREE** | Official Fed data |

### Institutional Ownership & 13F Filings

| Vendor | Coverage | Price | Data Quality |
|--------|----------|-------|--------------|
| Financial Modeling Prep | 13F filings | $39/mo | ✅ Good |
| WhaleWisdom | Premium 13F analysis | Custom | ⭐⭐⭐⭐⭐ |
| **SEC Edgar** | Raw filings | **FREE** | ✅ Official (needs parsing) |
| Quiver Quantitative | Aggregated data | $100/mo | ⭐⭐⭐⭐ |

### Corporate Events Calendar

| Vendor | Earnings | Dividends | IPOs | Price |
|--------|----------|-----------|------|-------|
| Financial Modeling Prep | ✅ | ✅ | ✅ | $39/mo |
| Benzinga | ✅ | ✅ | ✅ | ~$500/mo |
| IEX Cloud | ✅ | ✅ | ✅ | $99/mo |
| Alpha Vantage | ✅ | ❌ | ❌ | $49.99/mo |

---

## Recommended Integration Strategy

### Phase 1: MVP (Budget: $50-100/month)
**Primary Provider**: Alpha Vantage ($49.99/month)
- Stock data for all tickers
- Economic indicators
- News & sentiment
- Earnings calendar

**Supplemental**:
- FRED API (FREE) - Economic indicators
- SEC Edgar (FREE) - Institutional ownership

**What you get**:
- ✅ Stock chart data
- ✅ News headlines
- ✅ Economic calendar events
- ✅ Basic institutional data

### Phase 2: Growth (Budget: $150-200/month)
**Primary Provider**: Polygon.io ($99/month)
- Real-time stock data
- Company news
- Better SPAC coverage

**Secondary Provider**: Financial Modeling Prep ($39/month)
- Institutional ownership (13F)
- Corporate events calendar
- Economic calendar

**What you get**:
- ✅ Real-time data
- ✅ Better performance
- ✅ Comprehensive institutional data
- ✅ All calendar events

### Phase 3: Enterprise (Budget: $500+/month)
**Primary**: Polygon.io Advanced ($199/month)
**Secondary**: Benzinga ($500/month)
**Tertiary**: Trading Economics ($300/month)

**What you get**:
- ✅ Best-in-class data quality
- ✅ Premium news coverage
- ✅ Global economic data
- ✅ Production-ready reliability

---

## Testing Your Issuers (CRAQ, RAAQ, DAAQ)

Before committing, test these endpoints:

### Polygon.io
```bash
# Check if ticker exists
curl "https://api.polygon.io/v3/reference/tickers/CRAQ?apiKey=YOUR_KEY"

# Get stock data
curl "https://api.polygon.io/v2/aggs/ticker/CRAQ/range/1/day/2023-01-01/2024-12-31?apiKey=YOUR_KEY"
```

### Alpha Vantage
```bash
# Get quote
curl "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=CRAQ&apikey=YOUR_KEY"

# Get daily prices
curl "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=CRAQ&apikey=YOUR_KEY"
```

### Financial Modeling Prep
```bash
# Get quote
curl "https://financialmodelingprep.com/api/v3/quote/CRAQ?apikey=YOUR_KEY"

# Get institutional ownership
curl "https://financialmodelingprep.com/api/v3/institutional-holder/CRAQ?apikey=YOUR_KEY"
```

---

## Quick Reference: What Each Dashboard Component Needs

| Component | Data Needed | Best API | Alternative |
|-----------|-------------|----------|-------------|
| **Stock Chart** | Historical prices (30 days) | Polygon.io | Alpha Vantage |
| **News Section** | Recent headlines | Polygon.io | Alpha Vantage News |
| **Calendar - Economic** | CPI, PPI, Fed events | FRED (Free) | Alpha Vantage |
| **Calendar - Corporate** | Earnings, board meetings | Financial Modeling Prep | IEX Cloud |
| **Investor Breakdown** | Ownership percentages | Financial Modeling Prep | SEC Edgar |
| **Insiders Table** | Insider transactions | Financial Modeling Prep | SEC Edgar |
| **Institutional Investors** | 13F filings | Financial Modeling Prep | WhaleWisdom |
| **Investor Targets** | Institutional holdings | Financial Modeling Prep | Quiver Quant |

---

## Final Recommendation

**For your use case (CRAQ, RAAQ, DAAQ type issuers):**

**Best Combo**:
1. **Polygon.io Developer** ($99/month) - Stock data & news
2. **Financial Modeling Prep Professional** ($39/month) - Institutional data & calendars
3. **FRED API** (FREE) - Economic indicators

**Total: $138/month**

**Why this works:**
- ✅ Comprehensive coverage of SPACs and all US-listed securities
- ✅ Real-time stock data
- ✅ All institutional ownership data (13F filings)
- ✅ Complete calendar coverage (economic + corporate)
- ✅ News feeds
- ✅ Scalable as you grow
- ✅ Good documentation and support

**Alternative Budget Option**:
- **Alpha Vantage Premium** ($49.99/month) - Everything except advanced institutional data
- **SEC Edgar API** (FREE) - Parse 13F filings yourself

**Total: $49.99/month**
