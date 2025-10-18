"use client";

import { useState } from "react";

export default function TestVisionPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const testVisionAPI = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      // テスト用のサンプル画像（1x1ピクセルの透明PNG）
      const sampleImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

      const response = await fetch('/api/test-vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: sampleImage
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Vision API テスト</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <button
            onClick={testVisionAPI}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "テスト中..." : "Vision API テスト実行"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">❌ エラー</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-green-800 font-semibold mb-2">✅ テスト結果</h3>
              <div className="space-y-2">
                <p><strong>成功:</strong> {result.success ? "はい" : "いいえ"}</p>
                <p><strong>顔検出数:</strong> {result.faceCount}</p>
                {result.debug && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-700 mb-2">デバッグ情報:</h4>
                    <ul className="text-sm space-y-1">
                      <li>画像長: {result.debug.imageLength}</li>
                      <li>クリーン画像長: {result.debug.cleanImageLength}</li>
                      <li>Client Email設定: {result.debug.hasClientEmail ? "あり" : "なし"}</li>
                      <li>Private Key設定: {result.debug.hasPrivateKey ? "あり" : "なし"}</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {result.faces && result.faces.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-blue-800 font-semibold mb-2">検出された顔</h3>
                <div className="space-y-2">
                  {result.faces.map((face: any, index: number) => (
                    <div key={index} className="text-sm">
                      <p><strong>顔 {face.id}:</strong></p>
                      <p>検出信頼度: {face.detectionConfidence}</p>
                      <p>喜び度: {face.joyLikelihood}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-gray-800 font-semibold mb-2">詳細レスポンス</h3>
              <pre className="text-xs overflow-auto bg-white p-3 rounded border">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
