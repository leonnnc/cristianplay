"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useUI } from "@/components/providers/ui-provider";

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertTriangle,
};

const COLORS = {
  info: "text-cyan-300",
  success: "text-emerald-300",
  warning: "text-amber-300",
  danger: "text-rose-300",
};

export function Toasts() {
  const { toasts, dismissToast } = useUI();

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-[80] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 lg:bottom-6">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.tone];
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0b1020]/95 px-4 py-3 text-sm text-slate-100 shadow-2xl backdrop-blur-xl toast-in"
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${COLORS[toast.tone]}`} />
            <p className="min-w-0 flex-1 leading-snug">{toast.message}</p>
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => dismissToast(toast.id)}
              className="rounded-md p-0.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
