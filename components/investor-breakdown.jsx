"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowUp } from "lucide-react"

const COLORS = {
  Insider: '#f97316',      // Orange-500
  Institutional: '#ea580c', // Orange-600
  'Retail / Non-13F': '#ef4444'  // Red-500
}

export default function InvestorBreakdown({ data }) {
  const chartData = [
    { name: 'Insider', value: data.insider },
    { name: 'Institutional', value: data.institutional },
    { name: 'Retail / Non-13F', value: data.retail }
  ]

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover backdrop-blur-sm border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-popover-foreground">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">{payload[0].value.toFixed(1)}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pie Chart */}
      <Card className="card-glass border-0">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            Investor Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry) => (
                  <span className="text-sm text-muted-foreground">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Ownership Breakdown Table */}
      <Card className="card-glass border-0">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center justify-between">
            <span>Ownership</span>
            <ArrowUp className="h-5 w-5 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-muted-foreground">Investor Type</TableHead>
                <TableHead className="font-bold text-muted-foreground text-right">Ownership</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-accent">
                <TableCell className="font-medium text-foreground">Institutional</TableCell>
                <TableCell className="text-right font-semibold">{data.institutional.toFixed(1)}%</TableCell>
              </TableRow>
              <TableRow className="hover:bg-accent">
                <TableCell className="font-medium text-foreground">Retail / Non-13F</TableCell>
                <TableCell className="text-right font-semibold">{data.retail.toFixed(1)}%</TableCell>
              </TableRow>
              <TableRow className="hover:bg-accent">
                <TableCell className="font-medium text-foreground">Insider</TableCell>
                <TableCell className="text-right font-semibold">{data.insider.toFixed(1)}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
