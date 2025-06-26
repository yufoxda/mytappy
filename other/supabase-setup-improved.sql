-- 改良版: シンプルで効率的な日程調整システム

-- ユーザー
CREATE TABLE user_account (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- イベント
CREATE TABLE event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  creator_id UUID REFERENCES user_account(id)
);

-- 候補日時スロット（シンプルなラベルベース設計）
CREATE TABLE time_slot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  
  -- ユーザー入力のラベル（表示用）
  date_label VARCHAR NOT NULL, -- "12/25", "クリスマス", "第1回目" など自由入力
  time_label VARCHAR NOT NULL, -- "18:00~渋谷1", "20:15~渋谷2", "22:45~明大前3" など自由入力
  
  -- 表示順序
  row_order INTEGER NOT NULL DEFAULT 0, -- 行の並び順（時間軸）
  col_order INTEGER NOT NULL DEFAULT 0, -- 列の並び順（日付軸）
  
  UNIQUE(event_id, row_order, col_order) -- 表の位置の重複防止
);

-- 投票（ユーザーの可用性）
CREATE TABLE vote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
  time_slot_id UUID NOT NULL REFERENCES time_slot(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE, -- 冗長だがクエリ高速化のため
  status BOOLEAN NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, time_slot_id) -- 同じスロットに重複投票を防ぐ
);

-- ユーザーの過去の投票パターン（自動入力のため）
CREATE TABLE user_availability_pattern (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  UNIQUE(user_id, start_time, end_time, )
);

-- パフォーマンス最適化インデックス
CREATE INDEX idx_time_slot_event_id ON time_slot(event_id);
CREATE INDEX idx_time_slot_display_order ON time_slot(event_id, row_order, col_order);
CREATE INDEX idx_time_slot_labels ON time_slot(date_label, time_label); -- ラベル検索用
CREATE INDEX idx_vote_event_id ON vote(event_id);
CREATE INDEX idx_vote_user_id ON vote(user_id);
CREATE INDEX idx_vote_time_slot_id ON vote(time_slot_id);
CREATE INDEX idx_vote_event_user ON vote(event_id, user_id); -- 集計クエリ用
CREATE INDEX idx_user_pattern_user_day ON user_availability_pattern(user_id, day_of_week);

-- 集計用マテリアライズドビュー（大規模データ対応）
CREATE MATERIALIZED VIEW event_vote_summary AS
SELECT 
  v.event_id,
  v.time_slot_id,
  ts.date_label,
  ts.time_label,
  ts.row_order,
  ts.col_order,
  COUNT(*) as total_votes,
  COUNT(CASE WHEN v.status = true THEN 1 END) as available_count,
  COUNT(CASE WHEN v.status = false THEN 1 END) as unavailable_count
FROM vote v
JOIN time_slot ts ON v.time_slot_id = ts.id
GROUP BY v.event_id, v.time_slot_id, ts.date_label, ts.time_label, ts.row_order, ts.col_order;

CREATE UNIQUE INDEX idx_vote_summary_event_slot ON event_vote_summary(event_id, time_slot_id);

-- 表形式表示用のビュー
CREATE VIEW event_table_structure AS
WITH date_headers AS (
  SELECT DISTINCT 
    event_id, 
    date_label, 
    col_order
  FROM time_slot
),
time_headers AS (
  SELECT DISTINCT 
    event_id, 
    time_label, 
    row_order
  FROM time_slot
)
SELECT 
  dh.event_id,
  dh.date_label,
  dh.col_order,
  th.time_label,
  th.row_order,
  ts.id as time_slot_id
FROM date_headers dh
CROSS JOIN time_headers th
LEFT JOIN time_slot ts ON 
  ts.event_id = dh.event_id 
  AND ts.col_order = dh.col_order 
  AND ts.row_order = th.row_order
WHERE dh.event_id = th.event_id;

-- 自動更新トリガー
CREATE OR REPLACE FUNCTION refresh_vote_summary()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY event_vote_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_vote_summary
  AFTER INSERT OR UPDATE OR DELETE ON vote
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_vote_summary();
