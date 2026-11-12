"use client";

import { Heart, Home, ListMusic, Menu, Search } from "lucide-react";
import clsx from "clsx";
import { usePlayer } from "@/components/providers/player-provider";
import { useUI } from "@/components/providers/ui-provider";

export function MobileNav() {
  const { view, navigate, setSearchOpen, setSidebarOpen, searchOpen } = useUI();
  const { queue } = usePlayer();

  const items = [
    {
      key: "home",
      label: "Inicio",
      icon: Home,
      active: view.type === "home",
      onClick: () => navigate({ type: "home" }),
    },
    {
      key: "search",
      label: "Buscar",
      icon: Search,
      active: searchOpen,
      onClick: () => setSearchOpen(true),
    },
    {
      key: "queue",
      label: "Cola",
      icon: ListMusic,
      active: view.type === "queue",
      badge: queue.length,
      onClick: () => navigate({ type: "queue" }),
    },
    {
      key: "favorites",
      label: "Favoritos",
      icon: Heart,
      active: view.type === "favorites",
      onClick: () => navigate({ type: "favorites" }),
    },
    {
      key: "menu",
      label: "Menú",
      icon: Menu,
      active: false,
      onClick: () => setSidebarOpen(true),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[60] border-t border-white/[0.08] bg-[#070a14]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className={clsx(
                "relative flex flex-col items-center gap-1 py-2.5 text-[9px] font-medium transition",
                item.active
                  ? "text-violet-200"
                  : "text-slate-500 hover:text-slate-200",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.badge ? (
                <span className="absolute right-[26%] top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-violet-500 px-0.5 text-[8px] font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
              {item.label}
              {item.active ? (
                <span className="absolute -top-px h-0.5 w-6 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(139,92,246,1)]" />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
