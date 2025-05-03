'use client';
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EntryPage() {
  const { id } = useParams();
  const router = useRouter();
  const [schedule, setSchedule] = useState<any>(null);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<boolean[][]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/schedules')
      .then(res => res.json())
      .then((data) => {
        const found = data.find((s: any) => s.id === id);
        if (found) {
          setSchedule(found);
          setSelected(
            Array(found.rows.length).fill(null).map(() => Array(found.cols.length).fill(false))
          );
        }
      });
  }, [id]);

  const toggleCell = (i: number, j: number) => {
    setSelected(prev =>
      prev.map((row, rowIdx) =>
        row.map((cell, colIdx) =>
          rowIdx === i && colIdx === j ? !cell : cell
        )
      )
    );
  };

  const handleEntry = async () => {
    if (!name) {
      alert('名前を入力してください');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/schedules');
    const schedules = await res.json();
    const idx = schedules.findIndex((s: any) => s.id === id);
    if (idx === -1) {
      alert('日程が見つかりません');
      setLoading(false);
      return;
    }
    schedules[idx].entries.push({ user: name, selected });
    await fetch(`/api/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(schedules[idx]),
      headers: { 'Content-Type': 'application/json' }
    });
    setLoading(false);
    alert('登録しました');
    router.push('/');
  };

  if (!schedule) return <div>読み込み中...</div>;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="bg-white rounded shadow p-8">
        <h2 className="text-2xl font-bold text-blue-700 mb-6 border-b pb-2">{schedule.title} 参加登録</h2>
        <div className="mb-4">
          <label className="block mb-1">名前</label>
          <input className="w-full border rounded px-3 py-2" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="overflow-x-auto mb-4">
          <table>
            <thead>
              <tr>
                <th></th>
                {schedule.cols.map((col: string, j: number) => (
                  <th key={j}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.rows.map((row: string, i: number) => (
                <tr key={i}>
                  <td>{row}</td>
                  {schedule.cols.map((col: string, j: number) => (
                    <td
                      key={j}
                      className={selected[i]?.[j] ? "selected" : ""}
                      onClick={() => toggleCell(i, j)}
                    ></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
          onClick={handleEntry}
          disabled={loading}
        >
          {loading ? "登録中..." : "登録"}
        </button>
      </div>
    </div>
  );
}