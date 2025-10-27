import { Calendar, BarChart3, PlusCircle, Camera, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Calendar, label: "Rolês", path: "/" },
  { icon: BarChart3, label: "Enquetes", path: "/enquetes" },
  { icon: PlusCircle, label: "Criar", path: "/criar", isSpecial: true },
  { icon: Camera, label: "Memórias", path: "/memorias" },
  { icon: User, label: "Perfil", path: "/perfil" },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[1100] bg-black/80 backdrop-blur border-t border-white/20 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                isActive ? "text-white" : "text-white/70 hover:text-white"
              )
            }
          >
            {({ isActive }) => (
              item.isSpecial ? (
                <>
                  <div className="relative -mt-6">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 p-[2px] shadow-[0_8px_20px_rgba(16,185,129,0.35)]">
                      <div className="h-full w-full rounded-full bg-black flex items-center justify-center">
                        <item.icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-white/90 mt-1">{item.label}</span>
                </>
              ) : (
                <>
                  <item.icon
                    className={cn(
                      "h-6 w-6 transition-all",
                      isActive ? "text-white" : "text-white/70"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isActive
                        ? "bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent"
                        : "text-white/70"
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
