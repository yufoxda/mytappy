# MyTappy - Keycloak認証対応スケジュール調整ツール

## 概要
MyTappyは、Keycloak認証を統合したモダンなスケジュール調整アプリケーションです。
Next.js、TypeScript、Supabase、Keycloakを使用して構築されています。

## 主な機能
- 🔐 Keycloak認証による安全なログイン
- 📅 直感的なスケジュール作成・管理
- 👥 複数参加者の日程調整
- 🤖 AI学習による投票パターンの自動提案
- 📊 リアルタイム投票統計
- 🎨 レスポンシブデザイン

## 技術スタック
- **フロントエンド**: Next.js 15, React, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes, Supabase
- **データベース**: PostgreSQL (Supabase)
- **認証**: Keycloak + Supabase Auth
- **デプロイ**: Vercel (推奨)

## セットアップ手順

### 1. 前提条件
- Node.js 18以上
- npm または yarn
- Keycloakサーバー（設定済み）
- Supabaseプロジェクト

### 2. プロジェクトのクローンとインストール
```bash
git clone <repository-url>
cd mytappy
npm install
```

### 3. 環境変数の設定
`.env.local.example`を参考に`.env.local`を作成：

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Keycloak Configuration
KEYCLOAK_CLIENT_ID=your_keycloak_client_id
KEYCLOAK_CLIENT_SECRET=your_keycloak_client_secret
KEYCLOAK_ISSUER_URL=https://your-keycloak-server.com/realms/your-realm
KEYCLOAK_REALM=your-realm-name
KEYCLOAK_SERVER_URL=https://your-keycloak-server.com
```

### 4. Keycloak設定

#### 4.1 Keycloakクライアント作成
1. Keycloak Admin Consoleにアクセス
2. 対象のRealmを選択
3. "Clients" > "Create client"で新しいクライアントを作成
4. 以下の設定を行う：
   - **Client type**: OpenID Connect
   - **Client ID**: `mytappy` (任意)
   - **Client authentication**: ON
   - **Authorization**: OFF

#### 4.2 クライアント詳細設定
- **Valid redirect URIs**: 
  - `http://localhost:3000/auth/callback`
  - `https://your-domain.com/auth/callback`
- **Valid post logout redirect URIs**:
  - `http://localhost:3000`
  - `https://your-domain.com`
- **Web origins**: `*` または具体的なオリジン

#### 4.3 クライアントスコープ設定
必要に応じて以下のスコープを追加：
- `openid`
- `profile`
- `email`
- `roles`

### 5. Supabase設定

#### 5.1 認証プロバイダー設定
1. Supabase Dashboardの「Authentication」>「Providers」
2. 「Add provider」>「OIDC」を選択
3. 以下の情報を入力：
   - **Provider name**: `keycloak`
   - **Client ID**: Keycloakで作成したClient ID
   - **Client Secret**: Keycloakで生成したClient Secret
   - **Issuer**: `https://your-keycloak-server.com/realms/your-realm`

#### 5.2 データベーススキーマ更新
提供されたSQLファイルを実行：
```sql
-- keycloak-users-migration.sql の内容を実行
```

### 6. アプリケーション起動
```bash
npm run dev
```

アプリケーションは `http://localhost:3000` で起動します。

## 使用方法

### 基本的な流れ
1. **ログイン**: Keycloak認証でサインイン
2. **イベント作成**: 新規スケジュール調整を作成
3. **参加者招待**: URLを共有して参加者を招待
4. **投票**: 各参加者が利用可能な日程を選択
5. **結果確認**: 投票結果を確認し、最適な日程を決定

### 認証済みユーザーの特典
- 投票履歴の自動保存
- パーソナライズされた投票提案
- 投票パターンの学習機能

## 開発

### プロジェクト構造
```
src/
├── app/                    # Next.js App Router
│   ├── auth/              # 認証関連ページ
│   ├── api/               # API Routes
│   └── [id]/              # 動的ルート
├── lib/                   # ユーティリティ・ロジック
│   ├── actions.ts         # Server Actions
│   ├── keycloakAuth.ts    # Keycloak認証
│   ├── AuthContext.tsx    # 認証コンテキスト
│   └── supabase.ts        # Supabase設定
└── components/            # Reactコンポーネント
```

### 主要なファイル
- `src/lib/actions.ts`: データベース操作とビジネスロジック
- `src/lib/keycloakAuth.ts`: Keycloak認証の統合
- `src/lib/AuthContext.tsx`: 認証状態の管理
- `src/components/Navigation.tsx`: ナビゲーションバー

## セキュリティ
- Keycloak OIDCによる安全な認証
- Supabase Row Level Security (RLS)
- CSRF対策
- XSS対策

## トラブルシューティング

### よくある問題
1. **認証エラー**: Keycloakの設定とリダイレクトURIを確認
2. **データベースエラー**: Supabaseの接続情報と権限を確認
3. **CORS エラー**: Keycloakの Web origins 設定を確認

### デバッグ
開発者ツールのコンソールでログを確認してください。
認証フローの詳細なログが出力されます。

## ライセンス
MIT License

## 貢献
プルリクエストやイシューの報告を歓迎します。

## サポート
問題や質問がある場合は、GitHubのIssuesでお知らせください。
