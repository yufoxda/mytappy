'use client';
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function RegisterPage() {
  const { id } = useParams();
  const router = useRouter();
  const [schedule, setSchedule] = useState<any>(null);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<boolean[][]>([]);
  const [loading, setLoading] = useState(false);

useEffect(() => {
  if (!id) return;
  fetch(`/api/schedules/${id}`)
    .then(res => res.json())
    .then((data) => {
      if (data) {
        setSchedule(data);
        // 行と列の初期化を明示的に行う
        const initialSelected = [];
        for (let i = 0; i < data.cols.length; i++) {
          initialSelected[i] = Array(data.rows.length).fill(false);
        }
        console.log('初期化された選択状態:', initialSelected);
        setSelected(initialSelected);
      }
    });
}, [id]);

  // 行:時刻, 列:日付
const handleSelect = (rowIndex: number, colIndex: number) => {
  console.log(`選択: 行=${rowIndex}, 列=${colIndex}`);
  setSelected(prev => {
    const newSelected = prev.map(row => [...row]);
    newSelected[rowIndex][colIndex] = !newSelected[rowIndex][colIndex];
    console.log('更新後の状態:', newSelected);
    return newSelected;
  });
};

  const handleSubmit = async () => {
    setLoading(true);
    const newEntry = {
        user: name,
        selected,
    };

    try {
        const res = await fetch(`/api/schedules/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(newEntry),
            headers: { 'Content-Type': 'application/json' }
        });

        if (res.ok) {
            router.push(`/${id}`);
        } else {
            alert('登録に失敗しました');
        }
    } catch (error) {
        console.error('An error occurred:', error);
        alert('エラーが発生しました。');
    } finally {
        setLoading(false);
    }
  };

  if (!schedule) return <div>読み込み中...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
        <h2 className="text-2xl font-bold mb-4">{schedule.title} に予定を登録</h2>
        <div className="mb-4">
            <label className="block mb-1 font-semibold">名前</label>
            <input 
                className="border rounded px-3 py-2 w-full max-w-xs"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="名前を入力"
            />
        </div>

        <p className="mb-2">参加可能な時間を選択してください</p>
        <div className="overflow-x-auto">
            <table className="border-collapse border w-full">
                <thead>
                    <tr>
                        <th className="border"></th>
                        {schedule.rows.map((row: string, i: number) => (
                            <th key={i} className="border">{row}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {schedule.cols.map((col: string, i: number) => (
                        <tr key={i}>
                            <th className="">{col}</th>
                            {schedule.rows.map((_: string, j: number) => (
                                <td key={`${i}-${j}`} className="text-center">
                                   <button
  type="button"
  onClick={() => handleSelect(i, j)}
  className={`w-full h-10 rounded p-2 ${
    selected && selected[i] && selected[i][j] === true
      ? "bg-blue-500 text-white" 
      : "bg-white hover:bg-gray-100 border border-gray-300"
  }`}
>
  {selected && selected[i] && selected[i][j] === true ? '◯' : '×'}
</button>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
            {loading ? "登録中..." : "登録"}
        </button>
    </div>
  )
}