import React from 'react';

interface MetricBoxProps {
  label: string;
  beforeValue?: number;
  afterValue: number;
  unit?: string;
  color?: string;
  description?: string;
  isImprovement?: (change: number) => boolean;
  showEmoji?: boolean;
  className?: string;
}

export const MetricBox: React.FC<MetricBoxProps> = ({
  label,
  beforeValue,
  afterValue,
  unit = "",
  description,
  isImprovement,
  showEmoji = true,
  className = ""
}) => {
  const change = beforeValue ? afterValue - beforeValue : 0;
  const changePercent = beforeValue ? (change / beforeValue) * 100 : 0;
  const isGood = beforeValue && isImprovement ? isImprovement(change) : null;
  
  return (
    <div className={`bg-white p-3 rounded-lg shadow-sm border border-gray-100 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className={`text-sm font-bold ${
          change < 0 ? 'text-green-600' : 
          change > 0 ? 'text-red-600' : 'text-gray-600'
        }`}>
          {change > 0 ? '+' : ''}{change.toFixed(1)}{unit}
        </span>
      </div>
      
      {description && (
        <div className="text-xs text-gray-500 mb-2">{description}</div>
      )}
      
      {beforeValue && (
        <div className="text-xs text-gray-500 mb-2">
          {beforeValue.toFixed(1)}{unit} → {afterValue.toFixed(1)}{unit}
        </div>
      )}
      
      {beforeValue && showEmoji && isGood !== null && (
        <div className="flex items-center justify-center gap-1 mt-1">
          <span className={`text-xs font-medium ${
            change > 0 ? "text-green-600" : change < 0 ? "text-red-500" : "text-gray-500"
          }`}>
            {change > 0 ? "↗" : change < 0 ? "↘" : "→"} {Math.abs(changePercent).toFixed(1)}%
          </span>
          <span className="text-lg">
            {isGood ? "😃" : "😢"}
          </span>
        </div>
      )}
    </div>
  );
};
