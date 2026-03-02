'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Clock, GraduationCap } from 'lucide-react';

const navItems = [
  { href: '/app/settings/general', label: 'General', icon: Settings },
  { href: '/app/settings/acadamic', label: 'Academic', icon: GraduationCap },
  { href: '/app/settings/attendance', label: 'Attendance', icon: Clock },
];

export default function SettingsLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href + '/'));
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
