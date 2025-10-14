"use client";

import { useState } from "react";

export default function BeforeAfterCompare({ before, after }: { before: string; after: string }) {
  const [slider, setSlider] = useState(50);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
        {/* Before画像 - 背景として表示 */}
        <img 
          src={before} 
          alt="Before" 
          className="w-full h-auto block"
          style={{ aspectRatio: "4/3" }}
        />
        
        {/* After画像 - スライダーで制御 */}
        <div 
          className="absolute top-0 left-0 h-full overflow-hidden"
          style={{ width: `${slider}%` }}
        >
          <img
            src={after}
            alt="After"
            className="w-full h-full object-contain"
            style={{ aspectRatio: "4/3" }}
          />
        </div>
        
        {/* 中央の分割線 */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
          style={{ left: `${slider}%` }}
        />
      </div>
      
      <input
        type="range"
        min="0"
        max="100"
        value={slider}
        onChange={(e) => setSlider(Number(e.target.value))}
        className="w-full mt-4 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      
      <div className="mt-4 flex justify-between text-sm text-gray-600">
        <span className="font-medium">Before</span>
        <span className="font-medium">After</span>
      </div>
      
      <div className="mt-2 text-center text-xs text-gray-500">
        スライダーを動かして比較してください
      </div>
    </div>
  );
}
