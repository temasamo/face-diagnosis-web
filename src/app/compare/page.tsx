"use client";

import { useState } from "react";

export default function ComparePage() {
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    diff?: {
      joy: string;
      anger: string;
      sorrow: string;
      surprise: string;
      headTilt: number;
      roll: number;
      tilt: number;
      detectionConfidence: {
        before: number;
        after: number;
      };
    };
    comment?: string;
    faceCount?: { before: number; after: number };
    message?: string;
  } | null>(null);

  const handleCompare = async () => {
    if (!before || !after) return alert("BeforeとAfterの両方を選択してください。");
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
    } catch {
      setResult({
        success: false,
        message: "通信エラーが発生しました。"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto text-center p-6">
      <h1 className="text-2xl font-bold mb-4">Before / After AI診断</h1>
      <p className="text-gray-600 mb-6">
        2枚の写真をアップロードすると、AIが顔の印象変化を分析します。
      </p>

      {/* 画像アップロード */}
      <div className="flex flex-col sm:flex-row justify-center gap-6 mb-6">
        <div className="flex flex-col items-center">
          <p className="font-semibold mb-2 text-gray-700">Before</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => setBefore(reader.result as string);
                reader.readAsDataURL(file);
              }
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {before && (
            <img
              src={before}
              alt="Before"
              className="mt-3 w-56 h-56 object-cover rounded-lg shadow-md border"
            />
          )}
        </div>

        <div className="flex flex-col items-center">
          <p className="font-semibold mb-2 text-gray-700">After</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => setAfter(reader.result as string);
                reader.readAsDataURL(file);
              }
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
          {after && (
            <img
              src={after}
              alt="After"
              className="mt-3 w-56 h-56 object-cover rounded-lg shadow-md border"
            />
          )}
        </div>
      </div>

      {/* ボタン */}
      <button
        onClick={handleCompare}
        disabled={loading}
        className={`px-6 py-2 rounded-lg text-white font-semibold ${
          loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {loading ? "診断中..." : "AIで分析する"}
      </button>

      {/* 結果表示 */}
      {result && result.success && (
        <div className="mt-8 text-left bg-green-50 p-5 rounded-lg shadow-sm">
          <h2 className="text-lg font-bold text-green-800 mb-3">✨ AI診断コメント</h2>
          <p className="text-gray-800 leading-relaxed">{result.comment}</p>

          <div className="mt-4 text-sm text-gray-500">
            <details>
              <summary className="cursor-pointer">解析データを表示</summary>
              <pre className="bg-white mt-2 p-2 rounded text-xs overflow-x-auto">
                {JSON.stringify(result.diff, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}

      {/* エラーメッセージ */}
      {result && !result.success && (
        <div className="mt-6 bg-red-50 text-red-700 p-4 rounded">
          {result.message || "顔が検出されませんでした。"}
        </div>
      )}
    </div>
  );
}
