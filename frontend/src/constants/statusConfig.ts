export const assetStatusConfig: Record<string, { label: string; className: string }> = {
  available:         { label: 'Available',          className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  allocated:         { label: 'Allocated',           className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  reserved:          { label: 'Reserved',            className: 'bg-violet-500/20 text-violet-400 border border-violet-500/30' },
  under_maintenance: { label: 'Under Maintenance',   className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  lost:              { label: 'Lost',                className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  retired:           { label: 'Retired',             className: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' },
  disposed:          { label: 'Disposed',            className: 'bg-zinc-600/20 text-zinc-500 border border-zinc-600/30' },
};
export const bookingStatusConfig: Record<string, { label: string; className: string }> = {
  upcoming:  { label: 'Upcoming',  className: 'bg-sky-500/20 text-sky-400 border border-sky-500/30' },
  ongoing:   { label: 'Ongoing',   className: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  completed: { label: 'Completed', className: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
};
export const maintenanceStatusConfig: Record<string, { label: string; className: string }> = {
  pending:             { label: 'Pending',             className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  approved:            { label: 'Approved',            className: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  rejected:            { label: 'Rejected',            className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  technician_assigned: { label: 'Tech Assigned',       className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  in_progress:         { label: 'In Progress',         className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  resolved:            { label: 'Resolved',            className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
};
export const transferStatusConfig: Record<string, { label: string; className: string }> = {
  requested: { label: 'Requested', className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  approved:  { label: 'Approved',  className: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  rejected:  { label: 'Rejected',  className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
};
