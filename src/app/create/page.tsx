'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from '@/lib/actions';

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
  const today = new Date();
  const fiveDaysLater = new Date();
  fiveDaysLater.setDate(today.getDate() + 5);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [startDate, setStartDate] = useState(formatDate(today));
  const [endDate, setEndDate] = useState(formatDate(fiveDaysLater));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState(['']);
  const [cols, setCols] = useState(['']);

  // --- 副作用フック (useEffect) ---

  // 開始日・終了日が変更されたら、縦の表（日付リスト）を自動更新する
  useEffect(() => {
    if (!startDate || !endDate) return;
    
    const dates = [];
    let currentDate = new Date(startDate);
    const lastDate = new Date(endDate);
    
    if (currentDate > lastDate) return;

    while (currentDate <= lastDate) {
      dates.push(`${currentDate.getMonth() + 1}/${currentDate.getDate()}`);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    dates.push('');
    setRows(dates);
  }, [startDate, endDate]);

  // 開始時刻・終了時刻が変更されたら、横の表（時刻リスト）を自動更新する
  useEffect(() => {
    if (!startTime || !endTime) return;

    const times = [];
    let [currentHour, currentMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const endTotalMinutes = endHour * 60 + endMinute;
    let currentTotalMinutes = currentHour * 60 + currentMinute;
    
    if (currentTotalMinutes > endTotalMinutes) return;

    while(currentTotalMinutes <= endTotalMinutes) {
        times.push(`${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`);
        currentHour++;
        currentTotalMinutes = currentHour * 60 + currentMinute;
    }
    times.push('');
    setCols(times);
  }, [startTime, endTime]);


  // --- イベントハンドラ ---

  const handleRowChange = (index: number, value: string) => {
    const newRows = [...rows];
    newRows[index] = value;
    if (index === rows.length - 1 && value.trim() !== '') {
      newRows.push('');
    }
    setRows(newRows);
  };

  const handleColChange = (index: number, value: string) => {
    const newCols = [...cols];
    newCols[index] = value;
    if (index === cols.length - 1 && value.trim() !== '') {
      newCols.push('');
    }
    setCols(newCols);
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const removeCol = (index: number) => {
    if (cols.length > 1) {
      setCols(cols.filter((_, i) => i !== index));
    }
  };
  const handleCreate = async () => {
    setLoading(true);
    const newEvent = {
      title,
      description,
    };

    try {
      const result = await createEvent(newEvent);

      if (result.success && result.data) {
        // Supabaseから返されたデータからIDを取得
        const createdEventId = result.data[0]?.id;
        if (createdEventId) {
          router.push(`/${createdEventId}`);
        } else {
          alert('イベントの作成に成功しましたが、IDの取得に失敗しました。');
        }
      } else {
        alert(`保存に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('An error occurred:', error);
      alert('エラーが発生しました。');
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
            <input className="w-full border rounded px-3 py-2" type="time" step="3600" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div className="mb-4 flex-1">
            <label className="block mb-1">終了時刻</label>
            <input className="w-full border rounded px-3 py-2" type="time" step="3600" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>
        <div className="flex space-x-4 mb-6">
          <div className="mt-4 text-sm text-gray-500 flex-1">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="border px-2 py-1">縦</th>
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
                        onChange={(e) => handleRowChange(i, e.target.value)}
                        placeholder={i === rows.length -1 ? "追加..." : ""}
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
                  <th className="border px-2 py-1">横</th>
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
                        onChange={(e) => handleColChange(i, e.target.value)}
                         placeholder={i === cols.length -1 ? "追加..." : ""}
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
                    {rows.slice(0, -1).map((row, i) => (
                      <th key={i} className="border px-2 py-1">{row}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cols.slice(0, -1).map((col, i) => (
                    <tr key={i}>
                      <th className="border px-2 py-1">{col}</th>
                      {rows.slice(0, -1).map((row, j) => (
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
