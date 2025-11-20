import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  console.log("Resend inbound RAW payload:", bodyText);

  return new NextResponse("OK", { status: 200 });
}
export async function POST(req: Request) {
  const payload = await req.json().catch(async () => {
    // If not JSON, fallback to text
    return await req.text();
  });
  console.log('Received inbound Resend payload:', payload);
  return new Response('OK', { status: 200 });
}
