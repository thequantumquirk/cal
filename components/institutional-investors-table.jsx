"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function InstitutionalInvestorsTable({ investors }) {
  return (
    <Card className="card-glass border-0">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-900">
          Top 25 Institutional Investors
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-orange-600">Investor</TableHead>
                <TableHead className="font-bold text-orange-600">Investor Type</TableHead>
                <TableHead className="font-bold text-orange-600 text-right">AUM ($mm)</TableHead>
                <TableHead className="font-bold text-orange-600 text-right">Company Holdings ($mm)</TableHead>
                <TableHead className="font-bold text-orange-600">Ownership Period (months)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investors.map((investor) => (
                <TableRow key={investor.id} className="hover:bg-white/30">
                  <TableCell className="font-medium text-gray-900">
                    {investor.investor}
                  </TableCell>
                  <TableCell className="text-gray-900">{investor.investorType}</TableCell>
                  <TableCell className="text-right text-gray-900 font-semibold">
                    {investor.aum}
                  </TableCell>
                  <TableCell className="text-right text-gray-900 font-semibold">
                    {investor.companyHoldings}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      investor.ownershipPeriod === 'Buyer'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {investor.ownershipPeriod}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
