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
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Activity logs & Notifications</h1>

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
                <div className="divide-y divide-slate-100">
                  {notifications?.map((notif: any) => (
                    <div key={notif.id} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-slate-50' : 'bg-white'}`}>
                      <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded-full border border-slate-200 shadow-sm">
                          {getIcon(notif.type)}
                        </div>
                        <div>
                          <p className={`text-sm ${!notif.read ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                            {notif.message}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0 font-medium">{notif.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="alerts"><Card><CardContent className="p-8 text-center text-slate-500 font-medium">Alerts filtered view</CardContent></Card></TabsContent>
        <TabsContent value="approvals"><Card><CardContent className="p-8 text-center text-slate-500 font-medium">Approvals filtered view</CardContent></Card></TabsContent>
        <TabsContent value="bookings"><Card><CardContent className="p-8 text-center text-slate-500 font-medium">Bookings filtered view</CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationsPage;
