"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import {
  BarChart3, Calendar, Users, Truck, Map, Settings,
  Menu, LogOut, CreditCard, RotateCcw, Zap, Shield, HeartPulse,
  MapPin, Package, History,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/dashboard/bookings", label: "Bookings", icon: Calendar },
  { href: "/dashboard/dispatch", label: "Dispatch Map", icon: Map },
  { href: "/dashboard/drivers", label: "Drivers", icon: Users },
  { href: "/dashboard/vans", label: "Vans", icon: Truck },
  { href: "/dashboard/customers", label: "Customers / CRM", icon: Users },
  { href: "/dashboard/subscriptions", label: "Subscriptions", icon: Package },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/refunds", label: "Refund Requests", icon: RotateCcw },
  { href: "/dashboard/services", label: "Services & Pricing", icon: Zap },
  { href: "/dashboard/zones", label: "Zones", icon: MapPin },
  { href: "/dashboard/staff", label: "Staff & Roles", icon: Shield },
  { href: "/dashboard/activity", label: "Activity", icon: History },
  { href: "/dashboard/health", label: "System Health", icon: HeartPulse },
  { href: "/dashboard/settings", label: "Dispatch Settings", icon: Settings },
];

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentPage = navItems.find((item) =>
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href))
  );

  return (
    <div className="flex min-h-screen">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-[#202426] border-r border-[var(--border)] flex flex-col max-lg:transition-transform max-lg:duration-200 ${
          sidebarOpen ? "translate-x-0" : "max-lg:-translate-x-full"
        }`}
      >
        <div className="flex items-baseline gap-2.5 px-2.5 pb-7 pt-7">
          <span className="text-[30px] tracking-wide font-[900]">WOSH</span>
          <span className="text-[var(--green)] text-xs font-[800] tracking-[.18em]">ADMIN</span>
        </div>

        <nav className="flex flex-col gap-1.5 overflow-auto pr-1 flex-1 px-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3.5 px-3.5 py-3.5 rounded-xl text-[15px] font-[650] no-underline transition-all duration-[160ms] ${
                  isActive
                    ? "bg-[var(--green)] text-[#101213] shadow-[0_0_28px_rgba(182,255,28,.18)]"
                    : "text-[var(--muted)] hover:bg-[#282d30] hover:text-[var(--text)]"
                }`}
              >
                <item.icon size={23} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] pt-4 px-1">
          <Link
            href="/"
            className="flex items-center gap-3.5 px-3.5 py-3.5 rounded-xl text-[var(--muted)] no-underline font-[650] text-[15px] hover:text-[var(--text)]"
          >
            <LogOut size={23} />
            Back to Home
          </Link>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 min-h-screen max-lg:ml-0 ml-[280px]">
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-8 h-[72px]"
          style={{
            background: "rgba(31,34,36,.92)",
            backdropFilter: "blur(14px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-[var(--text)]"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <span className="text-[22px] font-[900]">
              {currentPage?.label || "Dashboard"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="pill pill-green">Live Dubai Ops</span>
            <span className="pill hidden md:inline-flex">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="pill hidden md:inline-flex">Super Admin</span>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>

        <div className="p-8 max-lg:p-5">{children}</div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
          <div className="text-center max-w-md mx-auto p-8">
            <div className="flex items-baseline gap-2.5 justify-center mb-2">
              <span className="text-[48px] font-[900] tracking-wide">WOSH</span>
              <span className="text-[var(--green)] text-sm font-[800] tracking-[.18em]">ADMIN</span>
            </div>
            <p className="text-[var(--muted)] mb-8">Sign in to access the admin dashboard</p>
            <div className="card p-8">
              <SignInButton mode="modal">
                <button className="btn-primary w-full justify-center">Sign In</button>
              </SignInButton>
            </div>
            <Link href="/" className="inline-block mt-6 text-sm text-[var(--muted)] hover:text-[var(--text)] no-underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <DashboardShell>{children}</DashboardShell>
      </Authenticated>

      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-[3px] border-[var(--border)] border-t-[var(--green)] rounded-full mx-auto mb-4" />
            <p className="text-[var(--muted)]">Loading...</p>
          </div>
        </div>
      </AuthLoading>
    </>
  );
}
