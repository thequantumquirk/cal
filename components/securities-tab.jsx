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
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b border-gray-200">
                <TableHead className="font-semibold text-gray-700 py-4">Shareholder</TableHead>
                <TableHead className="font-semibold text-gray-700 py-4">Type of Security</TableHead>
                <TableHead className="font-semibold text-gray-700 py-4 text-right"># of Securities</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {securities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                    No securities data available
                  </TableCell>
                </TableRow>
              ) : (
                securities.map((security, index) => (
                  <TableRow
                    key={index}
                    className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-blue-50/20'
                    }`}
                  >
                    <TableCell className="font-medium text-gray-900 py-3">
                      {security.shareholder}
                    </TableCell>
                    <TableCell className="text-gray-900 py-3">
                      {security.typeOfSecurity}
                    </TableCell>
                    <TableCell className="text-right text-gray-900 font-medium py-3">
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
