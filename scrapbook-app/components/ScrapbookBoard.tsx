"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, X, ExternalLink, Loader2, Pin, Search, Star,
  Archive, ArchiveRestore, LayoutGrid, Grid3x3, List,
} from "lucide-react";
import {
  archiveItemAction,
  createItemAction,
  deleteItemAction,
  fetchMetadataAction,
  restoreItemAction,
  toggleImportantAction,
} from "@/app/actions";
import { hostnameOf } from "@/lib/metadata";
import { isReservedCategory, RESERVED_TABS, type Item } from "@/lib/types";

const SUGGESTED_CATEGORIES = ["電子工作", "デザイン参考", "アニマトロニクス", "勉強", "お茶", "読みもの"];

const TAB_PALETTE = ["#6E8CAE", "#7C9473", "#C9A227", "#A6679C", "#4F8A8B", "#B8783F", "#8A6FA8", "#5B8266"];

function colorForCategory(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TAB_PALETTE[hash % TAB_PALETTE.length];
}

type ViewMode = "small" | "normal" | "title";

export default function ScrapbookBoard({ initialItems }: { initialItems: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [activeCategory, setActiveCategory] = useState("すべて");
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState<"url" | "edit">("url");
  const [urlInput, setUrlInput] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [draft, setDraft] = useState({ title: "", description: "", image: "", category: "" });
  const urlInputRef = useRef<HTMLInputElement>(null);

  // サーバー側の再レンダリング (router.refresh など) の結果を取り込む
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (showForm && formStep === "url" && urlInputRef.current) urlInputRef.current.focus();
  }, [showForm, formStep]);

  // 楽観的にローカル状態を更新しつつサーバーアクションを実行。
  // 失敗したらサーバーの状態を取り直して巻き戻す。
  function mutate(local: (prev: Item[]) => Item[], action: () => Promise<unknown>) {
    setItems(local);
    action().catch((e) => {
      console.error("更新に失敗しました", e);
      router.refresh();
    });
  }

  function openForm() {
    setUrlInput("");
    setDraft({ title: "", description: "", image: "", category: "" });
    setFetchError("");
    setFormStep("url");
    setShowForm(true);
  }

  async function handleFetch() {
    if (!urlInput.trim()) return;
    setFetching(true);
    setFetchError("");
    try {
      const meta = await fetchMetadataAction(urlInput.trim());
      // メタデータAPIが取れなかった場合はホスト名だけが返ってくる
      if (!meta.description && !meta.image && meta.title === hostnameOf(urlInput.trim())) {
        setFetchError("自動取得できませんでした。手入力で保存できます。");
      }
      setDraft({ ...meta, category: "" });
      setFormStep("edit");
    } catch {
      setFetchError("自動取得できませんでした。手入力で保存できます。");
      setDraft({ title: hostnameOf(urlInput.trim()), description: "", image: "", category: "" });
      setFormStep("edit");
    } finally {
      setFetching(false);
    }
  }

  const isReserved = isReservedCategory(draft.category.trim());

  async function handleSave() {
    if (!draft.category.trim() || isReserved || saving) return;
    setSaving(true);
    try {
      const item = await createItemAction({ url: urlInput.trim(), ...draft });
      setItems((prev) => [item, ...prev]);
      setShowForm(false);
    } catch (e) {
      console.error("保存に失敗しました", e);
      setFetchError("保存に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: string) {
    mutate((prev) => prev.filter((it) => it.id !== id), () => deleteItemAction(id));
  }

  function toggleImportant(id: string) {
    mutate(
      (prev) => prev.map((it) => (it.id === id ? { ...it, important: !it.important } : it)),
      () => toggleImportantAction(id)
    );
  }

  function archiveItem(id: string) {
    mutate(
      (prev) => prev.map((it) => (it.id === id ? { ...it, archived: true, important: false } : it)),
      () => archiveItemAction(id)
    );
  }

  function restoreItem(id: string) {
    mutate(
      (prev) => prev.map((it) => (it.id === id ? { ...it, archived: false } : it)),
      () => restoreItemAction(id)
    );
  }

  const activeItems = items.filter((it) => !it.archived);
  const archivedItems = items.filter((it) => it.archived);
  const dynamicCategories = Array.from(new Set(activeItems.map((it) => it.category))).filter(
    (c) => !(RESERVED_TABS as readonly string[]).includes(c)
  );
  const tabs = ["すべて", "★重要", ...dynamicCategories, "完了"];

  function countFor(tab: string): number {
    if (tab === "すべて") return activeItems.length;
    if (tab === "★重要") return activeItems.filter((it) => it.important).length;
    if (tab === "完了") return archivedItems.length;
    return activeItems.filter((it) => it.category === tab).length;
  }

  let baseList: Item[];
  if (activeCategory === "完了") baseList = archivedItems;
  else if (activeCategory === "★重要") baseList = activeItems.filter((it) => it.important);
  else if (activeCategory === "すべて") baseList = activeItems;
  else baseList = activeItems.filter((it) => it.category === activeCategory);

  baseList = [...baseList].sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0));

  const q = query.trim().toLowerCase();
  const filtered = baseList.filter((it) => {
    if (!q) return true;
    return (
      it.title.toLowerCase().includes(q) ||
      it.description.toLowerCase().includes(q) ||
      hostnameOf(it.url).toLowerCase().includes(q)
    );
  });

  const isArchiveView = activeCategory === "完了";

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Pin size={22} color="#B8562F" style={{ transform: "rotate(-18deg)" }} />
          <h1 style={styles.h1}>スクラップボード</h1>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.viewSwitch}>
            <button className="view-btn" onClick={() => setViewMode("small")} style={{ ...styles.viewBtn, background: viewMode === "small" ? "#2F2A22" : "transparent", color: viewMode === "small" ? "#F5EEDD" : "#5B4E39" }} aria-label="スモール表示">
              <Grid3x3 size={15} />
            </button>
            <button className="view-btn" onClick={() => setViewMode("normal")} style={{ ...styles.viewBtn, background: viewMode === "normal" ? "#2F2A22" : "transparent", color: viewMode === "normal" ? "#F5EEDD" : "#5B4E39" }} aria-label="ノーマル表示">
              <LayoutGrid size={15} />
            </button>
            <button className="view-btn" onClick={() => setViewMode("title")} style={{ ...styles.viewBtn, background: viewMode === "title" ? "#2F2A22" : "transparent", color: viewMode === "title" ? "#F5EEDD" : "#5B4E39" }} aria-label="タイトルのみ表示">
              <List size={15} />
            </button>
          </div>
          <div style={styles.searchBox}>
            <Search size={16} color="#8C7B5E" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="検索" style={styles.searchInput} />
          </div>
        </div>
      </header>

      <div style={styles.tabRow}>
        {tabs.map((cat) => {
          const active = cat === activeCategory;
          const isDynamic = !(RESERVED_TABS as readonly string[]).includes(cat);
          const color = isDynamic ? colorForCategory(cat) : null;
          const tabStyle = isDynamic
            ? { ...styles.tab, background: active ? color! : `${color}26`, color: active ? "#FFFDF7" : color! }
            : { ...styles.tab, background: active ? "#2F2A22" : "#EFE6D2", color: active ? "#F5EEDD" : "#5B4E39" };
          return (
            <button key={cat} className="tab-btn" onClick={() => setActiveCategory(cat)} style={tabStyle}>
              {cat} <span style={{ opacity: 0.7, fontSize: 12 }}>{countFor(cat)}</span>
            </button>
          );
        })}
      </div>

      <main style={styles.main}>
        {items.length === 0 && (
          <div style={styles.emptyState}>
            <Pin size={32} color="#C9B99B" />
            <p style={styles.emptyText}>まだ何も貼られていません。<br />右下の＋からURLを貼ってみましょう。</p>
          </div>
        )}

        {items.length > 0 && filtered.length === 0 && <p style={styles.emptyText}>見つかりませんでした。</p>}

        {viewMode === "normal" && (
          <div style={styles.grid}>
            {filtered.map((it, i) => (
              <div key={it.id} className="card" style={{ ...styles.card, transform: `rotate(${i % 2 === 0 ? -1.1 : 1.3}deg)` }}>
                <div style={styles.cardToolbar}>
                  <button onClick={() => toggleImportant(it.id)} style={styles.toolBtn} aria-label="重要">
                    <Star size={12} fill={it.important ? "#F2C879" : "none"} color={it.important ? "#F2C879" : "#fff"} />
                  </button>
                  {isArchiveView ? (
                    <button onClick={() => restoreItem(it.id)} style={styles.toolBtn} aria-label="戻す">
                      <ArchiveRestore size={12} color="#fff" />
                    </button>
                  ) : (
                    <button onClick={() => archiveItem(it.id)} style={styles.toolBtn} aria-label="完了へ移動">
                      <Archive size={12} color="#fff" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(it.id)} style={styles.toolBtn} aria-label="削除">
                    <X size={13} color="#fff" />
                  </button>
                </div>
                <a href={it.url} target="_blank" rel="noopener noreferrer" style={styles.cardLink}>
                  {/* 外部サイトの任意ドメインのOGP画像を表示するため next/image ではなく img を使う */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {it.image ? <img src={it.image} alt="" style={styles.cardImage} /> : <div style={styles.cardImageFallback}>{hostnameOf(it.url)}</div>}
                  <div style={styles.cardBody}>
                    <div style={styles.cardCategory}>{it.category}</div>
                    <div style={styles.cardTitle}>{it.title}</div>
                    {it.description && <div style={styles.cardDesc}>{it.description}</div>}
                    <div style={styles.cardHost}>
                      <ExternalLink size={11} style={{ marginRight: 4 }} />
                      {hostnameOf(it.url)}
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        )}

        {viewMode === "small" && (
          <div style={styles.smallGrid}>
            {filtered.map((it) => (
              <div key={it.id} className="small-card" style={styles.smallCard}>
                <button onClick={() => toggleImportant(it.id)} style={styles.smallStar} aria-label="重要">
                  <Star size={13} fill={it.important ? "#F2C879" : "none"} color={it.important ? "#F2C879" : "#fff"} />
                </button>
                <a href={it.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {it.image ? <img className="small-image" src={it.image} alt="" style={styles.smallImage} /> : <div style={styles.smallImageFallback}>{hostnameOf(it.url)}</div>}
                </a>
                <div style={styles.smallTitle}>{it.title}</div>
              </div>
            ))}
          </div>
        )}

        {viewMode === "title" && (
          <div style={styles.titleList}>
            {filtered.map((it) => (
              <div key={it.id} className="title-row" style={styles.titleRow}>
                <button onClick={() => toggleImportant(it.id)} style={styles.rowIconBtn} aria-label="重要">
                  <Star size={14} fill={it.important ? "#B8562F" : "none"} color="#B8562F" />
                </button>
                <a href={it.url} target="_blank" rel="noopener noreferrer" style={styles.titleRowLink}>
                  <span style={styles.titleRowText}>{it.title}</span>
                  <span style={styles.titleRowMeta}>{it.category} ・ {hostnameOf(it.url)}</span>
                </a>
                {isArchiveView ? (
                  <button onClick={() => restoreItem(it.id)} style={styles.rowIconBtn} aria-label="戻す">
                    <ArchiveRestore size={14} color="#8C7B5E" />
                  </button>
                ) : (
                  <button onClick={() => archiveItem(it.id)} style={styles.rowIconBtn} aria-label="完了へ移動">
                    <Archive size={14} color="#8C7B5E" />
                  </button>
                )}
                <button onClick={() => handleDelete(it.id)} style={styles.rowIconBtn} aria-label="削除">
                  <X size={14} color="#8C7B5E" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <button style={styles.fab} onClick={openForm} aria-label="追加">
        <Plus size={26} color="#F5EEDD" />
      </button>

      {showForm && (
        <div style={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>{formStep === "url" ? "URLを貼る" : "内容を確認"}</span>
              <button onClick={() => setShowForm(false)} style={styles.modalClose}><X size={18} /></button>
            </div>

            {formStep === "url" && (
              <div style={styles.modalBody}>
                <input ref={urlInputRef} value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleFetch()} placeholder="https://..." inputMode="url" autoCapitalize="off" autoCorrect="off" style={styles.textInput} />
                {fetchError && <p style={styles.errorText}>{fetchError}</p>}
                <button style={styles.primaryBtn} onClick={handleFetch} disabled={fetching || !urlInput.trim()}>
                  {fetching ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "情報を取得"}
                </button>
              </div>
            )}

            {formStep === "edit" && (
              <div style={styles.modalBody}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {draft.image && <img src={draft.image} alt="" style={styles.previewImage} />}
                <label style={styles.label}>タイトル</label>
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={styles.textInput} />
                <label style={styles.label}>概要</label>
                <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} style={{ ...styles.textInput, resize: "vertical" }} />
                <label style={styles.label}>画像URL</label>
                <input value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} style={styles.textInput} />
                <label style={styles.label}>カテゴリ</label>
                <input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="新規または既存のカテゴリ名" list="category-suggestions" style={styles.textInput} />
                {isReserved && <p style={styles.errorText}>「すべて」「★重要」「完了」は予約語のため使えません</p>}
                {fetchError && <p style={styles.errorText}>{fetchError}</p>}
                <datalist id="category-suggestions">
                  {Array.from(new Set([...dynamicCategories, ...SUGGESTED_CATEGORIES])).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <button style={styles.primaryBtn} onClick={handleSave} disabled={!draft.category.trim() || isReserved || saving}>
                  {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "保存する"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#F5EEDD", backgroundImage: "linear-gradient(#E6DBC0 1px, transparent 1px), linear-gradient(90deg, #E6DBC0 1px, transparent 1px)", backgroundSize: "26px 26px", fontFamily: "'Zen Maru Gothic', sans-serif", color: "#3A3226", paddingBottom: 100 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 8px", flexWrap: "wrap", gap: 12 },
  headerLeft: { display: "flex", alignItems: "center", gap: 8 },
  headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  h1: { fontSize: 20, fontWeight: 900, margin: 0, letterSpacing: "0.02em" },
  viewSwitch: { display: "flex", gap: 2, background: "#EFE6D2", borderRadius: 10, padding: 3 },
  viewBtn: { border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", display: "flex", alignItems: "center" },
  searchBox: { display: "flex", alignItems: "center", gap: 6, background: "#FFFDF7", border: "1px solid #DFD2AF", borderRadius: 20, padding: "6px 12px", minWidth: 140 },
  searchInput: { border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#3A3226", width: "100%" },
  tabRow: { display: "flex", gap: 8, overflowX: "auto", padding: "8px 20px 14px" },
  tab: { border: "none", borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer", fontFamily: "'Zen Maru Gothic', sans-serif" },
  main: { padding: "4px 20px" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 20px" },
  emptyText: { color: "#8C7B5E", fontSize: 14, textAlign: "center", lineHeight: 1.7 },

  grid: { columnCount: 2, columnGap: 14 },
  card: { breakInside: "avoid", marginBottom: 16, background: "#FFFDF7", border: "1px solid #E6DBC0", borderRadius: 4, boxShadow: "0 4px 10px rgba(60,45,25,0.12)", position: "relative", overflow: "hidden" },
  cardToolbar: { position: "absolute", top: 6, right: 6, zIndex: 3, display: "flex", gap: 4, background: "rgba(58,50,38,0.55)", borderRadius: 14, padding: 3 },
  toolBtn: { width: 20, height: 20, borderRadius: "50%", border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  cardLink: { textDecoration: "none", color: "inherit", display: "block" },
  cardImage: { width: "100%", display: "block", objectFit: "cover" },
  cardImageFallback: { width: "100%", height: 70, display: "flex", alignItems: "center", justifyContent: "center", background: "#EFE6D2", color: "#A6926B", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" },
  cardBody: { padding: "10px 12px 12px" },
  cardCategory: { fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#B8562F", fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" },
  cardTitle: { fontSize: 14, fontWeight: 700, lineHeight: 1.4, marginBottom: 4 },
  cardDesc: { fontSize: 12, color: "#7A6B52", lineHeight: 1.5, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  cardHost: { fontSize: 10, color: "#A6926B", display: "flex", alignItems: "center", fontFamily: "'JetBrains Mono', monospace" },

  smallGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 12 },
  smallCard: { position: "relative", display: "flex", flexDirection: "column" },
  smallStar: { position: "absolute", top: 4, right: 4, zIndex: 2, width: 20, height: 20, borderRadius: "50%", border: "none", background: "rgba(58,50,38,0.55)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  smallImage: { width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 6, display: "block", border: "1px solid #E6DBC0" },
  smallImageFallback: { width: "100%", aspectRatio: "1 / 1", borderRadius: 6, background: "#EFE6D2", color: "#A6926B", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 4, fontFamily: "'JetBrains Mono', monospace", border: "1px solid #E6DBC0" },
  smallTitle: { fontSize: 11, lineHeight: 1.35, marginTop: 5, color: "#3A3226", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },

  titleList: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 },
  titleRow: { display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: "#FFFDF7", border: "1px solid #E6DBC0", borderRadius: 8, minWidth: 0 },
  titleRowLink: { flex: 1, display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit", minWidth: 0 },
  titleRowText: { fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  titleRowMeta: { fontSize: 11, color: "#A6926B", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 },
  rowIconBtn: { border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 },

  fab: { position: "fixed", bottom: 24, right: 24, width: 56, height: 56, borderRadius: "50%", background: "#B8562F", border: "none", boxShadow: "0 6px 16px rgba(184,86,47,0.45)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(30,24,14,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 10 },
  modal: { background: "#FFFDF7", width: "100%", maxWidth: 480, borderRadius: "16px 16px 0 0", padding: "16px 20px 28px", maxHeight: "85vh", overflowY: "auto" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: 900 },
  modalClose: { border: "none", background: "transparent", cursor: "pointer", color: "#8C7B5E" },
  modalBody: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, color: "#8C7B5E", fontWeight: 700, marginTop: 8, marginBottom: 2 },
  textInput: { border: "1px solid #DFD2AF", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", background: "#FFFEFA", color: "#3A3226" },
  errorText: { fontSize: 12, color: "#B8562F", margin: "4px 0" },
  previewImage: { width: "100%", borderRadius: 8, marginBottom: 4, maxHeight: 160, objectFit: "cover" },
  primaryBtn: { marginTop: 14, border: "none", borderRadius: 10, padding: "12px", background: "#2F2A22", color: "#F5EEDD", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Zen Maru Gothic', sans-serif" },
};
