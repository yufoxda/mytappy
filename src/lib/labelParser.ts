// Next.js用のラベル解析とtime_slot自動生成機能

/**
 * ラベルを解析して構造化データを抽出する
 */
export interface ParsedLabelData {
  // 日付ラベル解析結果
  date?: Date;
  isDateRecognized: boolean;
  
  // 時刻ラベル解析結果
  startTime?: string; // "HH:MM"形式
  endTime?: string;   // "HH:MM"形式
  location?: string;  // 場所情報
  isTimeRecognized: boolean;        
}

/**
 * 新しい正規化設計用の型定義
 */
export interface EventDateData {
  date_label: string;
  col_order: number;
}

export interface EventTimeData {
  time_label: string;
  row_order: number;
}

export interface NormalizedEventData {
  dates: EventDateData[];
  times: EventTimeData[];
}

/**
 * 日付ラベルを解析
 * "12/25", "12-25", "1225", "クリスマス" など様々な形式に対応
 */
export function parseDateLabel(label: string): Pick<ParsedLabelData, 'date' | 'isDateRecognized'> {
  const currentYear = new Date().getFullYear();
  
  // パターン1: "12/25", "12-25", "12.25"
  const datePattern1 = /^(\d{1,2})[\/\-\.](\d{1,2})$/;
  const match1 = label.match(datePattern1);
  if (match1) {
    const month = parseInt(match1[1], 10);
    const day = parseInt(match1[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        date: new Date(currentYear, month - 1, day),
        isDateRecognized: true
      };
    }
  }
  
  // パターン2: "2024/12/25", "2024-12-25"
  const datePattern2 = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
  const match2 = label.match(datePattern2);
  if (match2) {
    const year = parseInt(match2[1], 10);
    const month = parseInt(match2[2], 10);
    const day = parseInt(match2[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        date: new Date(year, month - 1, day),
        isDateRecognized: true
      };
    }
  }
  
  // パターン3: "1225" (MMDD)
  const datePattern3 = /^(\d{2})(\d{2})$/;
  const match3 = label.match(datePattern3);
  if (match3) {
    const month = parseInt(match3[1], 10);
    const day = parseInt(match3[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        date: new Date(currentYear, month - 1, day),
        isDateRecognized: true
      };
    }
  }
  
  return { isDateRecognized: false };
}

/**
 * 時刻ラベルを解析
 * "18:00~渋谷1", "20:15~渋谷2", "22:45~明大前3", "10:00-12:00" など
 */
export function parseTimeLabel(label: string): Pick<ParsedLabelData, 'startTime' | 'endTime' | 'location' | 'isTimeRecognized'> {
  // パターン1: "18:00~渋谷1" (時刻~場所)
  const timeLocationPattern = /^(\d{1,2}):(\d{2})~(.+)$/;
  const match1 = label.match(timeLocationPattern);
  if (match1) {
    const hour = parseInt(match1[1], 10);
    const minute = parseInt(match1[2], 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return {
        startTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        location: match1[3],
        isTimeRecognized: true
      };
    }
  }
  
  // パターン2: "10:00-12:00" (時刻範囲)
  const timeRangePattern = /^(\d{1,2}):(\d{2})[-~](\d{1,2}):(\d{2})$/;
  const match2 = label.match(timeRangePattern);
  if (match2) {
    const startHour = parseInt(match2[1], 10);
    const startMinute = parseInt(match2[2], 10);
    const endHour = parseInt(match2[3], 10);
    const endMinute = parseInt(match2[4], 10);
    
    if (startHour >= 0 && startHour <= 23 && startMinute >= 0 && startMinute <= 59 &&
        endHour >= 0 && endHour <= 23 && endMinute >= 0 && endMinute <= 59) {
      return {
        startTime: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
        endTime: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
        isTimeRecognized: true
      };
    }
  }
  
  // パターン3: "18:00" (単一時刻)
  const singleTimePattern = /^(\d{1,2}):(\d{2})$/;
  const match3 = label.match(singleTimePattern);
  if (match3) {
    const hour = parseInt(match3[1], 10);
    const minute = parseInt(match3[2], 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return {
        startTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        isTimeRecognized: true
      };
    }
  }
  
  return { isTimeRecognized: false };
}

