"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function InsidersTable({ insiders }) {
  return (
    <Card className="card-glass border-0">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground">
          Insiders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-muted-foreground">Shareholder</TableHead>
                <TableHead className="font-bold text-muted-foreground">Shareholder Type</TableHead>
                <TableHead className="font-bold text-muted-foreground">Location</TableHead>
                <TableHead className="font-bold text-muted-foreground">Type of Security</TableHead>
                <TableHead className="font-bold text-muted-foreground">Class of Security</TableHead>
                <TableHead className="font-bold text-muted-foreground"># Of Securities</TableHead>
                <TableHead className="font-bold text-muted-foreground">% Ownership</TableHead>
                <TableHead className="font-bold text-muted-foreground">1yr+ Holder</TableHead>
                <TableHead className="font-bold text-muted-foreground">Restrictions (Y/N)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insiders.map((insider) => (
                <TableRow key={insider.id} className="hover:bg-accent">
                  <TableCell className="font-medium text-foreground">
                    {insider.shareholder}
                  </TableCell>
                  <TableCell className="text-foreground">{insider.shareholderType}</TableCell>
                  <TableCell className="text-foreground">{insider.location}</TableCell>
                  <TableCell className="text-foreground">{insider.typeOfSecurity}</TableCell>
                  <TableCell className="text-foreground">{insider.classOfSecurity}</TableCell>
                  <TableCell className="text-foreground">{insider.numSecurities}</TableCell>
                  <TableCell className="text-foreground font-semibold">{insider.ownership}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      insider.is1yrHolder === 'Yes'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {insider.is1yrHolder}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      insider.restrictions === 'Y'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
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
