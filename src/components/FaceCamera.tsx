"use client";

import { useRef, useEffect, useState } from "react";

export default function FaceCamera({ onCapture }: { onCapture: (img: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
        };
      }
    } catch (error) {
      console.error("カメラの起動に失敗しました:", error);
      alert("カメラの起動に失敗しました。カメラの許可を確認してください。");
    }
  };

  const capturePhoto = () => {
    if (!isCameraReady) return;
    
    // カウントダウン開始
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // 実際の撮影
          const canvas = document.createElement("canvas");
          const video = videoRef.current!;
          
          // より大きな解像度で撮影
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(video, 0, 0);
          
          // 高品質で保存
          const imageData = canvas.toDataURL("image/jpeg", 0.9);
          onCapture(imageData);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="relative">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full rounded-lg border-2 border-gray-300"
        />
        
        {/* カウントダウン表示 */}
        {countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <div className="text-6xl font-bold text-white">
              {countdown}
            </div>
          </div>
        )}
        
        {/* 撮影ガイドライン */}
        <div className="absolute inset-4 border-2 border-white border-dashed rounded-lg pointer-events-none opacity-50">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-40 border border-white rounded-full"></div>
        </div>
      </div>
      
      <div className="mt-4 space-x-4">
        <button 
          onClick={startCamera}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          disabled={isCameraReady}
        >
          {isCameraReady ? "カメラ準備完了" : "カメラ起動"}
        </button>
        <button 
          onClick={capturePhoto}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          disabled={!isCameraReady || countdown > 0}
        >
          {countdown > 0 ? `${countdown}秒後撮影` : "撮影"}
        </button>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>📸 撮影のコツ:</p>
        <ul className="text-left mt-2 space-y-1">
          <li>• 顔全体が枠内に収まるようにしてください</li>
          <li>• 照明を均等に当ててください</li>
          <li>• カメラから適度な距離を保ってください</li>
          <li>• 同じ角度・位置で撮影してください</li>
        </ul>
      </div>
    </div>
  );
}
