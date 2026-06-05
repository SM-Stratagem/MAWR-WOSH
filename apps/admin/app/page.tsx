import Link from "next/link";
import { ArrowRight, BarChart3, Users, Car, Calendar, Settings, Activity } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/dashboard/bookings", label: "Bookings", icon: Calendar },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/drivers", label: "Drivers", icon: Car },
  { href: "/dashboard/dispatch", label: "Dispatch", icon: Users },
  { href: "/dashboard/payments", label: "Payments", icon: Settings },
  { href: "/dashboard/health", label: "Health", icon: Activity },
];

export default function AdminLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e2236]">
      <div className="text-center max-w-md mx-auto p-8">
        <h1 className="text-4xl font-bold tracking-wider mb-2">WOSH</h1>
        <p className="text-[#4d9aff] mb-8">Admin Dashboard</p>

        <div className="card p-6 mb-8">
          <p className="text-[#b2c3b8] mb-6">
            Sign in to access the admin dashboard
          </p>
          <Link href="/sign-in" className="btn-primary inline-flex items-center gap-2">
            Sign In <ArrowRight size={18} />
          </Link>
        </div>

        <div className="text-left">
          <h3 className="text-sm font-semibold text-[#b2c3b8] uppercase mb-4">
            Quick Links
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {navItems.slice(0, 6).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 text-sm text-[#b2c3b8] hover:text-white transition-colors"
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
