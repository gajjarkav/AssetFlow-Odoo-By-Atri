import React from "react";
import { useQuery } from "@tanstack/react-query";
import { notifications as notifApi } from "../api/endpoints";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Card, CardContent } from "../components/ui/card";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { CheckCircle2, Wrench, Calendar, ArrowRightLeft, AlertTriangle } from "lucide-react";

const NotificationsPage: React.FC = () => {
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await notifApi.getNotifications()).data
  });

  const getIcon = (type: string) => {
    switch(type) {
      case "allocation": return <CheckCircle2 size={16} className="text-blue-500" />;
      case "maintenance": return <Wrench size={16} className="text-violet-500" />;
      case "booking": return <Calendar size={16} className="text-emerald-500" />;
      case "transfer": return <ArrowRightLeft size={16} className="text-amber-500" />;
      case "alert": return <AlertTriangle size={16} className="text-red-500" />;
      default: return <div className="w-4 h-4 rounded-full bg-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[#F8FAFC]">Activity logs & Notifications</h1>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all" className="px-6 py-2">All</TabsTrigger>
          <TabsTrigger value="alerts" className="px-6 py-2">Alerts</TabsTrigger>
          <TabsTrigger value="approvals" className="px-6 py-2">Approvals</TabsTrigger>
          <TabsTrigger value="bookings" className="px-6 py-2">Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              {isLoading ? <div className="p-6"><LoadingSkeleton /></div> : (
                <div className="divide-y divide-[#2A2A38]">
                  {notifications?.map((notif: any) => (
                    <div key={notif.id} className={`p-4 flex items-center justify-between hover:bg-[#111118] transition-colors ${!notif.read ? 'bg-[#111118]/50' : ''}`}>
                      <div className="flex items-center gap-4">
                        <div className="bg-[#0B0B0F] p-2 rounded-full border border-[#2A2A38]">
                          {getIcon(notif.type)}
                        </div>
                        <div>
                          <p className={`text-sm ${!notif.read ? 'font-bold text-[#F8FAFC]' : 'text-[#94A3B8]'}`}>
                            {notif.message}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-[#64748B] shrink-0">{notif.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="alerts"><Card><CardContent className="p-8 text-center text-[#94A3B8]">Alerts filtered view</CardContent></Card></TabsContent>
        <TabsContent value="approvals"><Card><CardContent className="p-8 text-center text-[#94A3B8]">Approvals filtered view</CardContent></Card></TabsContent>
        <TabsContent value="bookings"><Card><CardContent className="p-8 text-center text-[#94A3B8]">Bookings filtered view</CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationsPage;
