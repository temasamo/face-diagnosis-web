"use client";

import { useState } from "react";

export default function ApiTest() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // テスト用のサンプル画像（有効なbase64形式の1x1ピクセル画像）
  const sampleBeforeImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const sampleAfterImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

  const testApi = async () => {
    setLoading(true);
    setError("");
    setResult("");

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          before: sampleBeforeImage,
          after: sampleAfterImage,
          mode: 'vision'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-black">API テスト</h2>
      
      <button
        onClick={testApi}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {loading ? "分析中..." : "API テスト実行"}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>エラー:</strong> {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <strong>結果:</strong>
          <p className="mt-2 whitespace-pre-wrap">{result}</p>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <p><strong>テストURL:</strong> http://localhost:3001/api/analyze</p>
        <p><strong>注意:</strong> このテストはサンプル画像を使用しています。実際の顔画像でのテストには、カメラ機能を使用してください。</p>
      </div>
    </div>
  );
}
