/**
 * Ticker Symbol Utilities
 * 
 * TradingView expects symbols in format: EXCHANGE:TICKER
 * Examples: NASDAQ:AAPL, NYSE:IBM, NASDAQ:CRAU
 * 
 * This utility normalizes and validates ticker symbols from the database
 * before passing them to the TradingView widget.
 */

// Valid exchange codes recognized by TradingView
const VALID_EXCHANGES = [
    'NASDAQ', 'NYSE', 'AMEX', 'ARCA', 'BATS',
    'OTC', 'OTCBB', 'PINK',
    'TSX', 'TSE', // Toronto
    'LSE', // London
    'HKEX', 'SEHK', // Hong Kong
    'ASX', // Australia  
    'NSE', 'BSE', // India
    'SSE', 'SZSE', // China
    'EURONEXT', 'XETRA', // Europe
]

/**
 * Normalize an exchange platform name to TradingView format
 * 
 * @param {string} exchange - Raw exchange from database
 * @returns {string|null} - Normalized exchange or null if invalid
 * 
 * @example
 * normalizeExchange('nasdaq') // 'NASDAQ'
 * normalizeExchange('Nasdaq Stock Market') // 'NASDAQ'
 * normalizeExchange('New York Stock Exchange') // 'NYSE'
 */
export function normalizeExchange(exchange) {
    if (!exchange || typeof exchange !== 'string') return null

    const cleaned = exchange.trim().toUpperCase()

    // Direct match
    if (VALID_EXCHANGES.includes(cleaned)) {
        return cleaned
    }

    // Common variations
    const exchangeMap = {
        'NASDAQ GLOBAL SELECT MARKET': 'NASDAQ',
        'NASDAQ GLOBAL MARKET': 'NASDAQ',
        'NASDAQ CAPITAL MARKET': 'NASDAQ',
        'NASDAQ STOCK MARKET': 'NASDAQ',
        'THE NASDAQ': 'NASDAQ',
        'NEW YORK STOCK EXCHANGE': 'NYSE',
        'AMERICAN STOCK EXCHANGE': 'AMEX',
        'TOKYO STOCK EXCHANGE': 'TSE',
        'LONDON STOCK EXCHANGE': 'LSE',
        'HONG KONG STOCK EXCHANGE': 'HKEX',
        'AUSTRALIAN SECURITIES EXCHANGE': 'ASX',
        'NATIONAL STOCK EXCHANGE': 'NSE',
        'BOMBAY STOCK EXCHANGE': 'BSE',
    }

    // Check for partial matches
    for (const [key, value] of Object.entries(exchangeMap)) {
        if (cleaned.includes(key) || key.includes(cleaned)) {
            return value
        }
    }

    // If it looks like a simple exchange code, return it uppercase
    if (/^[A-Z]{2,10}$/.test(cleaned)) {
        return cleaned
    }

    // Default to NASDAQ for US-based tickers without exchange
    return 'NASDAQ'
}

/**
 * Normalize a ticker symbol for TradingView
 * 
 * @param {string} ticker - Raw ticker from database
 * @returns {string|null} - Normalized ticker or null if invalid
 * 
 * @example
 * normalizeTicker('  AAPL  ') // 'AAPL'
 * normalizeTicker('crau') // 'CRAU'
 * normalizeTicker('BRK.B') // 'BRK.B'
 * normalizeTicker('') // null
 */
export function normalizeTicker(ticker) {
    if (!ticker || typeof ticker !== 'string') return null

    const cleaned = ticker.trim().toUpperCase()

    // Must be 1-10 alphanumeric characters (with optional dots for class shares)
    if (!/^[A-Z0-9.]{1,10}$/.test(cleaned)) {
        console.warn(`Invalid ticker format: "${ticker}"`)
        return null
    }

    return cleaned
}

/**
 * Format a complete TradingView symbol from exchange and ticker
 * 
 * @param {string} ticker - Ticker symbol from database
 * @param {string} exchange - Exchange platform from database
 * @returns {{ symbol: string, ticker: string, exchange: string, isValid: boolean }}
 * 
 * @example
 * formatTradingViewSymbol('CRAU', 'NASDAQ')
 * // { symbol: 'NASDAQ:CRAU', ticker: 'CRAU', exchange: 'NASDAQ', isValid: true }
 * 
 * formatTradingViewSymbol(null, 'NYSE')
 * // { symbol: null, ticker: null, exchange: 'NYSE', isValid: false }
 */
export function formatTradingViewSymbol(ticker, exchange) {
    const normalizedTicker = normalizeTicker(ticker)
    const normalizedExchange = normalizeExchange(exchange)

    if (!normalizedTicker) {
        return {
            symbol: null,
            ticker: null,
            exchange: normalizedExchange,
            isValid: false,
            error: 'Invalid or missing ticker symbol'
        }
    }

    const effectiveExchange = normalizedExchange || 'NASDAQ'

    return {
        symbol: `${effectiveExchange}:${normalizedTicker}`,
        ticker: normalizedTicker,
        exchange: effectiveExchange,
        isValid: true
    }
}

/**
 * Check if a ticker/exchange combo is likely valid for TradingView
 * Useful for showing/hiding the chart component
 * 
 * @param {string} ticker
 * @param {string} exchange
 * @returns {boolean}
 */
export function isValidTradingViewSymbol(ticker, exchange) {
    const { isValid } = formatTradingViewSymbol(ticker, exchange)
    return isValid
}
