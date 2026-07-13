# moff link — Garmin Connect IQ アプリ

Garmin Venu SQ 2 で計測した心拍数を、BLE 経由で **moff (ESP32)** に毎秒送信する
Connect IQ ウォッチアプリ（Monkey C）です。

## アーキテクチャ

```
┌─────────────────────┐        BLE (カスタムGATT)        ┌──────────────────┐
│ Venu SQ 2           │  ──────────────────────────────▶ │ moff (ESP32)     │
│ moff link (このアプリ) │   心拍値 1byte を毎秒 Write      │ NimBLE サーバー   │
│ = BLE セントラル      │                                  │ = ペリフェラル    │
└─────────────────────┘                                  └──────────────────┘
```

**重要:** Connect IQ の BLE API（`Toybox.BluetoothLowEnergy`）は**セントラル専用**です。
時計側を心拍サーバー（ペリフェラル）にはできないため、moff の CLAUDE.md にある
「ESP32 が NimBLE **Client** として標準 Heart Rate Service (0x180D) に接続する」
構成とは**逆方向**になります。このアプリを使う場合、ESP32 側は
`esp32/moff_ble_server_example.ino` のように **NimBLE サーバー**に変更してください。

### ⚠️ 対応デバイスに関する重要な注意（2026-07 実機検証で判明）

**Venu Sq 2（無印・非Music版）はこのアプリを使えません。**

- 無印版のファームウェアには Connect IQ の `BluetoothLowEnergy` モジュールが含まれておらず、
  BLE を使う CIQ アプリは動作しない（実機 FW 2.69 / CIQ 6.0.2 で確認。アプリは
  「BLE not available」を表示して安全に停止する）
- 内蔵の心拍転送モードも無印版は **ANT+ のみ**で、Bluetooth 送信不可
- 対応するのは **Venu Sq 2 Music** や Venu 2/3、Forerunner 245 以降など
  CIQ BLE 対応モデル

無印 Venu Sq 2 で moff に心拍を送る現実的な選択肢:

1. **市販の BLE 心拍センサーを併用**（胸バンド/アームバンド型、数千円）—
   ESP32 は当初計画どおり NimBLE Client として標準 Heart Rate Service
   (0x180D/0x2A37) を受信する。moff 本体の設計変更が最小で済む
2. **moff 本体に PPG 脈拍センサー（MAX30102 等）を内蔵** — なでている手から
   直接心拍を取る。時計不要になり「触れ合うと通じ合う」という体験にも合う
3. CIQ BLE 対応の Garmin に買い替え/追加 — 本アプリがそのまま使える

### 代替案: Connect IQ アプリなしで済ませる方法

Venu SQ 2 には内蔵の「**心拍転送モード**（Broadcast Heart Rate）」があり、
標準 HRS (Service `0x180D` / Characteristic `0x2A37`) で心拍を配信できます。
この場合 Garmin アプリの開発は不要で、ESP32 は当初計画どおり NimBLE Client で受信できます。
ただし転送モードは時計側で毎回手動で ON にする必要があります。
「moff を持ったら自動でつながる」体験を作りたいので、本アプリ方式を採用しています。

## UUID（ESP32 側と一致させること）

| 用途 | UUID |
|------|------|
| moff サービス | `0DF0A1E0-5A0B-4C2D-9E8F-C0FFEE000001` |
| 心拍 Characteristic (Write, 1byte bpm) | `0DF0A1E0-5A0B-4C2D-9E8F-C0FFEE000002` |

定義場所: `source/MoffBleDelegate.mc` / `esp32/moff_ble_server_example.ino`

## 準備するもの

### 1. 開発環境（PC）

1. **Connect IQ SDK Manager** をインストール
   https://developer.garmin.com/connect-iq/sdk/
   - SDK Manager から最新 SDK と **Venu Sq 2 のデバイスサポート**をダウンロード
   - 初回起動時に Garmin アカウントでのログインが必要（無料）
2. **Visual Studio Code** + **Monkey C 拡張機能**（Garmin公式）をインストール
3. **開発者キーの生成**（アプリの署名に必須）
   - VS Code のコマンドパレット → `Monkey C: Generate a Developer Key`
   - または `openssl genrsa -out developer_key.pem 4096 && openssl pkcs8 -topk8 -inform PEM -outform DER -in developer_key.pem -out developer_key.der -nocrypt`

### 2. 実機（Venu SQ 2）

- USB ケーブル（充電ケーブル）— 実機への転送（サイドロード）に使用
- 時計のソフトウェアを最新に更新しておく（Garmin Express / Garmin Connect）

### 3. ESP32 側

- Arduino IDE に **NimBLE-Arduino** ライブラリを追加
- `esp32/moff_ble_server_example.ino` を書き込んで受信側を先に動かしておくとテストが楽

## ビルドと実行

### シミュレータでの確認

VS Code でこのフォルダ（`moff-garmin-app/`）を開き:

1. コマンドパレット → `Monkey C: Run` → デバイスに `venusq2` を選択
2. シミュレータの `Simulation > FIT Data > Simulate Data` で心拍を流せる
   （BLE はシミュレータでは「Nordic USB ドングル」がないと実通信できないため、
   実機テストが基本になります）

### CLI でビルドする場合

```sh
monkeyc -d venusq2 -f monkey.jungle -o MoffLink.prg -y developer_key.der
```

### 実機への転送（サイドロード）

1. Venu SQ 2 を USB で PC に接続（マスストレージとして認識される）
2. `MoffLink.prg` を時計内の `GARMIN/APPS/` フォルダにコピー
3. USB を抜くと、時計のアクティビティ一覧の最後に「moff link」が現れる

## 使い方

1. moff (ESP32) の電源を入れる（アドバタイズ開始）
2. 時計で「moff link」を起動 → 自動でスキャン・接続
3. 画面には現在の心拍数と接続状態が表示され、接続中は毎秒 moff へ送信
4. SELECT ボタン: スキャンの開始/停止、接続中なら切断

## ファイル構成

```
moff-garmin-app/
├── manifest.xml              # アプリ定義 (対象: venusq2 / 権限: BLE, Sensor)
├── monkey.jungle             # ビルド設定
├── source/
│   ├── MoffLinkApp.mc        # エントリポイント + 心拍センサー購読
│   ├── MoffBleDelegate.mc    # BLE スキャン/接続/書き込みの中核
│   ├── MoffLinkView.mc       # 画面描画 (心拍数 + 接続状態)
│   └── MoffLinkDelegate.mc   # ボタン操作
├── resources/
│   ├── strings/strings.xml
│   └── drawables/            # ランチャーアイコン
└── esp32/
    └── moff_ble_server_example.ino  # 受信側 (NimBLE サーバー) サンプル
```

## 今後の課題

- [ ] 実機での接続安定性の確認（再接続ロジックのチューニング）
- [ ] moff 本体 `src/ble_handler.h` への NimBLE サーバー実装の統合
- [ ] 送信間隔・省電力の最適化（画面OFF時の挙動確認）
- [ ] 心拍だけでなくストレススコア等の送信検討
