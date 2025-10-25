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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "h-6 w-6 transition-all",
                    isActive && "stroke-[2.5]",
                    item.isSpecial && "h-7 w-7"
                  )}
                />
                <span className="text-xs font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
