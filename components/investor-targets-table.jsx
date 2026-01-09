"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function InvestorTargetsTable({ targets }) {
  return (
    <Card className="card-glass border-0">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground">
          VFS Top Investor Targets
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
                <TableHead className="font-bold text-muted-foreground text-right">VFS Position...</TableHead>
                <TableHead className="font-bold text-muted-foreground text-right">Peers Holdin...</TableHead>
                <TableHead className="font-bold text-muted-foreground text-right"># of Peers H...</TableHead>
                <TableHead className="font-bold text-muted-foreground">Location</TableHead>
                <TableHead className="font-bold text-muted-foreground">Met Previou...</TableHead>
                <TableHead className="font-bold text-muted-foreground">Follow-up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((target) => (
                <TableRow key={target.id} className="hover:bg-accent">
                  <TableCell className="font-medium text-foreground">
                    {target.investor}
                  </TableCell>
                  <TableCell className="text-foreground">{target.investorType}</TableCell>
                  <TableCell className="text-right text-foreground font-semibold">
                    {target.aum}
                  </TableCell>
                  <TableCell className="text-right text-foreground">
                    {target.vfsPosition}
                  </TableCell>
                  <TableCell className="text-right text-foreground font-semibold">
                    {target.peersHoldings}
                  </TableCell>
                  <TableCell className="text-right text-foreground">
                    {target.numPeersHeld}
                  </TableCell>
                  <TableCell className="text-foreground">{target.location}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      target.metPreviously === 'Y'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {target.metPreviously}
                    </span>
                  </TableCell>
                  <TableCell className="text-primary hover:underline cursor-pointer">
                    {target.followUp}
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
