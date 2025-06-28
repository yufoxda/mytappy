-- Supabase認証連携のためのマイグレーション
-- 既存のusersテーブルに認証連携フィールドを追加

-- 1. 新しいカラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

-- 2. インデックスを追加
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- 3. 認証ユーザー自動連携関数（重複回避強化版）
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'ユーザー')
  )
  ON CONFLICT (auth_user_id) DO NOTHING; -- 重複時は何もしない
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- ユニーク制約違反の場合は何もしない
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 認証ユーザー削除時の連携関数
CREATE OR REPLACE FUNCTION handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- 認証ユーザーが削除された場合、auth_user_idをNULLに設定
  UPDATE public.users 
  SET auth_user_id = NULL
  WHERE auth_user_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. トリガーの作成（既存のものがあれば置き換え）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_delete();

-- 6. 既存の認証ユーザーとの連携（手動実行が必要）
-- 注意: 以下のクエリは既存のauth.usersテーブルにデータがある場合のみ実行
/*
INSERT INTO public.users (auth_user_id, email, name)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email, 'ユーザー')
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.auth_user_id = au.id
);
*/

-- 8. 重複ユーザーのクリーンアップ（必要に応じて実行）
/*
-- 重複ユーザーを確認
SELECT auth_user_id, COUNT(*) as count
FROM users 
WHERE auth_user_id IS NOT NULL
GROUP BY auth_user_id 
HAVING COUNT(*) > 1;

-- 重複ユーザーを削除（最新のレコードを保持）
WITH ranked_users AS (
  SELECT id, auth_user_id,
         ROW_NUMBER() OVER (PARTITION BY auth_user_id ORDER BY created_at DESC) as rn
  FROM users 
  WHERE auth_user_id IS NOT NULL
)
DELETE FROM users 
WHERE id IN (
  SELECT id FROM ranked_users WHERE rn > 1
);
*/

-- 7. コメント追加
COMMENT ON COLUMN users.auth_user_id IS 'Supabase認証テーブル(auth.users)のIDとの紐付け（NULLの場合は非認証ユーザー）';
COMMENT ON COLUMN users.name IS '表示名（非認証：投票時入力名、認証：変更可能な表示名）';
