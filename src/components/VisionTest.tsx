"use client";

import { useState } from "react";

export default function VisionTest() {
  const [result, setResult] = useState<{
    success: boolean;
    faceCount: number;
    faces: Array<{
      id: number;
      joyLikelihood: string;
      sorrowLikelihood: string;
      angerLikelihood: string;
      surpriseLikelihood: string;
      detectionConfidence: number;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");

  // テスト用のサンプル画像（有効なbase64形式の1x1ピクセル画像）
  const sampleImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

  const testVisionAPI = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    setImagePreview(sampleImage);

    try {
      const response = await fetch('/api/vision', {
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

  const formatLikelihood = (likelihood: string) => {
    const likelihoodMap: { [key: string]: string } = {
      'VERY_UNLIKELY': '非常に低い',
      'UNLIKELY': '低い',
      'POSSIBLE': '可能性あり',
      'LIKELY': '高い',
      'VERY_LIKELY': '非常に高い'
    };
    return likelihoodMap[likelihood] || likelihood;
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-black">Google Cloud Vision API テスト</h2>
      
      <button
        onClick={testVisionAPI}
        disabled={loading}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {loading ? "テスト中..." : "Vision API テスト実行"}
      </button>

      {imagePreview && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">テスト画像:</h3>
          <img 
            src={imagePreview} 
            alt="Test" 
            className="border border-gray-300 rounded"
            style={{ width: '100px', height: '100px' }}
          />
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>エラー:</strong> {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <strong>結果:</strong>
          <div className="mt-2">
            {result.faces && result.faces.length > 0 ? (
              <div>
                <p className="font-bold">検出された顔: {result.faces.length}個</p>
                {result.faces.map((face, index: number) => (
                  <div key={index} className="mt-2 p-2 bg-white rounded border">
                    <p><strong>顔 {face.id}:</strong></p>
                    <p>• 喜び: {formatLikelihood(face.joyLikelihood)}</p>
                    <p>• 悲しみ: {formatLikelihood(face.sorrowLikelihood)}</p>
                    <p>• 怒り: {formatLikelihood(face.angerLikelihood)}</p>
                    <p>• 驚き: {formatLikelihood(face.surpriseLikelihood)}</p>
                    <p>• 検出信頼度: {face.detectionConfidence ? (face.detectionConfidence * 100).toFixed(1) + '%' : 'N/A'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>顔が検出されませんでした。</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
