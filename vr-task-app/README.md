# VRプロジェクト タスク管理アプリ

VRプロジェクトチーム(クライム / 車椅子 / 釣り・自転車 の3チーム)向けの、
タスク進捗・スケジュール共有 Web アプリです。スマホ優先のレスポンシブ対応で、
PC からも同じデータを閲覧・編集できます。

## 主な機能

- **ガントチャート(メイン画面)**
  - 縦軸: タスク / 横軸: 日程。バーの色 = チーム(3色)、バー上にデバイス種別アイコン(クライム/車椅子/釣り/自転車)
  - バーをドラッグして日程移動、バーの両端をドラッグして開始日・終了日を変更(タッチ / マウス両対応)
  - バーまたは左のタスク名をタップで編集モーダル(担当者・進捗ステータス・削除)
  - 上部タブで「全体 / クライム / 車椅子 / 釣り・自転車」を切り替え。デフォルトはログインユーザーの所属チーム
- **タスク追加**: 右下の「＋」ボタン → タスク名 / チーム / デバイス種別 / 担当者 / 開始日 / 終了日 を入力
- **議事録・記録タブ**: 画像(会議メモ・資料写真)+ テキストの記録を一覧・追加
- **リアルタイム同期**: Supabase Realtime により、複数人が同時に開いていても変更が即時反映
- **Google OAuth ログイン(学校ドメイン限定)**: `hd` パラメータ + サーバー側検証の二段構え

## 技術スタック

| 役割 | 技術 |
|---|---|
| フロントエンド | Next.js 16 (App Router) + React 19 + Tailwind CSS v4 |
| 認証 | Supabase Auth (Google OAuth, ドメイン制限) |
| データベース | Supabase (PostgreSQL + RLS + Realtime) |
| 画像ストレージ | Supabase Storage (`note-images` バケット) |
| ガントチャート | 自作コンポーネント (`components/gantt/GanttChart.tsx`) |

> ガントチャートについて: 当初案の `gantt-task-react` は React 19 非対応かつ
> タッチドラッグが弱いため、Pointer Events ベースの軽量な自作実装にしています。
> スマホでの指ドラッグ・PC のマウスドラッグの両方で日程変更できます。

## セットアップ手順

### 1. Supabase プロジェクト作成

1. [supabase.com](https://supabase.com) で新規プロジェクトを作成
2. ダッシュボードの **SQL Editor** で `supabase/migrations/0001_init.sql` の内容を実行
   (テーブル / RLS / Realtime / Storage バケットがまとめて作成されます)

### 2. Google OAuth の設定

1. [Google Cloud Console](https://console.cloud.google.com/) → 「APIとサービス」→「認証情報」で
   **OAuth クライアント ID(ウェブアプリケーション)** を作成
   - 承認済みリダイレクト URI: `https://<プロジェクトID>.supabase.co/auth/v1/callback`
2. Supabase ダッシュボード → **Authentication → Providers → Google** を有効化し、
   クライアント ID / シークレットを設定
3. Supabase → **Authentication → URL Configuration** で
   - Site URL: 本番のアプリ URL
   - Redirect URLs: `http://localhost:3000/auth/callback` と本番の `https://<アプリURL>/auth/callback`

> ドメイン制限は「ログイン画面の `hd` パラメータ」「OAuth コールバックでの検証」
> 「proxy(ミドルウェア)での検証」の3か所で行っています。`hd` はあくまでヒントなので、
> サーバー側検証(後者2つ)が本体です。より厳密にするには Google Cloud Console 側で
> OAuth アプリを「内部」(Workspace 内部限定)にしてください。

### 3. 環境変数

```bash
cp .env.local.example .env.local
```

| 変数 | 内容 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API の Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 同 anon public key |
| `NEXT_PUBLIC_ALLOWED_GOOGLE_DOMAIN` | 学校の Google ドメイン (例: `example-school.ac.jp`)。空なら制限なし |

### 4. 起動

```bash
npm install
npm run dev
```

http://localhost:3000 を開くとログイン画面が表示されます。

### 開発用プレビュー

Supabase を設定しなくても、`npm run dev` 起動後に
http://localhost:3000/dev/gantt でサンプルデータのガントチャート
(ドラッグ操作込み)を確認できます。本番ビルドでは 404 になります。

## データモデル

```
profiles: id(=auth.users.id) / email / display_name / team(所属チーム, タブの初期値)
tasks:    id / title / team / device / assignee / start_date / end_date / status / created_by
notes:    id / title / body / image_path(Storage パス) / author_name / created_by
```

- `team`: `climb` | `wheelchair` | `fishing_bike`
- `device`: `climb` | `wheelchair` | `fishing` | `bike`(釣り・自転車チームは2種を使い分け)
- `status`: `todo`(未着手) | `in_progress`(進行中) | `done`(完了)
- ログインユーザー(=学校ドメイン検証済み)は全チームのデータを読み書き可能(RLS)

## 将来の拡張(通知機能など)

通知は未実装ですが、以下の設計で追加しやすくしています。

- タスク変更はすべて `tasks` テーブルの UPDATE/INSERT として一元化されているため、
  Supabase の **Database Webhooks** または **Edge Functions (trigger)** を足すだけで
  「担当タスクが変更されたら LINE/Slack/メール通知」が実現可能
- `profiles` にユーザーごとの行があるため、通知先設定(トークン等)のカラム追加が容易

## ディレクトリ構成

```
app/
  page.tsx            # メイン: ガントチャート
  GanttPage.tsx       # タブ切替 + FAB + モーダルの制御
  notes/              # 議事録・記録タブ
  login/              # ログイン画面
  auth/callback/      # OAuth コールバック (ドメイン検証)
  dev/gantt/          # 開発用プレビュー (本番は404)
components/
  gantt/GanttChart.tsx  # ガント本体 (ドラッグ日程変更)
  gantt/TaskModal.tsx   # タスク追加・編集モーダル
  AppShell.tsx          # ヘッダー / 下部ナビ / チーム設定
  TeamTabs.tsx          # 全体/チーム切替タブ
lib/
  supabase/           # ブラウザ・サーバー用クライアント
  hooks/useTasks.ts   # タスク CRUD + Realtime 同期
  hooks/useNotes.ts   # 記録 CRUD + 画像アップロード
  types.ts            # チーム/デバイス/ステータス定義 (DB 制約と対応)
proxy.ts              # 認証ガード + セッション更新 + ドメイン検証
supabase/migrations/  # DB スキーマ (SQL)
```
