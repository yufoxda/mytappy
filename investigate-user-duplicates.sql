-- usersテーブルの重複調査クエリ

-- 1. 全体的な重複状況を確認
SELECT 
    name, 
    email,
    COUNT(*) as count,
    string_agg(id::text, ', ') as user_ids,
    string_agg(COALESCE(auth_user_id::text, 'NULL'), ', ') as auth_user_ids
FROM users 
GROUP BY name, email
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2. 名前での重複確認
SELECT 
    name, 
    COUNT(*) as count,
    string_agg(id::text, ', ') as user_ids
FROM users 
GROUP BY name 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 3. メールアドレスでの重複確認
SELECT 
    email, 
    COUNT(*) as count,
    string_agg(id::text, ', ') as user_ids
FROM users 
WHERE email IS NOT NULL
GROUP BY email 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 4. 全ユーザーの詳細確認
SELECT 
    id,
    name,
    email,
    auth_user_id,
    created_at,
    (SELECT COUNT(*) FROM votes WHERE user_id = users.id) as vote_count
FROM users 
ORDER BY name, created_at;

-- 5. 同じ名前で異なるIDのユーザー詳細
SELECT 
    u1.id as id1,
    u1.name,
    u1.email as email1,
    u1.auth_user_id as auth_id1,
    u1.created_at as created1,
    u2.id as id2,
    u2.email as email2,
    u2.auth_user_id as auth_id2,
    u2.created_at as created2
FROM users u1
JOIN users u2 ON u1.name = u2.name AND u1.id != u2.id
ORDER BY u1.name, u1.created_at;
