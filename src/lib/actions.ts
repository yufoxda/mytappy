'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// スケジュール作成のServer Action
export async function createSchedule(scheduleData: any) {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .insert([scheduleData])
      .select();
    
    if (error) {
      console.error('Error creating schedule:', error);
      return { success: false, error: 'Failed to create schedule' };
    }
    
    // キャッシュを無効化してデータを再取得
    revalidatePath('/');
    
    return { success: true, data };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// 全スケジュール取得のServer Action
export async function getSchedules() {
  try {
    const { data: schedules, error } = await supabase
      .from('schedules')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching schedules:', error);
      return { success: false, error: 'Failed to fetch schedules' };
    }
    
    return { success: true, data: schedules || [] };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// 特定のスケジュール取得のServer Action
export async function getScheduleById(id: string) {
  try {
    const { data: schedule, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return { success: false, error: 'Schedule not found' };
      }
      console.error('Error fetching schedule:', error);
      return { success: false, error: 'Failed to fetch schedule' };
    }
    
    return { success: true, data: schedule };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// スケジュール更新のServer Action
export async function updateSchedule(id: string, scheduleData: any) {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .update(scheduleData)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Error updating schedule:', error);
      return { success: false, error: 'Failed to update schedule' };
    }
    
    if (!data || data.length === 0) {
      return { success: false, error: 'Schedule not found' };
    }
    
    // キャッシュを無効化
    revalidatePath('/');
    revalidatePath(`/${id}`);
    
    return { success: true, data };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// エントリ追加のServer Action
export async function addEntryToSchedule(id: string, newEntry: any) {
  try {
    // まず現在のスケジュールを取得
    const { data: schedule, error: fetchError } = await supabase
      .from('schedules')
      .select('entries')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return { success: false, error: 'Schedule not found' };
      }
      console.error('Error fetching schedule:', fetchError);
      return { success: false, error: 'Failed to fetch schedule' };
    }
    
    // 既存のentriesに新しいエントリを追加
    const updatedEntries = [...(schedule.entries || []), newEntry];
    
    // entriesを更新
    const { error: updateError } = await supabase
      .from('schedules')
      .update({ entries: updatedEntries })
      .eq('id', id);
    
    if (updateError) {
      console.error('Error updating entries:', updateError);
      return { success: false, error: 'Failed to add entry' };
    }
    
    // キャッシュを無効化
    revalidatePath(`/${id}`);
    
    return { success: true, message: 'Entry added successfully' };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}
