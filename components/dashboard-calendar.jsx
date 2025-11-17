"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek
} from 'date-fns'

export default function DashboardCalendar({ events = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 30)) // October 2025

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getEventsForDate = (date) => {
    return events.filter(event => isSameDay(new Date(event.date), date))
  }

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card className="card-glass border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-gray-900">
            {format(currentDate, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 rounded-md hover:bg-white/50 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5 text-gray-700" />
            </button>
            <div className="flex gap-1">
              <button className="px-3 py-1 text-sm font-medium bg-white rounded-md shadow-sm hover:bg-gray-50">
                Month
              </button>
              <button className="px-3 py-1 text-sm text-gray-600 hover:bg-white/50 rounded-md">
                Week
              </button>
              <button className="px-3 py-1 text-sm text-gray-600 hover:bg-white/50 rounded-md">
                Day
              </button>
              <button className="px-3 py-1 text-sm text-gray-600 hover:bg-white/50 rounded-md">
                List
              </button>
              <button className="px-3 py-1 text-sm font-medium bg-orange-500 text-white rounded-md shadow-sm hover:bg-orange-600">
                Today
              </button>
            </div>
            <button
              onClick={goToNextMonth}
              className="p-1.5 rounded-md hover:bg-white/50 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div
              key={day}
              className="bg-gray-50 py-2 text-center text-sm font-semibold text-gray-700"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, index) => {
            const dayEvents = getEventsForDate(day)
            const isCurrentMonth = isSameMonth(day, currentDate)

            return (
              <div
                key={index}
                className={`min-h-[80px] bg-white p-2 ${
                  !isCurrentMonth ? 'text-gray-400 bg-gray-50/50' : 'text-gray-900'
                }`}
              >
                <div className="text-sm font-medium mb-1">
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEvents.map((event, eventIndex) => (
                    <div
                      key={eventIndex}
                      className={`text-xs px-2 py-1 rounded text-white ${
                        event.type === 'economic'
                          ? 'bg-orange-500'
                          : 'bg-red-500'
                      }`}
                      title={event.description}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
