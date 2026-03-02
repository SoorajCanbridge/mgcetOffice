'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"

export default function AppLayout({ children }) {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar />
        <div className="flex flex-col w-full">
          <AppHeader />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
