-- Keycloak認証対応のためのusersテーブル更新
-- 既存のusersテーブルにkeycloak_idカラムとemailカラムを追加

-- keycloak_idカラムを追加（NULL許可、ユニーク制約）
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS keycloak_id TEXT UNIQUE;

-- emailカラムを追加（NULL許可）
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email TEXT;

-- updated_atカラムを追加（NULL許可）
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Keycloak IDのインデックスを作成（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_users_keycloak_id ON users(keycloak_id);

-- emailのインデックスを作成
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- コメント追加
COMMENT ON COLUMN users.keycloak_id IS 'Keycloak user ID for authentication';
COMMENT ON COLUMN users.email IS 'User email address from Keycloak';
COMMENT ON COLUMN users.updated_at IS 'Last updated timestamp';

-- サンプルデータの確認クエリ
-- SELECT id, name, email, keycloak_id, created_at, updated_at FROM users LIMIT 10;
