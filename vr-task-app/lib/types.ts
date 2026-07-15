// チーム / デバイス種別 / 進捗ステータスの定義。
// DB 側の CHECK 制約 (supabase/migrations/0001_init.sql) と必ず一致させること。

export type TeamId = "climb" | "wheelchair" | "fishing_bike";
export type DeviceId = "climb" | "wheelchair" | "fishing" | "bike";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: string;
  title: string;
  team: TeamId;
  device: DeviceId;
  assignee: string;
  start_date: string; // "yyyy-MM-dd"
  end_date: string; // "yyyy-MM-dd" (両端含む)
  status: TaskStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  image_path: string | null;
  author_name: string;
  created_by: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  team: TeamId | null;
}

/** 全体予定 (ガント上部に日付単位で表示する短いイベント。1日1件) */
export interface DayEvent {
  id: string;
  date: string; // "yyyy-MM-dd"
  title: string; // 全角6文字 (半角12文字) まで
  created_by: string | null;
  created_at: string;
}

/** 全体予定タイトルの表示幅 (全角=2, 半角=1) */
export function eventTitleWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    // ASCII と半角カナは幅1、それ以外は幅2として数える
    w += /[ -~｡-ﾟ]/.test(ch) ? 1 : 2;
  }
  return w;
}

export const EVENT_TITLE_MAX_WIDTH = 12;

export interface TeamDef {
  id: TeamId;
  label: string;
  devices: DeviceId[];
  /* バーの色: dataviz パレット検証済み (light/dark 両モード) */
  colorLight: string;
  colorDark: string;
  /* バー上のアイコン・文字色 (背景色とのコントラスト確保用) */
  barInkLight: string;
  barInkDark: string;
}

export const TEAMS: TeamDef[] = [
  {
    id: "climb",
    label: "クライム",
    devices: ["climb"],
    colorLight: "#2a78d6",
    colorDark: "#3987e5",
    barInkLight: "#ffffff",
    barInkDark: "#ffffff",
  },
  {
    id: "wheelchair",
    label: "車椅子",
    devices: ["wheelchair"],
    colorLight: "#1baf7a",
    colorDark: "#199e70",
    barInkLight: "#04281a",
    barInkDark: "#04281a",
  },
  {
    id: "fishing_bike",
    label: "釣り・自転車",
    devices: ["fishing", "bike"],
    colorLight: "#eda100",
    colorDark: "#c98500",
    barInkLight: "#2e2000",
    barInkDark: "#2e2000",
  },
];

export const TEAM_MAP: Record<TeamId, TeamDef> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t])
) as Record<TeamId, TeamDef>;

export const DEVICES: { id: DeviceId; label: string }[] = [
  { id: "climb", label: "クライム" },
  { id: "wheelchair", label: "車椅子" },
  { id: "fishing", label: "釣り" },
  { id: "bike", label: "自転車" },
];

export const DEVICE_MAP: Record<DeviceId, { id: DeviceId; label: string }> =
  Object.fromEntries(DEVICES.map((d) => [d.id, d])) as Record<
    DeviceId,
    { id: DeviceId; label: string }
  >;

export const STATUSES: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "未着手" },
  { id: "in_progress", label: "進行中" },
  { id: "done", label: "完了" },
];

export const STATUS_MAP: Record<TaskStatus, string> = {
  todo: "未着手",
  in_progress: "進行中",
  done: "完了",
};

/** タブ = 「全体」+ 3チーム + 「一覧」(班ごとの時系列リスト) */
export type TabId = "all" | TeamId | "list";

export const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "全体" },
  ...TEAMS.map((t) => ({ id: t.id as TabId, label: t.label })),
  { id: "list", label: "一覧" },
];

export const NOTE_IMAGE_BUCKET = "note-images";
