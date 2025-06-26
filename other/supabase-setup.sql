-- Supabaseでイベントとavailabilitiesテーブルを作成するためのSQL

-- ユーザー
CREATE TABLE user_account (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  keycloak_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- eventテーブルを作成
CREATE TABLE event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  start_timestamp TIMESTAMP,
  end_timestamp TIMESTAMP
);

-- イベントの時間
CREATE TABLE event_sheet_col (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES event(id) ON DELETE CASCADE,
  col VARCHAR NOT NULL  -- 時間　12:00
);

-- イベントの日程
create table event_sheet_row (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES event(id) ON DELETE CASCADE,
  row VARCHAR NOT NULL  -- 日程12/25
);

-- 参加者の可用セル（表の1マス）
CREATE TABLE available (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
  event_id UUID REFERENCES event(id) ON DELETE CASCADE,
  col_id UUID REFERENCES event_sheet_col(id) ON DELETE CASCADE,
  row_id UUID REFERENCES event_sheet_row(id) ON DELETE CASCADE,
  UNIQUE(user_id, event_id, col_id, row_id)  -- 重複チェック
);

CREATE TABLE availabilities_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
  start_datetime TIMESTAMP NOT NULL,
  end_datetime TIMESTAMP NOT NULL,
  CONSTRAINT valid_user_datetime_range CHECK (end_datetime > start_datetime)
);

-- パフォーマンス向上のためのインデックス
CREATE INDEX idx_event_sheet_col_event_id ON event_sheet_col(event_id);
CREATE INDEX idx_event_sheet_row_event_id ON event_sheet_row(event_id);
CREATE INDEX idx_available_event_id ON available(event_id);
CREATE INDEX idx_available_user_id ON available(user_id);
CREATE INDEX idx_availabilities_user_user_id ON availabilities_user(user_id);
