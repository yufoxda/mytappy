'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from 'uuid';

export default function CreateSchedule() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    const id = uuidv4();
    const newSchedule = {
      id,
      title,
      start,
      end,
      rows: ["1", "2", "3", "4", "5"],
      cols: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      entries: []
    };
    const res = await fetch('/api/schedules', {
      method: 'POST',
      body: JSON.stringify(newSchedule),
      headers: { 'Content-Type': 'application/json' }
    });
    setLoading(false);
    if (res.ok) {
      router.push('/');
    } else {
      alert('保存に失敗しました');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
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
              <input className="border rounded px-3 py-2" type="password" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
          </div>
          <div className="mb-4 flex-1">
            <label className="block mb-1">イベントの詳細</label>
            <textarea className="w-full border rounded px-3 py-2" rows={4} value={title} onChange={e => setTitle(e.target.value)} />
          </div>
        </div>
        <div className="flex space-x-4 mb-6">
          <div className="mb-4 flex-1">
            <label className="block mb-1">開始日</label>
            <input className="w-full border rounded px-3 py-2" type="date" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div className="mb-4 flex-1">
            <label className="block mb-1">終了日</label>
            <input className="w-full border rounded px-3 py-2" type="date" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
        
        </div>
        <div className="flex space-x-4 mb-6">
          <div className="mb-4 flex-1">
            <label className="block mb-1">開始時刻</label>
            <input className="w-full border rounded px-3 py-2" type="time" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div className="mb-4 flex-1">
            <label className="block mb-1">終了時刻</label>
            <input className="w-full border rounded px-3 py-2" type="time" value={end} onChange={e => setEnd(e.target.value)} />
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
              {["1", "2", "3", "4", "5"].map((row, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">
                    <input
                      className="w-full border rounded px-2 py-1"
                      type="text"
                      value={row}
                      onChange={(e) => {
                        // Handle row name change if needed
                      }}
                    /></td>
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
              {["1", "2", "3", "4", "5"].map((row, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">
                    <input
                      className="w-full border rounded px-2 py-1"
                      type="text"
                      value={row}
                      onChange={(e) => {
                        // Handle row name change if needed
                      }}
                    /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        
        </div>
      
        <button
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? "保存中..." : "作成"}
        </button>

      </div>
    </div>
  );
}