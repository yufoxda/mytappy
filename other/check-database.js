// データベースの内容を確認するためのスクリプト
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 環境変数を読み込む
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase環境変数が設定されていません');
  console.log('SUPABASE_URL:', supabaseUrl);
  console.log('SUPABASE_KEY:', supabaseKey ? 'あり' : 'なし');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseContent() {
  console.log('=== データベース内容確認 ===');
  
  // 1. user_availability_patternsの内容を確認
  const { data: patterns, error } = await supabase
    .from('user_availability_patterns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching patterns:', error);
  } else {
    console.log('\n最新のuser_availability_patterns:');
    patterns.forEach((pattern, index) => {
      console.log(`${index + 1}. User: ${pattern.user_id}`);
      console.log(`   Start: ${pattern.start_time}`);
      console.log(`   End: ${pattern.end_time}`);
      console.log(`   Created: ${pattern.created_at}`);
      console.log('');
    });
  }

  // 2. 最新の投票内容を確認
  const { data: votes, error: voteError } = await supabase
    .from('votes')
    .select(`
      *,
      event_dates (date_label),
      event_times (time_label)
    `)
    .order('voted_at', { ascending: false })
    .limit(5);

  if (voteError) {
    console.error('Error fetching votes:', voteError);
  } else {
    console.log('\n最新の投票:');
    votes.forEach((vote, index) => {
      console.log(`${index + 1}. User: ${vote.user_id}, Event: ${vote.event_id}`);
      console.log(`   Date: ${vote.event_dates?.date_label}, Time: ${vote.event_times?.time_label}`);
      console.log(`   Available: ${vote.is_available}`);
      console.log(`   Voted at: ${vote.voted_at}`);
      console.log('');
    });
  }
}

checkDatabaseContent().catch(console.error);
