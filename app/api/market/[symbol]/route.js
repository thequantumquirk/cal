import { NextResponse } from "next/server"

const POLYGON_API_KEY = process.env.POLYGON_API_KEY
if (!POLYGON_API_KEY) {
  console.warn("POLYGON_API_KEY not configured")
}

export async function GET(request, { params }) {
  if (!POLYGON_API_KEY) {
    return NextResponse.json(
      { error: "Market API not configured" },
      { status: 500 }
    )
  }

  const { symbol } = await params
  const { searchParams } = new URL(request.url)
  const range = searchParams.get("range") || "3M"

  try {
    const to = new Date()
    const from = new Date()

    switch (range) {
      case "1M":
        from.setMonth(from.getMonth() - 1)
        break
      case "3M":
        from.setMonth(from.getMonth() - 3)
        break
      case "6M":
        from.setMonth(from.getMonth() - 6)
        break
      case "1Y":
        from.setFullYear(from.getFullYear() - 1)
        break
      case "YTD":
        from.setMonth(0)
        from.setDate(1)
        break
      default:
        from.setMonth(from.getMonth() - 3)
    }

    const fromStr = from.toISOString().split("T")[0]
    const toStr = to.toISOString().split("T")[0]

    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol.toUpperCase()}/range/1/day/${fromStr}/${toStr}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`

    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 300 }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Polygon API error:", response.status, errorText)
      return NextResponse.json(
        { error: "Failed to fetch market data", details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()

    if (!data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: "No data available for this symbol", symbol },
        { status: 404 }
      )
    }

    const chartData = data.results.map((bar) => ({
      date: new Date(bar.t).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      timestamp: bar.t,
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      vwap: bar.vw
    }))

    const firstPrice = data.results[0].c
    const lastPrice = data.results[data.results.length - 1].c
    const priceChange = lastPrice - firstPrice
    const percentChange = ((priceChange / firstPrice) * 100).toFixed(2)

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      range,
      data: chartData,
      summary: {
        currentPrice: lastPrice,
        priceChange: priceChange.toFixed(2),
        percentChange,
        high: Math.max(...data.results.map(r => r.h)),
        low: Math.min(...data.results.map(r => r.l)),
        volume: data.results.reduce((sum, r) => sum + r.v, 0)
      }
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
      }
    })

  } catch (error) {
    console.error("Market fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch market data", message: error.message },
      { status: 500 }
    )
  }
}
