"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLandmarks } from "@/components/useLandmarks";
import { FaceDiagnosisResult } from "@/components/FaceDiagnosisResult";
import { FaceSaggingResult } from "@/components/FaceSaggingResult";

/**
 * 顔診断＋たるみ診断 共通ページ
 * - 同一画像・ランドマークデータを用いて診断を切替
 * - 各診断APIは独立（/api/compare, /api/face/compare）
 */
// 型定義
type FaceDiagnosisResult = {
  success: boolean;
  diff?: {
    measurements?: {
      faceWidth?: { before: number; after: number; change: number; unit: string };
      faceHeight?: { before: number; after: number; change: number; unit: string };
      eyeDistance?: { before: number; after: number; change: number; unit: string };
      lowerFaceRatio?: { before: number; after: number; change: number; changePercent?: number; unit: string };
    };
  };
  message?: string;
};

type FaceSaggingResult = {
  before: { MCD: number; JLA: number; CDI: number; CDI_L: number; CDI_R: number; JWR: number };
  after: { MCD: number; JLA: number; CDI: number; CDI_L: number; CDI_R: number; JWR: number };
  delta: {
    ΔMCD: number;
    ΔJLA: number;
    ΔCDI: number;
    ΔJWR: number;
    改善率_CDI: number;
    改善率_JLA: number;
    改善率_MCD?: number;
    改善率_JWR?: number;
  };
  score: number;
};

export default function FaceDiagnosisPage() {
  const [loading, setLoading] = useState(false);
  const [faceResult, setFaceResult] = useState<FaceDiagnosisResult | null>(null);
  const [saggingResult, setSaggingResult] = useState<FaceSaggingResult | null>(null);
  const { landmarks, images, uploadImage, loading: landmarksLoading } =
    useLandmarks();

  // 顔診断（汎用）- base64画像を送信
  async function handleFaceDiagnosis() {
    if (!images.before || !images.after) {
      alert("Before画像とAfter画像の両方をアップロードしてください");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          before: images.before,
          after: images.after,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setFaceResult(data);
    } catch (error) {
      console.error("Face diagnosis error:", error);
      alert("顔診断に失敗しました: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  // たるみ診断 - 画像を送信（API内で自動補正とランドマーク取得を実行）
  async function handleSaggingDiagnosis() {
    if (!images.before || !images.after) {
      alert("Before画像とAfter画像の両方をアップロードしてください");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/face/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          before: images.before,
          after: images.after,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setSaggingResult(data);
    } catch (error) {
      console.error("Sagging diagnosis error:", error);
      alert("たるみ診断に失敗しました: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-center mb-6">顔診断AI</h1>
      <p className="text-sm text-gray-600 text-center mb-8">
        一枚の画像から複数の診断（顔診断・たるみ診断）を行います。
      </p>

      {/* 画像アップロード */}
      <div className="mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold mb-2 text-gray-700 text-sm">Before画像</p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => uploadImage(e, "before")}
              disabled={landmarksLoading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
            {landmarks.before && (
              <p className="text-xs text-green-600 mt-1">✓ ランドマーク取得完了</p>
            )}
          </div>
          <div>
            <p className="font-semibold mb-2 text-gray-700 text-sm">After画像</p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => uploadImage(e, "after")}
              disabled={landmarksLoading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
            {landmarks.after && (
              <p className="text-xs text-green-600 mt-1">✓ ランドマーク取得完了</p>
            )}
          </div>
        </div>
        {landmarksLoading && (
          <p className="text-xs text-gray-500 text-center mt-2">ランドマーク取得中...</p>
        )}
      </div>

      <Tabs defaultValue="face" className="w-full">
        <TabsList className="flex justify-center mb-4">
          <TabsTrigger value="face">顔診断</TabsTrigger>
          <TabsTrigger value="sagging">たるみ診断</TabsTrigger>
        </TabsList>

        {/* 顔診断タブ */}
        <TabsContent value="face">
          <div className="flex flex-col items-center gap-4">
            <Button
              disabled={loading || !images.before || !images.after}
              onClick={handleFaceDiagnosis}
            >
              {loading ? "診断中..." : "顔診断を実行"}
            </Button>
            {faceResult && <FaceDiagnosisResult data={faceResult} />}
          </div>
        </TabsContent>

        {/* たるみ診断タブ */}
        <TabsContent value="sagging">
          <div className="flex flex-col items-center gap-4">
            <Button
              disabled={loading || !images.before || !images.after}
              onClick={handleSaggingDiagnosis}
            >
              {loading ? "診断中..." : "たるみ診断を実行"}
            </Button>
            {saggingResult && <FaceSaggingResult data={saggingResult} />}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

