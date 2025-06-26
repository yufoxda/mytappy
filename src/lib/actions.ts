'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { supabase } from './supabase';
import { type NormalizedEventData } from './labelParser';

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
