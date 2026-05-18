import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface WeightageValidatorProps {
  totalWeightage: number;
  goalCount: number;
}

const WeightageValidator: React.FC<WeightageValidatorProps> = ({ totalWeightage, goalCount }) => {
  const isValid = totalWeightage === 100;
  const isOver = totalWeightage > 100;
  const remaining = 100 - totalWeightage;

  const getBarColor = () => {
    if (isValid) return 'bg-emerald-500';
    if (isOver) return 'bg-red-500';
    if (totalWeightage >= 80) return 'bg-amber-500';
    return 'bg-red-400';
  };

  const getTextColor = () => {
    if (isValid) return 'text-emerald-700';
    if (isOver) return 'text-red-700';
    return 'text-amber-700';
  };

  const getBgColor = () => {
    if (isValid) return 'bg-emerald-50 border-emerald-200';
    if (isOver) return 'bg-red-50 border-red-200';
    return 'bg-amber-50 border-amber-200';
  };

  const getMessage = () => {
    if (isValid) return 'Total weightage is exactly 100%. Ready to submit.';
    if (isOver) return `Over by ${Math.abs(remaining)}%. Please reduce weightage of some goals.`;
    return `${remaining}% remaining to allocate. Total must equal 100%.`;
  };

  return (
    <div className={`rounded-xl border p-4 ${getBgColor()}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isValid ? (
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          <span className="text-sm font-semibold text-gray-900">Weightage Summary</span>
        </div>
        <span className={`text-2xl font-bold ${getTextColor()}`}>{totalWeightage}%</span>
      </div>

      <div className="h-3 bg-white rounded-full overflow-hidden border border-gray-200 mb-3">
        <div
          className={`h-full rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${Math.min(totalWeightage, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className={`text-xs font-medium ${getTextColor()}`}>{getMessage()}</p>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{goalCount} goal{goalCount !== 1 ? 's' : ''}</span>
          {!isValid && <span className="font-medium text-gray-700">Need: 100%</span>}
        </div>
      </div>

      {!isValid && totalWeightage > 0 && (
        <p className="text-xs mt-2 text-gray-500">
          Tip: Ensure all goal weightages sum to exactly 100%. Each goal must have at least 10%.
        </p>
      )}
    </div>
  );
};

export default WeightageValidator;
