# Face Diagnosis AI Web App

顔診断AIのWebアプリケーション - Before/After比較による肌状態の改善度を測定

## 📱 機能

- カメラによる顔撮影
- Before/After画像の比較
- スライダーでの画像比較UI
- レスポンシブデザイン

## 🚀 セットアップ

### 前提条件
- Node.js (v18以上推奨)
- npm または yarn

### インストール

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

### 実行

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm start
```

## 📂 プロジェクト構成

```
face-diagnosis-web/
├── src/
│   ├── app/
│   │   └── ai/
│   │       └── face/
│   │           └── page.tsx    # メインページ
│   └── components/
│       ├── FaceCamera.tsx      # カメラUI
│       ├── BeforeAfterCompare.tsx # 画像比較UI
│       └── ResultCard.tsx      # 診断結果UI
├── package.json
└── README.md
```

## 🛠 技術スタック

- **Next.js 15** - React フレームワーク
- **React 18** - UI ライブラリ
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **Vercel** - デプロイメント

## 🌐 デプロイ

このプロジェクトはVercelでデプロイされています：

- **本番URL**: [https://face-diagnosis-web.vercel.app](https://face-diagnosis-web.vercel.app)
- **顔診断AI**: [https://face-diagnosis-web.vercel.app/ai/face](https://face-diagnosis-web.vercel.app/ai/face)

## 📝 ライセンス

MIT License
