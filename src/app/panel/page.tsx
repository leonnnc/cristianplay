import type { Metadata } from "next";
import { PanelApp } from "@/components/panel/panel-app";

export const metadata: Metadata = {
  title: "Panel de configuración · CristianPlay",
  description: "Configuración del servidor: Firebase/Google y YouTube.",
  robots: { index: false, follow: false },
};

export default function PanelPage() {
  return <PanelApp />;
}