'use client';
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ConfirmPage() {
  const { id } = useParams();
  const router = useRouter();
  const [schedule, setSchedule] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/schedules/${id}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Schedule not found');
        }
        return res.json();
      })
      .then((data) => {
        setSchedule(data);
      })
      .catch(err => {
        console.error(err);
        // ここで404ページなどにリダイレクトすることもできます
      });
  }, [id]);

  if (!schedule) return <div>読み込み中...</div>;

  // 参加人数集計（行:時刻, 列:日付）
  const counts = schedule.cols.map((_: any, i: number) =>
    schedule.rows.map((_: any, j: number) =>
      schedule.entries.reduce(
        (acc: number, entry: any) => acc + (entry.selected?.[i]?.[j] ? 1 : 0),
        0
      )
    )
  );

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{schedule.title} の日程確認</h2>
        <button
          onClick={() => router.push(`/${id}/register`)}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 shrink-0"
        >
          予定を登録する
        </button>
      </div>
      <div className="mb-6">
        <strong>期間：</strong>{schedule.start} 〜 {schedule.end}
      </div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">参加者一覧</h3>
        <ul>
          {schedule.entries.length === 0 && <li>まだ参加者がいません</li>}
          {schedule.entries.map((entry: any, idx: number) => (
            <li key={idx}>{entry.user}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">時間帯ごとの参加人数</h3>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th></th>
                {schedule.rows.map((row: string, j: number) => (
                  <th key={j}>{row}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.cols.map((col: string, i: number) => (
                <tr key={i}>
                  <td>{col}</td>
                  {schedule.rows.map((_: string, j: number) => (
                    <td key={j} style={{
                      background: counts[i][j] > 0 ? "#90caf9" : "#f5f5f5",
                      fontWeight: counts[i][j] > 0 ? "bold" : "normal"
                    }}>
                      {counts[i][j] > 0 ? counts[i][j] : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
