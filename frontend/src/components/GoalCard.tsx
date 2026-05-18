import React from 'react';
import { Goal } from '../types';
import StatusBadge from './StatusBadge';
import ProgressBar from './ProgressBar';
import { Lock, Share2, Target } from 'lucide-react';

interface GoalCardProps {
  goal: Goal;
  showAchievements?: boolean;
  activeQuarter?: string;
  onEdit?: (goal: Goal) => void;
  onDelete?: (goalId: string) => void;
  compact?: boolean;
}

const uomDescriptions: Record<string, string> = {
  MAX: 'Higher is better (maximize)',
  MIN: 'Lower is better (minimize)',
  TIMELINE: 'Date-based completion',
  ZERO: 'Binary: achieved or not',
};

const computeScore = (goal: Goal, quarter: string): number | null => {
  const achievement = goal.achievements?.find((a) => a.quarter === quarter);
  if (!achievement || achievement.actual === undefined) return null;

  if (goal.uomType === 'MAX') {
    return Math.min(Math.round((achievement.actual / goal.target) * 100), 120);
  }
  if (goal.uomType === 'MIN') {
    if (achievement.actual === 0) return 100;
    return Math.min(Math.round((goal.target / achievement.actual) * 100), 120);
  }
  if (goal.uomType === 'ZERO') {
    return achievement.actual === 1 ? 100 : 0;
  }
  if (goal.uomType === 'TIMELINE') {
    return achievement.status === 'COMPLETED' ? 100 : achievement.status === 'ON_TRACK' ? 50 : 0;
  }
  return null;
};

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  showAchievements = false,
  activeQuarter,
  onEdit,
  onDelete,
  compact = false,
}) => {
  const latestAchievement = goal.achievements?.[goal.achievements.length - 1];
  const score = activeQuarter ? computeScore(goal, activeQuarter) : null;

  return (
    <div
      className={`bg-white rounded-xl border ${
        goal.isLocked ? 'border-gray-200 bg-gray-50/50' : 'border-gray-200'
      } ${compact ? 'p-3' : 'p-4'} transition-shadow hover:shadow-sm`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {goal.thrustArea && (
              <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                {goal.thrustArea.name}
              </span>
            )}
            {goal.isShared && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full font-medium">
                <Share2 className="w-3 h-3" />
                Shared
              </span>
            )}
            {goal.isLocked && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                <Lock className="w-3 h-3" />
                Locked
              </span>
            )}
          </div>
          <h3
            className={`text-sm font-semibold ${
              goal.isLocked ? 'text-gray-500' : 'text-gray-900'
            } truncate`}
          >
            {goal.title}
          </h3>
          {!compact && goal.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{goal.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onEdit && !goal.isLocked && (
            <button
              onClick={() => onEdit(goal)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Edit
            </button>
          )}
          {onDelete && !goal.isLocked && (
            <button
              onClick={() => onDelete(goal.id)}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className={`${compact ? 'mt-2' : 'mt-3'} flex flex-wrap gap-3`}>
        <div className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-600">
            Target:{' '}
            <span className="font-medium text-gray-800">
              {goal.uomType === 'TIMELINE'
                ? goal.targetDate ?? 'TBD'
                : goal.uomType === 'ZERO'
                ? 'Achieve'
                : goal.target}
            </span>
          </span>
        </div>
        <div className="text-xs text-gray-500">
          <span className="font-medium text-gray-700">{goal.uomType}</span>{' '}
          <span className="text-gray-400">— {uomDescriptions[goal.uomType]}</span>
        </div>
        <div className="text-xs">
          Weight:{' '}
          <span className="font-semibold text-indigo-600">{goal.weightage}%</span>
        </div>
      </div>

      {showAchievements && latestAchievement && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">{latestAchievement.quarter} Progress</span>
            <StatusBadge status={latestAchievement.status} size="sm" />
          </div>
          {score !== null ? (
            <ProgressBar value={score} />
          ) : (
            <p className="text-xs text-gray-400 italic">No achievement recorded</p>
          )}
        </div>
      )}
    </div>
  );
};

export default GoalCard;
