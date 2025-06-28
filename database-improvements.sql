-- ユーザーテーブルの拡張（認証情報とのリンクを追加）
ALTER TABLE users ADD COLUMN auth_user_id UUID UNIQUE;
ALTER TABLE users ADD COLUMN display_name VARCHAR;
ALTER TABLE users ADD COLUMN is_authenticated BOOLEAN DEFAULT false;

-- インデックスを追加
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_authenticated ON users(is_authenticated);

-- コメント追加
COMMENT ON COLUMN users.auth_user_id IS 'Supabase認証テーブル(auth.users)のIDとの紐付け';
COMMENT ON COLUMN users.display_name IS 'ユーザーが設定可能な表示名（認証ユーザーが変更可能）';
COMMENT ON COLUMN users.name IS '投票時に使用される実際の名前（レガシー互換性のため維持）';
COMMENT ON COLUMN users.is_authenticated IS '認証済みユーザーかどうかのフラグ';
