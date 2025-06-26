'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { supabase } from './supabase';

// イベント作成のServer Action
export async function createEvent(eventData: { 
  title: string; 
  description?: string; 
  start_timestamp: string | null;
  end_timestamp?: string | null;
}) {
  try {
    const { data, error } = await supabase
      .from('event')
      .insert([eventData])
      .select();
    
    if (error) {
      console.error('Error creating event:', error);
      return { success: false, error: 'Failed to create event' };
    }
    
    // キャッシュを無効化してデータを再取得
    revalidatePath('/');
    
    return { success: true, data };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// 全イベント取得のServer Action
export async function getEvents() {
  try {
    const { data: events, error } = await supabase
      .from('event')
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
      .from('event')
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
