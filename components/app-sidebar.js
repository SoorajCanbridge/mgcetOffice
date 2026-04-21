"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Home, Settings, User2, ChevronsUpDown, BookOpen, Users, 
  Wallet, Receipt, Briefcase, Clock, GraduationCap,
  BarChart3, LayoutDashboard, Scale, Shield, ChevronRight, 
  LogOut, CreditCard, Command, Bell, Search, BookMarked, FileText, Tag, TrendingUp, TrendingDown,
  Rocket, Building2, Package, Bookmark, Tags
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { canAccess } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname() ?? "";
  const { user } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  
  const [openGroups, setOpenGroups] = useState(["Main"]); // Default 'Main' open

  const visibleGroups = useMemo(() => {
    return navGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => !item.moduleKey || canAccess(user, item.moduleKey, "view")),
      }))
      .filter((g) => g.items.length > 0);
  }, [user]);

  const toggleGroup = (label) => {
    setOpenGroups(prev => 
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-all duration-300">
      
      {/* 1. BRANDING SECTION */}
      <div className="flex h-[72px] items-center px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Command className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">e-MGCET</span>
              <span className="text-[11px] font-medium text-zinc-500 mt-0.5">Enterprise Admin</span>
            </div>
          )}
        </div>
      </div>

  
      {/* 3. NAVIGATION CONTENT */}
      <SidebarContent className="px-3 custom-scrollbar">
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            {!isCollapsed && (
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center justify-between px-2  text-[11px] font-semibold uppercase tracking-wider text-zinc-400 py-2 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors "
              >
                {group.label}
                <ChevronRight className={cn(
                  "h-3 w-3 transition-transform",
                  openGroups.includes(group.label) && "rotate-90"
                )} />
              </button>
            )}

            {(openGroups.includes(group.label) || isCollapsed) && (
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                          className={cn(
                            "relative group h-9 px-3 transition-all duration-200 rounded-md",
                            isActive 
                              ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium" 
                              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200"
                          )}
                        >
                          <Link href={item.url} className="flex items-center gap-3">
                            <item.icon className={cn(
                              "h-[18px] w-[18px] shrink-0",
                              isActive ? "text-blue-600 dark:text-blue-400" : "opacity-70 group-hover:opacity-100"
                            )} />
                            {!isCollapsed && <span className="text-sm truncate">{item.title}</span>}
                            
                            {/* Active Tab Indicator */}
                            {isActive && (
                              <div className="absolute left-[-12px] w-1 h-5 bg-blue-600 rounded-r-full" />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* 4. FOOTER: REFINED PROFILE */}
      <SidebarFooter className="p-3 border-t border-zinc-200 dark:border-zinc-800">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton 
                  size="lg" 
                  className="w-full hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-all"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                    <User2 className="h-4 w-4" />
                  </div>
                  {!isCollapsed && (
                    <div className="grid flex-1 text-left text-sm leading-tight ml-2.5">
                      <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{user?.name || "Admin"}</span>
                      <span className="truncate text-[11px] text-zinc-500 font-medium">Manage Account</span>
                    </div>
                  )}
                  {!isCollapsed && <ChevronsUpDown className="ml-auto size-4 text-zinc-400" />}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[240px] rounded-xl shadow-xl border-zinc-200 dark:border-zinc-800" side="right" align="end" sideOffset={12}>
                <DropdownMenuLabel className="p-3 font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold leading-none text-zinc-900 dark:text-zinc-100">{user?.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-1">
                  <DropdownMenuItem className="rounded-md cursor-pointer py-2">
                    <Settings className="mr-2 h-4 w-4 opacity-70" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-md cursor-pointer py-2">
                    <Bell className="mr-2 h-4 w-4 opacity-70" /> Notifications
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator />
                <div className="p-1">
                  <DropdownMenuItem className="rounded-md cursor-pointer py-2 text-red-600 dark:text-red-400 focus:bg-red-50 focus:dark:bg-red-950/30 transition-colors">
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

const navGroups = [
  {
    label: "Main",
    items: [
      { title: "Home", url: "/app", icon: Home, moduleKey: "dashboard" },
      { title: "Analytics", url: "/app/analytics", icon: BarChart3, moduleKey: "analytics" },
    ],
  },
  {
    label: "Academics",
    items: [
      { title: "Courses", url: "/app/courses", icon: BookOpen, moduleKey: "academic" },
      { title: "Students", url: "/app/students", icon: Users, moduleKey: "students" },
      { title: "Student categories", url: "/app/students/categories", icon: Bookmark, moduleKey: "students" },
      { title: "Student tags", url: "/app/students/tags", icon: Tags, moduleKey: "students" },
    ],
  },
  {
    label: "Staff",
    items: [
      { title: "Staff", url: "/app/staff", icon: Briefcase, moduleKey: "staff" },
      { title: "Staff Attendance", url: "/app/staff-attendance", icon: Clock, moduleKey: "attendance" },
    ],
  },
  {
    label: "Fees & Payments",
    items: [
      { title: "Fees", url: "/app/invoices/saved-contents", icon: BookMarked, moduleKey: "fees" },
      { title: "Invoices", url: "/app/invoices", icon: FileText, moduleKey: "invoice" },
      { title: "Payments", url: "/app/invoices/payments", icon: CreditCard, moduleKey: "payments" },
      { title: "Payroll", url: "/app/payroll", icon: Briefcase, moduleKey: "payroll" },
      { title: "Transactions", url: "/app/payments", icon: BookOpen, moduleKey: "payments" },
    ],
  },
  {
    label: "Startup Kit",
    items: [
      { title: "Clients (New Colleges)", url: "/app/startup/clients", icon: Building2, moduleKey: "startup" },
      { title: "Plans", url: "/app/startup/plans", icon: Package, moduleKey: "startup" },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Dashboard", url: "/app/finance/tracking", icon: LayoutDashboard, moduleKey: "finance" },
      { title: "Accounts", url: "/app/accounts", icon: Wallet, moduleKey: "finance" },
      { title: "Ledgers", url: "/app/ledgers", icon: Receipt, moduleKey: "finance" },
      // { title: "Balance Sheet", url: "/app/ledgers/balance-sheet", icon: Scale, moduleKey: "finance" },
      { title: "Income", url: "/app/finance/tracking/income", icon: TrendingUp, moduleKey: "finance" },
      { title: "Expenses", url: "/app/finance/tracking/expenses", icon: TrendingDown, moduleKey: "finance" },
      { title: "Categories", url: "/app/finance/categories", icon: Tag, moduleKey: "finance" },
      { title: "Reports", url: "/app/finance/tracking/reports", icon: BarChart3, moduleKey: "finance" },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "General", url: "/app/settings/general", icon: Settings, moduleKey: "settings" },
      { title: "Attendance", url: "/app/settings/attendance", icon: Clock, moduleKey: "settings" },
      { title: "Academic", url: "/app/settings/acadamic", icon: GraduationCap, moduleKey: "settings" },
    ],
  },
  {
    label: "Team",
    items: [
      { title: "Team & users", url: "/app/settings/team", icon: Users, moduleKey: "team" },
      { title: "Roles", url: "/app/settings/roles", icon: Shield, moduleKey: "team" },
    ],
  },
];