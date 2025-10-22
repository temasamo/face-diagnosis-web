"use client";

import { useState } from "react";
import Image from "next/image";

export default function ComparePage() {
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.5); // 半透明度コントロール
  const [loading, setLoading] = useState(false);
  const [aligning, setAligning] = useState(false);
  const [alignedBefore, setAlignedBefore] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'overlay' | 'side-by-side'>('overlay'); // 比較モード

  // ✅ スマホ対応：画像リサイズ関数（3MB→1MB前後に圧縮）
  const resizeImage = async (file: File, maxSize = 1280): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const img = new window.Image();
        img.onload = () => {
          try {
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            const canvas = document.createElement("canvas");
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Canvas context not available"));
              return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            resolve(dataUrl);
          } catch (error) {
            console.error("Canvas processing error:", error);
            reject(error);
          }
        };
        img.onerror = (error) => {
          console.error("Image load error:", error);
          reject(error);
        };
        img.src = URL.createObjectURL(file);
      } catch (error) {
        console.error("Resize image error:", error);
        reject(error);
      }
    });
  };

  // 画像保存関数
  const saveImage = (imageDataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = imageDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
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
        faceAngle: {
          before: number;
          after: number;
          change: number;
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
    faceCount?: { before: number; after: number };
    message?: string;
  } | null>(null);

  // 顔位置自動補正関数
  const alignFaces = async () => {
    if (!before || !after) return;
    
    setAligning(true);
    try {
      // 1. Vision APIで顔の位置・角度データを取得
      const alignRes = await fetch("/api/align", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ before, after }),
      });
      const alignData = await alignRes.json();
      
      if (!alignData.success) {
        alert("顔の位置補正に失敗しました: " + alignData.message);
        return;
      }
      
      setAlignmentData(alignData);
      
      // 2. CanvasでBefore画像を補正
      const beforeImg = new window.Image();
      const afterImg = new window.Image();
      
      // 画像の読み込みを待つ
      await new Promise<void>((resolve) => {
        beforeImg.onload = () => {
          afterImg.onload = () => resolve();
          afterImg.src = after;
        };
        beforeImg.src = before;
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
      // ここではAfter画像は描画せず、純粋に補正されたBefore画像のみを生成
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
    <div className="max-w-4xl mx-auto p-6 text-center">
      <h1 className="text-2xl font-bold mb-6">Before / After 比較診断</h1>
      <p className="text-gray-600 mb-8">
        2枚の写真をアップロードすると、重ね合わせまたは横並びで比較できます。AIが顔の印象変化を分析します。
      </p>

      {/* 画像アップロード */}
      <div className="flex justify-center gap-8 mb-8">
        <div>
          <p className="font-semibold mb-2 text-gray-600">Before</p>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  console.log("Before画像処理開始:", file.name, file.size);
                  // ✅ スマホ対応：画像を自動リサイズ
                  const resizedImage = await resizeImage(file);
                  console.log("Before画像処理完了:", resizedImage.length);
                  setBefore(resizedImage);
                } catch (error) {
                  console.error("Before画像処理エラー:", error);
                  // エラー時は通常のFileReaderを使用
                  const reader = new FileReader();
                  reader.onloadend = () => setBefore(reader.result as string);
                  reader.readAsDataURL(file);
                }
              }
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <div>
          <p className="font-semibold mb-2 text-gray-600">After</p>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  console.log("After画像処理開始:", file.name, file.size);
                  // ✅ スマホ対応：画像を自動リサイズ
                  const resizedImage = await resizeImage(file);
                  console.log("After画像処理完了:", resizedImage.length);
                  setAfter(resizedImage);
                } catch (error) {
                  console.error("After画像処理エラー:", error);
                  // エラー時は通常のFileReaderを使用
                  const reader = new FileReader();
                  reader.onloadend = () => setAfter(reader.result as string);
                  reader.readAsDataURL(file);
                }
              }
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
        </div>
      </div>

      {/* 比較エリア */}
      {before && after && (
        <div className="mb-8">
          {/* 比較モード切り替えボタン */}
          <div className="mb-6 flex justify-center gap-2">
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
          {comparisonMode === 'overlay' ? (
            // 重ね合わせ比較モード
            <div className="relative inline-block">
              {/* After画像（背景） */}
              <Image
                src={after}
                alt="After"
                width={400}
                height={400}
                className="w-[400px] h-[400px] object-cover rounded-lg shadow-lg border-2 border-green-200"
              />
              {/* Before画像（上に半透明で重ねる） */}
              <Image
                src={alignedBefore || before}
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
                    src={alignedBefore || before}
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
                    src={after}
                    alt="After"
                    width={400}
                    height={400}
                    className="w-full h-auto rounded-lg shadow-lg border-2 border-green-200 object-contain"
                  />
                </div>
              </div>
            </div>
          )}
          
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

      {/* 画像保存ボタン */}
      {before && after && (
        <div className="mb-6 flex justify-center gap-3 flex-wrap">
          <button
            onClick={() => {
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              saveImage(before, `before-${timestamp}.jpg`);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            💾 Before画像を保存
          </button>
          <button
            onClick={() => {
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              saveImage(after, `after-${timestamp}.jpg`);
            }}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            💾 After画像を保存
          </button>
          {comparisonMode === 'overlay' && alignedBefore && (
            <button
              onClick={() => {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                saveImage(alignedBefore, `aligned-comparison-${timestamp}.jpg`);
              }}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
              💾 補正済み比較画像を保存
            </button>
          )}
        </div>
      )}

      {/* AI分析ボタン */}
      {before && after && (
        <div className="mb-8">
          <button
            onClick={handleCompare}
            disabled={loading}
            className={`px-8 py-3 rounded-lg text-white font-semibold text-lg transition-all duration-200 ${
              loading 
                ? "bg-gray-400 cursor-not-allowed" 
                : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl"
            }`}
          >
            {loading ? "🤖 美容効果分析中..." : "✨ 美容効果を診断する"}
          </button>
        </div>
      )}

      {/* 美容効果診断結果表示 */}
      {result && result.success && (
        <div className="mt-8 text-left bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-xl shadow-lg border border-pink-200">
          <h2 className="text-xl font-bold text-pink-800 mb-4">✨ 美容効果診断結果</h2>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-gray-800 leading-relaxed text-lg mb-3 whitespace-pre-line">
              {result.comment}
            </div>
            <div className="text-sm text-pink-600 bg-pink-50 p-3 rounded border-l-4 border-pink-300">
              💡 <strong>美容効果のポイント:</strong> マッサージ、オイル、パック等の施術による肌質改善、リフトアップ効果、シワ・たるみの軽減を分析しています。
            </div>
          </div>

          {/* 精密数値測定結果 */}
          {result.diff?.measurements && (
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-3">📏 精密数値測定結果</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 顔の幅 */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">顔の幅</span>
                    <span className={`text-sm font-bold ${
                      result.diff.measurements.faceWidth.change < 0 ? 'text-green-600' : 
                      result.diff.measurements.faceWidth.change > 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {result.diff.measurements.faceWidth.change > 0 ? '+' : ''}{result.diff.measurements.faceWidth.change}mm
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {result.diff.measurements.faceWidth.before} → {result.diff.measurements.faceWidth.after}
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
                  <div className="text-xs text-center text-blue-600 font-medium">左右の端から端まで</div>
                </div>

                {/* 顔の長さ */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">顔の長さ</span>
                    <span className={`text-sm font-bold ${
                      result.diff.measurements.faceHeight.change < 0 ? 'text-green-600' : 
                      result.diff.measurements.faceHeight.change > 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {result.diff.measurements.faceHeight.change > 0 ? '+' : ''}{result.diff.measurements.faceHeight.change}mm
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {result.diff.measurements.faceHeight.before} → {result.diff.measurements.faceHeight.after}
                  </div>
                  {/* 顔の長さの図解 */}
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
                      {/* 垂直の矢印（顔の長さ） */}
                      <div className="absolute left-1/2 top-1 bottom-1 w-1 bg-blue-600 rounded-full transform -translate-x-0.5"></div>
                      <div className="absolute left-1/2 top-0 w-2 h-2 bg-blue-600 rounded-full transform -translate-x-1"></div>
                      <div className="absolute left-1/2 bottom-0 w-2 h-2 bg-blue-600 rounded-full transform -translate-x-1"></div>
                    </div>
                  </div>
                  <div className="text-xs text-center text-blue-600 font-medium">額から顎まで</div>
                </div>

                {/* 目の間隔 */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">目の間隔</span>
                    <span className={`text-sm font-bold ${
                      result.diff.measurements.eyeDistance.change > 0 ? 'text-green-600' : 
                      result.diff.measurements.eyeDistance.change < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {result.diff.measurements.eyeDistance.change > 0 ? '+' : ''}{result.diff.measurements.eyeDistance.change}mm
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {result.diff.measurements.eyeDistance.before} → {result.diff.measurements.eyeDistance.after}
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
                    <span className={`text-sm font-bold ${
                      result.diff.measurements.eyebrowToEyeDistance.change < 0 ? 'text-green-600' : 
                      result.diff.measurements.eyebrowToEyeDistance.change > 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {result.diff.measurements.eyebrowToEyeDistance.change > 0 ? '+' : ''}{result.diff.measurements.eyebrowToEyeDistance.change}mm
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {result.diff.measurements.eyebrowToEyeDistance.before} → {result.diff.measurements.eyebrowToEyeDistance.after}
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

                {/* フェイスライン角度 */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">フェイスライン角度</span>
                    <span className={`text-sm font-bold ${
                      result.diff.measurements.faceAngle.change > 0 ? 'text-green-600' : 
                      result.diff.measurements.faceAngle.change < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {result.diff.measurements.faceAngle.change > 0 ? '+' : ''}{result.diff.measurements.faceAngle.change}度
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {result.diff.measurements.faceAngle.before} → {result.diff.measurements.faceAngle.after}
                  </div>
                  {/* フェイスライン角度の図解（ズームアップ） */}
                  <div className="flex justify-center mb-2">
                    <div className="relative w-24 h-16">
                      {/* 背景 */}
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-gray-300"></div>
                      {/* 顎から頬のライン（ズームアップ） */}
                      <div className="absolute bottom-2 left-2 right-2 h-2 bg-blue-600 rounded-full transform rotate-12 origin-left"></div>
                      <div className="absolute bottom-2 left-2 w-3 h-3 bg-blue-600 rounded-full transform -translate-y-1"></div>
                      <div className="absolute bottom-2 right-2 w-3 h-3 bg-blue-600 rounded-full transform -translate-y-1"></div>
                      {/* 基準線（水平） */}
                      <div className="absolute bottom-2 left-2 right-2 h-1 bg-gray-400 rounded-full"></div>
                      {/* 角度の弧 */}
                      <div className="absolute bottom-1 left-1/2 w-4 h-4 border-2 border-blue-600 rounded-full transform -translate-x-2 -translate-y-1" 
                           style={{clipPath: 'polygon(50% 50%, 0% 0%, 100% 0%)'}}></div>
                    </div>
                  </div>
                  <div className="text-xs text-center text-blue-600 font-medium">顎から頬にかけての角度</div>
                </div>

                {/* 検出信頼度 */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">検出信頼度</span>
                    <span className={`text-sm font-bold ${
                      result.diff.detectionConfidence.after > result.diff.detectionConfidence.before ? 'text-green-600' : 
                      result.diff.detectionConfidence.after < result.diff.detectionConfidence.before ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {((result.diff.detectionConfidence.after - result.diff.detectionConfidence.before) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {((result.diff.detectionConfidence.before) * 100).toFixed(1)}% → {((result.diff.detectionConfidence.after) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 肌の状態分析結果 */}
          {result.diff?.skinAnalysis && (
            <div className="mt-6 bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-lg border border-pink-200">
              <h3 className="font-bold text-pink-800 mb-3">🌸 肌の状態分析結果</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 肌の明度 */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-pink-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">肌の明度</span>
                    <span className={`text-sm font-bold ${
                      result.diff.skinAnalysis.improvements.brightness > 0 ? 'text-green-600' : 
                      result.diff.skinAnalysis.improvements.brightness < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {result.diff.skinAnalysis.improvements.brightness > 0 ? '+' : ''}{result.diff.skinAnalysis.improvements.brightness}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {result.diff.skinAnalysis.before.skinQuality.brightness} → {result.diff.skinAnalysis.after.skinQuality.brightness}
                  </div>
                </div>

                {/* 肌の彩度 */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-pink-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">肌の彩度</span>
                    <span className={`text-sm font-bold ${
                      result.diff.skinAnalysis.improvements.saturation > 0 ? 'text-green-600' : 
                      result.diff.skinAnalysis.improvements.saturation < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {result.diff.skinAnalysis.improvements.saturation > 0 ? '+' : ''}{result.diff.skinAnalysis.improvements.saturation}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {result.diff.skinAnalysis.before.skinQuality.saturation} → {result.diff.skinAnalysis.after.skinQuality.saturation}
                  </div>
                </div>

                {/* 肌の均一性 */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-pink-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">肌の均一性</span>
                    <span className={`text-sm font-bold ${
                      result.diff.skinAnalysis.improvements.evenness ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {result.diff.skinAnalysis.improvements.evenness ? '改善' : '変化なし'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {result.diff.skinAnalysis.before.skinQuality.evenness} → {result.diff.skinAnalysis.after.skinQuality.evenness}
                  </div>
                </div>

                {/* 肌のトーン */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-pink-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">肌のトーン</span>
                    <span className={`text-sm font-bold ${
                      result.diff.skinAnalysis.improvements.tone ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {result.diff.skinAnalysis.improvements.tone ? '変化' : '変化なし'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {result.diff.skinAnalysis.before.skinQuality.tone} → {result.diff.skinAnalysis.after.skinQuality.tone}
                  </div>
                </div>

                {/* シワの見えやすさ */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-pink-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">シワの見えやすさ</span>
                    <span className={`text-sm font-bold ${
                      result.diff.skinAnalysis.improvements.wrinkleVisibility < 0 ? 'text-green-600' : 
                      result.diff.skinAnalysis.improvements.wrinkleVisibility > 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {result.diff.skinAnalysis.improvements.wrinkleVisibility > 0 ? '+' : ''}{result.diff.skinAnalysis.improvements.wrinkleVisibility}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {result.diff.skinAnalysis.before.wrinkleVisibility}% → {result.diff.skinAnalysis.after.wrinkleVisibility}%
                  </div>
                </div>

                {/* 肌年齢印象 */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-pink-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">肌年齢印象</span>
                    <span className={`text-sm font-bold ${
                      result.diff.skinAnalysis.improvements.estimatedAge ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {result.diff.skinAnalysis.improvements.estimatedAge ? '変化' : '変化なし'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {result.diff.skinAnalysis.before.estimatedAge} → {result.diff.skinAnalysis.after.estimatedAge}
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
                      joy: result.diff?.joy,
                      anger: result.diff?.anger,
                      sorrow: result.diff?.sorrow,
                      surprise: result.diff?.surprise
                    }, null, 2)}</pre>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">📐 顔の角度変化</h4>
                    <pre className="text-xs">{JSON.stringify({
                      headTilt: result.diff?.headTilt,
                      roll: result.diff?.roll,
                      tilt: result.diff?.tilt
                    }, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      )}

      {/* エラーメッセージ */}
      {result && !result.success && (
        <div className="mt-6 bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
          <h3 className="font-bold mb-2">❌ エラー</h3>
          <p>{result.message || "顔が検出されませんでした。"}</p>
        </div>
      )}

      {/* 使い方説明 */}
      <div className="mt-12 bg-blue-50 p-6 rounded-xl border border-blue-200">
        <h3 className="font-bold text-lg mb-3 text-blue-800">📋 使い方</h3>
        <ol className="text-left text-blue-700 space-y-2">
          <li>1. 「Before」と「After」の画像をそれぞれアップロードしてください（📱 スマホ画像は自動でリサイズされます）</li>
          <li>2. 比較モードを選択してください（重ね合わせ or 横並び）</li>
          <li>3. 「🎯 顔位置を自動補正」ボタンで顔の位置・角度・サイズを自動調整できます</li>
          <li>4. 重ね合わせモードでは透明度スライダーでBefore画像の透明度を調整できます</li>
          <li>5. 画像保存ボタンで撮影した画像をダウンロードできます</li>
          <li>6. 「美容効果を診断する」ボタンで美容施術の効果を分析できます</li>
          <li>7. 数値付きの精密測定でマッサージ、オイル、パック等の施術効果を詳細に測定します</li>
        </ol>
      </div>
    </div>
  );
}
