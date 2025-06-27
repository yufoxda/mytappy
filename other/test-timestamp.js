// タイムスタンプ生成機能のテスト

// 時間フォーマット関数
const time_format = (time) => {
  const singleTimePattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  const rangeTimePattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])[-~]([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  
  const singleMatch = time.match(singleTimePattern);
  if (singleMatch) {
    const [, hour, minute] = singleMatch;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
  
  const rangeMatch = time.match(rangeTimePattern);
  if (rangeMatch) {
    const [, startHour, startMinute, endHour, endMinute] = rangeMatch;
    const separator = time.includes('-') ? '-' : '~';
    return `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}${separator}${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
  }
  
  return null;
};

// タイムスタンプ生成関数
const createTimestamp = (date, time) => {
  const formattedTime = time_format(time);
  if (!formattedTime) return null;
  
  const singleTime = formattedTime.includes('-') || formattedTime.includes('~') 
    ? formattedTime.split(/[-~]/)[0] 
    : formattedTime;
  
  return `${date} ${singleTime}:00`;
};

// 終了タイムスタンプ生成関数
const createEndTimestamp = (date, time) => {
  const formattedTime = time_format(time);
  if (!formattedTime) return null;
  
  if (formattedTime.includes('-') || formattedTime.includes('~')) {
    const endTime = formattedTime.split(/[-~]/)[1];
    return `${date} ${endTime}:00`;
  } else {
    return null;
  }
};

// テストケース
console.log('=== タイムスタンプ生成テスト ===');

// まず time_format 関数のテスト
console.log('=== time_format 関数のテスト ===');
console.log('09:00 ->', time_format('09:00'));
console.log('09:00-17:00 ->', time_format('09:00-17:00'));
console.log('09:00~17:00 ->', time_format('09:00~17:00'));
console.log('');

// テスト1: 単一時刻
console.log('テスト1 - 単一時刻:');
const test1Start = createTimestamp('2024-01-15', '09:00');
const test1End = createEndTimestamp('2024-01-15', '09:00');
console.log(`開始: ${test1Start}`);
console.log(`終了: ${test1End}`);

// テスト2: 時間範囲（ハイフン）
console.log('テスト2 - 時間範囲:');
const test2Start = createTimestamp('2024-01-15', '09:00-17:00');
const test2End = createEndTimestamp('2024-01-15', '09:00-17:00');
console.log(`開始: ${test2Start}`);
console.log(`終了: ${test2End}`);

// テスト3: 時間範囲（チルダ）
console.log('テスト3 - チルダ区切り:');
const test3Start = createTimestamp('2024-01-15', '09:00~17:00');
const test3End = createEndTimestamp('2024-01-15', '09:00~17:00');
console.log(`開始: ${test3Start}`);
console.log(`終了: ${test3End}`);

// テスト4: 不正な入力
console.log('テスト4 - 不正な入力:');
const test4Start = createTimestamp('2024-01-15', '25:00');
const test4End = createEndTimestamp('2024-01-15', '25:00');
console.log(`開始: ${test4Start}`);
console.log(`終了: ${test4End}`);

// テスト5: 複数日にまたがる（単一時刻）
console.log('テスト5 - 複数日にまたがる:');
const test5Start = createTimestamp('2024-01-15', '09:00');
const test5End = createEndTimestamp('2024-01-15', '09:00');
console.log(`開始: ${test5Start}`);
console.log(`終了: ${test5End}`);
