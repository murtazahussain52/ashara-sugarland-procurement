import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { cookies } from "next/headers";

async function authed() {
  const c = await cookies();
  return c.get("auth")?.value === "1";
}
function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  if (!(await authed())) return unauthorized();
  const items = await redis.get<any[]>("items") ?? [];
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  if (!(await authed())) return unauthorized();
  const item = await req.json();
  item.id = Date.now().toString();
  item.createdAt = new Date().toISOString();
  const items = await redis.get<any[]>("items") ?? [];
  items.push(item);
  await redis.set("items", items);
  return NextResponse.json(item, { status: 201 });
}
