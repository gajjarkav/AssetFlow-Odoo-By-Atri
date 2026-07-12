import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "../context/AuthContext";
import { AppLayout } from "../components/layout/AppLayout";
import { ProtectedRoute, AdminRoute } from "./ProtectedRoute";

// Pages
import DashboardPage from "../pages/DashboardPage";
import OrgSetupPage from "../pages/OrgSetupPage";
import AssetsPage from "../pages/AssetsPage";
import AssetDetailPage from "../pages/AssetDetailPage";
import AllocationPage from "../pages/AllocationPage";
import BookingPage from "../pages/BookingPage";
import MaintenancePage from "../pages/MaintenancePage";
import AuditPage from "../pages/AuditPage";
import ReportsPage from "../pages/ReportsPage";
import NotificationsPage from "../pages/NotificationsPage";
import LoginPage from "../pages/auth/LoginPage";
import SignupPage from "../pages/auth/SignupPage";
import TransfersPage from "../pages/TransfersPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes (data is considered fresh for 5 mins)
      gcTime: 10 * 60 * 1000, // 10 minutes (keep inactive data in cache for 10 mins)
      refetchOnWindowFocus: false, // Don't refetch on tab switch to avoid spamming the backend
      retry: 1, // Only retry failed requests once
    },
  },
});

export const AppRoutes = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster theme="dark" position="top-right" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/assets" element={<AssetsPage />} />
                <Route path="/assets/:id" element={<AssetDetailPage />} />
                <Route path="/allocations" element={<AllocationPage />} />
                <Route path="/bookings" element={<BookingPage />} />
                <Route path="/maintenance" element={<MaintenancePage />} />
                <Route path="/audits" element={<AuditPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/transfers" element={<TransfersPage />} />

                <Route path="/org" element={
                  <AdminRoute>
                    <OrgSetupPage />
                  </AdminRoute>
                } />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
