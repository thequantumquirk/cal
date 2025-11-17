"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function InvestorTargetsTable({ targets }) {
  return (
    <Card className="card-glass border-0">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-900">
          VFS Top Investor Targets
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
                <TableHead className="font-bold text-orange-600 text-right">VFS Position...</TableHead>
                <TableHead className="font-bold text-orange-600 text-right">Peers Holdin...</TableHead>
                <TableHead className="font-bold text-orange-600 text-right"># of Peers H...</TableHead>
                <TableHead className="font-bold text-orange-600">Location</TableHead>
                <TableHead className="font-bold text-orange-600">Met Previou...</TableHead>
                <TableHead className="font-bold text-orange-600">Follow-up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((target) => (
                <TableRow key={target.id} className="hover:bg-white/30">
                  <TableCell className="font-medium text-gray-900">
                    {target.investor}
                  </TableCell>
                  <TableCell className="text-gray-900">{target.investorType}</TableCell>
                  <TableCell className="text-right text-gray-900 font-semibold">
                    {target.aum}
                  </TableCell>
                  <TableCell className="text-right text-gray-900">
                    {target.vfsPosition}
                  </TableCell>
                  <TableCell className="text-right text-gray-900 font-semibold">
                    {target.peersHoldings}
                  </TableCell>
                  <TableCell className="text-right text-gray-900">
                    {target.numPeersHeld}
                  </TableCell>
                  <TableCell className="text-gray-900">{target.location}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      target.metPreviously === 'Y'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {target.metPreviously}
                    </span>
                  </TableCell>
                  <TableCell className="text-orange-600 hover:underline cursor-pointer">
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
