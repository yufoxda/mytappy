'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthProvider";
import Navigation from "@/components/Navigation";

export default function Home() {
  const { user, loading } = useAuth();

  // デバッグ用：ユーザー情報をコンソールに出力
  useEffect(() => {
    if (user) {
      console.log('Current user:', user);
      console.log('User metadata:', user.user_metadata);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-3xl mx-auto py-8 px-4">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-6 bg-gray-200 rounded mb-6"></div>
              <div className="h-16 bg-gray-100 rounded mb-6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h1 className="text-3xl font-bold text-blue-700 mb-2">たぴぷら</h1>
          <h2 className="text-xl font-semibold text-gray-600 mb-6">tappy++ - Keycloak認証対応版</h2>
          
          {user ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-700 font-semibold">
                    {(user.user_metadata?.name || user.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-green-800 font-semibold">
                    {user.user_metadata?.name || user.user_metadata?.full_name || 'ユーザー'}さん、ようこそ！
                  </p>
                  <p className="text-green-600 text-sm">{user.email}</p>
                  <p className="text-green-600 text-xs">
                    認証済みユーザーとして全機能をご利用いただけます。
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <p className="text-yellow-800">
                現在ゲストモードでご利用中です。
                <a href="/auth/login" className="underline font-semibold ml-1">ログイン</a>
                すると、投票履歴の保存や個人設定が利用できます。
              </p>
            </div>
          )}
          
          <p className="text-gray-700 mb-6">
            このアプリは、Keycloak認証を使用したセキュアな日程調整ツールです。
          </p>
          
          <div className="text-center">
            <button
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              onClick={() => window.location.href = '/create'}        
            >
              新規予定作成
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">使い方</h1>
          <ul className="list-disc pl-6 space-y-3 text-gray-700">
            <li>新規予定を作成するには、上の「新規予定作成」ボタンをクリックします。</li>
            <li>予定を作成すると、参加者が日程を選択できるようになります。</li>
            <li>参加者は、予定の詳細ページから自分の名前と選択した日程を登録できます。</li>
            <li>登録後、予定の確認ページで参加者の一覧と日程ごとの参加人数を確認できます。</li>
            <li><strong>認証済みユーザー</strong>は、投票パターンの学習機能と自動提案機能が利用できます。</li>
            <li>このアプリは、Next.js、TypeScript、Supabase、Keycloakを使用して開発されています。</li>
          </ul>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="font-semibold text-blue-900 mb-2">🔐 セキュリティ機能</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Keycloak認証による安全なログイン</li>
              <li>• ユーザー固有のデータ管理</li>
              <li>• 投票履歴の自動学習</li>
              <li>• パーソナライズされた予定提案</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}