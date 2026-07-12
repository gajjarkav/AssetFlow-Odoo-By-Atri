export const mockData = {
  users: [
    { id: "u1", name: "Priya Shah", email: "priya@example.com", role: "EMPLOYEE", department_id: "d1", status: "Active", created_at: "2025-01-10T10:00:00Z" },
    { id: "u2", name: "Admin User", email: "admin@example.com", role: "ADMIN", status: "Active", created_at: "2025-01-01T10:00:00Z" },
    { id: "u3", name: "Raj Patel", email: "raj@example.com", role: "ASSET_MANAGER", department_id: "d2", status: "Active", created_at: "2025-01-15T10:00:00Z" },
  ],
  departments: [
    { id: "d1", name: "Engineering", head: "Priya Shah", status: "Active" },
    { id: "d2", name: "Facilities", head: "Raj Patel", status: "Active" },
    { id: "d3", name: "Field Ops", head: "Sam Iqbal", status: "Inactive" },
  ],
  categories: [
    { id: "c1", name: "Electronics", type: "IT" },
    { id: "c2", name: "Furniture", type: "Office" },
    { id: "c3", name: "Vehicles", type: "Fleet" },
  ],
  assets: [
    { id: "a1", tag: "AF-0012", name: "Dell Laptop", category: "Electronics", status: "allocated", location: "Bangalore", current_holder_name: "Priya Shah" },
    { id: "a2", tag: "AF-0045", name: "Projector", category: "Electronics", status: "under_maintenance", location: "HQ Floor 2" },
    { id: "a3", tag: "AF-0201", name: "Office Chair", category: "Furniture", status: "available", location: "Warehouse" },
    { id: "a4", tag: "AF-0114", name: "MacBook Pro", category: "Electronics", status: "allocated", location: "Pune", current_holder_name: "Raj Patel" },
  ],
  allocations: [
    { id: "al1", asset_id: "a1", asset_tag: "AF-0012", asset_name: "Dell Laptop", user_id: "u1", user_name: "Priya Shah", expected_return_date: "2026-12-31T00:00:00Z", status: "active", created_at: "2026-03-12T10:00:00Z" },
    { id: "al2", asset_id: "a4", asset_tag: "AF-0114", asset_name: "MacBook Pro", user_id: "u3", user_name: "Raj Patel", expected_return_date: "2025-10-01T00:00:00Z", status: "returned", created_at: "2025-01-14T10:00:00Z" },
  ],
  transfers: [
    { id: "t1", asset_id: "a1", asset_tag: "AF-0012", asset_name: "Dell Laptop", from_user_id: "u1", from_user_name: "Priya Shah", to_user_id: "u3", to_user_name: "Raj Patel", reason: "Need it for a client presentation next week.", status: "pending", created_at: "2026-07-10T10:00:00Z" },
  ],
  maintenance: [
    { id: "m1", asset_tag: "AF-0045", asset_name: "Projector", issue: "Not turning on", priority: "High", status: "pending", created_at: "2026-07-11T10:00:00Z" },
    { id: "m2", asset_tag: "AF-0015", asset_name: "Dell Laptop", issue: "Noisy compressor", priority: "Medium", status: "approved", created_at: "2026-07-10T10:00:00Z" },
    { id: "m3", asset_tag: "AF-0098", asset_name: "Forklift", issue: "Needs oil service", priority: "Low", status: "technician_assigned", created_at: "2026-07-09T10:00:00Z" },
    { id: "m4", asset_tag: "AF-0112", asset_name: "Printer Jam", issue: "Parts ordered", priority: "Medium", status: "in_progress", created_at: "2026-07-08T10:00:00Z" },
    { id: "m5", asset_tag: "AF-0221", asset_name: "Office Chair", issue: "Wheel repair", priority: "Low", status: "resolved", created_at: "2026-07-01T10:00:00Z", resolved_at: "2026-07-03T10:00:00Z" },
  ],
  bookings: [
    { id: "b1", resource_name: "Conference Room B2 - Cap 8, AV", user_name: "Priya Shah", start_time: "2026-07-12T09:00:00Z", end_time: "2026-07-12T10:00:00Z", status: "upcoming" },
    { id: "b2", resource_name: "Conference Room B2 - Cap 8, AV", user_name: "Raj Patel", start_time: "2026-07-12T13:00:00Z", end_time: "2026-07-12T15:00:00Z", status: "upcoming" },
  ],
  audits: [
    { id: "au1", name: "Q3 Assets Engineering Dept", date: "Jul 10 - Jul 25", status: "active", auditor: "A. Patel, S. Rajput" },
  ],
  auditItems: [
    { id: "ai1", asset_tag: "AF-0012", asset_name: "Dell Laptop", location: "Desk B32", status: "Verified" },
    { id: "ai2", asset_tag: "AF-0121", asset_name: "Office Chair", location: "Desk B33", status: "Missing" },
    { id: "ai3", asset_tag: "AF-0822", asset_name: "Monitor", location: "Desk B34", status: "Damaged" },
  ],
  dashboard: {
    stats: {
      available_assets: 128,
      allocated_assets: 35,
      active_bookings: 9,
      pending_transfers: 3,
      upcoming_returns: 12,
      overdue_returns: 3,
    },
    recent_activity: [
      { id: "ra1", type: "allocation", description: "Laptop AF-0114 allocated to Priya Shah - IT dept", created_at: "2026-07-12T09:30:00Z" },
      { id: "ra2", type: "booking", description: "Room B2 booking confirmed - 2:00 to 3:00 PM", created_at: "2026-07-12T08:15:00Z" },
      { id: "ra3", type: "maintenance", description: "Projector AF-0045 maintenance resolved", created_at: "2026-07-11T16:45:00Z" },
    ],
  },
  reports: {
    utilization: [
      { name: "Engineering", value: 85 },
      { name: "Facilities", value: 40 },
      { name: "HR", value: 65 },
      { name: "Sales", value: 90 },
      { name: "Support", value: 75 },
    ],
    maintenanceFreq: [
      { month: "Jan", value: 10 },
      { month: "Feb", value: 15 },
      { month: "Mar", value: 12 },
      { month: "Apr", value: 25 },
      { month: "May", value: 18 },
      { month: "Jun", value: 30 },
    ],
    mostUsed: [
      { name: "MacBook Pro", usage: "312 hrs this month" },
      { name: "Van AF-312", usage: "21 trips this month" },
    ],
    idle: [
      { name: "Projector AF-022", usage: "0 hrs this month" },
      { name: "Chair AF-041", usage: "unused 45 days" },
    ],
    dueForMaintenance: [
      { tag: "AF-0098", name: "Forklift", reason: "service due in 5 days" },
      { tag: "AF-0222", name: "Laptop", reason: "4 years old - nearing retirement" },
    ]
  },
  notifications: [
    { id: "n1", type: "allocation", message: "Laptop AF-0114 assigned to Priya Shah", time: "2m ago", read: false },
    { id: "n2", type: "maintenance", message: "Maintenance request AF-0045 approved", time: "15m ago", read: false },
    { id: "n3", type: "booking", message: "Booking confirmed : Room B2 2:00 to 3:00 PM", time: "1h ago", read: true },
    { id: "n4", type: "transfer", message: "Transfer approved : AF-0023 to Facilities dept", time: "3h ago", read: true },
    { id: "n5", type: "alert", message: "Overdue return : AF-0021 was due 3 days ago", time: "1d ago", read: true },
    { id: "n6", type: "alert", message: "Audit discrepancy flagged : AF-0099 damaged", time: "2d ago", read: true },
  ]
};
