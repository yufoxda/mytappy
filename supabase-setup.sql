-- Supabaseでイベントとavailabilitiesテーブルを作成するためのSQL

-- eventテーブルを作成
CREATE TABLE event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  keycloak_id VARCHAR NOT NULL UNIQUE
);

CREATE TABLE availabilities_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  start_datetime TIMESTAMP DEFAULT NOW(),
  end_datetime TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_datetime_range CHECK (end_datetime > start_datetime)
);

CREATE TABLE invitation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
);


CREATE TABLE availabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  start_datetime TIMESTAMP NOT NULL,
  end_datetime TIMESTAMP NOT NULL,
  user_name VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約: 終了時刻は開始時刻より後でなければならない
  CONSTRAINT valid_datetime_range CHECK (end_datetime > start_datetime)
);

