import { NextResponse } from "next/server";
import { getLiveStatus } from "@/lib/server/live";

/** Estado del directo de Catedral de Fe. */
export async function GET() {
  try {
    const status = await getLiveStatus();
    return NextResponse.json(status, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo consultar el estado en vivo.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
