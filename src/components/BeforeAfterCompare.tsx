"use client";

import { useState } from "react";

export default function BeforeAfterCompare({ before, after }: { before: string; after: string }) {
  const [slider, setSlider] = useState(50);

  return (
    <div className="max-w-md mx-auto">
      <div className="relative">
        <img src={before} alt="Before" className="w-full block rounded-lg" />
        <img
          src={after}
          alt="After"
          className="absolute top-0 left-0 rounded-lg"
          style={{
            width: `${slider}%`,
            height: "100%",
            objectFit: "cover",
            overflow: "hidden",
          }}
        />
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={slider}
        onChange={(e) => setSlider(Number(e.target.value))}
        className="w-full mt-4"
      />
      <div className="mt-4 flex justify-between text-sm text-gray-600">
        <span>Before</span>
        <span>After</span>
      </div>
    </div>
  );
}
