"use client";

import React from "react";

interface FaceSaggingResultProps {
  data: {
    before: {
      MCD: number;
      JLA: number;
      CDI: number;
      CDI_L: number;
      CDI_R: number;
      JWR: number;
    };
    after: {
      MCD: number;
      JLA: number;
      CDI: number;
      CDI_L: number;
      CDI_R: number;
      JWR: number;
    };
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
}

export function FaceSaggingResult({ data }: FaceSaggingResultProps) {
  // 改善率が正の値 = 改善（CDI, JLA, MCD, JWRは減少が改善）
  const isCDIImproved = data.delta.改善率_CDI > 0;
  const isJLAImproved = data.delta.改善率_JLA > 0;
  const isMCDImproved = data.delta.改善率_MCD !== undefined && data.delta.改善率_MCD > 0;
  const isJWRImproved = data.delta.改善率_JWR !== undefined && data.delta.改善率_JWR > 0;

  return (
    <div className="w-full bg-gray-50 rounded-xl p-6 shadow">
      <h2 className="text-lg font-bold mb-4 text-center text-gray-900">たるみ診断結果</h2>

      {/* 総合スコア */}
      <div className="mb-6 text-center">
        <p className="text-sm text-gray-800 mb-1">総合スコア</p>
        <p className="text-3xl font-bold text-blue-600">{data.score}</p>
        <p className="text-xs text-gray-700 mt-1">/ 100</p>
      </div>

      {/* 主要指標 */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3 text-gray-900">主要指標</h3>
        <div className="space-y-3">
          {/* CDI: 頬下降量 */}
          <div className="bg-white p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                頬下降量 (CDI)
              </span>
              <span className="text-xs text-gray-700">
                減少が改善（頬が上がる）
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-bold text-gray-900">{data.after.CDI.toFixed(3)}</p>
                <p className="text-xs text-gray-700">
                  Before: {data.before.CDI.toFixed(3)}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-semibold ${
                    isCDIImproved ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {isCDIImproved ? "😃" : "😢"} {data.delta.改善率_CDI.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-700">
                  変化量: {data.delta.ΔCDI > 0 ? "+" : ""}
                  {data.delta.ΔCDI.toFixed(3)}
                </p>
              </div>
            </div>
          </div>

          {/* JLA: 下顎角 */}
          <div className="bg-white p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                下顎角 (JLA)
              </span>
              <span className="text-xs text-gray-700">
                減少が改善（フェイスラインが引き締まる）
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {data.after.JLA.toFixed(2)}°
                </p>
                <p className="text-xs text-gray-700">
                  Before: {data.before.JLA.toFixed(2)}°
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-semibold ${
                    isJLAImproved ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {isJLAImproved ? "😃" : "😢"}{" "}
                  {data.delta.改善率_JLA.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-700">
                  変化量: {data.delta.ΔJLA > 0 ? "+" : ""}
                  {data.delta.ΔJLA.toFixed(2)}°
                </p>
              </div>
            </div>
          </div>

          {/* MCD: 口角下がり角 */}
          <div className="bg-white p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                口角下がり角 (MCD)
              </span>
              <span className="text-xs text-gray-700">
                減少が改善（口角が上がる）
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {data.after.MCD.toFixed(2)}°
                </p>
                <p className="text-xs text-gray-700">
                  Before: {data.before.MCD.toFixed(2)}°
                </p>
              </div>
              <div className="text-right">
                {data.delta.改善率_MCD !== undefined ? (
                  <>
                    <p
                      className={`text-sm font-semibold ${
                        isMCDImproved ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {isMCDImproved ? "😃" : "😢"}{" "}
                      {data.delta.改善率_MCD.toFixed(2)}%
                    </p>
                    <p className="text-xs text-gray-700">
                      変化量: {data.delta.ΔMCD > 0 ? "+" : ""}
                      {data.delta.ΔMCD.toFixed(2)}°
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-800">
                    変化量: {data.delta.ΔMCD > 0 ? "+" : ""}
                    {data.delta.ΔMCD.toFixed(2)}°
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* JWR: ジョウル幅比 */}
          <div className="bg-white p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                ジョウル幅比 (JWR)
              </span>
              <span className="text-xs text-gray-700">
                減少が改善（顎が引き締まる）
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {data.after.JWR.toFixed(3)}
                </p>
                <p className="text-xs text-gray-700">
                  Before: {data.before.JWR.toFixed(3)}
                </p>
              </div>
              <div className="text-right">
                {data.delta.改善率_JWR !== undefined ? (
                  <>
                    <p
                      className={`text-sm font-semibold ${
                        isJWRImproved ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {isJWRImproved ? "😃" : "😢"}{" "}
                      {data.delta.改善率_JWR.toFixed(2)}%
                    </p>
                    <p className="text-xs text-gray-700">
                      変化量: {data.delta.ΔJWR > 0 ? "+" : ""}
                      {data.delta.ΔJWR.toFixed(3)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-800">
                    変化量: {data.delta.ΔJWR > 0 ? "+" : ""}
                    {data.delta.ΔJWR.toFixed(3)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 左右差の詳細 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-gray-900 mb-2">
          左右差の詳細
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-800">左頬 (CDI_L):</span>
            <span className="ml-1 font-semibold text-gray-900">
              {data.after.CDI_L.toFixed(3)}
            </span>
          </div>
          <div>
            <span className="text-gray-800">右頬 (CDI_R):</span>
            <span className="ml-1 font-semibold text-gray-900">
              {data.after.CDI_R.toFixed(3)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

