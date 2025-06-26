// パターン分割処理のテストスクリプト
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase環境変数が設定されていません');
  console.log('SUPABASE_URL:', supabaseUrl ? '設定済み' : 'なし');
  console.log('SUPABASE_KEY:', supabaseKey ? '設定済み' : 'なし');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// テストデータのクリーンアップ
async function cleanup() {
  console.log('=== Cleanup ===');
  
  // テストユーザーのパターンを削除
  await supabase.from('user_availability_patterns').delete().eq('user_id', '7');
  
  // テストユーザーの投票を削除
  await supabase.from('votes').delete().eq('user_id', '7');
  
  console.log('Cleanup completed');
}

// パターンを確認
async function checkPatterns(userId, label) {
  console.log(`\n=== ${label} ===`);
  const { data: patterns } = await supabase
    .from('user_availability_patterns')
    .select('*')
    .eq('user_id', userId)
    .order('start_time');
    
  if (patterns && patterns.length > 0) {
    patterns.forEach((pattern, index) => {
      console.log(`  ${index + 1}. ${pattern.start_time} - ${pattern.end_time}`);
    });
  } else {
    console.log('  パターンなし');
  }
  return patterns || [];
}

// 投票を追加する関数（actions.tsのロジックを模倣）
async function addVotes(eventId, userId, votes) {
  console.log(`\n=== Adding votes for user ${userId}, event ${eventId} ===`);
  
  // 既存の投票を削除
  await supabase.from('votes').delete().eq('event_id', eventId).eq('user_id', userId);
  
  // 新しい投票を追加
  const votesData = votes.map(vote => ({
    event_id: eventId,
    user_id: userId,
    event_date_id: vote.eventDateId,
    event_time_id: vote.eventTimeId,
    is_available: vote.isAvailable
  }));
  
  const { data, error } = await supabase.from('votes').insert(votesData).select();
  
  if (error) {
    console.error('投票追加エラー:', error);
    return false;
  }
  
  console.log(`投票追加完了: ${votesData.length}件`);
  
  // パターン学習をシミュレート（簡略版）
  await learnPatterns(userId, eventId, votes);
  
  return true;
}

// パターン学習の簡略版
async function learnPatterns(userId, eventId, votes) {
  console.log(`\n=== Learning patterns for user ${userId} ===`);
  
  // 対応可能な投票のみ
  const availableVotes = votes.filter(vote => vote.isAvailable);
  
  if (availableVotes.length === 0) {
    console.log('対応可能な投票がありません');
    return;
  }
  
  // 既存パターンを取得
  const { data: existingPatterns } = await supabase
    .from('user_availability_patterns')
    .select('*')
    .eq('user_id', userId)
    .order('start_time');
  
  console.log(`既存パターン: ${existingPatterns?.length || 0}件`);
  
  // 新規パターンを作成（仮想的に）
  const newPatterns = [];
  for (const vote of availableVotes) {
    // 実際のデータベースから日付・時刻情報を取得
    const { data: dateData } = await supabase
      .from('event_dates')
      .select('date_label')
      .eq('id', vote.eventDateId)
      .single();
      
    const { data: timeData } = await supabase
      .from('event_times')
      .select('time_label')
      .eq('id', vote.eventTimeId)
      .single();
    
    if (dateData && timeData) {
      // 簡略化：固定の日付と時刻パターンを使用
      if (timeData.time_label === '9:00-10:00') {
        newPatterns.push({ start_time: '2025-06-27 09:00:00', end_time: '2025-06-27 10:00:00' });
      } else if (timeData.time_label === '10:00-11:00') {
        newPatterns.push({ start_time: '2025-06-27 10:00:00', end_time: '2025-06-27 11:00:00' });
      } else if (timeData.time_label === '11:00-12:00') {
        newPatterns.push({ start_time: '2025-06-27 11:00:00', end_time: '2025-06-27 12:00:00' });
      }
    }
  }
  
  // 連続パターンの結合
  if (newPatterns.length > 1) {
    // 9:00-10:00 と 10:00-11:00 と 11:00-12:00 → 9:00-12:00
    const sortedPatterns = newPatterns.sort((a, b) => a.start_time.localeCompare(b.start_time));
    const mergedPattern = {
      start_time: sortedPatterns[0].start_time,
      end_time: sortedPatterns[sortedPatterns.length - 1].end_time
    };
    
    console.log(`連続パターンを結合: ${mergedPattern.start_time} - ${mergedPattern.end_time}`);
    
    // 既存パターンを削除して新規パターンを追加
    if (existingPatterns && existingPatterns.length > 0) {
      const existingIds = existingPatterns.map(p => p.id);
      await supabase.from('user_availability_patterns').delete().in('id', existingIds);
      console.log(`既存パターン ${existingIds.length}件を削除`);
    }
    
    const { error } = await supabase.from('user_availability_patterns').insert([{
      user_id: userId,
      start_time: mergedPattern.start_time,
      end_time: mergedPattern.end_time
    }]);
    
    if (error) {
      console.error('パターン追加エラー:', error);
    } else {
      console.log('新規パターンを追加');
    }
  } else {
    // 単一パターンまたは非連続パターンの場合
    for (const pattern of newPatterns) {
      const { error } = await supabase.from('user_availability_patterns').insert([{
        user_id: userId,
        start_time: pattern.start_time,
        end_time: pattern.end_time
      }]);
      
      if (error) {
        console.error('パターン追加エラー:', error);
      } else {
        console.log(`パターン追加: ${pattern.start_time} - ${pattern.end_time}`);
      }
    }
  }
}

