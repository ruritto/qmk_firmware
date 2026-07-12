import { notFound } from "next/navigation";
import DevGanttPreview from "./DevGanttPreview";

// 開発時専用: Supabase なしでガントチャートの表示・ドラッグ挙動を確認するページ。
// 本番ビルドでは 404 になる。
export default function DevGanttPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevGanttPreview />;
}
