import { NextResponse } from "next/server";
import fs from "node:fs";

export async function GET() {
  const cwd = process.cwd();
  const existsApp = fs.existsSync("app/page.tsx");
  const existsPages = fs.existsSync("pages/index.tsx");
  const existsSrcApp = fs.existsSync("src/app/page.tsx");

  return NextResponse.json({
    ok: true,
    cwd,
    exists: { app: existsApp, pages: existsPages, srcApp: existsSrcApp },
    timestamp: new Date().toISOString(),
  });
}
