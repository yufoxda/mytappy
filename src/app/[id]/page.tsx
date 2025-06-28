'use client';
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCompleteEventById, getEventTableGrid, getEventParticipants } from '@/lib/actions';

export default function ConfirmPage() {
  const { id } = useParams();
  const router = useRouter();
  const [schedule, setSchedule] = useState<any>(null);
  const [tableGrid, setTableGrid] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // イベント基本情報を取得
        const eventResult = await getCompleteEventById(id as string);
        
        if (eventResult.success) {
          setSchedule(eventResult.data);
        } else {
          console.error(eventResult.error);
          return;
        }

        // 投票状況テーブルを取得
        const gridResult = await getEventTableGrid(id as string);
        if (gridResult.success) {
          setTableGrid(gridResult.data || []);
        }

        // 参加者一覧を取得
        const participantsResult = await getEventParticipants(id as string);
        if (participantsResult.success) {
          setParticipants(participantsResult.data || []);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // テーブル形式のデータを構築する関数
  const buildTableData = () => {
    if (!schedule?.dates || !schedule?.times || !tableGrid) return { dates: [], times: [], grid: {} };
    
    const dates = schedule.dates.sort((a: any, b: any) => a.column_order - b.column_order);
    const times = schedule.times.sort((a: any, b: any) => a.row_order - b.row_order);
    
    // gridデータをマッピング
    const grid: { [key: string]: any } = {};
    tableGrid.forEach((item: any) => {
      const key = `${item.row_order}-${item.column_order}`;
      grid[key] = item;
    });
    
    return { dates, times, grid };
  };

  const { dates, times, grid } = buildTableData();

  if (loading) return <div className="max-w-2xl mx-auto py-8 px-4">読み込み中...</div>;
  if (!schedule) return <div className="max-w-2xl mx-auto py-8 px-4">イベントが見つかりません</div>;

  // 参加人数集計（行:時刻, 列:日付）
  // const counts = schedule.cols.map((_: any, i: number) =>
    // schedule.rows.map((_: any, j: number) =>
    //   schedule.entries.reduce(
    //     (acc: number, entry: any) => acc + (entry.selected?.[i]?.[j] ? 1 : 0),
    //     0
    //   )
    // )
  // );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{schedule.event?.title || 'イベント'} の日程確認</h2>
        <button
          onClick={() => router.push(`/${id}/register`)}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 shrink-0"
        >
          予定を登録する
        </button>
      </div>
      <div className="mb-6">
        <strong>期間：</strong>{schedule.event?.title}の日程調整
      </div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">参加者一覧</h3>
        <ul className="bg-gray-50 p-4 rounded-lg">
          {participants.length === 0 && <li>まだ参加者がいません</li>}
          {participants.map((participant: any, idx: number) => (
            <li key={idx} className="py-1 flex items-center">
              <span className="flex-1">
                {participant.users?.name || `ユーザー${participant.user_id}`}
              </span>
              {participant.users?.is_authenticated && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                  ログインユーザー
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">時間帯ごとの参加人数</h3>
        {dates.length === 0 || times.length === 0 ? (
          <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
            まだ日程や時間が設定されていません
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    <th className="border border-gray-300 px-2 py-1 bg-gray-100 text-sm">時間 \\ 日程</th>
                    {dates.map((date: any) => (
                      <th key={date.id} className="border border-gray-300 px-2 py-1 bg-gray-100 text-sm min-w-[80px]">
                        {date.date_label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {times.map((time: any) => (
                    <tr key={time.id}>
                      <td className="border border-gray-300 px-2 py-1 bg-gray-50 text-sm font-medium">
                        {time.time_label}
                      </td>
                      {dates.map((date: any) => {
                        const key = `${time.row_order}-${date.column_order}`;
                        const cellData = grid[key];
                        const availableVotes = cellData?.available_votes || 0;
                        const totalVotes = cellData?.total_votes || 0;
                        
                        return (
                          <td 
                            key={`${time.id}-${date.id}`} 
                            className="border border-gray-300 px-2 py-1 text-center text-sm"
                            style={{
                              background: availableVotes > 0 ? "#e3f2fd" : "#f5f5f5",
                              fontWeight: availableVotes > 0 ? "bold" : "normal"
                            }}
                          >
                            {availableVotes > 0 ? (
                              <div>
                                <div className="text-blue-600 font-bold">{availableVotes}</div>
                                {totalVotes > availableVotes && (
                                  <div className="text-xs text-gray-500">
                                    / {totalVotes}
                                  </div>
                                )}
                              </div>
                            ) : (
                              totalVotes > 0 ? (
                                <div className="text-gray-400">0 / {totalVotes}</div>
                              ) : ""
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>• 青色の数字は「参加可能」な人数を示しています</p>
              <p>• グレーの数字は「参加不可」の人数を示しています</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
