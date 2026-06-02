# Just Watching: Urban Diorama Viewer

五反田駅とTOCビルの中間あたりを、上から静かに眺めるためのブラウザベース都市ジオラマです。
Vite + React + TypeScript + React Three Fiber で作られており、OpenStreetMap 由来の道路・建物データ、国土地理院の標高タイル由来の組み込み標高データ、手続き的な低ポリ表現を組み合わせています。

目的やゲーム性はありません。小さな青いフィールドマップ風アイコンが街を流れ、時間帯・天気・降水量・風速によって雰囲気が変わります。

## セットアップ

```powershell
npm.cmd install
```

PowerShell で `npm` が実行ポリシーに止められる場合は、`npm.cmd` を使ってください。

## ブラウザで実行

```powershell
npm.cmd run dev
```

表示されたURLをブラウザで開きます。通常は以下です。

```text
http://127.0.0.1:5173/
```

## ビルド

```powershell
npm.cmd run build
```

## デスクトップ / スクリーンセーバー風シェル

開発用 Electron シェル:

```powershell
npm.cmd run desktop
```

ビルド済みアプリを Electron で起動:

```powershell
npm.cmd run desktop:built
```

Windows portable exe を作成:

```powershell
npm.cmd run package:win
```

Windows `.scr` 風ファイルを作成:

```powershell
npm.cmd run package:scr
```

Electron版はフルスクリーン/kiosk風に起動します。`Esc` または `Q` で終了できます。
`.scr` 版は `/s` でフルスクリーン起動します。現時点では `/p` プレビューと `/c` 設定呼び出しは、設定UIを出さずに即終了します。

## 操作

右上の小さなパネルから以下を変更できます。

- カメラ自動オービットの一時停止/再開
- 時間帯: `Now`, `Morning`, `Noon`, `Dusk`, `Night`, `Late`
- 天気: `Live Gotanda`, `Clear`, `Cloudy`, `Fog`, `Drizzle`, `Rain`, `Snow`, `Storm`
- 群衆表示
- 降水表示

`Now` はブラウザ/PCの現在時刻に追随します。
`Live Gotanda` は Open-Meteo から五反田駅とTOCビルの中間付近の現在天気を取得します。

## 天気と時間

Live Weather では Open-Meteo API を使っています。
取得している主な値:

- 気温
- weather code
- 降水量
- 降雪量
- 積雪深
- 雲量
- 10m風速

降水量が増えると、雨・雪・霧雨・雷雨の粒子数、濡れた道路の反射、傘アイコン率が変わります。
降雪量は雪粒子の量に、積雪深は地表面と屋根の薄い雪化粧に反映されます。
風速は雨筋の角度、雨の流れ、雷雨時の横殴り感、雪の漂いに反映されます。

## OSM地図データ

アプリはまず `public/data/gotanda-toc-osm.json` を読み込みます。
このファイルには Overpass API から取得した OpenStreetMap の道路・建物データが入っています。
ファイルがない場合は、決定的乱数による手続き生成レイアウトにフォールバックします。

OSMサンプルを再取得する場合:

```powershell
node scripts/fetch-osm.mjs
```

`src/map/createLayoutFromOsm.ts` は緯度経度をローカルなジオラマ座標へ投影し、道路をメッシュと群衆パスに、建物 footprint を低ポリ建物に変換します。建物高さは OSM の `height` または `building:levels` があれば使い、なければ決定的な推定値を使います。

## 組み込み標高データ

アプリは `public/data/gotanda-toc-elevation.json` がある場合、国土地理院の標高タイルから生成した相対標高グリッドを読み込みます。
この標高グリッドは OSM サンプルと同じ五反田/TOC bbox を対象にしており、建物の基礎、道路、人の経路に同じ高さとして反映されます。

標高サンプルを再取得する場合:

```powershell
npm.cmd run fetch:elevation
```

実標高に加えて、OSM の `bridge`, `tunnel`, `layer`, `highway=steps`, `incline` などの都市構造タグも上乗せされます。これにより、実際の地形の微妙な起伏と、階段・高架・地下通路のような街の上下構造を両方表現します。

出典: 国土地理院 標高タイル

## 実装メモ

主な構成:

- `src/components/DioramaScene.tsx`
- `src/components/CityBlock.tsx`
- `src/components/Building.tsx`
- `src/components/IconCrowd.tsx`
- `src/components/RetroMapIcon.tsx`
- `src/components/WeatherSystem.tsx`
- `src/ambience.ts`
- `src/weatherApi.ts`
- `src/map/createLayoutFromOsm.ts`
- `src/map/elevationSampler.ts`

## 注意

- Electron runtime の取得が不完全な場合は、もう一度 `npm.cmd install` を実行してください。
- `.scr` 版は簡易対応です。Windowsスクリーンセーバーとして完全対応するには、プレビュー親ウィンドウへの埋め込みや設定UIが追加で必要です。
- Live Weather は外部APIにアクセスします。完全オフライン運用では手動天気モードを使ってください。
