import { useEffect } from 'react'
import { formatTradingViewSymbol } from '@/lib/ticker-utils'

/**
 * ⚡ useTradingViewChart Hook - Lazy loads TradingView widget script
 * Only loads on client side, only when needed, with proper cleanup
 * 
 * Now includes robust ticker/exchange normalization via ticker-utils
 * 
 * @param {string} ticker - Stock ticker symbol (e.g., "CRAU", "  aapl  ")
 * @param {string} exchange - Exchange platform (e.g., "NASDAQ", "nasdaq stock market")
 * @param {object} options - Optional configuration
 * @param {string} options.theme - 'light' or 'dark' (auto-detects if not provided)
 * @returns {{ isValid: boolean, error?: string }} - Status of chart initialization
 */
export function useTradingViewChart(ticker, exchange, options = {}) {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Use our robust utility to normalize and validate the symbol
    const symbolData = formatTradingViewSymbol(ticker, exchange)

    // Don't proceed if symbol is invalid
    if (!symbolData.isValid) {
      console.warn('TradingView: Invalid symbol -', symbolData.error)
      return
    }

    const { symbol, ticker: normalizedTicker, exchange: normalizedExchange } = symbolData

    // Auto-detect theme if not provided
    const isDarkMode = options.theme === 'dark' ||
      (options.theme === undefined && window.matchMedia?.('(prefers-color-scheme: dark)').matches) ||
      document.documentElement.classList.contains('dark')

    // Theme-aware colors matching app's design system
    const trendColor = isDarkMode ? '#c9a227' : '#15803d' // Gold for dark, Green for light
    const colorTheme = isDarkMode ? 'dark' : 'light'

    // Small delay to ensure DOM is ready
    const timeout = setTimeout(() => {
      try {
        // Remove existing script to prevent duplicates
        const existingScript = document.getElementById('tradingview-script')
        if (existingScript) {
          existingScript.remove()
        }

        // Remove existing widget
        const widgetContainer = document.getElementById('tradingview-widget')
        if (widgetContainer) {
          widgetContainer.innerHTML = ''
        }

        // Create and configure script
        const script = document.createElement('script')
        script.id = 'tradingview-script'
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js'
        script.async = true

        // Set the widget configuration with normalized symbol
        script.innerHTML = JSON.stringify({
          symbols: [[symbol]], // Use the normalized "EXCHANGE:TICKER" format
          width: '100%',
          height: 400,
          locale: 'en',
          colorTheme: colorTheme,
          dateRange: '1M',
          interval: '1W',
          trendLineColor: trendColor,
          underLineColor: 'rgba(0, 0, 0, 0)',
          isTransparent: false,
          autosize: true,
          showFloatingTooltip: true,
          showSymbolLogo: true,
          showChartTitle: true,
          scalePosition: 'left',
          hideDateRanges: false,
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01,
          },
          numberFormat: {
            decimalSign: '.',
            thousandsSeparator: ',',
            currencyFormat: {
              symbol: '$',
              position: 'before'
            }
          }
        })

        console.log(`TradingView: Loading chart for ${symbol}`)

        // Append script to trigger widget rendering
        const container = document.getElementById('tradingview-widget')
        if (container) {
          container.appendChild(script)
        }
      } catch (err) {
        console.error('Error initializing TradingView chart:', err)
      }
    }, 100)

    return () => {
      clearTimeout(timeout)
    }
  }, [ticker, exchange, options.theme])
}
