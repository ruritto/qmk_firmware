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
// 取れなければ自前スクレイパー → ホスト名のみ、と段階的にフォールバックし、
// UI側・APIどちらの呼び出しでも「保存自体は必ず成功する」ようにする。
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const fallback: UrlMetadata = { title: hostnameOf(url), description: "", image: "" };
  const fromMicrolink = await fetchViaMicrolink(url);
  if (fromMicrolink) return fromMicrolink;
  const fromScrape = await scrapeOgp(url);
  if (fromScrape) return fromScrape;
  return fallback;
}

async function fetchViaMicrolink(url: string): Promise<UrlMetadata | null> {
  try {
    const res = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}&palette=false`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== "success") return null;
    return {
      title: json.data.title || hostnameOf(url),
      description: json.data.description || "",
      image: json.data.image?.url || json.data.logo?.url || "",
    };
  } catch {
    return null;
  }
}

// 自前のOGPスクレイパー。HTMLを直接取得して og:/twitter: メタタグと <title> を拾う。
// microlink の無料枠 (50リクエスト/日) を超えた場合や落ちている場合の保険。
async function scrapeOgp(url: string): Promise<UrlMetadata | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        // ボット扱いで弾かれにくいよう一般的なブラウザのUAを名乗る
        "user-agent":
          "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return null;
    // 巨大ページ対策: メタタグは先頭にあるので最初の512KBだけ読む
    const html = (await res.text()).slice(0, 512 * 1024);

    const title =
      metaContent(html, "og:title") ||
      metaContent(html, "twitter:title") ||
      decodeEntities(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "") ||
      hostnameOf(url);
    const description =
      metaContent(html, "og:description") ||
      metaContent(html, "twitter:description") ||
      metaContent(html, "description");
    let image = metaContent(html, "og:image") || metaContent(html, "twitter:image");
    if (image) {
      try {
        image = new URL(image, res.url || url).toString(); // 相対URLを絶対化
      } catch {
        image = "";
      }
    }
    return { title, description, image };
  } catch {
    return null;
  }
}

// <meta property="og:x" content="..."> / <meta name="x" content="..."> を
// 属性の順序によらず拾う
function metaContent(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return "";
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ");
}
