-- 改良版: シンプルで効率的な日程調整システム（マテリアライズドビュー採用）

-- ユーザーアカウント（Supabase認証と連携）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id), -- Supabase認証テーブルとの連携
  name VARCHAR NOT NULL, -- 表示名（非認証：投票時入力、認証：変更可能）
  email VARCHAR UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- イベント
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  creator_id UUID REFERENCES users(id)
);

-- イベントの候補日（列ヘッダー）
CREATE TABLE event_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date_label VARCHAR NOT NULL, -- "12/25", "クリスマス", "第1回目" など自由入力
  column_order INTEGER NOT NULL DEFAULT 0, -- 列の並び順
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, column_order)
);

-- イベントの候補時刻（行ヘッダー）
CREATE TABLE event_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  time_label VARCHAR NOT NULL, -- "18:00~渋谷1", "20:15~渋谷2", "22:45~明大前3" など自由入力
  row_order INTEGER NOT NULL DEFAULT 0, -- 行の並び順
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, row_order)
);

-- 候補日時スロット（日付×時刻の組み合わせ）- ビューとして実装
CREATE VIEW time_slots AS
SELECT 
  ed.event_id,
  ed.id as event_date_id,
  et.id as event_time_id,
  ed.date_label,
  ed.column_order,
  et.time_label,
  et.row_order,
  CONCAT(ed.id, '-', et.id) as slot_key -- 一意識別子
FROM event_dates ed
CROSS JOIN event_times et
WHERE ed.event_id = et.event_id;

-- 投票（ユーザーの可用性）
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_date_id UUID NOT NULL REFERENCES event_dates(id) ON DELETE CASCADE,
  event_time_id UUID NOT NULL REFERENCES event_times(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_date_id, event_time_id) -- 同じスロットに重複投票を防ぐ
);

-- ユーザーの過去の投票パターン（自動入力のため）
CREATE TABLE user_availability_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  UNIQUE(user_id, start_time, end_time)
);

-- パフォーマンス最適化インデックス
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id); -- 認証ユーザーID用インデックス
CREATE INDEX idx_event_dates_event_id ON event_dates(event_id);
CREATE INDEX idx_event_dates_order ON event_dates(event_id, column_order);
CREATE INDEX idx_event_times_event_id ON event_times(event_id);
CREATE INDEX idx_event_times_order ON event_times(event_id, row_order);
CREATE INDEX idx_votes_event_id ON votes(event_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_votes_date_time ON votes(event_date_id, event_time_id);
CREATE INDEX idx_votes_event_user ON votes(event_id, user_id); -- 集計クエリ用
CREATE INDEX idx_user_patterns_user ON user_availability_patterns(user_id);

-- 集計用マテリアライズドビュー（高速な投票結果表示）
CREATE MATERIALIZED VIEW event_vote_statistics AS
SELECT 
  v.event_id,
  v.event_date_id,
  v.event_time_id,
  ed.date_label,
  ed.column_order,
  et.time_label,
  et.row_order,
  COUNT(*) as total_votes,
  COUNT(CASE WHEN v.is_available = true THEN 1 END) as available_votes,
  COUNT(CASE WHEN v.is_available = false THEN 1 END) as unavailable_votes,
  ROUND(
    COUNT(CASE WHEN v.is_available = true THEN 1 END) * 100.0 / COUNT(*), 
    2
  ) as availability_percentage
FROM votes v
JOIN event_dates ed ON v.event_date_id = ed.id
JOIN event_times et ON v.event_time_id = et.id
GROUP BY v.event_id, v.event_date_id, v.event_time_id, ed.date_label, ed.column_order, et.time_label, et.row_order;

CREATE UNIQUE INDEX idx_vote_statistics_event_date_time ON event_vote_statistics(event_id, event_date_id, event_time_id);

-- 表形式表示用のビュー（UIでの表描画用）
CREATE VIEW event_table_grid AS
SELECT 
  ed.event_id,
  ed.date_label,
  ed.column_order,
  et.time_label,
  et.row_order,
  ed.id as event_date_id,
  et.id as event_time_id,
  ts.slot_key, -- 一意識別子
  -- 投票統計も含める（リアルタイム表示用）
  COALESCE(evs.total_votes, 0) as total_votes,
  COALESCE(evs.available_votes, 0) as available_votes,
  COALESCE(evs.unavailable_votes, 0) as unavailable_votes,
  COALESCE(evs.availability_percentage, 0) as availability_percentage
FROM event_dates ed
CROSS JOIN event_times et
LEFT JOIN time_slots ts ON 
  ts.event_id = ed.event_id 
  AND ts.event_date_id = ed.id 
  AND ts.event_time_id = et.id
LEFT JOIN event_vote_statistics evs ON 
  evs.event_date_id = ed.id AND evs.event_time_id = et.id
WHERE ed.event_id = et.event_id
ORDER BY ed.column_order, et.row_order;

-- マテリアライズドビューの自動更新関数
CREATE OR REPLACE FUNCTION refresh_vote_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- CONCURRENTLYオプションを削除（Supabase対応）
  REFRESH MATERIALIZED VIEW event_vote_statistics;
  -- INSERT/UPDATE の場合はNEWを、DELETEの場合はOLDを返す
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 新規認証ユーザーの自動連携関数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'ユーザー')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 認証ユーザー削除時の連携関数
CREATE OR REPLACE FUNCTION handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- 認証ユーザーが削除された場合、auth_user_idをNULLに設定（レコードは保持）
  UPDATE public.users 
  SET auth_user_id = NULL
  WHERE auth_user_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 投票データ変更時のトリガー
CREATE TRIGGER trigger_refresh_vote_statistics
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_vote_statistics();

-- 認証ユーザー作成時のトリガー（自動でusersテーブルにレコード作成）
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 認証ユーザー削除時のトリガー
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_delete();

-- コメント追加
COMMENT ON COLUMN users.auth_user_id IS 'Supabase認証テーブル(auth.users)のIDとの紐付け（NULLの場合は非認証ユーザー）';
COMMENT ON COLUMN users.name IS '表示名（非認証：投票時入力名、認証：変更可能な表示名）';

/*
== シンプルなユーザー管理設計 ==

### データ構造の考え方：
1. `name`: 唯一の表示名フィールド
   - 非認証ユーザー：投票時に入力した名前
   - 認証ユーザー：初回ログイン時に自動設定、その後変更可能
   
2. `auth_user_id`: 認証状態の判定
   - NULL: 非認証ユーザー
   - UUID: 認証済みユーザー

### 利点：
- シンプルで理解しやすい
- フィールドが1つなので混乱がない  
- 認証・非認証ユーザー共通の扱い

### 使用例：
-- 認証済みかどうかの判定
SELECT *, (auth_user_id IS NOT NULL) as is_authenticated FROM users;

-- 認証済みユーザーのみ取得
SELECT * FROM users WHERE auth_user_id IS NOT NULL;

-- 名前更新（認証ユーザーのみ）
UPDATE users SET name = '新しい名前' WHERE auth_user_id = 'user-uuid';

*/
