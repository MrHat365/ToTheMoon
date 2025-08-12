"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Mountain } from "lucide-react"

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card text-card-foreground shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Mountain className="h-6 w-6 text-primary" /> {/* Mountain icon now uses primary accent color */}
          <span className="text-lg">ToTheMoon Dashboard</span>
        </Link>
        <nav className="flex items-center space-x-4">
          <Link
            href="/template-management"
            className={cn(
              "px-4 py-2.5 rounded-md text-sm font-medium transition-colors", // Increased padding
              pathname === "/template-management"
                ? "bg-primary/20 text-primary border border-primary" // More prominent active state
                : "text-muted-foreground hover:bg-secondary", // Clearer hover state
            )}
          >
            模板管理
          </Link>
          <Link
            href="/control-center"
            className={cn(
              "px-4 py-2.5 rounded-md text-sm font-medium transition-colors", // Increased padding
              pathname === "/control-center"
                ? "bg-primary/20 text-primary border border-primary" // More prominent active state
                : "text-muted-foreground hover:bg-secondary", // Clearer hover state
            )}
          >
            控制中心
          </Link>
          <Link
            href="/config"
            className={cn(
              "px-4 py-2.5 rounded-md text-sm font-medium transition-colors", // Increased padding
              pathname === "/config"
                ? "bg-primary/20 text-primary border border-primary" // More prominent active state
                : "text-muted-foreground hover:bg-secondary", // Clearer hover state
            )}
          >
            系统配置
          </Link>
        </nav>
      </div>
    </header>
  )
}
