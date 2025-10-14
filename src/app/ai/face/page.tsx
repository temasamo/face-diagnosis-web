"use client";

import { useState } from "react";
import FaceCamera from "@/components/FaceCamera";
import BeforeAfterCompare from "@/components/BeforeAfterCompare";

export default function FaceDiagnosisPage() {
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [step, setStep] = useState<"before" | "after" | "compare">("before");

  const handleCapture = (image: string) => {
    if (step === "before") {
      setBeforeImage(image);
      setStep("after");
    } else if (step === "after") {
      setAfterImage(image);
      setStep("compare");
    }
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
        <BeforeAfterCompare before={beforeImage} after={afterImage} />
      )}
    </main>
  );
}
