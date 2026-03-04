"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext"
import { api, API_URL } from "@/lib/api"
import { getLogoUrl } from "@/lib/utils"
import { Moon, Sun, User, LogOut, Settings, Building2, GraduationCap, CalendarCheck, Sliders } from "lucide-react"

export function AppHeader() {
  const [mounted, setMounted] = useState(false)
  const [college, setCollege] = useState(null)
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const collegeLogoUrl = useMemo(() => {
    if (!college?.logo) return ""
    return getLogoUrl(college.logo, API_URL, true)
  }, [college?.logo])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!user?.college) return
    const collegeId = typeof user.college === "object" ? (user.college._id || user.college.id || "") : String(user.college)
    api.get(`/colleges/${collegeId}`, {}, true).then((res) => {
      const data = res?.data || res
      if (data) setCollege(data)
    }).catch(() => {})
  }, [user?.college])

  const currentTheme = theme || "light"
  const displayName = user?.name || user?.username || user?.email || "User"

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <SidebarTrigger />
        </div>
        <div className="flex flex-1 items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {collegeLogoUrl ? (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
                <img src={collegeLogoUrl} alt={college?.name || "College"} className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
              {college?.name || "College"}
            </h1>
          </div>
          <nav className="flex flex-shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => mounted && setTheme(currentTheme === "dark" ? "light" : "dark")}
              aria-label={mounted ? `Switch to ${currentTheme === "light" ? "dark" : "light"} mode` : "Toggle theme"}
            >
              {!mounted ? (
                <span className="block h-4 w-4" />
              ) : currentTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Separator orientation="vertical" className="h-6" />
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <User className="h-4 w-4" />
                    <span className="sr-only">Profile menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-medium leading-none">{displayName}</p>
                      {user.email && (
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      )}
                      {user.role && (
                        <p className="text-xs leading-none text-muted-foreground capitalize">{user.role}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onSelect={() => router.push("/app/settings/general")}>
                        <Sliders className="mr-2 h-4 w-4" />
                        <span>General</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => router.push("/app/settings/acadamic")}>
                        <GraduationCap className="mr-2 h-4 w-4" />
                        <span>Academic</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => router.push("/app/settings/attendance")}>
                        <CalendarCheck className="mr-2 h-4 w-4" />
                        <span>Attendance</span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

