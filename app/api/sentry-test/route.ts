import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  Sentry.captureException(new Error("Sentry test error"));
  await Sentry.flush(2000);
  return NextResponse.json({ ok: true });
}

