-- 名前重複ユーザーのクリーンアップマイグレーション

-- 1. 重複状況の詳細確認（実行前に必ず確認）
/*
SELECT 
    name, 
    COUNT(*) as count,
    string_agg(
        id::text || 
        ' (auth:' || COALESCE(auth_user_id::text, 'NULL') || 
        ', votes:' || (SELECT COUNT(*) FROM votes WHERE user_id = users.id)::text || 
        ', created:' || created_at::text || ')', 
        '; '
    ) as user_details
FROM users 
GROUP BY name 
HAVING COUNT(*) > 1
ORDER BY count DESC;
*/

-- 2. 名前重複ユーザーの統合処理
DO $$
DECLARE
    duplicate_name TEXT;
    keep_user_id UUID;
    remove_user_ids UUID[];
    remove_user_id UUID;
    user_record RECORD;
BEGIN
    -- 重複している名前ごとに処理
    FOR duplicate_name IN 
        SELECT name 
        FROM users 
        GROUP BY name 
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Processing duplicate name: %', duplicate_name;
        
        -- 保持するユーザーを決定する優先順位：
        -- 1. 認証ユーザー（auth_user_id が NULL でない）
        -- 2. 投票データがあるユーザー
        -- 3. 作成日が新しいユーザー
        SELECT id INTO keep_user_id
        FROM users u
        WHERE u.name = duplicate_name
        ORDER BY 
            (u.auth_user_id IS NOT NULL) DESC, -- 認証ユーザー優先
            (SELECT COUNT(*) FROM votes v WHERE v.user_id = u.id) DESC, -- 投票数が多い順
            u.created_at DESC -- 作成日が新しい順
        LIMIT 1;
        
        -- 削除対象のユーザーIDを取得
        SELECT array_agg(id) INTO remove_user_ids
        FROM users 
        WHERE name = duplicate_name AND id != keep_user_id;
        
        RAISE NOTICE 'Keeping user_id: %, removing: %', keep_user_id, remove_user_ids;
        
        -- 削除対象ユーザーのデータを保持ユーザーに移行
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
            
            -- 保持ユーザーがまだauth_user_idを持っていない場合、
            -- 削除対象ユーザーのauth_user_idを移行
            SELECT * INTO user_record FROM users WHERE id = keep_user_id;
            IF user_record.auth_user_id IS NULL THEN
                UPDATE users 
                SET auth_user_id = (
                    SELECT auth_user_id FROM users WHERE id = remove_user_id
                )
                WHERE id = keep_user_id
                AND (SELECT auth_user_id FROM users WHERE id = remove_user_id) IS NOT NULL;
            END IF;
            
            RAISE NOTICE 'Migrated data from user_id: % to user_id: %', remove_user_id, keep_user_id;
        END LOOP;
        
        -- 重複ユーザーを削除
        DELETE FROM users 
        WHERE name = duplicate_name AND id != keep_user_id;
        
        RAISE NOTICE 'Cleaned up duplicates for name: %, kept user_id: %', duplicate_name, keep_user_id;
    END LOOP;
END $$;

-- 3. 統計情報の更新
REFRESH MATERIALIZED VIEW IF EXISTS event_vote_statistics;

-- 4. クリーンアップ後の確認（実行後に確認）
/*
-- 名前重複が解消されたか確認
SELECT name, COUNT(*) as count
FROM users 
GROUP BY name 
HAVING COUNT(*) > 1;

-- 結果：何も表示されなければ重複解消完了

-- 全ユーザーの最終状況確認
SELECT 
    id,
    name,
    email,
    auth_user_id,
    (auth_user_id IS NOT NULL) as is_authenticated,
    created_at,
    (SELECT COUNT(*) FROM votes WHERE user_id = users.id) as vote_count
FROM users 
ORDER BY name, created_at DESC;
*/
