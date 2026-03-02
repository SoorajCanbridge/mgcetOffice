"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Home,
  Settings,
  User2,
  ChevronsUp,
  BookOpen,
  Users,
  FileText,
  Wallet,
  Receipt,
  CreditCard,
  ClipboardCheck,
  DollarSign,
  Tag,
  TrendingDown,
  TrendingUp,
  PieChart,
  Briefcase,
  Clock,
  Activity,
  LayoutGrid,
  BookMarked,
  Banknote,
  GraduationCap,
  BarChart3,
  LayoutDashboard,
  Scale,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navGroups = [
  {
    label: "Main",
    items: [
      { title: "Home", url: "/app", icon: Home },
      { title: "Analytics", url: "/app/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Academic",
    items: [
      { title: "Courses", url: "/app/courses", icon: BookOpen },
      { title: "Students", url: "/app/students", icon: Users },
      { title: "Staff", url: "/app/staff", icon: Briefcase },
      // { title: "Teacher Attendance", url: "/app/teacher-attendance", icon: ClipboardCheck },
      { title: "Staff Attendance", url: "/app/staff-attendance", icon: Clock },
    ],
  },
  {
    label: "Invoicing & Payments",
    items: [{ title: "Pay", url: "/app/invoices/payments", icon: Banknote },
      { title: "Invoices", url: "/app/invoices", icon: FileText },
      { title: "Fees", url: "/app/invoices/saved-contents", icon: BookMarked },    
      { title: "Transactions", url: "/app/payments", icon: CreditCard },
      { title: "Payroll", url: "/app/payroll", icon: DollarSign },
    ],
  },
  {
    label: "Finance",
    items: [ 
      { title: "Dashboard", url: "/app/finance/tracking", icon: LayoutDashboard },
      { title: "Accounts", url: "/app/accounts", icon: Wallet },
      { title: "Ledgers", url: "/app/ledgers", icon: Receipt },
      { title: "Balance Sheet", url: "/app/ledgers/balance-sheet", icon: Scale },
      // { title: "Finance", url: "/app/finance", icon: PieChart },
     
      { title: "Income", url: "/app/finance/tracking/income", icon: TrendingUp },
      { title: "Expenses", url: "/app/finance/tracking/expenses", icon: TrendingDown },
    
      { title: "Categories", url: "/app/finance/categories", icon: Tag }, 
       { title: "Reports", url: "/app/finance/tracking/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "General", url: "/app/settings/general", icon: Settings },
      { title: "Team", url: "/app/settings/team", icon: Users },
      { title: "Attendance", url: "/app/settings/attendance", icon: Clock },
      { title: "Academic", url: "/app/settings/acadamic", icon: GraduationCap },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname() ?? "";

  return (
    <Sidebar collapsible="icon" className="h-full">
      <SidebarContent className="h-full justify-between">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.url ||
                    (pathname.startsWith(item.url + "/") &&
                      !group.items.some(
                        (o) => o.url.length > item.url.length && pathname.startsWith(o.url)
                      ));
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton tooltip="Account">
                    <User2 />
                    <span>Account</span>
                    <ChevronsUp className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-[--radix-popper-anchor-width]"
                >
                  <DropdownMenuItem asChild>
                    <Link href="/app/settings/general">Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Billing</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
