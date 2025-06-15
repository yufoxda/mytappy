'use client';
import { useEffect, useState } from "react";
import { useRouter,notFound } from "next/navigation";

export default function DevPage() {
  const [schedules, setSchedules] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/schedules')
      .then(res => res.json())
      .then(data => setSchedules(data));
  }, []);
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-blue-700 mb-6 border-b pb-2">登録画面</h1>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded mb-6 hover:bg-blue-700"
        onClick={() => router.push('/create')}
      >
        新しい日程を作成
      </button>
      <ul className="space-y-4">
        {schedules.map((s: any) => (
          <li key={s.id} className="flex items-center justify-between border p-4 rounded shadow-sm bg-white">
            <div>
              <span className="font-semibold">{s.title}</span>
              <span className="ml-2 text-gray-500 text-sm">（{s.start}〜{s.end}）</span>
            </div>
            <div>
              <button
                className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                onClick={() => router.push(`/entry/${s.id}`)}
              >
                参加
              </button>
              <button
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 ml-2"
                onClick={() => router.push(`/confirm/${s.id}`)}
              >
                確認
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}