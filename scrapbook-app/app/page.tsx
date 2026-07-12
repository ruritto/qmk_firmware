import { prisma } from "@/lib/db";
import { toPlainItem } from "@/lib/types";
import ScrapbookBoard from "@/components/ScrapbookBoard";

// iOSショートカット経由で追加されたアイテムもリロードで必ず反映されるよう常に動的レンダリング
export const dynamic = "force-dynamic";

export default async function Home() {
  const items = await prisma.item.findMany({ orderBy: { createdAt: "desc" } });
  return <ScrapbookBoard initialItems={items.map(toPlainItem)} />;
}
