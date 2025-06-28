-- 「悠史 堀内」ユーザーの重複解消マイグレーション

-- 1. 現在の詳細状況確認
/*
SELECT 
    id,
    name,
    email,
    auth_user_id,
    created_at,
    (SELECT COUNT(*) FROM votes WHERE user_id = users.id) as vote_count
FROM users 
WHERE name = '悠史 堀内'
ORDER BY created_at DESC;
*/

-- 2. 重複ユーザーの統合（メールアドレスがある方を保持）
DO $$
DECLARE
    keep_user_id UUID;
    remove_user_id UUID;
    keep_user_record RECORD;
    remove_user_record RECORD;
BEGIN
    -- メールアドレスがある方を保持ユーザーとして選択
    SELECT id INTO keep_user_id
    FROM users 
    WHERE name = '悠史 堀内'
    ORDER BY 
        (email IS NOT NULL AND email != '') DESC, -- メールがある方を優先
        created_at DESC -- 作成日が新しい方を優先
    LIMIT 1;
    
    -- 削除対象のユーザーを取得
    SELECT id INTO remove_user_id
    FROM users 
    WHERE name = '悠史 堀内' AND id != keep_user_id;
    
    -- 処理内容をログ出力
    SELECT * INTO keep_user_record FROM users WHERE id = keep_user_id;
    SELECT * INTO remove_user_record FROM users WHERE id = remove_user_id;
    
    RAISE NOTICE 'Keeping user: id=%, email=%, auth_user_id=%', 
        keep_user_record.id, keep_user_record.email, keep_user_record.auth_user_id;
    RAISE NOTICE 'Removing user: id=%, email=%, auth_user_id=%', 
        remove_user_record.id, remove_user_record.email, remove_user_record.auth_user_id;
    
    -- 削除対象ユーザーに投票データがある場合は移行（念のため）
    UPDATE votes 
    SET user_id = keep_user_id 
    WHERE user_id = remove_user_id
    AND NOT EXISTS (
        SELECT 1 FROM votes v2 
        WHERE v2.user_id = keep_user_id 
        AND v2.event_date_id = votes.event_date_id 
        AND v2.event_time_id = votes.event_time_id
    );
    
    -- 削除対象ユーザーの残った投票データを削除
    DELETE FROM votes WHERE user_id = remove_user_id;
    
    -- パターンデータも同様に処理
    UPDATE user_availability_patterns 
    SET user_id = keep_user_id 
    WHERE user_id = remove_user_id
    AND NOT EXISTS (
        SELECT 1 FROM user_availability_patterns uap2 
        WHERE uap2.user_id = keep_user_id 
        AND uap2.start_time = user_availability_patterns.start_time 
        AND uap2.end_time = user_availability_patterns.end_time
    );
    
    DELETE FROM user_availability_patterns WHERE user_id = remove_user_id;
    
    -- 保持ユーザーにメールアドレスがない場合、削除対象ユーザーのメールを移行
    IF keep_user_record.email IS NULL OR keep_user_record.email = '' THEN
        UPDATE users 
        SET email = remove_user_record.email
        WHERE id = keep_user_id
        AND remove_user_record.email IS NOT NULL 
        AND remove_user_record.email != '';
    END IF;
    
    -- 重複ユーザーを削除
    DELETE FROM users WHERE id = remove_user_id;
    
    RAISE NOTICE 'Successfully cleaned up duplicate user "悠史 堀内"';
    
END $$;

-- 3. 統計情報の更新
DO $$
BEGIN
    -- マテリアライズドビューが存在する場合のみ更新
    IF EXISTS (
        SELECT 1 FROM pg_matviews 
        WHERE schemaname = 'public' AND matviewname = 'event_vote_statistics'
    ) THEN
        REFRESH MATERIALIZED VIEW event_vote_statistics;
        RAISE NOTICE 'Refreshed materialized view: event_vote_statistics';
    ELSE
        RAISE NOTICE 'Materialized view event_vote_statistics does not exist, skipping refresh';
    END IF;
END $$;

-- 4. 実行後の確認
/*
-- 重複が解消されたか確認
SELECT name, COUNT(*) as count
FROM users 
WHERE name = '悠史 堀内'
GROUP BY name;

-- 最終的なユーザー情報確認
SELECT 
    id,
    name,
    email,
    auth_user_id,
    created_at,
    (SELECT COUNT(*) FROM votes WHERE user_id = users.id) as vote_count
FROM users 
WHERE name = '悠史 堀内';

-- 全体の名前重複確認（他にもないか確認）
SELECT name, COUNT(*) as count
FROM users 
GROUP BY name 
HAVING COUNT(*) > 1;
*/
