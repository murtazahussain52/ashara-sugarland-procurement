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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authed())) return unauthorized();
  const { id } = await params;
  const update = await req.json();
  const items = await redis.get<any[]>("items") ?? [];
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  items[idx] = { ...items[idx], ...update, id };
  await redis.set("items", items);
  return NextResponse.json(items[idx]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authed())) return unauthorized();
  const { id } = await params;
  const items = await redis.get<any[]>("items") ?? [];
  const filtered = items.filter((i) => i.id !== id);
  await redis.set("items", filtered);
  return NextResponse.json({ ok: true });
}
