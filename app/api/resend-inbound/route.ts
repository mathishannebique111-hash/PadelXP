import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  console.log("Resend inbound RAW payload:", bodyText);

  return new NextResponse("OK", { status: 200 });
}
