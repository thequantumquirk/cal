"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getMockSecurities } from "@/lib/mock-data"

export default function SecuritiesTab({ issuerId }) {
  const [securities, setSecurities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!issuerId) return

    // Simulate loading delay for mock data
    const loadMockData = () => {
      setTimeout(() => {
        const mockData = getMockSecurities()
        setSecurities(mockData)
        setLoading(false)
      }, 500)
    }

    loadMockData()
  }, [issuerId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <Card className="card-glass border-0 shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b border-border hover:bg-muted/50">
                <TableHead className="font-semibold text-foreground py-4">Shareholder</TableHead>
                <TableHead className="font-semibold text-foreground py-4">Type of Security</TableHead>
                <TableHead className="font-semibold text-foreground py-4 text-right"># of Securities</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {securities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No securities data available
                  </TableCell>
                </TableRow>
              ) : (
                securities.map((security, index) => (
                  <TableRow
                    key={index}
                    className={`border-b border-border hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'
                      }`}
                  >
                    <TableCell className="font-medium text-foreground py-3">
                      {security.shareholder}
                    </TableCell>
                    <TableCell className="text-foreground py-3">
                      {security.typeOfSecurity}
                    </TableCell>
                    <TableCell className="text-right text-foreground font-medium py-3">
                      {security.numSecurities.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
