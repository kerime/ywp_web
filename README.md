# YWP Puzzle Recreated

パズルRPGゲームのWebリメイク版です。パズルボードでピースを操作して敵にダメージを与え、ステージをクリアしましょう。

## 遊び方

1. ステージをセレクトボックスで選択します
2. パズルボードのピースをドラッグ（またはクリック→クリック）で入れ替えます
3. 同じ色のピースを3つ以上並べると消えて敵にダメージ！
4. HPが0になる前に敵を全滅させればクリアです

## ローカルで動かす

```bash
# リポジトリをクローン
git clone https://github.com/kerime/ywp_web.git
cd ywp_web

# 静的サーバーで起動（Python 3）
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開いてください。

TypeScriptソースを編集する場合はビルドが必要です：

```bash
npm install
npm run build
```

---

## GitHub Pages で公開する

### 初回設定

1. **GitHubのリポジトリページを開く**
   `https://github.com/kerime/ywp_web`

2. **Settings → Pages を開く**
   上部タブの「Settings」→ 左メニューの「Pages」をクリック

3. **公開ソースを設定する**
   - *Source*: `Deploy from a branch`
   - *Branch*: `main` / `/ (root)`
   - 「Save」ボタンをクリック

4. **数分待つ**
   設定後1〜3分でデプロイが完了します。
   ページ上部に公開URLが表示されます：
   ```
   https://kerime.github.io/ywp_web/
   ```

### 更新のデプロイ

`main` ブランチにプッシュするだけで自動的に再デプロイされます。

```bash
git add .
git commit -m "Update game"
git push origin main
```

### TypeScriptを編集した場合

ソースを変更したときはビルドしてからプッシュしてください。
`dist/` フォルダもコミット対象に含めることで、GitHub Pagesがビルドなしでそのままホストできます。

```bash
npm run build          # dist/ を更新
git add dist/
git commit -m "Rebuild dist"
git push origin main
```

---

## ファイル構成

```
ywp_web/
├── index.html          # エントリーポイント
├── style.css           # スタイル
├── dist/               # コンパイル済みJS（コミット対象）
│   ├── main.js
│   ├── app/
│   ├── domain/
│   ├── infrastructure/
│   └── ui/
├── src/                # TypeScriptソース
│   ├── main.ts
│   ├── app/
│   ├── domain/
│   ├── infrastructure/
│   └── ui/
└── assets/             # 画像素材
```
