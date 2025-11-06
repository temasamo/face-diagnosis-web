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
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                頬下降量 (CDI)
              </span>
              <span className="text-xs text-gray-700">
                数値の減少が改善を意味します（頬が上がる）
              </span>
            </div>
            <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
              <p className="font-semibold mb-1">📖 説明:</p>
              <p>左右それぞれの目尻と口角の平均高さを基準に、左右の頬中心がどれだけ下がっているかを測定します。左右の下降量の平均がCDIです。値が小さいほど頬が上がっている状態です。</p>
            </div>
            {/* CDIの図解 */}
            <div className="mb-3 flex justify-center">
              <div className="w-full max-w-xs">
                <svg viewBox="0 0 200 280" className="w-full h-auto">
                  {/* 背景 */}
                  <rect width="200" height="280" fill="#FEF3C7" rx="8"/>
                  
                  {/* 顔の輪郭 */}
                  <ellipse cx="100" cy="125" rx="70" ry="90" fill="#FDE68A" stroke="#6B7280" strokeWidth="2"/>
                  
                  {/* 目 */}
                  <ellipse cx="80" cy="80" rx="8" ry="5" fill="#374151"/>
                  <ellipse cx="120" cy="80" rx="8" ry="5" fill="#374151"/>
                  
                  {/* 目尻（左） */}
                  <circle cx="88" cy="80" r="3" fill="#2563EB"/>
                  <text x="88" y="75" fontSize="8" fill="#2563EB" textAnchor="middle" fontWeight="bold">目尻</text>
                  
                  {/* 目尻（右） */}
                  <circle cx="112" cy="80" r="3" fill="#2563EB"/>
                  <text x="112" y="75" fontSize="8" fill="#2563EB" textAnchor="middle" fontWeight="bold">目尻</text>
                  
                  {/* 口角（左） */}
                  <circle cx="85" cy="150" r="3" fill="#2563EB"/>
                  <text x="85" y="145" fontSize="8" fill="#2563EB" textAnchor="middle" fontWeight="bold">口角</text>
                  
                  {/* 口角（右） */}
                  <circle cx="115" cy="150" r="3" fill="#2563EB"/>
                  <text x="115" y="145" fontSize="8" fill="#2563EB" textAnchor="middle" fontWeight="bold">口角</text>
                  
                  {/* 左側の基準線（目尻左と口角左の平均） */}
                  <line x1="30" y1="115" x2="90" y2="115" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4,4" opacity="0.7"/>
                  <text x="30" y="112" fontSize="8" fill="#3B82F6" fontWeight="bold">基準線(左)</text>
                  
                  {/* 右側の基準線（目尻右と口角右の平均） */}
                  <line x1="110" y1="115" x2="170" y2="115" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4,4" opacity="0.7"/>
                  <text x="140" y="112" fontSize="8" fill="#3B82F6" fontWeight="bold">基準線(右)</text>
                  
                  {/* 左頬中心 */}
                  <circle cx="70" cy="170" r="4" fill="#DC2626"/>
                  <text x="70" y="185" fontSize="8" fill="#DC2626" textAnchor="middle" fontWeight="bold">左頬中心</text>
                  
                  {/* 右頬中心 */}
                  <circle cx="130" cy="170" r="4" fill="#DC2626"/>
                  <text x="130" y="185" fontSize="8" fill="#DC2626" textAnchor="middle" fontWeight="bold">右頬中心</text>
                  
                  {/* 左側の下降量の矢印 */}
                  <line x1="70" y1="115" x2="70" y2="170" stroke="#DC2626" strokeWidth="3" markerEnd="url(#arrowhead-red)"/>
                  <text x="55" y="142" fontSize="9" fill="#DC2626" fontWeight="bold">CDI_L</text>
                  
                  {/* 右側の下降量の矢印 */}
                  <line x1="130" y1="115" x2="130" y2="170" stroke="#DC2626" strokeWidth="3" markerEnd="url(#arrowhead-red)"/>
                  <text x="145" y="142" fontSize="9" fill="#DC2626" fontWeight="bold">CDI_R</text>
                  
                  {/* 平均の説明 */}
                  <text x="100" y="210" fontSize="9" fill="#DC2626" textAnchor="middle" fontWeight="bold">CDI = (CDI_L + CDI_R) ÷ 2</text>
                  <text x="100" y="225" fontSize="8" fill="#6B7280" textAnchor="middle">左右の平均値</text>
                  
                  {/* 矢印のマーカー定義 */}
                  <defs>
                    <marker id="arrowhead-red" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 10 3, 0 6" fill="#DC2626"/>
                    </marker>
                  </defs>
                </svg>
              </div>
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
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                下顎角 (JLA)
              </span>
              <span className="text-xs text-gray-700">
                数値の減少が改善を意味します（フェイスラインが引き締まる）
              </span>
            </div>
            <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
              <p className="font-semibold mb-1">📖 説明:</p>
              <p>顎角から耳珠と顎先への角度差を測定します。値が小さいほどフェイスラインが引き締まり、シャープな輪郭になります。</p>
            </div>
            {/* JLAの図解 */}
            <div className="mb-3 flex justify-center">
              <div className="w-full max-w-xs">
                <svg viewBox="0 0 200 200" className="w-full h-auto">
                  {/* 背景 */}
                  <rect width="200" height="200" fill="#FEF3C7" rx="8"/>
                  
                  {/* 顔の輪郭（側面） */}
                  <ellipse cx="100" cy="100" rx="60" ry="80" fill="#FDE68A" stroke="#6B7280" strokeWidth="2"/>
                  
                  {/* 顎角（左） */}
                  <circle cx="50" cy="150" r="4" fill="#2563EB"/>
                  <text x="50" y="145" fontSize="8" fill="#2563EB" textAnchor="middle" fontWeight="bold">顎角</text>
                  
                  {/* 顎角（右） */}
                  <circle cx="150" cy="150" r="4" fill="#2563EB"/>
                  <text x="150" y="145" fontSize="8" fill="#2563EB" textAnchor="middle" fontWeight="bold">顎角</text>
                  
                  {/* 耳珠（左） */}
                  <circle cx="30" cy="90" r="3" fill="#10B981"/>
                  <text x="30" y="85" fontSize="8" fill="#10B981" textAnchor="middle" fontWeight="bold">耳珠</text>
                  
                  {/* 耳珠（右） */}
                  <circle cx="170" cy="90" r="3" fill="#10B981"/>
                  <text x="170" y="85" fontSize="8" fill="#10B981" textAnchor="middle" fontWeight="bold">耳珠</text>
                  
                  {/* 顎先 */}
                  <circle cx="100" cy="170" r="3" fill="#9333EA"/>
                  <text x="100" y="185" fontSize="8" fill="#9333EA" textAnchor="middle" fontWeight="bold">顎先</text>
                  
                  {/* 角度線（左側）: 顎角→耳珠 */}
                  <line x1="50" y1="150" x2="30" y2="90" stroke="#2563EB" strokeWidth="2"/>
                  {/* 角度線（左側）: 顎角→顎先 */}
                  <line x1="50" y1="150" x2="100" y2="170" stroke="#2563EB" strokeWidth="2"/>
                  {/* 角度アーク（左側） */}
                  <path d="M 50 150 Q 50 120 30 90" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeDasharray="2,2"/>
                  <text x="40" y="115" fontSize="9" fill="#2563EB" fontWeight="bold">JLA</text>
                  
                  {/* 角度線（右側）: 顎角→耳珠 */}
                  <line x1="150" y1="150" x2="170" y2="90" stroke="#2563EB" strokeWidth="2"/>
                  {/* 角度線（右側）: 顎角→顎先 */}
                  <line x1="150" y1="150" x2="100" y2="170" stroke="#2563EB" strokeWidth="2"/>
                  {/* 角度アーク（右側） */}
                  <path d="M 150 150 Q 150 120 170 90" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeDasharray="2,2"/>
                </svg>
              </div>
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
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                口角下がり角 (MCD)
              </span>
              <span className="text-xs text-gray-700">
                数値の減少が改善を意味します（口角が上がる）
              </span>
            </div>
            <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
              <p className="font-semibold mb-1">📖 説明:</p>
              <p>左右の口角を結んだ線の水平角度を測定します。値が小さいほど口角が上がり、若々しい印象になります。</p>
            </div>
            {/* MCDの図解 */}
            <div className="mb-3 flex justify-center">
              <div className="w-full max-w-xs">
                <svg viewBox="0 0 200 150" className="w-full h-auto">
                  {/* 背景 */}
                  <rect width="200" height="150" fill="#FEF3C7" rx="8"/>
                  
                  {/* 顔の輪郭（正面） */}
                  <ellipse cx="100" cy="75" rx="70" ry="60" fill="#FDE68A" stroke="#6B7280" strokeWidth="2"/>
                  
                  {/* 目 */}
                  <ellipse cx="80" cy="50" rx="8" ry="5" fill="#374151"/>
                  <ellipse cx="120" cy="50" rx="8" ry="5" fill="#374151"/>
                  
                  {/* 鼻 */}
                  <ellipse cx="100" cy="65" rx="4" ry="6" fill="#9CA3AF"/>
                  
                  {/* 左口角 */}
                  <circle cx="85" cy="100" r="3" fill="#2563EB"/>
                  <text x="85" y="95" fontSize="8" fill="#2563EB" textAnchor="middle" fontWeight="bold">口角</text>
                  
                  {/* 右口角 */}
                  <circle cx="115" cy="100" r="3" fill="#2563EB"/>
                  <text x="115" y="95" fontSize="8" fill="#2563EB" textAnchor="middle" fontWeight="bold">口角</text>
                  
                  {/* 口角を結ぶ線 */}
                  <line x1="85" y1="100" x2="115" y2="100" stroke="#2563EB" strokeWidth="2"/>
                  
                  {/* 水平線（基準） */}
                  <line x1="30" y1="100" x2="170" y2="100" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6"/>
                  <text x="30" y="97" fontSize="8" fill="#9CA3AF" fontWeight="bold">水平線</text>
                  
                  {/* 角度アーク */}
                  <path d="M 85 100 Q 100 90 115 100" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeDasharray="2,2"/>
                  <text x="100" y="88" fontSize="9" fill="#2563EB" textAnchor="middle" fontWeight="bold">MCD</text>
                </svg>
              </div>
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
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                ジョウル幅比 (JWR)
              </span>
              <span className="text-xs text-gray-700">
                数値の減少が改善を意味します（顎が引き締まる）
              </span>
            </div>
            <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
              <p className="font-semibold mb-1">📖 説明:</p>
              <p>顎の幅（左右の顎角間）と耳の幅（左右の耳珠間）の比率を測定します。値が小さいほど顎が引き締まっている状態です。</p>
            </div>
            {/* JWRの図解 */}
            <div className="mb-3 flex justify-center">
              <div className="w-full max-w-xs">
                <svg viewBox="0 0 200 180" className="w-full h-auto">
                  {/* 背景 */}
                  <rect width="200" height="180" fill="#FEF3C7" rx="8"/>
                  
                  {/* 顔の輪郭（正面） */}
                  <ellipse cx="100" cy="90" rx="70" ry="75" fill="#FDE68A" stroke="#6B7280" strokeWidth="2"/>
                  
                  {/* 目 */}
                  <ellipse cx="80" cy="60" rx="8" ry="5" fill="#374151"/>
                  <ellipse cx="120" cy="60" rx="8" ry="5" fill="#374151"/>
                  
                  {/* 左顎角 */}
                  <circle cx="50" cy="140" r="4" fill="#2563EB"/>
                  <text x="50" y="135" fontSize="8" fill="#2563EB" textAnchor="middle" fontWeight="bold">顎角</text>
                  
                  {/* 右顎角 */}
                  <circle cx="150" cy="140" r="4" fill="#2563EB"/>
                  <text x="150" y="135" fontSize="8" fill="#2563EB" textAnchor="middle" fontWeight="bold">顎角</text>
                  
                  {/* 左耳珠 */}
                  <circle cx="30" cy="80" r="3" fill="#10B981"/>
                  <text x="30" y="75" fontSize="8" fill="#10B981" textAnchor="middle" fontWeight="bold">耳珠</text>
                  
                  {/* 右耳珠 */}
                  <circle cx="170" cy="80" r="3" fill="#10B981"/>
                  <text x="170" y="75" fontSize="8" fill="#10B981" textAnchor="middle" fontWeight="bold">耳珠</text>
                  
                  {/* 顎幅の矢印 */}
                  <line x1="50" y1="140" x2="150" y2="140" stroke="#2563EB" strokeWidth="3" markerEnd="url(#arrowhead-blue)" markerStart="url(#arrowhead-blue-start)"/>
                  <text x="100" y="155" fontSize="9" fill="#2563EB" textAnchor="middle" fontWeight="bold">顎幅</text>
                  
                  {/* 耳幅の矢印 */}
                  <line x1="30" y1="80" x2="170" y2="80" stroke="#10B981" strokeWidth="3" markerEnd="url(#arrowhead-green)" markerStart="url(#arrowhead-green-start)"/>
                  <text x="100" y="70" fontSize="9" fill="#10B981" textAnchor="middle" fontWeight="bold">耳幅</text>
                  
                  {/* 比率表示 */}
                  <text x="100" y="110" fontSize="10" fill="#DC2626" textAnchor="middle" fontWeight="bold">JWR = 顎幅 ÷ 耳幅</text>
                  
                  {/* 矢印のマーカー定義 */}
                  <defs>
                    <marker id="arrowhead-blue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                      <polygon points="0 0, 10 3, 0 6" fill="#2563EB"/>
                    </marker>
                    <marker id="arrowhead-blue-start" markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto">
                      <polygon points="10 0, 0 3, 10 6" fill="#2563EB"/>
                    </marker>
                    <marker id="arrowhead-green" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                      <polygon points="0 0, 10 3, 0 6" fill="#10B981"/>
                    </marker>
                    <marker id="arrowhead-green-start" markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto">
                      <polygon points="10 0, 0 3, 10 6" fill="#10B981"/>
                    </marker>
                  </defs>
                </svg>
              </div>
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

