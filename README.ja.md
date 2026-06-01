# Just Watching: Urban Diorama Viewer

新宿周辺の裏路地を、上から静かに眺めるためのブラウザベース都市ジオラマです。  
Vite + React + TypeScript + React Three Fiber で作られていて、街は OpenStreetMap 由来の道路・建物データと低ポリの手続き的な表現を組み合わせています。

目的やゲーム性はありません。小さな青いフィールドマップ風アイコンが街を流れ、時間・天気・降水量・風速に合わせて街の雰囲気が変わります。

## セットアップ

```powershell
npm.cmd install
```

PowerShell で `npm` が実行ポリシーに止められる場合は、`npm.cmd` を使ってください。

## ブラウザで実行

```powershell
npm.cmd run dev
```

表示された URL、通常は以下をブラウザで開きます。

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

Electron 版はフルスクリーン/kiosk風に起動します。`Esc` または `Q` で終了できます。

## 操作

右上の最小パネルから以下を変更できます。

- カメラ自動オービットの一時停止/再開
- 時間帯: `Now`, `Morning`, `Noon`, `Dusk`, `Night`, `Late`
- 天気: `Live Shinjuku`, `Clear`, `Cloudy`, `Fog`, `Drizzle`, `Rain`, `Snow`, `Storm`
- 群衆表示
- 降水表示

`Now` はブラウザ/PCの現在時刻に追随します。  
`Live Shinjuku` は Open-Meteo から新宿付近の現在天気を取得します。

## 天気と時間

Live Weather では Open-Meteo API を使っています。

取得している値:

- 気温
- weather code
- 降水量
- 雲量
- 10m風速

降水量が増えると、雨・雪・霧雨・雷雨の粒子数や濃さが変わります。  
風速が上がると、雨筋や雪の横流れが強くなります。

天気の分類:

- `clear`
- `cloudy`
- `fog`
- `drizzle`
- `rain`
- `snow`
- `thunderstorm`

## OSM 地形データ

アプリはまず `public/data/shinjuku-osm.json` を読み込みます。  
このファイルには Overpass API から取得した OpenStreetMap の道路・建物データが入っています。

再取得する場合:

```powershell
node scripts/fetch-osm.mjs
```

OSM データが読めない場合は、決定的乱数による手続き生成レイアウトにフォールバックします。

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

建物は OSM の footprint を押し出して表示します。複雑すぎる footprint は矩形近似にフォールバックします。

## 注意点

- Electron runtime の取得が不完全な場合は、もう一度 `npm.cmd install` を実行してください。
- 現状の `.scr` 互換はまだ未実装です。Windows スクリーンセーバーとして完全対応するには `/s`, `/p`, `/c` などの引数対応が必要です。
- Live Weather は外部APIにアクセスします。完全オフライン運用では手動天気モードを使ってください。
