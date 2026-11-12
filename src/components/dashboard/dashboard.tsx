"use client";

import { useEffect } from "react";
import { ArrowRight, ListMusic, Play } from "lucide-react";
import { LibraryProvider, useLibrary } from "@/components/providers/library-provider";
import { PlayerProvider, usePlayer } from "@/components/providers/player-provider";
import { SearchProvider, useSearch } from "@/components/providers/search-provider";
import { UIProvider, useUI } from "@/components/providers/ui-provider";
import { Ambient } from "@/components/dashboard/ambient";
import { CloudModal } from "@/components/dashboard/cloud-modal";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { PlaylistPicker } from "@/components/dashboard/playlist-picker";
import { PlayerStage } from "@/components/dashboard/player-stage";
import { SearchPanel, SearchSheet } from "@/components/dashboard/search-panel";
import { SectionContent } from "@/components/dashboard/section-content";
import { Sidebar, MobileSidebar } from "@/components/dashboard/sidebar";
import { Toasts } from "@/components/dashboard/toasts";
import { TopBar } from "@/components/dashboard/topbar";
import { Thumb } from "@/components/ui/thumb";
import type { View } from "@/lib/types";

function UpNext() {
  const { queue, index, playAt } = usePlayer();
  const { navigate } = useUI();

  const upcoming = queue.slice(index + 1).slice(0, 8);
  if (upcoming.length === 0) return null;

  return (
    <section className="glass-soft rounded-2xl px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          <ListMusic className="h-3.5 w-3.5 text-violet-300" />
          A continuación
        </p>
        <button
          type="button"
          onClick={() => navigate({ type: "queue" })}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 transition hover:text-white"
        >
          Ver cola
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div className="scrollbar-none mt-2 flex gap-2 overflow-x-auto pb-0.5">
        {upcoming.map((track, position) => (
          <button
            key={`${track.id}-${position}`}
            type="button"
            onClick={() => playAt(index + 1 + position)}
            className="group flex w-[210px] shrink-0 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-1.5 text-left transition hover:border-violet-400/30 hover:bg-white/[0.05]"
          >
            <span className="relative h-9 w-14 shrink-0 overflow-hidden rounded-md">
              <Thumb src={track.thumbnail} alt="" className="h-full w-full" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                <Play className="h-3 w-3 fill-white text-white" />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[10px] font-medium text-slate-200">
                {track.title}
              </span>
              <span className="block truncate text-[9px] text-slate-500">
                {track.channel}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.05] pb-1 pt-4 text-[10px] text-slate-600">
      <span className="flex items-center gap-1.5">
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
        CristianPlay · v0.1 — Worship OS
      </span>
      <span>Contenido servido por YouTube. Sin descargas ni almacenamiento.</span>
    </footer>
  );
}

function DashboardInner() {
  const { navigate, setSearchOpen, setSidebarOpen } = useUI();
  const { searchCategory } = useSearch();
  const { current } = usePlayer();
  const { recordHistory } = useLibrary();

  const go = (next: View) => {
    navigate(next);
    if (next.type === "search") {
      searchCategory(next.category);
    }
  };

  useEffect(() => {
    if (current) recordHistory(current);
  }, [current, recordHistory]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSidebarOpen(false);
        return;
      }
      if (event.key !== "/") return;
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (typing) return;
      event.preventDefault();
      const mobile = window.matchMedia("(max-width: 1279px)").matches;
      if (mobile) setSearchOpen(true);
      window.setTimeout(
        () => window.dispatchEvent(new Event("cp:focus-search")),
        mobile ? 120 : 0,
      );
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setSearchOpen, setSidebarOpen]);

  return (
    <div className="relative h-dvh w-full overflow-hidden text-slate-200">
      <Ambient />

      <div className="relative z-10 grid h-dvh min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[258px_minmax(0,1fr)_380px]">
        <Sidebar onNavigate={go} />

        <main className="scroll-thin relative min-h-0 overflow-y-auto px-3 pb-24 pt-3 sm:px-5 lg:px-6 lg:pb-6">
          <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 sm:gap-5">
            <TopBar />
            <PlayerStage />
            <UpNext />
            <SectionContent onNavigate={go} />
            <Footer />
          </div>
        </main>

        <div className="hidden min-h-0 flex-col overflow-hidden border-l border-white/[0.06] bg-[#070a14]/40 xl:flex">
          <SearchPanel variant="desktop" />
        </div>
      </div>

      <MobileNav />
      <MobileSidebar onNavigate={go} />
      <SearchSheet />
      <PlaylistPicker />
      <CloudModal />
      <Toasts />
    </div>
  );
}

export function Dashboard() {
  return (
    <UIProvider>
      <LibraryProvider>
        <PlayerProvider>
          <SearchProvider>
            <DashboardInner />
          </SearchProvider>
        </PlayerProvider>
      </LibraryProvider>
    </UIProvider>
  );
}
