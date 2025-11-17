"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function InsidersTable({ insiders }) {
  return (
    <Card className="card-glass border-0">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-900">
          Insiders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-orange-600">Shareholder</TableHead>
                <TableHead className="font-bold text-orange-600">Shareholder Type</TableHead>
                <TableHead className="font-bold text-orange-600">Location</TableHead>
                <TableHead className="font-bold text-orange-600">Type of Security</TableHead>
                <TableHead className="font-bold text-orange-600">Class of Security</TableHead>
                <TableHead className="font-bold text-orange-600"># Of Securities</TableHead>
                <TableHead className="font-bold text-orange-600">% Ownership</TableHead>
                <TableHead className="font-bold text-orange-600">1yr+ Holder</TableHead>
                <TableHead className="font-bold text-orange-600">Restrictions (Y/N)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insiders.map((insider) => (
                <TableRow key={insider.id} className="hover:bg-white/30">
                  <TableCell className="font-medium text-gray-900">
                    {insider.shareholder}
                  </TableCell>
                  <TableCell className="text-gray-900">{insider.shareholderType}</TableCell>
                  <TableCell className="text-gray-900">{insider.location}</TableCell>
                  <TableCell className="text-gray-900">{insider.typeOfSecurity}</TableCell>
                  <TableCell className="text-gray-900">{insider.classOfSecurity}</TableCell>
                  <TableCell className="text-gray-900">{insider.numSecurities}</TableCell>
                  <TableCell className="text-gray-900 font-semibold">{insider.ownership}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      insider.is1yrHolder === 'Yes'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {insider.is1yrHolder}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      insider.restrictions === 'Y'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {insider.restrictions}
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
