"use client";

import { useRef } from "react";

export default function FaceCamera({ onCapture }: { onCapture: (img: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (error) {
      console.error("カメラの起動に失敗しました:", error);
      alert("カメラの起動に失敗しました。カメラの許可を確認してください。");
    }
  };

  const capturePhoto = () => {
    const canvas = document.createElement("canvas");
    const video = videoRef.current!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg");
    onCapture(imageData);
  };

  return (
    <div className="max-w-md mx-auto">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="w-full rounded-lg border-2 border-gray-300"
      />
      <div className="mt-4 space-x-4">
        <button 
          onClick={startCamera}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          カメラ起動
        </button>
        <button 
          onClick={capturePhoto}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          撮影
        </button>
      </div>
    </div>
  );
}
