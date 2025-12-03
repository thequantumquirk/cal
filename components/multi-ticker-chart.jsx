"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const COLORS = {
  VFS: '#1e3a8a',    // Dark Blue (matching image)
  TSLA: '#3b82f6',   // Blue
  RIVN: '#60a5fa',   // Light Blue
  SPX: '#cbd5e1',    // Light Gray
  Nasdaq: '#fbbf24'  // Yellow/Amber
}

export default function MultiTickerChart({ data }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Show only the first item (most relevant)
      const item = payload[0]
      return (
        <div className="bg-popover text-popover-foreground px-3 py-2 rounded shadow-lg text-sm font-medium border border-border">
          <p>{label}</p>
          <p>{item.name}: {item.value.toFixed(0)}%</p>
        </div>
      )
    }
    return null
  }

  const CustomLegend = ({ payload }) => {
    return (
      <div className="flex items-center justify-center gap-6 mb-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card className="bg-card border border-border shadow-sm">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-semibold text-foreground">
          Trailing 30 Days Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 30, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="0" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              stroke="#d1d5db"
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              stroke="#d1d5db"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
              domain={[-20, 10]}
              ticks={[-15, -10, -5, 0, 5]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Line
              type="monotone"
              dataKey="VFSChange"
              name="VFS"
              stroke={COLORS.VFS}
              strokeWidth={2.5}
              dot={{ fill: COLORS.VFS, r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: COLORS.VFS, stroke: '#fff', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="TSLAChange"
              name="TSLA"
              stroke={COLORS.TSLA}
              strokeWidth={2.5}
              dot={{ fill: COLORS.TSLA, r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: COLORS.TSLA, stroke: '#fff', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="RIVNChange"
              name="RIVN"
              stroke={COLORS.RIVN}
              strokeWidth={2.5}
              dot={{ fill: COLORS.RIVN, r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: COLORS.RIVN, stroke: '#fff', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="SPXChange"
              name="SPX"
              stroke={COLORS.SPX}
              strokeWidth={2.5}
              dot={{ fill: COLORS.SPX, r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: COLORS.SPX, stroke: '#fff', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="NasdaqChange"
              name="Nasdaq"
              stroke={COLORS.Nasdaq}
              strokeWidth={2.5}
              dot={{ fill: COLORS.Nasdaq, r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: COLORS.Nasdaq, stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
