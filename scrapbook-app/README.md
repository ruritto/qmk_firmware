# スクラップボード

iPadで使う自分専用のPinterest風スクラップブック。気になったURLを貼ると
タイトル・概要・画像を自動取得して、コルクボード風のボードにピン留めします。

- **スタック**: Next.js (App Router) + TypeScript + Prisma
- **DB**: ローカルは SQLite、本番は Turso (libsql) に環境変数だけで載せ替え可能
- **認証**: 個人利用前提。Web UIはログインなし、外部APIのみ固定Bearerキー

## 画面と機能

- コルクボード風のカードグリッド（カードが少し傾く）
- 3種のビュー切替: スモール（画像グリッド）/ ノーマル（カード）/ タイトルのみ（リスト）
- カテゴリタブ（名前から自動で色分け）、★重要、完了フォルダ、検索
- ＋ボタン → URLを貼る → メタデータ自動取得 → 確認して保存

## ディレクトリ構成

```
scrapbook-app/
├── app/
│   ├── page.tsx               # ボード画面 (サーバーコンポーネント、DBから一覧取得)
│   ├── actions.ts             # Web UI用サーバーアクション (追加/★/完了/削除)
│   ├── layout.tsx / globals.css
│   └── api/items/
│       ├── route.ts           # GET 一覧 / POST 追加 (Bearerキー必須、ショートカット用)
│       └── [id]/route.ts      # PATCH 部分更新 / DELETE 削除
├── components/
│   └── ScrapbookBoard.tsx     # ボードUI本体 (クライアントコンポーネント)
├── lib/
│   ├── db.ts                  # Prismaクライアント (SQLite ⇄ Turso をここで切替)
│   ├── metadata.ts            # メタデータ取得 (microlink → 自前OGPスクレイパー → ホスト名)
│   ├── auth.ts                # Bearerキー検証
│   └── types.ts               # Item型・予約語カテゴリ
└── prisma/schema.prisma       # Item モデル
```

## データモデル

```prisma
model Item {
  id          String   @id @default(cuid())
  url         String
  title       String
  description String   @default("")
  image       String   @default("")   // OGP画像のURL
  category    String                  // 自由入力。タブは名前から自動色分け
  important   Boolean  @default(false) // ★重要
  archived    Boolean  @default(false) // 完了フォルダ
  createdAt   DateTime @default(now())
}
```

「すべて」「★重要」「完了」はタブの予約語のため、カテゴリ名には使えません。

## セットアップ (ローカル)

```bash
cd scrapbook-app
npm install
cp .env.example .env        # SCRAPBOOK_API_KEY を書き換える
npx prisma db push          # prisma/dev.db を作成
npm run dev                 # http://localhost:3000
```

環境変数:

| 変数 | 用途 |
| --- | --- |
| `DATABASE_URL` | SQLiteファイルのパス (例: `file:./dev.db`) |
| `SCRAPBOOK_API_KEY` | `/api/items` 用の固定キー。`openssl rand -hex 32` などで生成 |
| `TURSO_DATABASE_URL` | (本番のみ) 設定すると SQLite の代わりに Turso へ接続 |
| `TURSO_AUTH_TOKEN` | (本番のみ) Turso の認証トークン |

## API (iOSショートカット用)

すべて `Authorization: Bearer <SCRAPBOOK_API_KEY>` が必要です。

### 追加: POST /api/items

`url` と `category` だけ渡せば、サーバー側でメタデータ取得〜保存まで行います。

```bash
curl -X POST https://<デプロイ先ドメイン>/api/items \
  -H "Authorization: Bearer $SCRAPBOOK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article", "category": "読みもの"}'
```

`title` / `description` / `image` / `important` を明示的に渡すと自動取得より優先されます。

```bash
curl -X POST https://<デプロイ先ドメイン>/api/items \
  -H "Authorization: Bearer $SCRAPBOOK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "category": "電子工作", "title": "手動タイトル", "important": true}'
```

### その他

```bash
# 一覧
curl https://<ドメイン>/api/items -H "Authorization: Bearer $SCRAPBOOK_API_KEY"

# 部分更新 (★重要/完了など)
curl -X PATCH https://<ドメイン>/api/items/<id> \
  -H "Authorization: Bearer $SCRAPBOOK_API_KEY" -H "Content-Type: application/json" \
  -d '{"archived": true}'

# 削除
curl -X DELETE https://<ドメイン>/api/items/<id> \
  -H "Authorization: Bearer $SCRAPBOOK_API_KEY"
```

## iOSショートカット「共有シートから追加」の作り方

Safariの共有シートからワンタップでボードに貼れるようにします。

1. ショートカットApp → ＋で新規ショートカット
2. ショートカット設定 (ⓘ) → **「共有シートに表示」をオン** → 受け取る種類を **URL** に
3. アクションを追加: **「URLの内容を取得」(Get Contents of URL)**
   - URL: `https://<デプロイ先ドメイン>/api/items`
   - 方法: **POST**
   - ヘッダ:
     - `Authorization` = `Bearer <SCRAPBOOK_API_KEYの値>`
   - 本文を要求: **JSON**
     - `url` (テキスト) = 変数 **「ショートカットの入力」**
     - `category` (テキスト) = 好きな既定カテゴリ (例: `読みもの`)
4. (任意) 「メニューから選択」アクションを先頭に入れ、選択肢ごとに `category` を
   変えた「URLの内容を取得」を並べると、共有時にカテゴリを選べます
5. 名前を「スクラップに追加」などにして保存

以後、Safariで共有 → 「スクラップに追加」でボードに貼られます。

## デプロイ (Vercel + Turso)

VercelのファイルシステムはリクエストごとにリセットされるためSQLiteファイルは
永続化できません。本番は Turso (SQLite互換のマネージドDB) を使います。

1. Turso でDBを作成し、URLとトークンを取得
   ```bash
   turso db create scrapbook
   turso db show scrapbook --url      # → TURSO_DATABASE_URL
   turso db tokens create scrapbook   # → TURSO_AUTH_TOKEN
   ```
2. スキーマを反映 (ローカルから一度だけ)
   ```bash
   turso db shell scrapbook < <(npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script)
   ```
3. Vercel にプロジェクトを作成し、Root Directory を `scrapbook-app` に設定
4. 環境変数を設定: `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` / `SCRAPBOOK_API_KEY`
   (`DATABASE_URL` は `file:./dev.db` のままでよい。`TURSO_DATABASE_URL` があると
   `lib/db.ts` がTurso接続に切り替わる)
5. デプロイ後、iOSショートカットのドメインを差し替え

Supabase等のPostgresに載せ替える場合は `prisma/schema.prisma` の provider を
`postgresql` に変え、`lib/db.ts` を素の `new PrismaClient()` に戻すだけです
(アプリコードはPrisma経由でしかDBに触れません)。

## ホーム画面に追加 (iPad)

Safariでデプロイ先URLを開き、共有 → 「ホーム画面に追加」すると
フルスクリーンのアプリ感覚で使えます。
