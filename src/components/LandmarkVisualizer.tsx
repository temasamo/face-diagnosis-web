import React from 'react';

interface Landmark {
  type: string;
  position: { x: number; y: number; z: number };
}

interface LandmarkVisualizerProps {
  landmarks: Landmark[];
  title: string;
}

export default function LandmarkVisualizer({ landmarks, title }: LandmarkVisualizerProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">{title}</h3>
      
      {/* ランドマーク一覧 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-800 mb-2">検出されたランドマーク ({landmarks.length}個)</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {landmarks.map((landmark, index) => (
            <div key={index} className="bg-gray-50 p-2 rounded">
              <div className="font-medium text-blue-600">{landmark.type}</div>
              <div className="text-gray-600">
                x: {landmark.position.x.toFixed(1)}, y: {landmark.position.y.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 測定可能な項目 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-800 mb-2">測定可能な項目</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            <span className="text-gray-800">顔の幅: 目の外側間距離</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            <span className="text-gray-800">顔の長さ: 眉毛中央-顎先</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            <span className="text-gray-800">目の間隔: 目の中心間距離</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            <span className="text-gray-800">眉毛と目の距離: 眉毛-目</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            <span className="text-gray-800">フェイスリフト角度: 目尻→口角→顎先</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            <span className="text-gray-800">下顔面比率: 鼻下→口角→顎先</span>
          </div>
        </div>
      </div>

      {/* 利用可能なランドマークタイプ */}
      <div>
        <h4 className="text-sm font-medium text-gray-800 mb-2">利用可能なランドマークタイプ</h4>
        <div className="grid grid-cols-3 gap-1 text-xs">
          {[
            'LEFT_EYE', 'RIGHT_EYE', 'LEFT_OF_LEFT_EYEBROW', 'RIGHT_OF_LEFT_EYEBROW',
            'LEFT_OF_RIGHT_EYEBROW', 'RIGHT_OF_RIGHT_EYEBROW', 'MIDPOINT_BETWEEN_EYES',
            'NOSE_TIP', 'UPPER_LIP', 'LOWER_LIP', 'LEFT_EYE_OUTER_CORNER', 'RIGHT_EYE_OUTER_CORNER',
            'LEFT_EYE_INNER_CORNER', 'RIGHT_EYE_INNER_CORNER', 'LEFT_EAR', 'RIGHT_EAR',
            'LEFT_CHEEK', 'RIGHT_CHEEK', 'CHIN_GNATHION', 'FOREHEAD_GLABELLA'
          ].map((type, index) => (
            <div key={index} className="bg-blue-50 p-1 rounded text-center text-gray-800 font-medium">
              {type}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
