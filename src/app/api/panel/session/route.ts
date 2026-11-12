import { NextResponse } from "next/server";
import { isPanelConfigured, resolveAuth } from "@/lib/server/panel-auth";

export async function GET(request: Request) {
  const configured = await isPanelConfigured();
  const authenticated = configured ? await (await import("@/lib/server/panel-auth")).isAuthenticated(request) : false;
  const { configuredByEnv } = await resolveAuth();
  return NextResponse.json(
    { configured, authenticated, configuredByEnv },
    { headers: { "cache-control": "no-store" } },
  );
}