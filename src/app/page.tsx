'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-blue-700 mb-6 border-b pb-2">たぴぷら</h1>
      <h2 className="text-xl font-semibold mb-4">tappy++</h2>
      <p className="mb-4">このアプリは、日程調整を簡単に行うためのツールです。</p>
        <button
          className="mx-auto bg-blue-600 text-white px-4 py-2 my-80 rounded hover:bg-blue-700"
          onClick={() => window.location.href = '/create'}        
        >
          新規予定作成
        </button>
      <h1 className="text-2xl font-bold mb-4">使い方</h1>
      <ul className="list-disc pl-6 space-y-2">
        <li>新規予定を作成するには、上の「新規予定作成」ボタンをクリックします。</li>
        <li>予定を作成すると、参加者が日程を選択できるようになります。</li>
        <li>参加者は、予定の詳細ページから自分の名前と選択した日程を登録できます。</li>
        <li>登録後、予定の確認ページで参加者の一覧と日程ごとの参加人数を確認できます。</li>
        <li>このアプリは、Next.jsとTypeScriptを使用して開発されています。</li>
        <li>ソースコードはGitHubで公開されています。</li>
        <li>フィードバックやバグ報告は、GitHubのIssuesで受け付けています。</li>
      </ul>
    </div>
  );
}