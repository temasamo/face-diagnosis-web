"use client";

import { useState } from "react";
import Image from "next/image";

export default function ComparePage() {
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    diff?: any;
    comment?: string;
    faceCount?: { before: number; after: number };
    message?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (file: File, type: 'before' | 'after') => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'before') {
        setBefore(reader.result as string);
      } else {
        setAfter(reader.result as string);
      }
      setResult(null); // 新しい画像をアップロードしたら結果をクリア
    };
    reader.readAsDataURL(file);
  };

  const handleCompare = async () => {
    if (!before || !after) {
      alert("Before画像とAfter画像の両方をアップロードしてください。");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ before, after }),
      });
      
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: "通信エラーが発生しました。"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setBefore(null);
    setAfter(null);
    setResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto text-center p-6">
      <h1 className="text-3xl font-bold mb-6">✨ AI顔診断（Before / After 比較）</h1>
      
      {/* 画像アップロードセクション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Before画像 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">📸 Before（施術前）</h2>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'before');
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {before && (
            <div className="relative">
              <Image 
                src={before} 
                alt="Before" 
                width={300}
                height={300}
                className="w-full h-64 object-cover rounded-lg border-2 border-blue-200"
              />
              <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-sm font-medium">
                Before
              </div>
            </div>
          )}
        </div>

        {/* After画像 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">📸 After（施術後）</h2>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'after');
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
          {after && (
            <div className="relative">
              <Image 
                src={after} 
                alt="After" 
                width={300}
                height={300}
                className="w-full h-64 object-cover rounded-lg border-2 border-green-200"
              />
              <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-sm font-medium">
                After
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 分析ボタン */}
      <div className="mb-8">
        <button 
          onClick={handleCompare}
          disabled={!before || !after || loading}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-8 rounded-full text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {loading ? "🤖 AI分析中..." : "✨ AIで診断する"}
        </button>
        
        {(before || after) && (
          <button 
            onClick={resetAll}
            className="ml-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-full transition-all duration-200"
          >
            🔄 リセット
          </button>
        )}
      </div>

      {/* 結果表示 */}
      {result && (
        <div className="space-y-6">
          {result.success ? (
            <>
              {/* AI診断コメント */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border border-green-200 shadow-lg">
                <h2 className="font-bold text-xl mb-4 text-green-800">✨ AI診断コメント</h2>
                <p className="text-lg leading-relaxed text-gray-800 bg-white p-4 rounded-lg shadow-sm">
                  {result.comment}
                </p>
              </div>

              {/* 詳細データ */}
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h3 className="font-bold text-lg mb-4 text-gray-700">📊 詳細分析データ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-blue-600">表情の変化</h4>
                    <ul className="space-y-1">
                      <li>喜び: {result.diff?.joy}</li>
                      <li>怒り: {result.diff?.anger}</li>
                      <li>悲しみ: {result.diff?.sorrow}</li>
                      <li>驚き: {result.diff?.surprise}</li>
                    </ul>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-green-600">顔の角度変化</h4>
                    <ul className="space-y-1">
                      <li>左右: {result.diff?.headTilt}度</li>
                      <li>回転: {result.diff?.roll}度</li>
                      <li>上下: {result.diff?.tilt}度</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 text-center text-sm text-gray-600">
                  顔検出数: Before {result.faceCount?.before}件 / After {result.faceCount?.after}件
                </div>
              </div>
            </>
          ) : (
            /* エラー表示 */
            <div className="bg-red-50 p-6 rounded-xl border border-red-200">
              <h2 className="font-bold text-xl mb-2 text-red-800">❌ エラー</h2>
              <p className="text-red-700">{result.message}</p>
            </div>
          )}
        </div>
      )}

      {/* 使い方説明 */}
      <div className="mt-12 bg-blue-50 p-6 rounded-xl border border-blue-200">
        <h3 className="font-bold text-lg mb-3 text-blue-800">📋 使い方</h3>
        <ol className="text-left text-blue-700 space-y-2">
          <li>1. 「Before」と「After」の画像をそれぞれアップロードしてください</li>
          <li>2. 「AIで診断する」ボタンをクリックしてください</li>
          <li>3. AIが表情や顔の角度の変化を分析し、自然なコメントを生成します</li>
          <li>4. 詳細な分析データも確認できます</li>
        </ol>
      </div>
    </div>
  );
}
