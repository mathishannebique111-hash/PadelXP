// app/api/resend-inbound/route.ts

import { NextRequest, NextResponse } from "next/server";



export async function POST(req: NextRequest) {

  // Resend envoie du JSON, mais on lit d'abord le texte brut pour debug

  const rawBody = await req.text();

  console.log("Resend inbound RAW payload:", rawBody);



  // Tu pourras parser ensuite avec JSON.parse(rawBody)

  return new NextResponse("OK", { status: 200 });

}

