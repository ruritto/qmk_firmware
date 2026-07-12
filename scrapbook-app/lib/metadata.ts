export type UrlMetadata = {
  title: string;
  description: string;
  image: string;
};

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// microlink.io の無料APIで OGP メタデータを取得する。
// 失敗してもエラーにせず、ホスト名をタイトルにしたフォールバックを返す
// (UI側・APIどちらの呼び出しでも「保存自体は必ず成功する」ようにするため)。
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const fallback: UrlMetadata = { title: hostnameOf(url), description: "", image: "" };
  try {
    const res = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}&palette=false`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return fallback;
    const json = await res.json();
    if (json.status !== "success") return fallback;
    return {
      title: json.data.title || fallback.title,
      description: json.data.description || "",
      image: json.data.image?.url || json.data.logo?.url || "",
    };
  } catch {
    return fallback;
  }
}
