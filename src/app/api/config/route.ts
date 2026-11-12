import { NextResponse } from "next/server";
import { getResolvedFirebaseConfig, getResolvedYouTubeConfig } from "@/lib/server/config";
import type { PublicRuntimeConfig } from "@/lib/config-types";

export async function GET() {
  const firebase = await getResolvedFirebaseConfig();
  const youtube = await getResolvedYouTubeConfig();
  const payload: PublicRuntimeConfig = {
    firebase: firebase.value,
    youtube: {
      configured: Boolean(youtube.apiKey),
      region: youtube.region || "MX",
    },
    panel: { path: "/panel" },
  };
  return NextResponse.json(payload, {
    headers: { "cache-control": "no-store" },
  });
}

