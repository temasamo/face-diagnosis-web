"use client";

import { useState } from "react";
import Image from "next/image";

export default function BeforeAfterCompare({ before, after }: { before: string; after: string }) {
  const [opacity, setOpacity] = useState(0.5); // 半透明度コントロール
  const [aligning, setAligning] = useState(false);
  const [alignedBefore, setAlignedBefore] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'overlay' | 'side-by-side'>('overlay'); // 比較モード
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

  // 顔位置自動補正関数
  const alignFaces = async () => {
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
      
      beforeImg.onload = () => {
        afterImg.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          
          const W = 400, H = 400;
          canvas.width = W;
          canvas.height = H;
          
          // Afterを背景として描画
          ctx.drawImage(afterImg, 0, 0, W, H);
          
          // Before画像の補正処理
          ctx.save();
          
          // 移動量を計算（After基準でBeforeを移動）
          const offsetX = alignData.alignment.offsetX * (W / afterImg.width);
          const offsetY = alignData.alignment.offsetY * (H / afterImg.height);
          
          // 回転補正
          const angle = (alignData.alignment.rotationDiff * Math.PI) / 180;
          ctx.translate(W / 2, H / 2);
          ctx.rotate(angle);
          ctx.translate(-W / 2, -H / 2);
          
          // スケール補正
          const scale = alignData.alignment.scale;
          ctx.scale(scale, scale);
          
          // Beforeを半透明で重ねる
          ctx.globalAlpha = opacity;
          ctx.drawImage(beforeImg, offsetX / scale, offsetY / scale, W / scale, H / scale);
          ctx.globalAlpha = 1.0;
          
          ctx.restore();
          
          setAlignedBefore(canvas.toDataURL());
        };
        afterImg.src = after;
      };
      beforeImg.src = before;
      
    } catch (error) {
      console.error("Alignment error:", error);
      alert("顔の位置補正中にエラーが発生しました。");
    } finally {
      setAligning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 比較モード切り替えボタン */}
      <div className="mb-4 flex justify-center gap-2">
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

      {/* 顔位置自動補正ボタン（重ね合わせモードのみ） */}
      {comparisonMode === 'overlay' && (
        <div className="mb-4 text-center">
          <button
            onClick={alignFaces}
            disabled={aligning}
            className={`px-4 py-2 rounded-lg text-white font-semibold transition-all duration-200 ${
              aligning 
                ? "bg-gray-400 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl"
            }`}
          >
            {aligning ? "🔄 補正中..." : "🎯 顔位置自動補正"}
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Vision APIで顔の位置・角度・サイズを自動調整
          </p>
        </div>
      )}

      {/* 比較表示エリア */}
      {comparisonMode === 'overlay' ? (
        // 重ね合わせ比較モード
        <div className="relative inline-block">
          {alignedBefore ? (
            // 補正済み画像を表示
            <Image
              src={alignedBefore}
              alt="Aligned Comparison"
              width={800}
              height={600}
              className="w-full h-auto rounded-lg shadow-lg border-2 border-purple-200"
              style={{ aspectRatio: "4/3" }}
            />
          ) : (
            // 通常の重ね合わせ表示
            <>
              {/* After画像（背景） */}
              <Image
                src={after}
                alt="After"
                width={800}
                height={600}
                className="w-full h-auto rounded-lg shadow-lg border-2 border-green-200"
                style={{ aspectRatio: "4/3" }}
              />
              {/* Before画像（上に半透明で重ねる） */}
              <Image
                src={before}
                alt="Before"
                width={800}
                height={600}
                className="absolute top-0 left-0 w-full h-full object-cover rounded-lg border-2 border-blue-200"
                style={{ 
                  aspectRatio: "4/3",
                  opacity 
                }}
              />
              {/* 中央の境界線表示 */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-white shadow-lg rounded"></div>
            </>
          )}
        </div>
      ) : (
        // 横並び比較モード
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Before画像 */}
          <div className="text-center">
            <div className="mb-2">
              <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                📸 Before
              </span>
            </div>
            <Image
              src={before}
              alt="Before"
              width={400}
              height={400}
              className="w-full h-auto rounded-lg shadow-lg border-2 border-blue-200"
              style={{ aspectRatio: "1/1" }}
            />
          </div>
          
          {/* After画像 */}
          <div className="text-center">
            <div className="mb-2">
              <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                ✨ After
              </span>
            </div>
            <Image
              src={after}
              alt="After"
              width={400}
              height={400}
              className="w-full h-auto rounded-lg shadow-lg border-2 border-green-200"
              style={{ aspectRatio: "1/1" }}
            />
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
      
      <div className="mt-2 text-center text-xs text-gray-500">
        {comparisonMode === 'overlay' ? (
          alignedBefore 
            ? "✨ 顔の位置・角度・サイズが自動補正されました！微妙な変化がより見やすくなっています。"
            : "💡 スライダーでBefore画像の透明度を調整して、変化を確認できます"
        ) : (
          "💡 横並び比較でBefore/Afterの違いを並べて確認できます"
        )}
      </div>

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
  );
}
