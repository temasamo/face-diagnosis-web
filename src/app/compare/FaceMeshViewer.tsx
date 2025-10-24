"use client";

import { useEffect, useRef, useState } from "react";

export default function FaceMeshViewer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("カメラを起動しています...");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') return;

    // ブラウザサポートチェック
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("このブラウザはカメラ機能をサポートしていません");
      return;
    }

    setIsSupported(true);

    // カメラストリームの取得
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: 640, 
        height: 480,
        facingMode: 'user'
      } 
    })
    .then((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStatus("カメラが起動しました");
        setError(null);
      }
    })
    .catch((err) => {
      console.error("Camera access error:", err);
      setError("カメラアクセスが許可されていません。ブラウザの設定を確認してください。");
      setStatus("カメラエラー");
    });

    return () => {
      // クリーンアップ
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // 簡単な顔検出シミュレーション（実際のMediaPipeの代替）
  const drawFaceOverlay = () => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 簡単な顔の輪郭を描画（デモ用）
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // 顔の輪郭（楕円）
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radiusX = 120;
    const radiusY = 150;
    
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();
    
    // 目の位置
    ctx.fillStyle = "#FF3030";
    ctx.beginPath();
    ctx.arc(centerX - 40, centerY - 30, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + 40, centerY - 30, 5, 0, 2 * Math.PI);
    ctx.fill();
    
    // 鼻の位置
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
    ctx.fill();
    
    // 口の位置
    ctx.beginPath();
    ctx.arc(centerX, centerY + 40, 8, 0, 2 * Math.PI);
    ctx.fill();
  };

  // 定期的に描画を更新
  useEffect(() => {
    if (!isSupported) return;
    
    const interval = setInterval(drawFaceOverlay, 100);
    return () => clearInterval(interval);
  }, [isSupported]);

  if (!isSupported) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">このブラウザはカメラ機能をサポートしていません</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="rounded-xl w-full"
        onLoadedMetadata={() => {
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />
      
      {/* ステータス表示 */}
      <div className="text-center mt-2">
        <p className={`text-sm ${error ? 'text-red-500' : 'text-gray-500'}`}>
          {error || status}
        </p>
        
        {/* デモ用の説明 */}
        <p className="text-xs text-blue-600 mt-1">
          デモ版: 簡単な顔検出オーバーレイを表示
        </p>
      </div>
    </div>
  );
}
