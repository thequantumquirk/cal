"use client"

import { useState, useEffect } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react"

const RANGE_OPTIONS = [
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "1Y", value: "1Y" },
  { label: "YTD", value: "YTD" }
]

export default function StockPriceChart({ ticker, exchange }) {
  const [data, setData] = useState([])
  const [summary, setSummary] = useState(null)
  const [range, setRange] = useState("3M")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!ticker) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/market/${ticker}?range=${range}`)
        const json = await res.json()

        if (!res.ok) {
          throw new Error(json.error || "Failed to fetch data")
        }

        setData(json.data)
        setSummary(json.summary)
      } catch (err) {
        console.error("Chart fetch error:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [ticker, range])

  const isPositive = summary?.percentChange >= 0
  const changeColor = isPositive ? "text-green-600" : "text-red-600"
  const gradientColor = isPositive ? "#22c55e" : "#ef4444"

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-lg text-sm border border-border">
          <p className="font-medium">{label}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-xs">
            <span className="text-muted-foreground">Open:</span>
            <span>${item.open?.toFixed(2)}</span>
            <span className="text-muted-foreground">High:</span>
            <span>${item.high?.toFixed(2)}</span>
            <span className="text-muted-foreground">Low:</span>
            <span>${item.low?.toFixed(2)}</span>
            <span className="text-muted-foreground">Close:</span>
            <span className="font-medium">${item.close?.toFixed(2)}</span>
          </div>
        </div>
      )
    }
    return null
  }

  if (!ticker) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] bg-muted/50 rounded-lg border border-border">
        <TrendingUp className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No ticker symbol available</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] bg-muted/50 rounded-lg border border-border">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
        <p className="text-muted-foreground text-sm">Loading market data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] bg-muted/50 rounded-lg border border-border">
        <TrendingDown className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground font-medium">Unable to load chart</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded">
              {exchange || "NASDAQ"}:{ticker}
            </span>
          </div>
          {summary && (
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl font-bold text-foreground">
                ${summary.currentPrice?.toFixed(2)}
              </span>
              <span className={`flex items-center gap-1 text-sm font-medium ${changeColor}`}>
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {isPositive ? "+" : ""}{summary.priceChange} ({isPositive ? "+" : ""}{summary.percentChange}%)
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                range === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              stroke="#d1d5db"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              stroke="#d1d5db"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value.toFixed(0)}`}
              domain={["auto", "auto"]}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="close"
              stroke={gradientColor}
              strokeWidth={2}
              fill="url(#colorPrice)"
              dot={false}
              activeDot={{ r: 4, fill: gradientColor, stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Period High</p>
            <p className="text-sm font-medium text-foreground">${summary.high?.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Period Low</p>
            <p className="text-sm font-medium text-foreground">${summary.low?.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Volume</p>
            <p className="text-sm font-medium text-foreground">
              {summary.volume >= 1000000
                ? `${(summary.volume / 1000000).toFixed(1)}M`
                : summary.volume >= 1000
                ? `${(summary.volume / 1000).toFixed(1)}K`
                : summary.volume?.toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
