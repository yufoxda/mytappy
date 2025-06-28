-- Row Level Security (RLS) ポリシー設定
-- Supabaseダッシュボードの「Authentication」→「Policies」で設定

-- 1. usersテーブルのRLS有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. ユーザーは自分の情報のみ更新可能
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- 3. 認証済みユーザーは他のユーザー情報を閲覧可能（参加者リスト用）
CREATE POLICY "Authenticated users can view all users" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

-- 4. システムが新規ユーザーを作成可能
CREATE POLICY "Enable insert for system" ON users
  FOR INSERT WITH CHECK (true);

-- 5. votesテーブルのポリシー例
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own votes" ON votes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = votes.user_id 
      AND (auth_user_id = auth.uid() OR auth_user_id IS NULL)
    )
  );

CREATE POLICY "Users can view all votes" ON votes
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own votes" ON votes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = votes.user_id 
      AND auth_user_id = auth.uid()
    )
  );
