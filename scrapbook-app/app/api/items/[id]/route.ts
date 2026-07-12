import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isAuthorized } from "@/lib/auth";
import { isReservedCategory, toPlainItem } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// important / archived / category などの部分更新
export async function PATCH(request: Request, { params }: Params) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const input = (body ?? {}) as Record<string, unknown>;

  const data: Record<string, unknown> = {};
  for (const key of ["title", "description", "image", "category", "url"] as const) {
    if (typeof input[key] === "string") data[key] = (input[key] as string).trim();
  }
  for (const key of ["important", "archived"] as const) {
    if (typeof input[key] === "boolean") data[key] = input[key];
  }
  if (typeof data.category === "string" && isReservedCategory(data.category)) {
    return NextResponse.json({ error: "予約語のカテゴリは使えません" }, { status: 400 });
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no updatable fields" }, { status: 400 });
  }

  try {
    const item = await prisma.item.update({ where: { id }, data });
    revalidatePath("/");
    return NextResponse.json({ item: toPlainItem(item) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(request: Request, { params }: Params) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await prisma.item.delete({ where: { id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    throw e;
  }
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
