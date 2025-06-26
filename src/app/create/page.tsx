'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from '@/lib/actions';
import { 
  generateNormalizedEventData,
  validateTableSlots, 
  suggestTimeSlots,
  parseDateLabel,
  parseTimeLabel,
  sortTableSlots,
  type UITableInput,
  type NormalizedEventData
} from '@/lib/labelParser';

// ゴミ箱アイコンのSVGコンポーネント
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-trash3" viewBox="0 0 16 16">
    <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm-1.115 1.447L8.5 15h-1l-1.115-11.053zM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m3.5-.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m3.5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Z"/>
  </svg>
);

/**
 * Dateオブジェクトを 'YYYY-MM-DD' 形式の文字列にフォーマットする
 * @param date - フォーマットするDateオブジェクト
 * @returns 'YYYY-MM-DD' 形式の文字列
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CreateSchedule() {
  const router = useRouter();

  // --- Stateの初期化 ---
  const start_day = new Date();
  const end_day = new Date();
  end_day.setDate(start_day.getDate() + 5);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');

  const [startDate, setStartDate] = useState(formatDate(start_day));
  const [endDate, setEndDate] = useState(formatDate(end_day));

  // 初期値は09:00から17:00
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState(['']); // 縦軸：時間
  const [cols, setCols] = useState(['']); // 横軸：日付


  // --- 副作用フック (useEffect) ---
  // 開始日・終了日が変更されたら、横軸（日付リスト）を自動更新する
  useEffect(() => {
    if (!startDate || !endDate) return;// 日付が未入力
    
    const currentDate = new Date(startDate);
    const lastDate = new Date(endDate);
    
    if (currentDate > lastDate) {
      //todo: enddateを赤枠で表示
      return;
    }

    // 日数を計算して一度に配列を作成
    const daysDiff = Math.floor((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (daysDiff < 1) return; // 日数が1日未満の場合は何もしない

    const dates = Array.from({ length: daysDiff }, (_, i) => {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    
    // 空の要素を追加（UI用）
    dates.push('');
    setCols(dates); // 横軸に日付を設定
  }, [startDate, endDate]);

  // 開始時刻・終了時刻が変更されたら、縦軸（時刻リスト）を自動更新する
  useEffect(() => {
    if (!startTime || !endTime) return;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    if (startTotalMinutes > endTotalMinutes) {
      // todo: endtimeを赤枠で表示
      return;
    }
    
    // 時間数を計算して一度に配列を作成（1時間刻み）
    const hoursDiff = Math.floor((endTotalMinutes - startTotalMinutes) / 60) + 1;
    const times = Array.from({ length: hoursDiff }, (_, i) => {
      const totalMinutes = startTotalMinutes + (i * 60);
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    });

    // 空の要素を追加（UI用）
    times.push('');
    setRows(times); // 縦軸に時間を設定
  }, [startTime, endTime]);


  // --- イベントハンドラ ---

  const handleTimeChange = (index: number, value: string) => {
    const newRows = [...rows];
    newRows[index] = value;
    if (index === rows.length - 1 && value.trim() !== '') {
      newRows.push('');
    }
    setRows(newRows);
  };

  const handleDateChange = (index: number, value: string) => {
    const newCols = [...cols];
    newCols[index] = value;
    if (index === cols.length - 1 && value.trim() !== '') {
      newCols.push('');
    }
    setCols(newCols);
  };

  const removeTime = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const removeDate = (index: number) => {
    if (cols.length > 1) {
      setCols(cols.filter((_, i) => i !== index));
    }
  };

  // 時刻候補の自動提案機能
  const getTimeSuggestions = (currentTimes: string[]): string[] => {
    if (currentTimes.length === 0) return [];
    return suggestTimeSlots(currentTimes, '');
  };

  const handleCreate = async () => {
    setLoading(true);
    
    try {
      // 基本情報の検証
      if (!title.trim()) {
        alert('タイトルを入力してください');
        setLoading(false);
        return;
      }

      // 入力データを整理（空文字列を除去）
      const filteredDates = cols.filter(date => date.trim() !== '');
      const filteredTimes = rows.filter(time => time.trim() !== '');

      if (filteredDates.length === 0 || filteredTimes.length === 0) {
        alert('候補日と候補時刻を少なくとも1つずつ入力してください');
        setLoading(false);
        return;
      }

      // 表形式データを生成
      const tableInput: UITableInput = {
        dates: filteredDates,
        times: filteredTimes
      };

      // 正規化されたイベントデータを生成
      const normalizedData = generateNormalizedEventData(tableInput);
      
      // 簡単なバリデーション（空文字列チェック）
      const hasEmptyDates = normalizedData.dates.some(d => !d.date_label.trim());
      const hasEmptyTimes = normalizedData.times.some(t => !t.time_label.trim());
      
      if (hasEmptyDates || hasEmptyTimes) {
        alert('空のラベルがあります。入力を確認してください。');
        setLoading(false);
        return;
      }
      
      // イベント作成処理
      const eventCreateData = {
        title: title.trim(),
        description: description.trim(),
        eventData: normalizedData
      };

      console.log('Creating event with data:', eventCreateData);
      
      // 実際のAPI呼び出し（actions.tsのcreateEventを想定）
      const result = await createEvent(eventCreateData);
      
      if (result.success) {
        router.push(`/${result.eventId}`);
      } else {
        throw new Error(result.error || 'イベントの作成に失敗しました');
      }
      
    } catch (error) {
      console.error('Event creation error:', error);
      alert(`エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="bg-white rounded shadow p-8">
        <h2 className="text-2xl font-bold text-blue-700 mb-6 border-b pb-2">日程を作成</h2>
        <div className="flex content-end space-x-4 mb-6">          
          <div className="flex flex-col content-center flex-1">
            <div className="mb-4 flex-1 text-center">
              <label className="block mb-1">イベント名</label>
              <input className="border rounded px-3 py-2" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="mb-4 flex-1 text-center">
              <label className="block mb-1">編集用パスワード</label>
              <input className="border rounded px-3 py-2" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>
          <div className="mb-4 flex-1">
            <label className="block mb-1">イベントの詳細</label>
            <textarea className="w-full border rounded px-3 py-2" rows={4} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>
        <div className="flex space-x-4 mb-6">
          <div className="mb-4 flex-1">
            <label className="block mb-1">開始日</label>
            <input className="w-full border rounded px-3 py-2" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="mb-4 flex-1">
            <label className="block mb-1">終了日</label>
            <input className="w-full border rounded px-3 py-2" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="flex space-x-4 mb-6">
          <div className="mb-4 flex-1">
            <label className="block mb-1">開始時刻</label>
            <input 
              className="w-full border rounded px-3 py-2"
              type="text" 
              value={startTime} 
              onChange={e => setStartTime(e.target.value)}
              placeholder="例: 09:00 または 09:00-17:00"
            />
            <p className="text-xs text-gray-500 mt-1">時間範囲指定の場合は「09:00-17:00」または「09:00~17:00」の形式</p>
          </div>
          <div className="mb-4 flex-1">
            <label className="block mb-1">終了時刻</label>
            <input 
              className="w-full border rounded px-3 py-2"
              type="text" 
              value={endTime} 
              onChange={e => setEndTime(e.target.value)}
              placeholder="例: 17:00 (省略可能)"
            />
            <p className="text-xs text-gray-500 mt-1">開始時刻で時間範囲を指定した場合は省略可</p>
          </div>
        </div>
        <div className="flex space-x-4 mb-6">
          
          <div className="mt-4 text-sm text-gray-500 flex-1">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="border px-2 py-1">横軸（日付）</th>
                </tr>
              </thead>
              <tbody>
                {cols.map((col, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1 flex items-center">
                      <input
                        className="w-full border rounded px-2 py-1 mr-2"
                        type="text"
                        value={col}
                        onChange={(e) => handleDateChange(i, e.target.value)}
                         placeholder={i === cols.length -1 ? "追加..." : ""}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-sm text-gray-500 flex-1">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="border px-2 py-1">縦軸（時間）</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1 flex items-center">
                      <input
                        className="w-full border rounded px-2 py-1 mr-2"
                        type="text"
                        value={row}
                        onChange={(e) => handleTimeChange(i, e.target.value)}
                        placeholder={i === rows.length -1 ? "追加..." : ""}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p>プレビュー</p>
            {rows.length > 1 && cols.length > 1 ? (
              <table className="border-collapse border w-full"> 
                <thead>
                  <tr>
                    <th className="border px-2 py-1"></th>
                    {cols.slice(0, -1).map((col, i) => (
                      <th key={i} className="border px-2 py-1">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, -1).map((row, i) => (
                    <tr key={i}>
                      <th className="border px-2 py-1">{row}</th>
                      {cols.slice(0, -1).map((col, j) => (
                        <td key={`${i}-${j}`} className="border px-2 py-1"></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500">行と列を追加してください。</p>
            )}
          </div>
        </div>
        <button
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
          onClick={handleCreate}
          disabled={loading || !title.trim()}
        >
          {loading ? "作成中..." : "作成"}
        </button>
      </div>
    </div>
  );
}
