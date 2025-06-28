-- 重複ユーザー問題解決のための追加マイグレーション
-- 変更前のmigration-auth-integration.sqlを実行した後に適用

-- 1. 現在の重複状況を確認（実行前に確認用）
/*
SELECT auth_user_id, COUNT(*) as count, string_agg(id::text, ', ') as user_ids
FROM users 
WHERE auth_user_id IS NOT NULL
GROUP BY auth_user_id 
HAVING COUNT(*) > 1
ORDER BY count DESC;
*/

-- 2. トリガー関数を重複回避版に更新
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

-- 3. 既存の重複ユーザーをクリーンアップ
-- 投票データがある場合は、そのユーザーを保持し、投票データを統合

DO $$
DECLARE
    duplicate_auth_id UUID;
    keep_user_id UUID;
    remove_user_ids UUID[];
    remove_user_id UUID;
BEGIN
    -- 重複している auth_user_id ごとに処理
    FOR duplicate_auth_id IN 
        SELECT auth_user_id 
        FROM users 
        WHERE auth_user_id IS NOT NULL
        GROUP BY auth_user_id 
        HAVING COUNT(*) > 1
    LOOP
        -- 保持するユーザーを決定（投票データがある場合は優先、なければ最新）
        SELECT id INTO keep_user_id
        FROM users u
        WHERE u.auth_user_id = duplicate_auth_id
        ORDER BY 
            (SELECT COUNT(*) FROM votes v WHERE v.user_id = u.id) DESC, -- 投票数が多い順
            u.created_at DESC -- 作成日が新しい順
        LIMIT 1;
        
        -- 削除対象のユーザーIDを取得
        SELECT array_agg(id) INTO remove_user_ids
        FROM users 
        WHERE auth_user_id = duplicate_auth_id AND id != keep_user_id;
        
        -- 削除対象ユーザーの投票データを保持ユーザーに移行
        FOREACH remove_user_id IN ARRAY remove_user_ids
        LOOP
            -- 投票データを移行（重複する場合は保持ユーザーの投票を優先）
            UPDATE votes 
            SET user_id = keep_user_id 
            WHERE user_id = remove_user_id
            AND NOT EXISTS (
                SELECT 1 FROM votes v2 
                WHERE v2.user_id = keep_user_id 
                AND v2.event_date_id = votes.event_date_id 
                AND v2.event_time_id = votes.event_time_id
            );
            
            -- 重複する投票データは削除
            DELETE FROM votes 
            WHERE user_id = remove_user_id;
            
            -- パターンデータも移行
            UPDATE user_availability_patterns 
            SET user_id = keep_user_id 
            WHERE user_id = remove_user_id
            AND NOT EXISTS (
                SELECT 1 FROM user_availability_patterns uap2 
                WHERE uap2.user_id = keep_user_id 
                AND uap2.start_time = user_availability_patterns.start_time 
                AND uap2.end_time = user_availability_patterns.end_time
            );
            
            -- 重複するパターンデータは削除
            DELETE FROM user_availability_patterns 
            WHERE user_id = remove_user_id;
        END LOOP;
        
        -- 重複ユーザーを削除
        DELETE FROM users 
        WHERE auth_user_id = duplicate_auth_id AND id != keep_user_id;
        
        RAISE NOTICE 'Cleaned up duplicates for auth_user_id: %, kept user_id: %', duplicate_auth_id, keep_user_id;
    END LOOP;
END $$;

-- 4. 統計情報の更新（マテリアライズドビューがある場合）
REFRESH MATERIALIZED VIEW IF EXISTS event_vote_statistics;

-- 5. 実行後の確認クエリ（結果確認用）
/*
-- 重複が解消されたか確認
SELECT auth_user_id, COUNT(*) as count
FROM users 
WHERE auth_user_id IS NOT NULL
GROUP BY auth_user_id 
HAVING COUNT(*) > 1;

-- 結果：何も表示されなければ重複解消完了

-- 全ユーザーの状況確認
SELECT 
    id,
    name,
    auth_user_id,
    (auth_user_id IS NOT NULL) as is_authenticated,
    created_at,
    (SELECT COUNT(*) FROM votes WHERE user_id = users.id) as vote_count
FROM users 
ORDER BY created_at DESC;
*/
