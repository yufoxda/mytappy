-- Supabaseでイベントとavailabilitiesテーブルを作成するためのSQL

-- eventテーブルを作成
CREATE TABLE event (
  id UUID PRIMARY KEY,
  title VARCHAR NOT NULL,
  description VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- availabilitiesテーブルを作成
CREATE TABLE availabilities (
  id INT8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id INT8 NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE
);

-- RLS (Row Level Security) を有効にする
ALTER TABLE event ENABLE ROW LEVEL SECURITY;
ALTER TABLE availabilities ENABLE ROW LEVEL SECURITY;

-- eventテーブルのポリシー
CREATE POLICY "Allow public read access on event" ON event
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on event" ON event
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on event" ON event
  FOR UPDATE USING (true);

-- availabilitiesテーブルのポリシー
CREATE POLICY "Allow public read access on availabilities" ON availabilities
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on availabilities" ON availabilities
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on availabilities" ON availabilities
  FOR UPDATE USING (true);

-- インデックスを作成（パフォーマンス向上のため）
CREATE INDEX idx_availabilities_event_id ON availabilities(event_id);
CREATE INDEX idx_availabilities_user_id ON availabilities(user_id);
