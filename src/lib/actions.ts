'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { supabase } from './supabase';
import { type NormalizedEventData } from './labelParser';
import { parseTimeLabel, parseDateLabel } from './labelParser';

// イベント作成のServer Action（正規化設計・改良版テーブル名）
export async function createEvent(eventData: { 
  title: string; 
  description?: string; 
  eventData: NormalizedEventData;
}) {
  try {
    // 1. イベントを作成
    const { data: eventResult, error: eventError } = await supabase
      .from('events')
      .insert([{
        title: eventData.title,
        description: eventData.description
      }])
      .select()
      .single();
    
    if (eventError) {
      console.error('Error creating event:', eventError);
      return { success: false, error: 'Failed to create event' };
    }

    const eventId = eventResult.id;

    // 2. event_datesレコードを作成
    if (eventData.eventData.dates.length > 0) {
      const eventDates = eventData.eventData.dates.map(date => ({
        event_id: eventId,
        date_label: date.date_label,
        column_order: date.col_order
      }));

      const { data: dateResults, error: datesError } = await supabase
        .from('event_dates')
        .insert(eventDates)
        .select();

      if (datesError) {
        console.error('Error creating event dates:', datesError);
        return { success: false, error: 'Failed to create event dates' };
      }

      // 3. event_timesレコードを作成
      const eventTimes = eventData.eventData.times.map(time => ({
        event_id: eventId,
        time_label: time.time_label,
        row_order: time.row_order
      }));

      const { data: timeResults, error: timesError } = await supabase
        .from('event_times')
        .insert(eventTimes)
        .select();

      if (timesError) {
        console.error('Error creating event times:', timesError);
        return { success: false, error: 'Failed to create event times' };
      }

      // Note: time_slotsはビューのため、event_datesとevent_timesの作成により自動的に生成される
      
      console.log(`Event created successfully with ${dateResults!.length} dates and ${timeResults!.length} times`);
    }
    
    // キャッシュを無効化してデータを再取得
    revalidatePath('/');
    
    return { success: true, eventId: eventId, data: eventResult };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// 全イベント取得のServer Action
export async function getEvents() {
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching events:', error);
      return { success: false, error: 'Failed to fetch events' };
    }
    
    return { success: true, data: events || [] };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// 特定のイベント取得のServer Action
export async function getEventById(id: string) {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return { success: false, error: 'Event not found' };
      }
      console.error('Error fetching event:', error);
      return { success: false, error: 'Failed to fetch event' };
    }
    
    return { success: true, data: event };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// イベント用のavailabilities取得のServer Action
export async function getAvailabilitiesByEventId(eventId: string) {
  try {
    const { data: availabilities, error } = await supabase
      .from('availabilities')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching availabilities:', error);
      return { success: false, error: 'Failed to fetch availabilities' };
    }
    
    return { success: true, data: availabilities || [] };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// availability追加のServer Action
export async function addAvailability(availabilityData: {
  event_id: string;
  user_id: number;
  start_date: string;
  end_time: string;
}) {
  try {
    const { data, error } = await supabase
      .from('availabilities')
      .insert([availabilityData])
      .select();
    
    if (error) {
      console.error('Error adding availability:', error);
      return { success: false, error: 'Failed to add availability' };
    }
    
    // キャッシュを無効化
    revalidatePath(`/${availabilityData.event_id}`);
    
    return { success: true, data };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// 完全なイベント情報取得（イベント詳細、候補日、候補時刻、投票情報）
export async function getCompleteEventById(id: string) {
  try {
    // 1. イベント基本情報を取得
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();
    
    if (eventError) {
      if (eventError.code === 'PGRST116') {
        return { success: false, error: 'Event not found' };
      }
      console.error('Error fetching event:', eventError);
      return { success: false, error: 'Failed to fetch event' };
    }

    // 2. 候補日を取得
    const { data: eventDates, error: datesError } = await supabase
      .from('event_dates')
      .select('*')
      .eq('event_id', id)
      .order('column_order');

    if (datesError) {
      console.error('Error fetching event dates:', datesError);
      return { success: false, error: 'Failed to fetch event dates' };
    }

    // 3. 候補時刻を取得
    const { data: eventTimes, error: timesError } = await supabase
      .from('event_times')
      .select('*')
      .eq('event_id', id)
      .order('row_order');

    if (timesError) {
      console.error('Error fetching event times:', timesError);
      return { success: false, error: 'Failed to fetch event times' };
    }

    // 4. 投票統計を取得（マテリアライズドビューから）
    const { data: voteStats, error: statsError } = await supabase
      .from('event_vote_statistics')
      .select('*')
      .eq('event_id', id);

    if (statsError) {
      console.error('Error fetching vote statistics:', statsError);
      // 投票統計の取得エラーは致命的でないため、空配列を使用
    }

    return { 
      success: true, 
      data: {
        event,
        dates: eventDates || [],
        times: eventTimes || [],
        voteStats: voteStats || []
      }
    };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// 特定イベントの投票状況テーブル取得（表形式表示用）
export async function getEventTableGrid(eventId: string) {
  try {
    const { data: tableGrid, error } = await supabase
      .from('event_table_grid')
      .select('*')
      .eq('event_id', eventId)
      .order('row_order')
      .order('column_order');

    if (error) {
      console.error('Error fetching event table grid:', error);
      return { success: false, error: 'Failed to fetch event table grid' };
    }

    return { success: true, data: tableGrid || [] };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// 特定イベントの参加者一覧取得
export async function getEventParticipants(eventId: string) {
  try {
    const { data: participants, error } = await supabase
      .from('votes')
      .select(`
        user_id,
        users (
          id,
          name,
          email
        )
      `)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error fetching participants:', error);
      return { success: false, error: 'Failed to fetch participants' };
    }

    // 重複を除去
    const uniqueParticipants = participants?.reduce((acc: any[], current: any) => {
      const exists = acc.find(p => p.users.id === current.users.id);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []) || [];

    return { success: true, data: uniqueParticipants };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// ユーザー作成または取得
export async function createOrGetUser(name: string) {
  try {
    // まず同じ名前のユーザーが存在するかチェック
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('name', name)
      .single();

    if (existingUser) {
      return { success: true, data: existingUser };
    }

    // 存在しない場合は新規作成
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{ name }])
      .select()
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return { success: false, error: 'Failed to create user' };
    }

    return { success: true, data: newUser };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Keycloak認証対応のユーザー作成または取得
export async function createOrGetKeycloakUser(keycloakId: string, email: string, name: string) {
  try {
    // まずKeycloak IDでユーザーが存在するかチェック
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('keycloak_id', keycloakId)
      .single();

    if (existingUser) {
      // 既存ユーザーの情報を更新
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          email,
          name,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating Keycloak user:', updateError);
        return { success: false, error: 'Failed to update user' };
      }

      return { success: true, data: updatedUser };
    }

    // 存在しない場合は新規作成
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{ 
        keycloak_id: keycloakId,
        email,
        name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (createError) {
      console.error('Error creating Keycloak user:', createError);
      return { success: false, error: 'Failed to create user' };
    }

    return { success: true, data: newUser };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Keycloak IDでユーザーを取得
export async function getUserByKeycloakId(keycloakId: string) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('keycloak_id', keycloakId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return { success: false, error: 'User not found' };
      }
      console.error('Error fetching user by Keycloak ID:', error);
      return { success: false, error: 'Failed to fetch user' };
    }

    return { success: true, data: user };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// 投票を追加
export async function addVotes(eventId: string, userId: string, votes: { eventDateId: string; eventTimeId: string; isAvailable: boolean }[]) {
  try {
    // 既存の投票を削除（上書きのため）
    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting existing votes:', deleteError);
      return { success: false, error: 'Failed to delete existing votes' };
    }

    // 新しい投票を追加
    const votesData = votes.map(vote => ({
      event_id: eventId,
      user_id: userId,
      event_date_id: vote.eventDateId,
      event_time_id: vote.eventTimeId,
      is_available: vote.isAvailable
    }));

    const { data, error } = await supabase
      .from('votes')
      .insert(votesData)
      .select();

    if (error) {
      console.error('Error adding votes:', error);
      return { success: false, error: 'Failed to add votes' };
    }

    // ユーザーの対応可能時間パターンを学習
    await learnUserAvailabilityPatterns(userId, eventId, votes);

    // マテリアライズドビューを手動で更新
    const { error: refreshError } = await supabase.rpc('refresh_vote_statistics');
    if (refreshError) {
      console.warn('Warning: Failed to refresh vote statistics:', refreshError);
    }

    // キャッシュを無効化
    revalidatePath(`/${eventId}`);

    return { success: true, data };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// ユーザーの対応可能時間パターンを学習・登録（連続時間帯結合・高度な重複検出・統合処理）
async function learnUserAvailabilityPatterns(userId: string, eventId: string, votes: { eventDateId: string; eventTimeId: string; isAvailable: boolean }[]) {
  try {
    console.log(`=== Learning patterns for user ${userId}, event ${eventId} ===`);
    console.log(`Total votes received:`, votes.length);
    console.log(`Votes details:`, votes.map(v => `${v.eventDateId}-${v.eventTimeId}: ${v.isAvailable ? '✅' : '❌'}`));
    
    // 対応可能な時間のみフィルタリング
    const availableVotes = votes.filter(vote => vote.isAvailable);
    
    console.log(`Available votes:`, availableVotes.length);
    console.log(`Available vote IDs:`, availableVotes.map(v => `${v.eventDateId}-${v.eventTimeId}`));
    
    if (availableVotes.length === 0) {
      console.log('No available votes to learn from');
      return; // 対応可能な時間がない場合は学習しない
    }

    // 1. 既存のユーザーパターンを取得
    const existingPatternsResult = await getUserAvailabilityPatterns(userId);
    const existingPatterns = existingPatternsResult.success && existingPatternsResult.data ? 
      existingPatternsResult.data : [];
      
    console.log(`Existing patterns:`, existingPatterns.length);
    existingPatterns.forEach((pattern, index) => {
      console.log(`  ${index + 1}. ${pattern.start_time} - ${pattern.end_time}`);
    });

    // 2. 新規投票データから時間パターンを抽出し、連続する時間帯を結合
    const individualPatterns: { start_time: string; end_time: string; date: string }[] = [];

    for (const vote of availableVotes) {
      const { data: dateData, error: dateError } = await supabase
        .from('event_dates')
        .select('date_label')
        .eq('id', vote.eventDateId)
        .single();

      const { data: timeData, error: timeError } = await supabase
        .from('event_times')
        .select('time_label')
        .eq('id', vote.eventTimeId)
        .single();

      if (dateError || timeError || !dateData || !timeData) {
        continue; // エラーの場合はスキップ
      }

      // 日付と時刻ラベルを解析
      const parsedDate = parseDateLabel(dateData.date_label);
      const parsedTime = parseTimeLabel(timeData.time_label);

      console.log(`Processing vote: date_label="${dateData.date_label}", time_label="${timeData.time_label}"`);
      console.log(`Parsed date:`, parsedDate);
      console.log(`Parsed time:`, parsedTime);

      // 日付ラベルから実際の日付を取得し、時刻ラベルから時刻を抽出
      if (parsedDate.isDateRecognized && parsedTime.isTimeRecognized && parsedDate.date && parsedTime.startTime) {
        // タイムゾーンを無視した文字列ベースの時刻計算
        const [startHour, startMinute] = parsedTime.startTime.split(':').map(Number);
        
        console.log(`Extracted time parts: hour=${startHour}, minute=${startMinute}`);
        
        // Dateオブジェクトからタイムゾーンの影響を受けない純粋な日付文字列を取得
        const year = parsedDate.date.getFullYear();
        const month = String(parsedDate.date.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        console.log(`Base date string: ${dateString}`);
        
        // 開始時刻を文字列で構築（タイムゾーン変換なし）
        const startTimeString = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`;
        const startTimestamp = `${dateString} ${startTimeString}`;
        
        console.log(`Start timestamp (timezone-free): ${startTimestamp}`);

        // 終了時刻を計算
        let endHour = startHour;
        let endMinute = startMinute;
        if (parsedTime.endTime) {
          [endHour, endMinute] = parsedTime.endTime.split(':').map(Number);
        } else {
          // 終了時刻が指定されていない場合は1時間後
          endHour = startHour + 1;
          if (endHour >= 24) {
            endHour = 23;
            endMinute = 59;
          }
        }

        const endTimeString = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`;
        const endTimestamp = `${dateString} ${endTimeString}`;

        console.log(`Individual pattern (timezone-free): ${startTimestamp} - ${endTimestamp}`);

        individualPatterns.push({
          start_time: startTimestamp,
          end_time: endTimestamp,
          date: dateString
        });
      } else {
        console.log(`Skipping vote - Date recognized: ${parsedDate.isDateRecognized}, Time recognized: ${parsedTime.isTimeRecognized}`);
      }
    }

    // 文字列時刻を分に変換するヘルパー関数
    const timeStringToMinutes = (timeString: string): number => {
      if (!timeString || typeof timeString !== 'string') {
        console.warn('Invalid timeString in learning:', timeString);
        return 0;
      }
      
      // PostgreSQLのTIMESTAMP形式の場合: "2024-12-25T09:00:00" または "2024-12-25 09:00:00"
      let timePart: string;
      if (timeString.includes('T')) {
        // ISO形式の場合
        timePart = timeString.split('T')[1].split('.')[0]; // "09:00:00"
      } else if (timeString.includes(' ')) {
        // スペース区切りの場合
        timePart = timeString.split(' ')[1]; // "09:00:00"
      } else {
        // 時刻のみの場合
        timePart = timeString; // "09:00:00"
      }
      
      if (!timePart) {
        console.warn('Could not extract time part from:', timeString);
        return 0;
      }
      
      const [hours, minutes] = timePart.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        console.warn('Invalid time format:', timePart);
        return 0;
      }
      
      return hours * 60 + minutes;
    };

    // 分を文字列時刻に変換するヘルパー関数
    const minutesToTimeString = (minutes: number, dateString: string): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${dateString} ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
    };

    if (individualPatterns.length === 0) {
      return; // 抽出できたパターンがない場合は終了
    }

    // 3. 同じ日付の時間帯を時系列でソートして連続する時間帯を結合
    const newPatterns: { start_time: string; end_time: string }[] = [];
    
    // 日付別にグループ化
    const patternsByDate = individualPatterns.reduce((acc, pattern) => {
      if (!acc[pattern.date]) {
        acc[pattern.date] = [];
      }
      acc[pattern.date].push(pattern);
      return acc;
    }, {} as Record<string, typeof individualPatterns>);

    // 各日付について連続する時間帯を結合
    for (const [date, patterns] of Object.entries(patternsByDate)) {
      // 開始時刻でソート（文字列比較で十分）
      patterns.sort((a, b) => a.start_time.localeCompare(b.start_time));
      
      console.log(`Processing date ${date} with ${patterns.length} patterns:`, patterns.map(p => `${p.start_time} - ${p.end_time}`));

      let mergedStartTime = patterns[0].start_time;
      let mergedEndTime = patterns[0].end_time;

      for (let i = 1; i < patterns.length; i++) {
        const currentStartTime = patterns[i].start_time;
        const currentEndTime = patterns[i].end_time;

        // 時刻を分に変換して比較
        const mergedEndMinutes = timeStringToMinutes(mergedEndTime);
        const currentStartMinutes = timeStringToMinutes(currentStartTime);

        // 前の時間帯の終了時刻と現在の開始時刻が連続しているかチェック
        if (currentStartMinutes <= mergedEndMinutes) {
          // 連続している場合は終了時刻を延長
          const currentEndMinutes = timeStringToMinutes(currentEndTime);
          const newEndMinutes = Math.max(mergedEndMinutes, currentEndMinutes);
          mergedEndTime = minutesToTimeString(newEndMinutes, date);
          console.log(`Merged continuous pattern: ${mergedStartTime} - ${mergedEndTime}`);
        } else {
          // 連続していない場合は現在の結合パターンを保存して新しい結合パターンを開始
          newPatterns.push({
            start_time: mergedStartTime,
            end_time: mergedEndTime
          });
          console.log(`Saved merged pattern: ${mergedStartTime} - ${mergedEndTime}`);
          
          mergedStartTime = currentStartTime;
          mergedEndTime = currentEndTime;
        }
      }

      // 最後の結合パターンを保存
      newPatterns.push({
        start_time: mergedStartTime,
        end_time: mergedEndTime
      });
      console.log(`Final merged pattern for ${date}: ${mergedStartTime} - ${mergedEndTime}`);
    }

    console.log(`Created ${newPatterns.length} merged patterns from ${individualPatterns.length} individual patterns`);

    if (newPatterns.length === 0) {
      return; // 結合できたパターンがない場合は終了
    }

    // 4. 既存パターンとの分割・統合処理（高度な時間帯管理）
    const duplicateIds: string[] = [];
    const finalPatterns: { start_time: string; end_time: string }[] = [];

    // 4.1. 各日付について、新規パターンと既存パターンの関係を分析
    const dateGroups = new Map<string, {
      newPatterns: typeof newPatterns,
      existingPatterns: typeof existingPatterns
    }>();

    // 新規パターンを日付別にグループ化
    for (const newPattern of newPatterns) {
      const dateString = newPattern.start_time.includes('T') ? 
        newPattern.start_time.split('T')[0] : 
        newPattern.start_time.split(' ')[0];
      
      if (!dateGroups.has(dateString)) {
        dateGroups.set(dateString, { newPatterns: [], existingPatterns: [] });
      }
      dateGroups.get(dateString)!.newPatterns.push(newPattern);
    }

    // 既存パターンを日付別にグループ化
    for (const existingPattern of existingPatterns) {
      const dateString = existingPattern.start_time.includes('T') ? 
        existingPattern.start_time.split('T')[0] : 
        existingPattern.start_time.split(' ')[0];
      
      if (!dateGroups.has(dateString)) {
        dateGroups.set(dateString, { newPatterns: [], existingPatterns: [] });
      }
      dateGroups.get(dateString)!.existingPatterns.push(existingPattern);
    }

    // 4.2. 各日付について時間帯の分割・統合処理を実行
    for (const [dateString, { newPatterns: dayNewPatterns, existingPatterns: dayExistingPatterns }] of dateGroups) {
      console.log(`\n🔍 Processing date ${dateString}: ${dayNewPatterns.length} new patterns, ${dayExistingPatterns.length} existing patterns`);
      console.log(`New patterns:`, dayNewPatterns.map(p => `${p.start_time} - ${p.end_time}`));
      console.log(`Existing patterns:`, dayExistingPatterns.map(p => `${p.start_time} - ${p.end_time} (ID: ${p.id})`));

      if (dayNewPatterns.length === 0) {
        // 新規パターンがない場合は既存パターンをそのまま保持
        finalPatterns.push(...dayExistingPatterns);
        continue;
      }

      // 新規パターンがある場合：スマートな統合・分割処理
      
      // 4.3. 新規パターンから連続する時間範囲を作成
      const newTimeRanges: { start: number; end: number }[] = [];
      for (const pattern of dayNewPatterns) {
        newTimeRanges.push({
          start: timeStringToMinutes(pattern.start_time),
          end: timeStringToMinutes(pattern.end_time)
        });
      }
      
      // 新規パターンをソートして連続性をチェック
      newTimeRanges.sort((a, b) => a.start - b.start);
      console.log(`📊 New time ranges:`, newTimeRanges.map(r => `${r.start}-${r.end}min`));
      
      // 4.4. 新規パターンを連続する範囲にマージ
      const mergedNewRanges: { start: number; end: number }[] = [];
      if (newTimeRanges.length > 0) {
        let currentStart = newTimeRanges[0].start;
        let currentEnd = newTimeRanges[0].end;
        
        for (let i = 1; i < newTimeRanges.length; i++) {
          const range = newTimeRanges[i];
          
          // 隣接または重複している場合は統合
          if (range.start <= currentEnd) {
            currentEnd = Math.max(currentEnd, range.end);
            console.log(`🔗 Merged new ranges: ${currentStart}-${currentEnd}min`);
          } else {
            // 隙間がある場合は分割
            mergedNewRanges.push({ start: currentStart, end: currentEnd });
            console.log(`💾 Saved new range: ${currentStart}-${currentEnd}min`);
            console.log(`⚡ Gap detected: ${currentEnd}min to ${range.start}min (${range.start - currentEnd}min gap)`);
            currentStart = range.start;
            currentEnd = range.end;
          }
        }
        
        mergedNewRanges.push({ start: currentStart, end: currentEnd });
        console.log(`🏁 Final new range: ${currentStart}-${currentEnd}min`);
      }
      
      console.log(`\n📈 Merged new ranges for ${dateString}: ${mergedNewRanges.length}`);
      mergedNewRanges.forEach((range, i) => {
        console.log(`  ${i + 1}. ${range.start}-${range.end}min (${Math.floor(range.start/60)}:${String(range.start%60).padStart(2,'0')}-${Math.floor(range.end/60)}:${String(range.end%60).padStart(2,'0')})`);
      });
      
      // 4.5. 既存パターンを削除対象に追加
      for (const pattern of dayExistingPatterns) {
        duplicateIds.push(pattern.id);
      }
      
      // 4.6. 新規パターンから最終パターンを作成
      for (const range of mergedNewRanges) {
        finalPatterns.push({
          start_time: minutesToTimeString(range.start, dateString),
          end_time: minutesToTimeString(range.end, dateString)
        });
        console.log(`✨ Final pattern for ${dateString}: ${minutesToTimeString(range.start, dateString)} - ${minutesToTimeString(range.end, dateString)}`);
      }
    }

    // 5. 重複するパターンを削除
    if (duplicateIds.length > 0) {
      // 重複を除去
      const uniqueDuplicateIds = [...new Set(duplicateIds)];
      console.log(`\n🗑️ Deleting ${uniqueDuplicateIds.length} duplicate patterns:`, uniqueDuplicateIds);
      
      const { error: deleteError } = await supabase
        .from('user_availability_patterns')
        .delete()
        .in('id', uniqueDuplicateIds);

      if (deleteError) {
        console.warn('❌ Warning: Failed to delete duplicate patterns:', deleteError);
      } else {
        console.log(`✅ Successfully deleted ${uniqueDuplicateIds.length} duplicate patterns`);
      }
    } else {
      console.log(`\n🔍 No duplicate patterns to delete`);
    }

    // 6. 統合されたパターンを登録
    if (finalPatterns.length > 0) {
      const patternsToInsert = finalPatterns.map(pattern => ({
        user_id: userId,
        start_time: pattern.start_time,
        end_time: pattern.end_time
      }));

      console.log(`\n💾 Inserting ${patternsToInsert.length} final patterns:`);
      patternsToInsert.forEach((pattern, i) => {
        console.log(`  ${i + 1}. ${pattern.start_time} - ${pattern.end_time}`);
      });

      const { error: insertError } = await supabase
        .from('user_availability_patterns')
        .insert(patternsToInsert);

      if (insertError) {
        console.warn('❌ Warning: Failed to insert final patterns:', insertError);
      } else {
        console.log(`✅ Successfully learned ${finalPatterns.length} availability patterns for user ${userId}`);
      }
    } else {
      console.log(`\n⚠️ No final patterns to insert`);
    }
  } catch (error) {
    console.warn('Warning: Failed to learn user availability patterns:', error);
    // パターン学習の失敗は投票処理を停止させない
  }
}

// ユーザーの対応可能時間パターンを取得
export async function getUserAvailabilityPatterns(userId: string) {
  try {
    const { data: patterns, error } = await supabase
      .from('user_availability_patterns')
      .select('*')
      .eq('user_id', userId)
      .order('start_time');

    if (error) {
      console.error('Error fetching user availability patterns:', error);
      return { success: false, error: 'Failed to fetch availability patterns' };
    }

    return { success: true, data: patterns || [] };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// ユーザーの対応可能時間パターンに基づいた自動投票提案
export async function suggestVotesBasedOnPatterns(userId: string, eventId: string) {
  try {
    // ユーザーのパターンを取得
    const patternsResult = await getUserAvailabilityPatterns(userId);
    if (!patternsResult.success || !patternsResult.data || patternsResult.data.length === 0) {
      return { success: true, data: [] }; // パターンがない場合は空の提案
    }

    console.log('User patterns for suggestions:', patternsResult.data);
    patternsResult.data.forEach((pattern, index) => {
      console.log(`Pattern ${index}: start="${pattern.start_time}" (type: ${typeof pattern.start_time}), end="${pattern.end_time}" (type: ${typeof pattern.end_time})`);
    });

    // イベントの完全情報を取得
    const eventResult = await getCompleteEventById(eventId);
    if (!eventResult.success || !eventResult.data) {
      return { success: false, error: 'Failed to fetch event data' };
    }

    const { dates, times } = eventResult.data;
    const suggestions: { eventDateId: string; eventTimeId: string; isAvailable: boolean }[] = [];

    // 各日付×時刻の組み合わせについてパターンマッチング
    for (const date of dates) {
      for (const time of times) {
        const parsedDate = parseDateLabel(date.date_label);
        const parsedTime = parseTimeLabel(time.time_label);

        if (parsedDate.isDateRecognized && parsedTime.isTimeRecognized && parsedDate.date && parsedTime.startTime) {
          // タイムゾーンフリーな候補日時の作成
          const [startHour, startMinute] = parsedTime.startTime.split(':').map(Number);
          
          // 日付文字列を作成
          const year = parsedDate.date.getFullYear();
          const month = String(parsedDate.date.getMonth() + 1).padStart(2, '0');
          const day = String(parsedDate.date.getDate()).padStart(2, '0');
          const dateString = `${year}-${month}-${day}`;
          
          // 開始・終了時刻を文字列で作成
          const startTimeString = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`;
          const candidateStartTimestamp = `${dateString} ${startTimeString}`;

          let candidateEndTimestamp: string;
          if (parsedTime.endTime) {
            const [endHour, endMinute] = parsedTime.endTime.split(':').map(Number);
            const endTimeString = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`;
            candidateEndTimestamp = `${dateString} ${endTimeString}`;
          } else {
            const endHour = startHour + 1;
            const endTimeString = `${String(endHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`;
            candidateEndTimestamp = `${dateString} ${endTimeString}`;
          }

          // 文字列時刻を分に変換するヘルパー関数
          const timeStringToMinutes = (timeString: string): number => {
            if (!timeString || typeof timeString !== 'string') {
              console.warn('Invalid timeString:', timeString);
              return 0;
            }
            
            // PostgreSQLのTIMESTAMP形式の場合: "2024-12-25T09:00:00" または "2024-12-25 09:00:00"
            let timePart: string;
            if (timeString.includes('T')) {
              // ISO形式の場合
              timePart = timeString.split('T')[1].split('.')[0]; // "09:00:00"
            } else if (timeString.includes(' ')) {
              // スペース区切りの場合
              timePart = timeString.split(' ')[1]; // "09:00:00"
            } else {
              // 時刻のみの場合
              timePart = timeString; // "09:00:00"
            }
            
            if (!timePart) {
              console.warn('Could not extract time part from:', timeString);
              return 0;
            }
            
            const [hours, minutes] = timePart.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) {
              console.warn('Invalid time format:', timePart);
              return 0;
            }
            
            return hours * 60 + minutes;
          };

          // パターンとマッチするかチェック（文字列ベースの比較）
          const candidateStartMinutes = timeStringToMinutes(candidateStartTimestamp);
          const candidateEndMinutes = timeStringToMinutes(candidateEndTimestamp);
          // 日付抽出の統一化（ISO形式とスペース形式の両方に対応）
          const candidateDateString = candidateStartTimestamp.includes('T') ? 
            candidateStartTimestamp.split('T')[0] : 
            candidateStartTimestamp.split(' ')[0];

          const isAvailable = patternsResult.data.some(pattern => {
            const patternStartMinutes = timeStringToMinutes(pattern.start_time);
            const patternEndMinutes = timeStringToMinutes(pattern.end_time);
            // 日付抽出の統一化（ISO形式とスペース形式の両方に対応）
            const patternDateString = pattern.start_time.includes('T') ? 
              pattern.start_time.split('T')[0] : 
              pattern.start_time.split(' ')[0];

            console.log(`Checking candidate ${candidateDateString} ${candidateStartMinutes}-${candidateEndMinutes} against pattern ${patternDateString} ${patternStartMinutes}-${patternEndMinutes}`);

            // 同じ日付で、候補時間がパターン時間内に含まれるかチェック
            return candidateDateString === patternDateString &&
                   candidateStartMinutes >= patternStartMinutes && 
                   candidateEndMinutes <= patternEndMinutes;
          });

          suggestions.push({
            eventDateId: date.id,
            eventTimeId: time.id,
            isAvailable
          });
        } else {
          // 解析できない場合はデフォルトで利用不可
          suggestions.push({
            eventDateId: date.id,
            eventTimeId: time.id,
            isAvailable: false
          });
        }
      }
    }

    return { success: true, data: suggestions };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}
