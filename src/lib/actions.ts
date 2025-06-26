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
    // 対応可能な時間のみフィルタリング
    const availableVotes = votes.filter(vote => vote.isAvailable);
    
    if (availableVotes.length === 0) {
      return; // 対応可能な時間がない場合は学習しない
    }

    // 1. 既存のユーザーパターンを取得
    const existingPatternsResult = await getUserAvailabilityPatterns(userId);
    const existingPatterns = existingPatternsResult.success && existingPatternsResult.data ? 
      existingPatternsResult.data : [];

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
      const timePart = timeString.split(' ')[1]; // "YYYY-MM-DD HH:mm:ss" から "HH:mm:ss" を取得
      const [hours, minutes] = timePart.split(':').map(Number);
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

        // 前の時間帯の終了時刻と現在の時間帯の開始時刻が連続しているかチェック
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

    // 4. 既存パターンとの重複検出と統合処理
    const duplicateIds: string[] = [];
    const mergedPatterns: { start_time: string; end_time: string }[] = [];

    for (const newPattern of newPatterns) {
      const newStartMinutes = timeStringToMinutes(newPattern.start_time);
      const newEndMinutes = timeStringToMinutes(newPattern.end_time);
      const newDateString = newPattern.start_time.split(' ')[0];
      
      let foundOverlap = false;
      
      // 既存パターンとの重複チェック
      for (const existing of existingPatterns) {
        const existingStartMinutes = timeStringToMinutes(existing.start_time);
        const existingEndMinutes = timeStringToMinutes(existing.end_time);
        const existingDateString = existing.start_time.split(' ')[0];
        
        // 同じ日付かチェック
        if (newDateString !== existingDateString) {
          continue;
        }
        
        // 時間重複判定（重複または隣接している場合）
        const isOverlapping = (
          newStartMinutes <= existingEndMinutes && newEndMinutes >= existingStartMinutes
        ) || (
          // 隣接している場合も統合対象とする（60分以内の差）
          Math.abs(newEndMinutes - existingStartMinutes) <= 60 ||
          Math.abs(existingEndMinutes - newStartMinutes) <= 60
        );
        
        if (isOverlapping) {
          foundOverlap = true;
          duplicateIds.push(existing.id);
          
          // 統合された時間範囲を計算
          const mergedStartMinutes = Math.min(newStartMinutes, existingStartMinutes);
          const mergedEndMinutes = Math.max(newEndMinutes, existingEndMinutes);
          
          mergedPatterns.push({
            start_time: minutesToTimeString(mergedStartMinutes, newDateString),
            end_time: minutesToTimeString(mergedEndMinutes, newDateString)
          });
          break; // 1つでも重複が見つかったら統合処理
        }
      }
      
      // 重複がない場合は新規パターンとして追加
      if (!foundOverlap) {
        mergedPatterns.push(newPattern);
      }
    }

    // 5. 重複するパターンを削除
    if (duplicateIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('user_availability_patterns')
        .delete()
        .in('id', duplicateIds);

      if (deleteError) {
        console.warn('Warning: Failed to delete duplicate patterns:', deleteError);
      }
    }

    // 6. 統合されたパターンを登録
    if (mergedPatterns.length > 0) {
      const patternsToInsert = mergedPatterns.map(pattern => ({
        user_id: userId,
        start_time: pattern.start_time,
        end_time: pattern.end_time
      }));

      const { error: insertError } = await supabase
        .from('user_availability_patterns')
        .insert(patternsToInsert);

      if (insertError) {
        console.warn('Warning: Failed to insert merged patterns:', insertError);
      } else {
        console.log(`Successfully learned ${mergedPatterns.length} availability patterns for user ${userId}`);
      }
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
          // 候補日時のTIMESTAMP作成
          const [startHour, startMinute] = parsedTime.startTime.split(':').map(Number);
          const candidateStart = new Date(parsedDate.date);
          candidateStart.setHours(startHour, startMinute, 0, 0);

          let candidateEnd = new Date(candidateStart);
          if (parsedTime.endTime) {
            const [endHour, endMinute] = parsedTime.endTime.split(':').map(Number);
            candidateEnd.setHours(endHour, endMinute, 0, 0);
          } else {
            candidateEnd.setHours(startHour + 1, startMinute, 0, 0); // デフォルト1時間
          }

          // パターンとマッチするかチェック
          const isAvailable = patternsResult.data.some(pattern => {
            const patternStart = new Date(pattern.start_time);
            const patternEnd = new Date(pattern.end_time);

            // 時間の重複チェック（候補時間がパターン時間内に含まれるか）
            return candidateStart >= patternStart && candidateEnd <= patternEnd;
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
