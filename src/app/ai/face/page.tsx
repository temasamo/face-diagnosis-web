"use client";

import { useState } from "react";
import FaceCamera from "@/components/FaceCamera";
import BeforeAfterCompare from "@/components/BeforeAfterCompare";

export default function FaceDiagnosisPage() {
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [step, setStep] = useState<"before" | "after" | "compare">("before");
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleCapture = async (image: string) => {
    if (step === "before") {
      setBeforeImage(image);
      setStep("after");
    } else if (step === "after") {
      setAfterImage(image);
      setStep("compare");
      
      // After撮影後、自動的に分析を開始
      if (beforeImage) {
        await analyzeImages(beforeImage, image);
      }
    }
  };

  const analyzeImages = async (before: string, after: string) => {
    setIsAnalyzing(true);
    setAnalysisResult("");

    try {
      // 新しい比較APIを使用
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          before: before,
          after: after
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      if (data.success) {
        // AI診断コメントを表示
        setAnalysisResult(data.comment);
      } else {
        setAnalysisResult(data.message || '分析に失敗しました');
      }
    } catch (error) {
      setAnalysisResult(`エラー: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetProcess = () => {
    setBeforeImage(null);
    setAfterImage(null);
    setStep("before");
    setAnalysisResult("");
    setIsAnalyzing(false);
  };

  return (
    <main className="text-center p-8">
      <h1 className="text-3xl font-bold mb-6">AI顔診断（Before / After 比較）</h1>

      {step !== "compare" && (
        <>
          <p className="mb-6 text-lg">
            {step === "before" ? "施術前の顔を撮影してください" : "施術後の顔を撮影してください"}
          </p>
          <FaceCamera onCapture={handleCapture} />
        </>
      )}

      {step === "compare" && beforeImage && afterImage && (
        <div className="space-y-6">
          <BeforeAfterCompare before={beforeImage} after={afterImage} />
          
          {isAnalyzing && (
            <div className="max-w-2xl mx-auto p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
              <p>AI分析中...</p>
            </div>
          )}

          {analysisResult && (
            <div className="max-w-2xl mx-auto p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              <h3 className="font-bold mb-2">診断結果:</h3>
              <p className="whitespace-pre-wrap">{analysisResult}</p>
            </div>
          )}

          <button
            onClick={resetProcess}
            className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            最初からやり直す
          </button>
        </div>
      )}
    </main>
  );
}
