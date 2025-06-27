# Keycloak SSO設定ガイド

## Supabase + Keycloak SSO統合

### 1. Keycloak設定（SSO対応）

#### 1.1 Client設定
```
Client ID: mytappy
Client type: OpenID Connect
Client authentication: ON
```

#### 1.2 アクセス設定（SSO重要）
```
Standard flow: ON
Implicit flow: OFF
Direct access grants: OFF
Service accounts roles: OFF
```

#### 1.3 ログイン設定（SSO体験向上）
```
Login theme: お好みのテーマ
Require SSL: External requests (本番環境)
```

#### 1.4 セッション設定
```
SSO Session Idle: 30 minutes (調整可能)
SSO Session Max: 10 hours (調整可能)
Client Session Idle: 30 minutes
Client Session Max: 10 hours
```

### 2. Valid Redirect URIs（重要）
```
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?sso=true
https://your-domain.com/auth/callback
https://your-domain.com/auth/callback?sso=true
```

### 3. Valid Post Logout Redirect URIs
```
http://localhost:3000
http://localhost:3000/?logout=true
https://your-domain.com
https://your-domain.com/?logout=true
```

### 4. Web Origins
```
http://localhost:3000
https://your-domain.com
```

### 5. Realm設定（SSO最適化）

#### 5.1 Login設定
```
User registration: ON/OFF (要件による)
Forgot password: ON
Remember me: ON (SSO体験向上)
Verify email: ON (推奨)
Login with email: ON
```

#### 5.2 Sessions設定
```
SSO Session Idle: 30m
SSO Session Max: 10h
Offline Session Idle: 30d
```

### 6. Supabase認証プロバイダー設定

#### 6.1 Provider設定
```
Provider type: OIDC
Provider name: keycloak
Client ID: [Keycloakで作成したClient ID]
Client Secret: [Keycloakで生成したSecret]
Issuer: https://your-keycloak-server.com/realms/your-realm
```

#### 6.2 Advanced設定（SSO最適化）
```
Additional scopes: openid profile email
Skip nonce check: false
```

## SSO動作フロー

### 通常のSSO動作
1. ユーザーがMyTappyにアクセス
2. 既存のKeycloakセッションを自動確認
3. 有効なセッションがある場合、自動ログイン
4. セッションがない場合、ログインページを表示

### 手動ログイン
1. ユーザーが「ログイン」ボタンをクリック
2. Keycloakログインページにリダイレクト
3. 認証後、MyTappyにリダイレクト
4. Supabaseセッション作成

## テスト手順

### 1. SSO動作確認
1. Keycloak管理画面で他のアプリにログイン
2. 新しいタブでMyTappyにアクセス
3. 自動的にログインされることを確認

### 2. ログアウト確認
1. MyTappyからログアウト
2. 他のKeycloakアプリもログアウトされることを確認

### 3. セッション期限確認
1. 長期間放置後のアクセス
2. セッション期限後の再認証フロー

## トラブルシューティング

### よくある問題

#### 1. SSOが動作しない
- Redirect URIの設定を確認
- Client認証設定を確認
- セッション設定を確認

#### 2. 無限リダイレクト
- `prompt=none`の設定確認
- CORS設定確認
- Web Origins設定確認

#### 3. セッション継続しない
- Cookie設定確認
- SameSite属性確認
- HTTPS設定確認（本番環境）

### デバッグ方法
1. ブラウザ開発者ツールでNetwork確認
2. Keycloakログ確認
3. Supabaseログ確認

## セキュリティ考慮事項

1. **HTTPS必須**（本番環境）
2. **適切なセッション期限設定**
3. **CORS設定の厳密化**
4. **リダイレクトURI制限**
5. **定期的なシークレット更新**