/**
 * 表形式データからtime_slotレコードを生成
 */
export interface TimeSlotInput {
  eventId: string;
  dateLabels: string[]; // ["12/25", "12/26", "第1回目"]
  timeLabels: string[]; // ["18:00~渋谷1", "20:15~渋谷2", "会議室A"]
}

export interface TimeSlotRecord {
  event_id: string;
  date_label: string;
  time_label: string;
  parsed_date: string | null;
  parsed_start_time: string | null;
  parsed_end_time: string | null;
  parsed_location: string | null;
  row_order: number;
  col_order: number;
  is_date_recognized: boolean;
  is_time_recognized: boolean;
}

export function generateTimeSlots(input: TimeSlotInput): TimeSlotRecord[] {
  const timeSlots: TimeSlotRecord[] = [];
  
  input.timeLabels.forEach((timeLabel, rowIndex) => {
    input.dateLabels.forEach((dateLabel, colIndex) => {
      const parsedDate = parseDateLabel(dateLabel);
      const parsedTime = parseTimeLabel(timeLabel);
      
      const timeSlot = {
        event_id: input.eventId,
        date_label: dateLabel,
        time_label: timeLabel,
        parsed_date: parsedDate.date?.toISOString().split('T')[0] || null,
        parsed_start_time: parsedTime.startTime || null,
        parsed_end_time: parsedTime.endTime || null,
        parsed_location: parsedTime.location || null,
        row_order: rowIndex,
        col_order: colIndex,
        is_date_recognized: parsedDate.isDateRecognized,
        is_time_recognized: parsedTime.isTimeRecognized
      };
      
      timeSlots.push(timeSlot);
    });
  });
  
  return timeSlots;
}

/**
 * 表形式の候補からtime_slotデータを自動生成（UI統合用）
 */
export interface TableSlotData {
  date_label: string;
  time_label: string;
  row_order: number;
  col_order: number;
}

export interface UITableInput {
  dates: string[];    // 列ヘッダー（日付ラベル）
  times: string[];    // 行ヘッダー（時刻ラベル）
}

/**
 * UI入力から表形式データを生成
 */
export function generateTimeSlotsFromUI(input: UITableInput): TableSlotData[] {
  const slots: TableSlotData[] = [];
  
  input.dates.forEach((dateLabel, colIndex) => {
    input.times.forEach((timeLabel, rowIndex) => {
      slots.push({
        date_label: dateLabel.trim(),
        time_label: timeLabel.trim(),
        row_order: rowIndex,
        col_order: colIndex
      });
    });
  });
  
  return slots;
}

/**
 * UI入力から正規化されたイベントデータを生成
 */
export function generateNormalizedEventData(input: UITableInput): NormalizedEventData {
  const dates: EventDateData[] = input.dates.map((dateLabel, index) => ({
    date_label: dateLabel.trim(),
    col_order: index
  }));

  const times: EventTimeData[] = input.times.map((timeLabel, index) => ({
    time_label: timeLabel.trim(),
    row_order: index
  }));

  return { dates, times };
}

/**
 * 表形式データを時系列順に自動ソート
 */
export function sortTableSlots(slots: TableSlotData[]): TableSlotData[] {
  return slots.sort((a, b) => {
    // 日付の認識・解析結果で並び替え
    const dateA = parseDateLabel(a.date_label);
    const dateB = parseDateLabel(b.date_label);
    
    if (dateA.isDateRecognized && dateB.isDateRecognized && dateA.date && dateB.date) {
      const dateDiff = dateA.date.getTime() - dateB.date.getTime();
      if (dateDiff !== 0) return dateDiff;
    }
    
    // 時刻の認識・解析結果で並び替え
    const timeA = parseTimeLabel(a.time_label);
    const timeB = parseTimeLabel(b.time_label);
    
    if (timeA.isTimeRecognized && timeB.isTimeRecognized && timeA.startTime && timeB.startTime) {
      return timeA.startTime.localeCompare(timeB.startTime);
    }
    
    // どちらも認識できない場合は元の順序を維持
    return a.col_order - b.col_order || a.row_order - b.row_order;
  });
}

