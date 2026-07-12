export const statusConfig: Record<string, string> = {
  // Assets
  available: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  allocated: "bg-blue-50 text-blue-700 border border-blue-200",
  reserved: "bg-violet-50 text-violet-700 border border-violet-200",
  under_maintenance: "bg-amber-50 text-amber-700 border border-amber-200",
  lost: "bg-red-50 text-red-700 border border-red-200",
  retired: "bg-slate-100 text-slate-700 border border-slate-200",
  disposed: "bg-slate-100 text-slate-700 border border-slate-200",
  
  // Bookings
  upcoming: "bg-blue-50 text-blue-700 border border-blue-200",
  ongoing: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  completed: "bg-slate-100 text-slate-700 border border-slate-200",
  cancelled: "bg-red-50 text-red-700 border border-red-200",

  // Maintenance
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  rejected: "bg-red-50 text-red-700 border border-red-200",
  technician_assigned: "bg-blue-50 text-blue-700 border border-blue-200",
  in_progress: "bg-violet-50 text-violet-700 border border-violet-200",
  resolved: "bg-emerald-50 text-emerald-700 border border-emerald-200",

  // Transfers
  requested: "bg-amber-50 text-amber-700 border border-amber-200",
};
