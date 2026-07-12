import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Calendar as CalendarIcon, AlertCircle, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { resources as resourcesApi } from "../api/endpoints";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

const BookingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Modal form state
  const [bookingDate, setBookingDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [purpose, setPurpose] = useState("");

  // Fetch all bookable resources
  const { data: sharedResources } = useQuery({
    queryKey: ["resources"],
    queryFn: async () => (await resourcesApi.getResources()).data
  });

  // Automatically select the first resource if none is selected
  React.useEffect(() => {
    if (sharedResources?.length > 0 && !selectedResourceId) {
      setSelectedResourceId(sharedResources[0].id);
    }
  }, [sharedResources, selectedResourceId]);

  // Fetch bookings for the selected resource
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings", selectedResourceId],
    queryFn: async () => (await resourcesApi.getBookings({ asset_id: selectedResourceId })).data,
    enabled: !!selectedResourceId
  });

  const createBooking = useMutation({
    mutationFn: async (data: any) => (await resourcesApi.createBooking(data)).data,
    onSuccess: () => {
      toast.success("Booking confirmed!");
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail?.detail || err.message || "Failed to book slot";
      toast.error(msg);
    }
  });

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceId) return toast.error("Please select a resource first.");
    
    // Construct local times
    const startAt = dayjs(`${bookingDate}T${startTime}`);
    const endAt = dayjs(`${bookingDate}T${endTime}`);
    
    if (endAt.isBefore(startAt) || endAt.isSame(startAt)) {
      return toast.error("End time must be after start time");
    }

    createBooking.mutate({
      asset_id: selectedResourceId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      purpose
    });
  };

  const selectedResourceData = sharedResources?.find((r: any) => r.id === selectedResourceId);

  const container: any = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const item: any = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }} 
      className="space-y-6 max-w-5xl mx-auto relative"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Resource Booking</h1>
          <p className="text-sm text-slate-500">Time-slot booking for shared resources</p>
        </div>
        <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
          <CalendarIcon size={16} /> Book a Slot
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>{selectedResourceData?.name || "Select a Resource"}</CardTitle>
            <CardDescription>
              {selectedResourceData?.tag ? `Tag: ${selectedResourceData.tag}` : "Loading..."}
            </CardDescription>
          </div>
          <div className="w-full sm:w-64">
            <Select 
              value={selectedResourceId} 
              onChange={(e) => setSelectedResourceId(e.target.value)}
            >
              {sharedResources?.map((res: any) => (
                <option key={res.id} value={res.id}>{res.name}</option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <LoadingSkeleton /> : (
            <div className="relative mt-4">
              {/* Timeline background */}
              <div className="absolute left-16 top-0 bottom-0 w-px bg-slate-200"></div>
              
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
                {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(hour => {
                  const hourStr = `${hour}:00`;
                  
                  // Simple logical map for visual display in MVP
                  // Find bookings that overlap this hour
                  const bookingsForHour = bookings?.filter((b: any) => {
                    const startH = dayjs(b.start_at).hour();
                    const endH = dayjs(b.end_at).hour();
                    return hour >= startH && hour < endH;
                  });
                  
                  return (
                    <motion.div variants={item} key={hour} className="relative flex items-start gap-8">
                      <div className="w-12 text-right text-sm text-[#94A3B8] pt-2 shrink-0">{hourStr}</div>
                      <div className="relative w-full min-h-[60px] border-t border-[#2A2A38]/50 pt-2">
                        {bookingsForHour?.map((b: any, i: number) => (
                          <div 
                            key={b.id} 
                            className="absolute left-0 w-full bg-blue-500/20 border border-blue-500/50 rounded-md p-3"
                            style={{ top: `${8 + (i * 5)}px` }}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-blue-600">Booked - {b.user_name}</span>
                              <span className="text-xs text-blue-600/80 hidden sm:block">
                                {dayjs(b.start_at).format("h:mm A")} - {dayjs(b.end_at).format("h:mm A")}
                              </span>
                            </div>
                            {b.purpose && <p className="text-xs text-blue-500/80 mt-1">{b.purpose}</p>}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1A22] border border-[#2A2A38] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#2A2A38]">
              <h2 className="text-lg font-bold text-[#F8FAFC]">Book Resource</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#94A3B8] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleBook} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Resource</label>
                <Select value={selectedResourceId} onChange={(e) => setSelectedResourceId(e.target.value)}>
                  {sharedResources?.map((res: any) => (
                    <option key={res.id} value={res.id}>{res.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Date</label>
                <Input 
                  type="date" 
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={dayjs().format("YYYY-MM-DD")}
                  required 
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Start Time</label>
                  <Input 
                    type="time" 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required 
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">End Time</label>
                  <Input 
                    type="time" 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Purpose</label>
                <Input 
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Client Meeting" 
                  required 
                />
              </div>

              <div className="pt-4 border-t border-[#2A2A38] flex justify-end gap-3">
                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#22C55E] text-black hover:bg-[#16a34a]" disabled={createBooking.isPending}>
                  {createBooking.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                  Confirm Booking
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </motion.div>
  );
};

export default BookingPage;