// メインテスト
async function runTest() {
  try {
    await cleanup();
    
    // ステップ1: user7がevent1で9-12:00に投票
    console.log('\n🎯 ステップ1: user7がevent1で9-12:00に投票');
    
    // event1の候補日時IDを取得（仮定）
    const { data: event1Dates } = await supabase.from('event_dates').select('*').eq('event_id', '1').limit(1);
    const { data: event1Times } = await supabase.from('event_times').select('*').eq('event_id', '1').order('row_order');
    
    if (!event1Dates || !event1Times || event1Times.length < 3) {
      console.error('event1の候補日時が不足しています');
      return;
    }
    
    const dateId = event1Dates[0].id;
    const votes1 = [
      { eventDateId: dateId, eventTimeId: event1Times[0].id, isAvailable: true },  // 9:00-10:00
      { eventDateId: dateId, eventTimeId: event1Times[1].id, isAvailable: true },  // 10:00-11:00
      { eventDateId: dateId, eventTimeId: event1Times[2].id, isAvailable: true },  // 11:00-12:00
    ];
    
    await addVotes('1', '7', votes1);
    await checkPatterns('7', 'ステップ1後のパターン');
    
    // ステップ2: user7がevent2で自動入力（9-12:00）
    console.log('\n🎯 ステップ2: user7がevent2で自動入力（9-12:00）確認');
    await checkPatterns('7', 'ステップ2での既存パターン');
    
    // ステップ3: 10:00-11:00を選択解除して登録
    console.log('\n🎯 ステップ3: 10:00-11:00を選択解除して登録');
    
    const { data: event2Dates } = await supabase.from('event_dates').select('*').eq('event_id', '2').limit(1);
    const { data: event2Times } = await supabase.from('event_times').select('*').eq('event_id', '2').order('row_order');
    
    if (!event2Dates || !event2Times || event2Times.length < 3) {
      console.error('event2の候補日時が不足しています');
      return;
    }
    
    const dateId2 = event2Dates[0].id;
    const votes2 = [
      { eventDateId: dateId2, eventTimeId: event2Times[0].id, isAvailable: true },  // 9:00-10:00
      { eventDateId: dateId2, eventTimeId: event2Times[1].id, isAvailable: false }, // 10:00-11:00 (選択解除)
      { eventDateId: dateId2, eventTimeId: event2Times[2].id, isAvailable: true },  // 11:00-12:00
    ];
    
    await addVotes('2', '7', votes2);
    await checkPatterns('7', 'ステップ3後のパターン（期待: 9-10:00, 11-12:00）');
    
    console.log('\n✅ テスト完了');
    
  } catch (error) {
    console.error('テストエラー:', error);
  }
}

runTest();
