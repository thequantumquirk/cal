"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExternalLink } from "lucide-react"

export default function NewsSection({ news }) {
  return (
    <Card className="card-glass border-0">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-900">
          Latest News
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold text-gray-700">Headline</TableHead>
              <TableHead className="font-bold text-gray-700 text-right">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {news.map((item, index) => (
              <TableRow key={index} className="hover:bg-white/30">
                <TableCell className="font-medium text-gray-900">
                  {item.headline}
                </TableCell>
                <TableCell className="text-right">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-800 inline-flex items-center gap-1"
                  >
                    <span className="text-sm">View</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
