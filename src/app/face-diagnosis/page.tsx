"use client";

import { useState } from "react";
import Image from "next/image";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLandmarks } from "@/components/useLandmarks";
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
    measurements?: {
      faceWidth: {
        before: number;
        after: number;
        change: number;
        unit: string;
      };
      faceHeight: {
        before: number;
        after: number;
        change: number;
        unit: string;
      };
      eyeDistance: {
        before: number;
        after: number;
        change: number;
        unit: string;
      };
      eyebrowToEyeDistance: {
        before: number;
        after: number;
        change: number;
        unit: string;
      };
      faceLiftAngle: {
        before: number;
        after: number;
        change: number;
        unit: string;
      };
      lowerFaceRatio: {
        before: number;
        after: number;
        change: number;
        changePercent?: number;
        unit: string;
      };
    };
    skinAnalysis?: {
      before: {
        skinQuality: {
          brightness: number;
          saturation: number;
          evenness: string;
          tone: string;
        };
        wrinkleVisibility: number;
        estimatedAge: string;
      };
      after: {
        skinQuality: {
          brightness: number;
          saturation: number;
          evenness: string;
          tone: string;
        };
        wrinkleVisibility: number;
        estimatedAge: string;
      };
      improvements: {
        brightness: number;
        saturation: number;
        evenness: boolean;
        tone: boolean;
        wrinkleVisibility: number;
        estimatedAge: boolean;
      };
    };
  };
  comment?: string;
  faceLiftIndex?: number;
  faceCount?: { before: number; after: number };
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
  
  // 比較機能のステート
  const [opacity, setOpacity] = useState(0.5);
  const [aligning, setAligning] = useState(false);
  const [alignedBefore, setAlignedBefore] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'overlay' | 'side-by-side'>('overlay');
  const [alignmentData, setAlignmentData] = useState<{
    success: boolean;
    beforeCenter: { x: number; y: number };
    afterCenter: { x: number; y: number };
    beforeSize: number;
    afterSize: number;
    scaleRatio: number;
    beforeAngles: { roll: number; tilt: number; pan: number };
    afterAngles: { roll: number; tilt: number; pan: number };
    alignment: {
      offsetX: number;
      offsetY: number;
      rotationDiff: number;
      scale: number;
    };
  } | null>(null);

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

  // 顔位置自動補正関数
  const alignFaces = async () => {
    if (!images.before || !images.after) return;
    
    setAligning(true);
    try {
      // 1. Vision APIで顔の位置・角度データを取得
      const alignRes = await fetch("/api/align", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ before: images.before, after: images.after }),
      });
      const alignData = await alignRes.json();
      
      if (!alignData.success) {
        alert("顔の位置補正に失敗しました: " + alignData.message);
        return;
      }
      
      setAlignmentData(alignData);
      
      // 2. CanvasでBefore画像を補正
      if (!images.before || !images.after) return;
      
      const beforeImg = new window.Image();
      const afterImg = new window.Image();
      
      // 画像の読み込みを待つ
      await new Promise<void>((resolve) => {
        beforeImg.onload = () => {
          afterImg.onload = () => resolve();
          afterImg.src = images.after!;
        };
        beforeImg.src = images.before!;
      });
      
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      // CanvasのサイズをAfter画像に合わせる
      const W = afterImg.width;
      const H = afterImg.height;
      canvas.width = W;
      canvas.height = H;
      
      // コンテキストを保存
      ctx.save();
      
      // After画像の中心を基準に変換を適用
      const centerX = W / 2;
      const centerY = H / 2;
      
      // 変換の原点を中心に移動
      ctx.translate(centerX, centerY);
      
      // 回転補正
      ctx.rotate((alignData.alignment.rotationDiff * Math.PI) / 180);
      
      // スケール補正
      ctx.scale(alignData.alignment.scale, alignData.alignment.scale);
      
      // 変換の原点を元に戻す
      ctx.translate(-centerX, -centerY);
      
      // 平行移動補正
      const offsetX = alignData.alignment.offsetX;
      const offsetY = alignData.alignment.offsetY;
      
      // Before画像を補正された位置・角度・サイズで描画
      ctx.drawImage(beforeImg, offsetX, offsetY, W, H);
      
      // コンテキストを復元
      ctx.restore();
      
      setAlignedBefore(canvas.toDataURL("image/jpeg", 0.9)); // 補正済みBefore画像をセット
      
    } catch (error) {
      console.error("Alignment error:", error);
      alert("顔の位置補正中にエラーが発生しました。");
    } finally {
      setAligning(false);
    }
  };

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

      {/* 比較エリア */}
      {images.before && images.after && (
        <div className="mb-8">
          {/* 比較モード切り替えボタン */}
          <div className="mb-6 flex justify-center gap-2 flex-wrap">
            <button
              onClick={() => setComparisonMode('overlay')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                comparisonMode === 'overlay'
                  ? "bg-purple-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              🔄 重ね合わせ比較
            </button>
            <button
              onClick={() => setComparisonMode('side-by-side')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                comparisonMode === 'side-by-side'
                  ? "bg-green-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              ↔️ 横並び比較
            </button>
          </div>

          {/* 顔位置自動補正ボタン（全モード対応） */}
          <div className="mb-4">
            <button
              onClick={alignFaces}
              disabled={aligning}
              className={`px-6 py-2 rounded-lg text-white font-semibold transition-all duration-200 ${
                aligning 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl"
              }`}
            >
              {aligning ? "🔄 顔位置補正中..." : "🎯 顔位置を自動補正"}
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Vision APIで顔の位置・角度・サイズを自動調整します
            </p>
          </div>

          {/* 比較表示エリア */}
          <div className="flex justify-center">
          {comparisonMode === 'overlay' ? (
            // 重ね合わせ比較モード
            <div className="relative inline-block">
              {/* After画像（背景） */}
              <Image
                src={images.after}
                alt="After"
                width={400}
                height={400}
                className="w-[400px] h-[400px] object-cover rounded-lg shadow-lg border-2 border-green-200"
              />
              {/* Before画像（上に半透明で重ねる） */}
              <Image
                src={alignedBefore || images.before}
                alt="Before"
                width={400}
                height={400}
                className="absolute top-0 left-0 w-[400px] h-[400px] object-cover rounded-lg border-2 border-blue-200"
                style={{ opacity }}
              />
              {/* 中央の境界線表示 */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-white shadow-lg"></div>
            </div>
          ) : (
            // 横並び比較モード
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Before画像 */}
              <div className="text-center">
                <div className="mb-3">
                  <span className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold">
                    📸 Before {alignedBefore && <span className="text-xs">(補正済み)</span>}
                  </span>
                </div>
                <div className="relative">
                  <Image
                    src={alignedBefore || images.before}
                    alt="Before"
                    width={400}
                    height={400}
                    className="w-full h-auto rounded-lg shadow-lg border-2 border-blue-200 object-contain"
                  />
                </div>
              </div>
              
              {/* After画像 */}
              <div className="text-center">
                <div className="mb-3">
                  <span className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                    ✨ After
                  </span>
                </div>
                <div className="relative">
                  <Image
                    src={images.after}
                    alt="After"
                    width={400}
                    height={400}
                    className="w-full h-auto rounded-lg shadow-lg border-2 border-green-200 object-contain"
                  />
                </div>
              </div>
            </div>
          )}
          </div>
          
          {/* 半透明度スライダー（重ね合わせモードかつ補正済みでない場合のみ） */}
          {comparisonMode === 'overlay' && !alignedBefore && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <label className="text-sm text-gray-700 font-medium">Beforeの透明度:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-64 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                {Math.round(opacity * 100)}%
              </span>
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-2">
            {comparisonMode === 'overlay' ? (
              alignedBefore 
                ? "✨ 顔の位置・角度・サイズが自動補正されました！微妙な変化がより見やすくなっています。"
                : "💡 スライダーでBefore画像の透明度を調整して、変化を確認できます"
            ) : (
              "💡 横並び比較でBefore/Afterの違いを並べて確認できます"
            )}
          </p>

          {/* 補正データ表示（重ね合わせモードのみ） */}
          {comparisonMode === 'overlay' && alignmentData && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-left">
              <h4 className="font-bold text-blue-800 mb-2">📊 補正データ</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• 移動量: X={alignmentData.alignment.offsetX.toFixed(1)}, Y={alignmentData.alignment.offsetY.toFixed(1)}</p>
                <p>• 回転差: {alignmentData.alignment.rotationDiff.toFixed(1)}°</p>
                <p>• スケール比: {alignmentData.alignment.scale.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>
      )}

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
            
            {/* 美容効果診断結果表示 */}
            {faceResult && faceResult.success && (
              <div className="mt-8 w-full text-left bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-xl shadow-lg border border-pink-200">
                <h2 className="text-xl font-bold text-pink-800 mb-4">✨ 美容効果診断結果</h2>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-gray-800 leading-relaxed text-lg mb-3 whitespace-pre-line">
                    {faceResult.comment}
                  </div>
                  <div className="text-sm text-pink-600 bg-pink-50 p-3 rounded border-l-4 border-pink-300">
                    💡 <strong>美容効果のポイント:</strong> マッサージ、オイル、パック等の施術による肌質改善、リフトアップ効果、シワ・たるみの軽減を分析しています。
                  </div>
                </div>

                {/* 精密数値測定結果 */}
                {faceResult.diff?.measurements && (
                  <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-bold text-blue-800 mb-3">📏 精密数値測定結果</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* 顔の幅 */}
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">顔の幅</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${
                              faceResult.diff.measurements.faceWidth.change < 0 ? 'text-green-600' : 
                              faceResult.diff.measurements.faceWidth.change > 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {faceResult.diff.measurements.faceWidth.change > 0 ? '+' : ''}{faceResult.diff.measurements.faceWidth.change}mm
                            </span>
                            <span className="text-lg">
                              {faceResult.diff.measurements.faceWidth.change < 0 ? '😄' : 
                               faceResult.diff.measurements.faceWidth.change > 0 ? '😢' : '😐'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {faceResult.diff.measurements.faceWidth.before} → {faceResult.diff.measurements.faceWidth.after}
                        </div>
                        {/* 顔の幅の図解 */}
                        <div className="flex justify-center mb-2">
                          <div className="relative w-20 h-24">
                            {/* 顔の輪郭（より詳細） */}
                            <div className="absolute inset-0 border-2 border-gray-500 rounded-full bg-gradient-to-b from-amber-50 to-amber-100"></div>
                            {/* 目 */}
                            <div className="absolute top-7 left-4 w-2 h-1 bg-gray-600 rounded-full"></div>
                            <div className="absolute top-7 right-4 w-2 h-1 bg-gray-600 rounded-full"></div>
                            {/* 鼻 */}
                            <div className="absolute top-9 left-1/2 w-1 h-1 bg-gray-500 rounded-full transform -translate-x-0.5"></div>
                            {/* 口 */}
                            <div className="absolute top-11 left-1/2 w-2 h-0.5 bg-gray-600 rounded-full transform -translate-x-1"></div>
                            {/* 水平の矢印（顔の幅） */}
                            <div className="absolute top-1/2 left-1 right-1 h-1 bg-blue-600 rounded-full"></div>
                            <div className="absolute top-1/2 left-0 w-2 h-2 bg-blue-600 rounded-full transform -translate-y-1"></div>
                            <div className="absolute top-1/2 right-0 w-2 h-2 bg-blue-600 rounded-full transform -translate-y-1"></div>
                          </div>
                        </div>
                        <div className="text-xs text-center text-blue-600 font-medium">左右の目の中心間</div>
                      </div>

                      {/* 顔の長さ */}
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">顔の長さ</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${
                              faceResult.diff.measurements.faceHeight.change < 0 ? 'text-green-600' : 
                              faceResult.diff.measurements.faceHeight.change > 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {faceResult.diff.measurements.faceHeight.change > 0 ? '+' : ''}{faceResult.diff.measurements.faceHeight.change}mm
                            </span>
                            <span className="text-lg">
                              {faceResult.diff.measurements.faceHeight.change < 0 ? '😄' : 
                               faceResult.diff.measurements.faceHeight.change > 0 ? '😢' : '😐'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {faceResult.diff.measurements.faceHeight.before} → {faceResult.diff.measurements.faceHeight.after}
                        </div>
                        {/* 顔の長さの図解 */}
                        <div className="flex justify-center mb-2">
                          <div className="relative w-20 h-24">
                            {/* 顔の輪郭（より詳細） */}
                            <div className="absolute inset-0 border-2 border-gray-500 rounded-full bg-gradient-to-b from-amber-50 to-amber-100"></div>
                            {/* 眉毛 */}
                            <div className="absolute top-5 left-3 right-3 h-0.5 bg-gray-700 rounded-full"></div>
                            {/* 目 */}
                            <div className="absolute top-7 left-4 w-2 h-1 bg-gray-600 rounded-full"></div>
                            <div className="absolute top-7 right-4 w-2 h-1 bg-gray-600 rounded-full"></div>
                            {/* 鼻 */}
                            <div className="absolute top-9 left-1/2 w-1 h-1 bg-gray-500 rounded-full transform -translate-x-0.5"></div>
                            {/* 口 */}
                            <div className="absolute top-11 left-1/2 w-2 h-0.5 bg-gray-600 rounded-full transform -translate-x-1"></div>
                            {/* 垂直の矢印（眉毛中央から顎先） */}
                            <div className="absolute left-1/2 top-5 bottom-1 w-1 bg-blue-600 rounded-full transform -translate-x-0.5"></div>
                            <div className="absolute left-1/2 top-5 w-2 h-2 bg-blue-600 rounded-full transform -translate-x-1"></div>
                            <div className="absolute left-1/2 bottom-0 w-2 h-2 bg-blue-600 rounded-full transform -translate-x-1"></div>
                          </div>
                        </div>
                        <div className="text-xs text-center text-blue-600 font-medium">眉毛中央から顎先まで</div>
                      </div>

                      {/* 目の間隔 */}
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">目の間隔</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${
                              faceResult.diff.measurements.eyeDistance.change > 0 ? 'text-green-600' : 
                              faceResult.diff.measurements.eyeDistance.change < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {faceResult.diff.measurements.eyeDistance.change > 0 ? '+' : ''}{faceResult.diff.measurements.eyeDistance.change}mm
                            </span>
                            <span className="text-lg">
                              {faceResult.diff.measurements.eyeDistance.change > 0 ? '😄' : 
                               faceResult.diff.measurements.eyeDistance.change < 0 ? '😢' : '😐'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {faceResult.diff.measurements.eyeDistance.before} → {faceResult.diff.measurements.eyeDistance.after}
                        </div>
                        {/* 目の間隔の図解（ズームアップ） */}
                        <div className="flex justify-center mb-2">
                          <div className="relative w-24 h-16">
                            {/* 背景 */}
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg border border-gray-300"></div>
                            {/* 左目（ズームアップ） */}
                            <div className="absolute top-2 left-2 w-6 h-4 bg-gray-700 rounded-full">
                              <div className="absolute top-1 left-1 w-2 h-2 bg-white rounded-full"></div>
                              <div className="absolute top-2 left-2 w-1 h-1 bg-gray-900 rounded-full"></div>
                            </div>
                            {/* 右目（ズームアップ） */}
                            <div className="absolute top-2 right-2 w-6 h-4 bg-gray-700 rounded-full">
                              <div className="absolute top-1 left-1 w-2 h-2 bg-white rounded-full"></div>
                              <div className="absolute top-2 left-2 w-1 h-1 bg-gray-900 rounded-full"></div>
                            </div>
                            {/* 目の間隔の矢印（ズームアップ） */}
                            <div className="absolute top-4 left-8 right-8 h-1.5 bg-blue-600 rounded-full"></div>
                            <div className="absolute top-4 left-7 w-3 h-3 bg-blue-600 rounded-full transform -translate-y-1"></div>
                            <div className="absolute top-4 right-7 w-3 h-3 bg-blue-600 rounded-full transform -translate-y-1"></div>
                          </div>
                        </div>
                        <div className="text-xs text-center text-blue-600 font-medium">左右の目の中心間</div>
                      </div>

                      {/* 眉毛と目の距離 */}
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">眉毛と目の距離</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${
                              faceResult.diff.measurements.eyebrowToEyeDistance.change < 0 ? 'text-green-600' : 
                              faceResult.diff.measurements.eyebrowToEyeDistance.change > 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {faceResult.diff.measurements.eyebrowToEyeDistance.change > 0 ? '+' : ''}{faceResult.diff.measurements.eyebrowToEyeDistance.change}mm
                            </span>
                            <span className="text-lg">
                              {faceResult.diff.measurements.eyebrowToEyeDistance.change < 0 ? '😄' : 
                               faceResult.diff.measurements.eyebrowToEyeDistance.change > 0 ? '😢' : '😐'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {faceResult.diff.measurements.eyebrowToEyeDistance.before} → {faceResult.diff.measurements.eyebrowToEyeDistance.after}
                        </div>
                        {/* 眉毛と目の距離の図解（ズームアップ） */}
                        <div className="flex justify-center mb-2">
                          <div className="relative w-20 h-20">
                            {/* 背景 */}
                            <div className="absolute inset-0 bg-gradient-to-b from-amber-50 to-amber-100 rounded-lg border border-gray-300"></div>
                            {/* 眉毛（ズームアップ） */}
                            <div className="absolute top-2 left-2 right-2 h-2 bg-gray-600 rounded-full"></div>
                            {/* 目（ズームアップ） */}
                            <div className="absolute top-8 left-4 w-6 h-4 bg-gray-700 rounded-full">
                              <div className="absolute top-1 left-1 w-2 h-2 bg-white rounded-full"></div>
                              <div className="absolute top-2 left-2 w-1 h-1 bg-gray-900 rounded-full"></div>
                            </div>
                            <div className="absolute top-8 right-4 w-6 h-4 bg-gray-700 rounded-full">
                              <div className="absolute top-1 left-1 w-2 h-2 bg-white rounded-full"></div>
                              <div className="absolute top-2 left-2 w-1 h-1 bg-gray-900 rounded-full"></div>
                            </div>
                            {/* 眉毛と目の距離の矢印（ズームアップ） */}
                            <div className="absolute left-1/2 top-4 bottom-8 w-1.5 bg-blue-600 rounded-full transform -translate-x-0.5"></div>
                            <div className="absolute left-1/2 top-3 w-3 h-3 bg-blue-600 rounded-full transform -translate-x-1.5"></div>
                            <div className="absolute left-1/2 top-8 w-3 h-3 bg-blue-600 rounded-full transform -translate-x-1.5"></div>
                          </div>
                        </div>
                        <div className="text-xs text-center text-blue-600 font-medium">眉毛から目まで</div>
                      </div>

                      {/* フェイスリフト角度 */}
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">フェイスリフト角度</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${
                              faceResult.diff.measurements.faceLiftAngle.change > 0 ? 'text-green-600' : 
                              faceResult.diff.measurements.faceLiftAngle.change < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {faceResult.diff.measurements.faceLiftAngle.change > 0 ? '+' : ''}{faceResult.diff.measurements.faceLiftAngle.change}度
                            </span>
                            <span className="text-lg">
                              {faceResult.diff.measurements.faceLiftAngle.change > 0 ? '😄' : 
                               faceResult.diff.measurements.faceLiftAngle.change < 0 ? '😢' : '😐'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {faceResult.diff.measurements.faceLiftAngle.before.toFixed(1)} → {faceResult.diff.measurements.faceLiftAngle.after.toFixed(1)}
                        </div>
                        {/* フェイスリフト角度の図解 */}
                        <div className="flex justify-center mb-2">
                          <div className="relative w-24 h-16">
                            {/* 背景 */}
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-gray-300"></div>
                            {/* 目尻 */}
                            <div className="absolute top-2 left-2 w-2 h-2 bg-blue-600 rounded-full"></div>
                            {/* 口角 */}
                            <div className="absolute top-8 left-1/2 w-2 h-2 bg-blue-600 rounded-full transform -translate-x-1"></div>
                            {/* 顎先 */}
                            <div className="absolute bottom-2 left-1/2 w-2 h-2 bg-blue-600 rounded-full transform -translate-x-1"></div>
                            {/* 角度線 */}
                            <div className="absolute top-2 left-2 w-8 h-8 border-2 border-blue-600 rounded-full transform -translate-x-1 -translate-y-1" 
                                 style={{clipPath: 'polygon(50% 50%, 0% 0%, 100% 0%)'}}></div>
                          </div>
                        </div>
                        <div className="text-xs text-center text-blue-600 font-medium">目尻→口角→顎先の角度</div>
                      </div>

                      {/* 下顔面比率 */}
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">下顔面比率</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${
                              faceResult.diff.measurements.lowerFaceRatio.change < 0 ? 'text-green-600' : 
                              faceResult.diff.measurements.lowerFaceRatio.change > 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {faceResult.diff.measurements.lowerFaceRatio.change > 0 ? '+' : ''}
                              {faceResult.diff.measurements.lowerFaceRatio.changePercent !== undefined
                                ? faceResult.diff.measurements.lowerFaceRatio.changePercent.toFixed(1)
                                : (faceResult.diff.measurements.lowerFaceRatio.change * 100).toFixed(1)}%
                            </span>
                            <span className="text-lg">
                              {faceResult.diff.measurements.lowerFaceRatio.change < 0 ? '😄' : 
                               faceResult.diff.measurements.lowerFaceRatio.change > 0 ? '😢' : '😐'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {(faceResult.diff.measurements.lowerFaceRatio.before * 100).toFixed(1)}% → {(faceResult.diff.measurements.lowerFaceRatio.after * 100).toFixed(1)}%
                        </div>
                        {/* 下顔面比率の図解 */}
                        <div className="flex justify-center mb-2">
                          <div className="relative w-24 h-16">
                            {/* 背景 */}
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-gray-300"></div>
                            {/* 鼻下 */}
                            <div className="absolute top-2 left-1/2 w-2 h-2 bg-blue-600 rounded-full transform -translate-x-1"></div>
                            {/* 口角 */}
                            <div className="absolute top-8 left-1/2 w-2 h-2 bg-blue-600 rounded-full transform -translate-x-1"></div>
                            {/* 顎先 */}
                            <div className="absolute bottom-2 left-1/2 w-2 h-2 bg-blue-600 rounded-full transform -translate-x-1"></div>
                            {/* 比率線 */}
                            <div className="absolute top-2 left-1/2 w-1 h-6 bg-blue-600 transform -translate-x-0.5"></div>
                            <div className="absolute top-8 left-1/2 w-1 h-4 bg-blue-600 transform -translate-x-0.5"></div>
                          </div>
                        </div>
                        <div className="text-xs text-center text-blue-600 font-medium">鼻下→口角→顎先の比率</div>
                      </div>

                      {/* AI総合判定 */}
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-purple-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">AI総合判定</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${
                              (faceResult.faceLiftIndex ?? 0) > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {(faceResult.faceLiftIndex ?? 0) > 0 ? 'リフトアップ傾向' : 'たるみ傾向'}
                            </span>
                            <span className="text-lg">
                              {(faceResult.faceLiftIndex ?? 0) > 0 ? '😄' : '😢'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          フェイスリフト指数: {faceResult.faceLiftIndex ?? 0}
                        </div>
                        <div className="text-xs text-purple-600 font-medium">
                          {(faceResult.faceLiftIndex ?? 0) > 0 ? '頬の位置が上がり、フェイスラインがすっきり' : '頬のたるみが改善の余地あり'}
                        </div>
                      </div>

                      {/* 検出信頼度 */}
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">検出信頼度</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${
                              faceResult.diff.detectionConfidence.after > faceResult.diff.detectionConfidence.before ? 'text-green-600' : 
                              faceResult.diff.detectionConfidence.after < faceResult.diff.detectionConfidence.before ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {((faceResult.diff.detectionConfidence.after - faceResult.diff.detectionConfidence.before) * 100).toFixed(1)}%
                            </span>
                            <span className="text-lg">
                              {faceResult.diff.detectionConfidence.after > faceResult.diff.detectionConfidence.before ? '😄' : 
                               faceResult.diff.detectionConfidence.after < faceResult.diff.detectionConfidence.before ? '😢' : '😐'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {((faceResult.diff.detectionConfidence.before) * 100).toFixed(1)}% → {((faceResult.diff.detectionConfidence.after) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 肌の状態分析結果 */}
                {faceResult.diff?.skinAnalysis && (
                  <div className="mt-6 bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-lg border border-pink-200">
                    <h3 className="font-bold text-pink-800 mb-3">🌸 肌の状態分析結果</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* 肌の明度 */}
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-pink-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">肌の明度</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${
                              faceResult.diff.skinAnalysis.improvements.brightness > 0 ? 'text-green-600' : 
                              faceResult.diff.skinAnalysis.improvements.brightness < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {faceResult.diff.skinAnalysis.improvements.brightness > 0 ? '+' : ''}{faceResult.diff.skinAnalysis.improvements.brightness}
                            </span>
                            <span className="text-lg">
                              {faceResult.diff.skinAnalysis.improvements.brightness > 0 ? '😄' : 
                               faceResult.diff.skinAnalysis.improvements.brightness < 0 ? '😢' : '😐'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {faceResult.diff.skinAnalysis.before.skinQuality.brightness} → {faceResult.diff.skinAnalysis.after.skinQuality.brightness}
                        </div>
                      </div>

                      {/* 肌の彩度 */}
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-pink-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">肌の彩度</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${
                              faceResult.diff.skinAnalysis.improvements.saturation > 0 ? 'text-green-600' : 
                              faceResult.diff.skinAnalysis.improvements.saturation < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {faceResult.diff.skinAnalysis.improvements.saturation > 0 ? '+' : ''}{faceResult.diff.skinAnalysis.improvements.saturation}
                            </span>
                            <span className="text-lg">
                              {faceResult.diff.skinAnalysis.improvements.saturation > 0 ? '😄' : 
                               faceResult.diff.skinAnalysis.improvements.saturation < 0 ? '😢' : '😐'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {faceResult.diff.skinAnalysis.before.skinQuality.saturation} → {faceResult.diff.skinAnalysis.after.skinQuality.saturation}
                        </div>
                      </div>

                      {/* 肌の均一性 */}
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-pink-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">肌の均一性</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${
                              faceResult.diff.skinAnalysis.improvements.evenness ? 'text-green-600' : 'text-gray-600'
                            }`}>
                              {faceResult.diff.skinAnalysis.improvements.evenness ? '改善' : '変化なし'}
                            </span>
                            <span className="text-lg">
                              {faceResult.diff.skinAnalysis.improvements.evenness ? '😄' : '😐'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {faceResult.diff.skinAnalysis.before.skinQuality.evenness} → {faceResult.diff.skinAnalysis.after.skinQuality.evenness}
                        </div>
                      </div>

                      {/* 肌のトーン */}
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-pink-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">肌のトーン</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${
                              faceResult.diff.skinAnalysis.improvements.tone ? 'text-green-600' : 'text-gray-600'
                            }`}>
                              {faceResult.diff.skinAnalysis.improvements.tone ? '変化' : '変化なし'}
                            </span>
                            <span className="text-lg">
                              {faceResult.diff.skinAnalysis.improvements.tone ? '😄' : '😐'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {faceResult.diff.skinAnalysis.before.skinQuality.tone} → {faceResult.diff.skinAnalysis.after.skinQuality.tone}
                        </div>
                      </div>

                      {/* シワの見えやすさ */}
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-pink-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">シワの見えやすさ</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${
                              faceResult.diff.skinAnalysis.improvements.wrinkleVisibility < 0 ? 'text-green-600' : 
                              faceResult.diff.skinAnalysis.improvements.wrinkleVisibility > 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {faceResult.diff.skinAnalysis.improvements.wrinkleVisibility > 0 ? '+' : ''}{faceResult.diff.skinAnalysis.improvements.wrinkleVisibility}%
                            </span>
                            <span className="text-lg">
                              {faceResult.diff.skinAnalysis.improvements.wrinkleVisibility < 0 ? '😄' : 
                               faceResult.diff.skinAnalysis.improvements.wrinkleVisibility > 0 ? '😢' : '😐'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {faceResult.diff.skinAnalysis.before.wrinkleVisibility}% → {faceResult.diff.skinAnalysis.after.wrinkleVisibility}%
                        </div>
                      </div>

                      {/* 肌年齢印象 */}
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-pink-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">肌年齢印象</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${
                              faceResult.diff.skinAnalysis.improvements.estimatedAge ? 'text-green-600' : 'text-gray-600'
                            }`}>
                              {faceResult.diff.skinAnalysis.improvements.estimatedAge ? '変化' : '変化なし'}
                            </span>
                            <span className="text-lg">
                              {faceResult.diff.skinAnalysis.improvements.estimatedAge ? '😄' : '😐'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {faceResult.diff.skinAnalysis.before.estimatedAge} → {faceResult.diff.skinAnalysis.after.estimatedAge}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 text-sm text-gray-500">
                  <details className="cursor-pointer">
                    <summary className="font-medium hover:text-gray-700">📊 詳細解析データを表示</summary>
                    <div className="bg-white mt-2 p-3 rounded text-xs overflow-x-auto border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-2">🎭 表情分析</h4>
                          <pre className="text-xs">{JSON.stringify({
                            joy: faceResult.diff?.joy,
                            anger: faceResult.diff?.anger,
                            sorrow: faceResult.diff?.sorrow,
                            surprise: faceResult.diff?.surprise
                          }, null, 2)}</pre>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-2">📐 顔の角度変化</h4>
                          <pre className="text-xs">{JSON.stringify({
                            headTilt: faceResult.diff?.headTilt,
                            roll: faceResult.diff?.roll,
                            tilt: faceResult.diff?.tilt
                          }, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            )}

            {/* エラーメッセージ */}
            {faceResult && !faceResult.success && (
              <div className="mt-6 w-full bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
                <h3 className="font-bold mb-2">❌ エラー</h3>
                <p>{faceResult.message || "顔が検出されませんでした。"}</p>
              </div>
            )}
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

