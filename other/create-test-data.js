// テストデータ作成スクリプト
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://esfcgqjlcwfhhdrjpzyz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZmNncWpsY3dmaGhkcmpwenl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUyNzQ2NDYsImV4cCI6MjA1MDg1MDY0Nn0.gxgPJMzqKj-qtVZO_ePgJMj0o3t4WNJzW39_HPu3tgI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestData() {
  console.log('=== テストデータ作成開始 ===\n');
  
  try {
    // 1. ユーザー作成
    console.log('👥 ユーザー作成...');
    const { data: user7, error: userError } = await supabase
      .from('users')
      .upsert([{ id: 7, name: 'user7' }], { onConflict: 'id' })
      .select()
      .single();
    
    if (userError) {
      console.error('ユーザー作成エラー:', userError);
      return;
    }
    console.log('✅ user7 作成完了:', user7);
    
    // 2. イベント作成
    console.log('\n📅 イベント作成...');
    const { data: event1, error: event1Error } = await supabase
      .from('events')
      .upsert([
        { id: 1, title: 'テストイベント1', description: '9-12時パターン学習用' }
      ], { onConflict: 'id' })
      .select()
      .single();
    
    const { data: event2, error: event2Error } = await supabase
      .from('events')
      .upsert([
        { id: 2, title: 'テストイベント2', description: '分割パターンテスト用' }
      ], { onConflict: 'id' })
      .select()
      .single();
    
    if (event1Error || event2Error) {
      console.error('イベント作成エラー:', event1Error || event2Error);
      return;
    }
    console.log('✅ イベント作成完了');
    
    // 3. 候補日作成
    console.log('\n📋 候補日作成...');
    const eventDates = [
      { id: 1, event_id: 1, date_label: '6/27(金)', column_order: 0 },
      { id: 2, event_id: 2, date_label: '6/27(金)', column_order: 0 }
    ];
    
    const { error: datesError } = await supabase
      .from('event_dates')
      .upsert(eventDates, { onConflict: 'id' });
    
    if (datesError) {
      console.error('候補日作成エラー:', datesError);
      return;
    }
    console.log('✅ 候補日作成完了');
    
    // 4. 候補時間作成
    console.log('\n⏰ 候補時間作成...');
    const eventTimes = [
      // イベント1用
      { id: 1, event_id: 1, time_label: '9:00-10:00', row_order: 0 },
      { id: 2, event_id: 1, time_label: '10:00-11:00', row_order: 1 },
      { id: 3, event_id: 1, time_label: '11:00-12:00', row_order: 2 },
      // イベント2用
      { id: 4, event_id: 2, time_label: '9:00-10:00', row_order: 0 },
      { id: 5, event_id: 2, time_label: '10:00-11:00', row_order: 1 },
      { id: 6, event_id: 2, time_label: '11:00-12:00', row_order: 2 }
    ];
    
    const { error: timesError } = await supabase
      .from('event_times')
      .upsert(eventTimes, { onConflict: 'id' });
    
    if (timesError) {
      console.error('候補時間作成エラー:', timesError);
      return;
    }
    console.log('✅ 候補時間作成完了');
    
    console.log('\n🎉 テストデータ作成完了！');
    
    // 作成されたデータを確認
    console.log('\n=== 作成されたデータ確認 ===');
    
    const { data: createdEvents } = await supabase.from('events').select('*').in('id', [1, 2]);
    console.log('📅 イベント:', createdEvents);
    
    const { data: createdDates } = await supabase.from('event_dates').select('*').in('event_id', [1, 2]);
    console.log('📋 候補日:', createdDates);
    
    const { data: createdTimes } = await supabase.from('event_times').select('*').in('event_id', [1, 2]);
    console.log('⏰ 候補時間:', createdTimes);
    
  } catch (error) {
    console.error('テストデータ作成エラー:', error);
  }
}

createTestData();