/**
 * 類似の時刻パターンを検出して自動入力候補を生成
 */
export function suggestTimeSlots(existingTimes: string[], newDate: string): string[] {
  const suggestions: string[] = [];
  
  existingTimes.forEach(timeLabel => {
    const parsed = parseTimeLabel(timeLabel);
    if (parsed.isTimeRecognized && parsed.startTime) {
      // 同じ時刻パターンを提案
      if (parsed.location) {
        suggestions.push(`${parsed.startTime}~${parsed.location}`);
      } else {
        suggestions.push(parsed.startTime);
      }
    }
  });
  
  return [...new Set(suggestions)]; // 重複除去
}

/**
 * ユーザーの過去投票パターンから可用性を予測
 */
export interface UserPattern {
  start_time: string;
  end_time: string;
  day_of_week: number;
}

export function predictAvailability(
  timeSlot: TableSlotData, 
  userPatterns: UserPattern[]
): boolean | null {
  const dateInfo = parseDateLabel(timeSlot.date_label);
  const timeInfo = parseTimeLabel(timeSlot.time_label);
  
  if (!dateInfo.isDateRecognized || !timeInfo.isTimeRecognized || 
      !dateInfo.date || !timeInfo.startTime) {
    return null; // 予測不可
  }
  
  const dayOfWeek = dateInfo.date.getDay();
  const slotTime = timeInfo.startTime;
  
  // マッチするパターンを検索
  for (const pattern of userPatterns) {
    if (pattern.day_of_week === dayOfWeek) {
      const startTime = pattern.start_time;
      const endTime = pattern.end_time;
      
      if (slotTime >= startTime && slotTime <= endTime) {
        return true; // 可能
      }
    }
  }
  
  return false; // 不可能
}

/**
 * 表形式データのバリデーション
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTableSlots(slots: TableSlotData[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 空のラベルチェック
  slots.forEach((slot, index) => {
    if (!slot.date_label.trim()) {
      errors.push(`スロット${index + 1}: 日付ラベルが空です`);
    }
    if (!slot.time_label.trim()) {
      errors.push(`スロット${index + 1}: 時刻ラベルが空です`);
    }
  });
  
  // 重複チェック
  const positions = new Set<string>();
  slots.forEach((slot, index) => {
    const key = `${slot.row_order}-${slot.col_order}`;
    if (positions.has(key)) {
      errors.push(`スロット${index + 1}: 位置(${slot.row_order}, ${slot.col_order})が重複しています`);
    }
    positions.add(key);
  });
  
  // 日付・時刻認識の警告
  let unrecognizedDates = 0;
  let unrecognizedTimes = 0;
  
  slots.forEach(slot => {
    const dateInfo = parseDateLabel(slot.date_label);
    const timeInfo = parseTimeLabel(slot.time_label);
    
    if (!dateInfo.isDateRecognized) unrecognizedDates++;
    if (!timeInfo.isTimeRecognized) unrecognizedTimes++;
  });
  
  if (unrecognizedDates > 0) {
    warnings.push(`${unrecognizedDates}個の日付ラベルが自動認識できませんでした`);
  }
  if (unrecognizedTimes > 0) {
    warnings.push(`${unrecognizedTimes}個の時刻ラベルが自動認識できませんでした`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 使用例
 */
export function exampleUsage() {
  const input: TimeSlotInput = {
    eventId: "some-uuid",
    dateLabels: ["12/5", "12/6", "12/7", "12/8", "12/9", "12/10", "12/11", "12/12", "12/13", "12/14", "12/15"],
    timeLabels: ["18:00~渋谷1", "20:15~渋谷2", "22:45~明大前3"]
  };
  
  const timeSlots = generateTimeSlots(input);
  
  // 画像のような表を生成
  console.log("生成された time_slot データ:");
  timeSlots.forEach(slot => {
    console.log(`${slot.date_label} x ${slot.time_label} = 
      日付認識: ${slot.is_date_recognized} (${slot.parsed_date})
      時刻認識: ${slot.is_time_recognized} (${slot.parsed_start_time})
      場所: ${slot.parsed_location}`);
  });
  
  return timeSlots;
}
