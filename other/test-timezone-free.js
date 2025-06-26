// タイムゾーンを無視した時刻処理のテスト

// 修正前（Date + toISOString）の問題を再現
console.log('=== 修正前の問題（Dateオブジェクト使用）===');
const testDate = new Date(2024, 11, 25); // 2024年12月25日（月は0から始まる）
console.log('Base date:', testDate);
testDate.setHours(18, 30, 0, 0);
console.log('After setHours(18, 30):', testDate.toISOString());
console.log('ローカル時刻:', testDate.toLocaleString());

// 修正後（文字列ベース）のアプローチ
console.log('\n=== 修正後（文字列ベース）===');
const year = testDate.getFullYear();
const month = String(testDate.getMonth() + 1).padStart(2, '0');
const day = String(testDate.getDate()).padStart(2, '0');
const dateString = `${year}-${month}-${day}`;

const hour = 18;
const minute = 30;
const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
const timezoneFreeTimetamp = `${dateString} ${timeString}`;

console.log('Date string:', dateString);
console.log('Time string:', timeString);
console.log('Timezone-free timestamp:', timezoneFreeTimetamp);

// 時刻計算のテスト
const timeStringToMinutes = (timeString) => {
  const timePart = timeString.split(' ')[1]; // "YYYY-MM-DD HH:mm:ss" から "HH:mm:ss" を取得
  const [hours, minutes] = timePart.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTimeString = (minutes, dateString) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${dateString} ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
};

console.log('\n=== 時刻計算テスト ===');
const timestamp1 = '2024-12-25 18:00:00';
const timestamp2 = '2024-12-25 19:30:00';

const minutes1 = timeStringToMinutes(timestamp1);
const minutes2 = timeStringToMinutes(timestamp2);

console.log(`${timestamp1} -> ${minutes1} minutes`);
console.log(`${timestamp2} -> ${minutes2} minutes`);

const mergedMinutes = Math.max(minutes1, minutes2);
const mergedTimestamp = minutesToTimeString(mergedMinutes, '2024-12-25');

console.log(`Merged: ${mergedTimestamp}`);

// 連続性の判定テスト
console.log('\n=== 連続性判定テスト ===');
const pattern1 = { start: '2024-12-25 18:00:00', end: '2024-12-25 19:00:00' };
const pattern2 = { start: '2024-12-25 19:00:00', end: '2024-12-25 20:00:00' };
const pattern3 = { start: '2024-12-25 21:00:00', end: '2024-12-25 22:00:00' };

const endMinutes1 = timeStringToMinutes(pattern1.end);
const startMinutes2 = timeStringToMinutes(pattern2.start);
const startMinutes3 = timeStringToMinutes(pattern3.start);

console.log(`Pattern1 end: ${endMinutes1}, Pattern2 start: ${startMinutes2} -> Continuous: ${startMinutes2 <= endMinutes1}`);
console.log(`Pattern2 end: ${timeStringToMinutes(pattern2.end)}, Pattern3 start: ${startMinutes3} -> Continuous: ${startMinutes3 <= timeStringToMinutes(pattern2.end)}`);
