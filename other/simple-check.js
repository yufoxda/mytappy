// より簡単なパターン確認スクリプト
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://esfcgqjlcwfhhdrjpzyz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZmNncWpsY3dmaGhkcmpwenl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUyNzQ2NDYsImV4cCI6MjA1MDg1MDY0Nn0.gxgPJMzqKj-qtVZO_ePgJMj0o3t4WNJzW39_HPu3tgI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('=== データベース状況確認 ===\n');
  
  // ユーザー確認
  const { data: users } = await supabase.from('users').select('*').order('id');
  console.log('👥 ユーザー一覧:');
  users?.forEach(user => console.log(`  ${user.id}: ${user.name}`));
  
  // イベント確認
  const { data: events } = await supabase.from('events').select('*').order('id');
  console.log('\n📅 イベント一覧:');
  events?.forEach(event => console.log(`  ${event.id}: ${event.title}`));
  
  // user7のパターン確認
  const { data: patterns } = await supabase
    .from('user_availability_patterns')
    .select('*')
    .eq('user_id', '7')
    .order('start_time');
  
  console.log('\n⏰ user7の可用時間パターン:');
  if (patterns && patterns.length > 0) {
    patterns.forEach((pattern, index) => {
      console.log(`  ${index + 1}. ${pattern.start_time} - ${pattern.end_time}`);
    });
  } else {
    console.log('  パターンなし');
  }
  
  // user7の投票確認
  const { data: votes } = await supabase
    .from('votes')
    .select(`
      *,
      event_dates(date_label),
      event_times(time_label)
    `)
    .eq('user_id', '7')
    .order('event_id');
  
  console.log('\n🗳️ user7の投票状況:');
  if (votes && votes.length > 0) {
    const votesByEvent = votes.reduce((acc, vote) => {
      if (!acc[vote.event_id]) acc[vote.event_id] = [];
      acc[vote.event_id].push(vote);
      return acc;
    }, {});
    
    Object.entries(votesByEvent).forEach(([eventId, eventVotes]) => {
      console.log(`  イベント${eventId}:`);
      eventVotes.forEach(vote => {
        const available = vote.is_available ? '✅' : '❌';
        console.log(`    ${available} ${vote.event_dates?.date_label} ${vote.event_times?.time_label}`);
      });
    });
  } else {
    console.log('  投票なし');
  }
  
  // イベント1の候補日時を確認
  const { data: event1Times } = await supabase
    .from('event_times')
    .select('*')
    .eq('event_id', '1')
    .order('row_order');
  
  console.log('\n📋 イベント1の候補時間:');
  event1Times?.forEach((time, index) => {
    console.log(`  ${index + 1}. ${time.time_label} (ID: ${time.id})`);
  });
}

checkDatabase().catch(console.error);
