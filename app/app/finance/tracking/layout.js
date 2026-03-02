'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, TrendingDown, BarChart3, LayoutDashboard } from 'lucide-react';

const navItems = [
  { href: '/app/finance/tracking', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/finance/tracking/income', label: 'Income', icon: TrendingUp },
  { href: '/app/finance/tracking/expenses', label: 'Expenses', icon: TrendingDown },
  { href: '/app/finance/tracking/reports', label: 'Reports', icon: BarChart3 },
];

export default function FinanceTrackingLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/app/finance/tracking' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
