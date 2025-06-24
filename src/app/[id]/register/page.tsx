'use client';
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getEventById, getAvailabilitiesByEventId, addAvailability } from '@/lib/actions';

export default function RegisterPage() {
  const { id } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);

useEffect(() => {
  if (!id) return;
  
  const fetchEvent = async () => {
    try {
      const result = await getEventById(id as string);
      
      if (result.success && result.data) {
        setEvent(result.data);
      } else {
        console.error(result.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  fetchEvent();
}, [id]);
  const handleSubmit = async () => {
    if (!name.trim() || !startDate || !endTime) {
      alert('すべての項目を入力してください。');
      return;
    }

    setLoading(true);
    
    // 名前を簡単なハッシュ値に変換（実際のアプリではユーザーIDを使用）
    const nameHash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const availabilityData = {
      event_id: id as string,
      user_id: Math.abs(nameHash), // 負の値を避けるため絶対値を使用
      start_date: startDate,
      end_time: endTime,
    };

    try {
        const result = await addAvailability(availabilityData);

        if (result.success) {
            router.push(`/${id}`);
        } else {
            alert(`登録に失敗しました: ${result.error}`);
        }
    } catch (error) {
        console.error('An error occurred:', error);
        alert('エラーが発生しました。');
    } finally {
        setLoading(false);
    }
  };

  if (!event) return <div>読み込み中...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
        <h2 className="text-2xl font-bold mb-4">{event.title} に予定を登録</h2>
        {event.description && (
          <p className="mb-6 text-gray-600">{event.description}</p>
        )}
        
        <div className="mb-4">
            <label className="block mb-1 font-semibold">名前</label>
            <input 
                className="border rounded px-3 py-2 w-full max-w-xs"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="名前を入力"
            />
        </div>

        <div className="mb-4">
            <label className="block mb-1 font-semibold">開始日</label>
            <input 
                type="date"
                className="border rounded px-3 py-2 w-full max-w-xs"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
            />
        </div>

        <div className="mb-4">
            <label className="block mb-1 font-semibold">終了時間</label>
            <input 
                type="time"
                className="border rounded px-3 py-2 w-full max-w-xs"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
            />
        </div>

        <button
            onClick={handleSubmit}
            disabled={loading || !name.trim() || !startDate || !endTime}
            className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
            {loading ? "登録中..." : "登録"}
        </button>
    </div>
  );
}