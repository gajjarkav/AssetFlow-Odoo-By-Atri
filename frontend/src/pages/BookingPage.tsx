import React from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { resources } from "../api/endpoints";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";

const BookingPage: React.FC = () => {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => (await resources.getBookings()).data
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Resource Booking</h1>
          <p className="text-sm text-slate-500">Time-slot booking for shared resources</p>
        </div>
        <Button className="gap-2"><CalendarIcon size={16} /> Book a Slot</Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Conference Room B2 - Cap 8, AV</CardTitle>
            <CardDescription>Today, Jul 12</CardDescription>
          </div>
          <div className="w-48">
            <Select>
              <option>Conference Room B2</option>
              <option>Projector AF-0045</option>
              <option>Company Van AF-312</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <LoadingSkeleton /> : (
            <div className="relative mt-8">
              {/* Timeline background */}
              <div className="absolute left-16 top-0 bottom-0 w-px bg-slate-200"></div>
              
              <div className="space-y-6">
                {[9, 10, 11, 12, 13, 14, 15, 16, 17].map(hour => {
                  const hourStr = `${hour}:00`;
                  const is12 = hour === 12;
                  
                  // Simple logic to place mock bookings
                  const bookingForHour = bookings?.find((b: any) => dayjs(b.start_time).hour() === hour);
                  
                  return (
                    <div key={hour} className="relative flex items-start gap-8">
                      <div className="w-12 text-right text-sm text-slate-500 font-medium pt-2 shrink-0">{hourStr}</div>
                      <div className="relative w-full min-h-[60px] border-t border-slate-200/50 pt-2">
                        {bookingForHour && (
                          <div className="absolute top-2 left-0 w-full bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-blue-700">Booked - {bookingForHour.user_name}</span>
                              <span className="text-xs text-blue-600 font-medium">
                                {dayjs(bookingForHour.start_time).format("h:mm A")} - {dayjs(bookingForHour.end_time).format("h:mm A")}
                              </span>
                            </div>
                          </div>
                        )}
                        {/* Simulation of a rejected overlap */}
                        {is12 && (
                          <div className="absolute top-2 left-0 w-full bg-red-50 border border-red-200 border-dashed rounded-lg p-3 opacity-90">
                            <div className="flex items-center gap-2">
                              <AlertCircle size={14} className="text-red-500" />
                              <span className="text-xs font-medium text-red-600">Rejected: 12:00 - overlap with existing</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingPage;
