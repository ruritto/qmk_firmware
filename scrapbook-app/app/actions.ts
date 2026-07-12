"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { fetchUrlMetadata, hostnameOf, type UrlMetadata } from "@/lib/metadata";
import { isReservedCategory, toPlainItem, type Item } from "@/lib/types";

// Web UI 用のサーバーアクション群。同一オリジンのUIからのみ呼ばれる想定
// (個人利用のためUIにログインは設けない)。外部からの追加は /api/items (Bearerキー) を使う。

export async function fetchMetadataAction(url: string): Promise<UrlMetadata> {
  return fetchUrlMetadata(url.trim());
}

export async function createItemAction(input: {
  url: string;
  title: string;
  description: string;
  image: string;
  category: string;
}): Promise<Item> {
  const url = input.url.trim();
  const category = input.category.trim();
  if (!url) throw new Error("URLが空です");
  if (!category || isReservedCategory(category)) throw new Error("カテゴリが不正です");

  const item = await prisma.item.create({
    data: {
      url,
      title: input.title.trim() || hostnameOf(url),
      description: input.description.trim(),
      image: input.image.trim(),
      category,
    },
  });
  revalidatePath("/");
  return toPlainItem(item);
}

export async function toggleImportantAction(id: string): Promise<Item> {
  const current = await prisma.item.findUniqueOrThrow({ where: { id } });
  const item = await prisma.item.update({
    where: { id },
    data: { important: !current.important },
  });
  revalidatePath("/");
  return toPlainItem(item);
}

export async function archiveItemAction(id: string): Promise<Item> {
  const item = await prisma.item.update({
    where: { id },
    data: { archived: true, important: false },
  });
  revalidatePath("/");
  return toPlainItem(item);
}

export async function restoreItemAction(id: string): Promise<Item> {
  const item = await prisma.item.update({ where: { id }, data: { archived: false } });
  revalidatePath("/");
  return toPlainItem(item);
}

export async function deleteItemAction(id: string): Promise<void> {
  await prisma.item.delete({ where: { id } });
  revalidatePath("/");
}
