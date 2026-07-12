import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isAuthorized } from "@/lib/auth";
import { fetchUrlMetadata, hostnameOf } from "@/lib/metadata";
import { isReservedCategory, toPlainItem } from "@/lib/types";

export const dynamic = "force-dynamic";

// iOSショートカット等の外部クライアント向けAPI。
// Authorization: Bearer <SCRAPBOOK_API_KEY> が必須。
// Web UI 自体は同一オリジンのサーバーアクション (app/actions.ts) を使うのでキー不要。

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const items = await prisma.item.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items: items.map(toPlainItem) });
}

// { url, category } だけ渡せばサーバー側でメタデータ取得〜保存まで行う。
// title / description / image を明示的に渡した場合はそちらを優先する。
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { url, category, title, description, image, important } =
    (body ?? {}) as Record<string, unknown>;

  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  if (typeof category !== "string" || !category.trim()) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }
  if (isReservedCategory(category.trim())) {
    return NextResponse.json(
      { error: "「すべて」「★重要」「完了」は予約語のため使えません" },
      { status: 400 }
    );
  }
  try {
    new URL(url.trim());
  } catch {
    return NextResponse.json({ error: "url is not a valid URL" }, { status: 400 });
  }

  const needsMeta = typeof title !== "string" || !title.trim();
  const meta = needsMeta ? await fetchUrlMetadata(url.trim()) : null;

  const item = await prisma.item.create({
    data: {
      url: url.trim(),
      title:
        (typeof title === "string" && title.trim()) ||
        meta?.title ||
        hostnameOf(url.trim()),
      description:
        (typeof description === "string" && description.trim()) || meta?.description || "",
      image: (typeof image === "string" && image.trim()) || meta?.image || "",
      category: category.trim(),
      important: important === true,
    },
  });

  revalidatePath("/");
  return NextResponse.json({ item: toPlainItem(item) }, { status: 201 });
}
