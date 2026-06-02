# Just Watching: Urban Diorama Viewer

神楽坂上あたりを中心に、東京大神宮付近まで入る範囲を上から静かに眺める都市ジオラマです。
Vite + React + TypeScript + React Three Fiber で作られており、OpenStreetMap の道路・建物データと国土地理院の標高タイル由来データを組み込みます。

目的やゲーム性はありません。小さな青いフィールドマップ風アイコンが路地や坂を流れ、時間帯・天気・降水量・風速に応じて雰囲気が変わります。

## セットアップ

```powershell
npm.cmd install
```

## ブラウザで実行

```powershell
npm.cmd run dev
```

通常は以下を開きます。

```text
http://127.0.0.1:5173/
```

## ビルド

```powershell
npm.cmd run build
```

## Windows exe / scr

Windows portable exe:

```powershell
npm.cmd run package:win
```

Windows `.scr` 風ファイル:

```powershell
npm.cmd run package:scr
```

Electron 版はフルスクリーン/kiosk 風に起動します。`Esc` または `Q` で終了できます。
`.scr` は `/s` でフルスクリーン再生します。`/p` プレビューと `/c` 設定呼び出しは、現状では設定UIを出さずに終了します。

## 操作

- カメラ自動オービットの一時停止/再開
- 時間帯: `Now`, `Morning`, `Noon`, `Dusk`, `Night`, `Late`
- 天気: `Live Kagurazaka`, `Clear`, `Cloudy`, `Fog`, `Drizzle`, `Rain`, `Snow`, `Storm`
- 群衆表示の切り替え
- 降水表示の切り替え

`Now` は PC の現在時刻に追随します。
`Live Kagurazaka` は Open-Meteo から神楽坂上付近の現在天気を取得します。

## OSM 地図データ

アプリはまず `public/data/kagurazaka-osm.json` を読み込みます。
このファイルには Overpass API から取得した OpenStreetMap の道路・建物・水路データが入っています。
ファイルがない場合は、決定的乱数による手続き生成レイアウトにフォールバックします。

再取得:

```powershell
node scripts/fetch-osm.mjs
```

`src/map/createLayoutFromOsm.ts` は緯度経度をローカルなジオラマ座標へ投影し、道路をメッシュと群衆パスに、建物 footprint を低ポリ建物に変換します。
低層建築には、神楽坂らしい落ち着いた見た目になるよう、控えめに切妻屋根を付けます。看板は少なめです。

## 標高データ

アプリは `public/data/kagurazaka-elevation.json` がある場合、国土地理院の標高タイルから生成した相対標高グリッドを読み込みます。
この標高グリッドは OSM サンプルと同じ神楽坂 bbox を対象にしており、建物の基礎、道路、人の経路に反映されます。

再取得:

```powershell
npm.cmd run fetch:elevation
```

実標高に加えて、OSM の `bridge`, `tunnel`, `layer`, `highway=steps`, `incline` などの都市構造タグも上乗せされます。
