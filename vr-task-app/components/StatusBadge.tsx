import type { TaskStatus } from "@/lib/types";
import { STATUS_MAP } from "@/lib/types";

// 進捗ステータスのバッジ。色 + テキストラベルの併記で色覚多様性にも対応。
export default function StatusBadge({ status }: { status: TaskStatus }) {
  const dotColor =
    status === "done"
      ? "var(--status-done)"
      : status === "in_progress"
        ? "var(--status-in_progress)"
        : "var(--ink-muted)";

  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-ink-secondary">
      <span
        className="inline-block size-2 rounded-full"
        style={{ background: dotColor }}
      />
      {STATUS_MAP[status]}
    </span>
  );
}
