-- Supabaseでスケジュールテーブルを作成するためのSQL

CREATE TABLE schedules (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  password TEXT,
  rows JSONB NOT NULL DEFAULT '[]',
  cols JSONB NOT NULL DEFAULT '[]',
  entries JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) を有効にする
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能なポリシーを作成
CREATE POLICY "Allow public read access" ON schedules
  FOR SELECT USING (true);

-- 全ユーザーが作成可能なポリシーを作成
CREATE POLICY "Allow public insert access" ON schedules
  FOR INSERT WITH CHECK (true);

-- 全ユーザーが更新可能なポリシーを作成
CREATE POLICY "Allow public update access" ON schedules
  FOR UPDATE USING (true);

-- updated_atカラムを自動更新するトリガーを作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schedules_updated_at 
  BEFORE UPDATE ON schedules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
