'use client';
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCompleteEventById, createOrGetUser, addVotes, suggestVotesBasedOnPatterns, linkAuthUserToAppUser } from '@/lib/actions';
import { useAuth } from '@/contexts/AuthProvider';

export default function RegisterPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(); // 認証状態を取得
  const [eventData, setEventData] = useState<any>(null);
  const [name, setName] = useState('');
  const [selections, setSelections] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false); // 重複セットアップ防止

  useEffect(() => {
    if (!id) return;
    
    const fetchEvent = async () => {
      try {
        const result = await getCompleteEventById(id as string);
        
        if (result.success && result.data) {
          setEventData(result.data);
        } else {
          console.error(result.error);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchEvent();
  }, [id]);

  useEffect(() => {
    // ユーザーがログインしている場合、名前を自動入力し、過去の投票パターンを取得
    if (user && user.id && !authLoading && !isSetupComplete) {
      console.log('Setting up authenticated user:', user.id);
      
      // Keycloakユーザーの表示名を取得（fallbackでemailを使用）
      const displayName = user.user_metadata?.full_name || user.email || 'ログインユーザー';
      setName(displayName);

      const setupAuthenticatedUser = async () => {
        try {
          setIsSetupComplete(true); // 重複実行を防止
          
          // 認証ユーザーとアプリユーザーを紐付け
          const linkResult = await linkAuthUserToAppUser(user.id, displayName);
          
          if (linkResult.success && linkResult.data) {
            setCurrentUserId(linkResult.data.id);
            
            // 過去のパターンに基づく自動提案を取得
            const suggestionResult = await suggestVotesBasedOnPatterns(linkResult.data.id, id as string);
            
            if (suggestionResult.success && suggestionResult.data && suggestionResult.data.length > 0) {
              // 提案データを selections に適用
              const newSelections: { [key: string]: boolean } = {};
              suggestionResult.data.forEach(suggestion => {
                const key = `${suggestion.eventDateId}-${suggestion.eventTimeId}`;
                newSelections[key] = suggestion.isAvailable;
              });
              
              setSelections(newSelections);
              setHasSuggestions(true);
            } else {
              setHasSuggestions(false);
            }
          }
        } catch (error) {
          console.error('Error setting up authenticated user:', error);
          setHasSuggestions(false);
          setIsSetupComplete(false); // エラー時はリセット
        }
      };

      setupAuthenticatedUser();
    }
  }, [user, authLoading, id, isSetupComplete]);

  // 名前変更時の処理（認証ユーザーと非認証ユーザーの両方に対応）
  const handleNameChange = async (newName: string) => {
    setName(newName);
    
    if (newName.trim().length === 0) {
      setCurrentUserId(null);
      setHasSuggestions(false);
      return;
    }

    try {
      if (user && user.id) {
        // ログインユーザーの場合：表示名を更新
        const linkResult = await linkAuthUserToAppUser(user.id, newName.trim());
        
        if (linkResult.success && linkResult.data) {
          setCurrentUserId(linkResult.data.id);
          
          // 過去のパターンに基づく自動提案を取得
          const suggestionResult = await suggestVotesBasedOnPatterns(linkResult.data.id, id as string);
          
          if (suggestionResult.success && suggestionResult.data && suggestionResult.data.length > 0) {
            const newSelections: { [key: string]: boolean } = {};
            suggestionResult.data.forEach(suggestion => {
              const key = `${suggestion.eventDateId}-${suggestion.eventTimeId}`;
              newSelections[key] = suggestion.isAvailable;
            });
            
            setSelections(newSelections);
            setHasSuggestions(true);
          } else {
            setHasSuggestions(false);
          }
        }
      } else {
        // 非ログインユーザーの場合：従来の処理
        const userResult = await createOrGetUser(newName.trim());
        
        if (userResult.success && userResult.data) {
          setCurrentUserId(userResult.data.id);
          
          // 過去のパターンに基づく自動提案を取得
          const suggestionResult = await suggestVotesBasedOnPatterns(userResult.data.id, id as string);
          
          if (suggestionResult.success && suggestionResult.data && suggestionResult.data.length > 0) {
            const newSelections: { [key: string]: boolean } = {};
            suggestionResult.data.forEach(suggestion => {
              const key = `${suggestion.eventDateId}-${suggestion.eventTimeId}`;
              newSelections[key] = suggestion.isAvailable;
            });
            
            setSelections(newSelections);
            setHasSuggestions(true);
          } else {
            setHasSuggestions(false);
          }
        }
      }
    } catch (error) {
      console.error('Error updating user name:', error);
      setHasSuggestions(false);
    }
  };

  // テーブル形式のデータを構築する関数
  const buildTableData = () => {
    if (!eventData?.dates || !eventData?.times) return { dates: [], times: [] };
    
    const dates = eventData.dates.sort((a: any, b: any) => a.column_order - b.column_order);
    const times = eventData.times.sort((a: any, b: any) => a.row_order - b.row_order);
    
    return { dates, times };
  };

  const { dates, times } = buildTableData();

  const handleCellClick = (dateId: string, timeId: string) => {
    const key = `${dateId}-${timeId}`;
    setSelections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('名前を入力してください。');
      return;
    }

    setLoading(true);
    
    try {
      let userId = currentUserId;
      
      if (user && user.id) {
        // ログインユーザーの場合：必ず最新の表示名でリンクを更新
        const linkResult = await linkAuthUserToAppUser(user.id, name.trim());
        
        if (!linkResult.success) {
          alert(`ユーザー情報の更新に失敗しました: ${linkResult.error}`);
          return;
        }
        
        userId = linkResult.data.id;
      } else if (!userId) {
        // 非ログインユーザーで、まだユーザーIDが取得されていない場合
        const userResult = await createOrGetUser(name.trim());
        
        if (!userResult.success) {
          alert(`ユーザー登録に失敗しました: ${userResult.error}`);
          return;
        }
        
        userId = userResult.data.id;
      }

      // 投票データを準備
      const votes: { eventDateId: string; eventTimeId: string; isAvailable: boolean }[] = [];
      
      dates.forEach((date: any) => {
        times.forEach((time: any) => {
          const key = `${date.id}-${time.id}`;
          votes.push({
            eventDateId: date.id,
            eventTimeId: time.id,
            isAvailable: selections[key] || false
          });
        });
      });

      // 投票を登録（パターン学習も自動実行される）
      const result = await addVotes(id as string, userId!, votes);

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

  if (!eventData) return <div className="max-w-4xl mx-auto py-8 px-4">読み込み中...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h2 className="text-2xl font-bold mb-4">{eventData.event?.title || 'イベント'} に予定を登録</h2>
      {eventData.event?.description && (
        <p className="mb-6 text-gray-600">{eventData.event.description}</p>
      )}
      
      <div className="mb-6">
        <label className="block mb-2 font-semibold">名前</label>
        <input 
          className="border rounded px-3 py-2 w-full max-w-xs"
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          placeholder="名前を入力"
        />
        {user && user.id && (
          <p className="mt-2 text-sm text-blue-600">
            🔒 ログイン中 - 表示名を変更できます（データベース上の関係は保持されます）
          </p>
        )}
        {hasSuggestions && (
          <p className="mt-2 text-sm text-green-600">
            ✨ {user && user.id ? 'ログイン' : '過去の投票'}パターンから自動で選択肢を設定しました。必要に応じて調整してください。
          </p>
        )}
      </div>

      {dates.length > 0 && times.length > 0 ? (
        <>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">参加可能な日程・時間を選択してください</h3>
            <p className="text-sm text-gray-600 mb-4">緑色のセルをクリックして参加可能な時間帯を選択してください</p>
          </div>

          <div className="overflow-x-auto mb-6">
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
                      const key = `${date.id}-${time.id}`;
                      const isSelected = selections[key] || false;
                      
                      return (
                        <td 
                          key={key}
                          className="border border-gray-300 px-2 py-1 text-center cursor-pointer hover:bg-gray-100"
                          style={{
                            background: isSelected ? "#4caf50" : "#f5f5f5",
                            color: isSelected ? "white" : "black"
                          }}
                          onClick={() => handleCellClick(date.id, time.id)}
                        >
                          {isSelected ? "○" : "－"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-6 text-sm text-gray-600">
            <p>• 緑色（○）: 参加可能</p>
            <p>• グレー（－）: 参加不可</p>
          </div>
        </>
      ) : (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg text-center text-gray-500">
          まだ日程や時間が設定されていません
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !name.trim() || (dates.length > 0 && times.length > 0 && Object.keys(selections).length === 0)}
        className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
      >
        {loading ? "登録中..." : "登録"}
      </button>
    </div>
  );
}