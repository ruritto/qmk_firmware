// クライアントコンポーネントに渡すためのプレーンな Item 型
// (Prisma の Date はシリアライズできないので createdAt は ISO 文字列にする)
export type Item = {
  id: string;
  url: string;
  title: string;
  description: string;
  image: string;
  category: string;
  important: boolean;
  archived: boolean;
  createdAt: string;
};

export function toPlainItem(item: Omit<Item, "createdAt"> & { createdAt: Date }): Item {
  return { ...item, createdAt: item.createdAt.toISOString() };
}

export const RESERVED_TABS = ["すべて", "★重要", "完了"] as const;

export function isReservedCategory(name: string): boolean {
  return (RESERVED_TABS as readonly string[]).includes(name);
}
