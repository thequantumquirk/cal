"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function InstitutionalInvestorsTable({ investors }) {
  return (
    <Card className="card-glass border-0">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground">
          Top 25 Institutional Investors
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-muted-foreground">Investor</TableHead>
                <TableHead className="font-bold text-muted-foreground">Investor Type</TableHead>
                <TableHead className="font-bold text-muted-foreground text-right">AUM ($mm)</TableHead>
                <TableHead className="font-bold text-muted-foreground text-right">Company Holdings ($mm)</TableHead>
                <TableHead className="font-bold text-muted-foreground">Ownership Period (months)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investors.map((investor) => (
                <TableRow key={investor.id} className="hover:bg-accent">
                  <TableCell className="font-medium text-foreground">
                    {investor.investor}
                  </TableCell>
                  <TableCell className="text-foreground">{investor.investorType}</TableCell>
                  <TableCell className="text-right text-foreground font-semibold">
                    {investor.aum}
                  </TableCell>
                  <TableCell className="text-right text-foreground font-semibold">
                    {investor.companyHoldings}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      investor.ownershipPeriod === 'Buyer'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-destructive/10 text-destructive'
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
