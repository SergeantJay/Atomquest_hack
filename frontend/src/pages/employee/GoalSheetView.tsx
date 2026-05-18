import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Lock, Share2, CheckCircle, User, Calendar, FileText, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { goalSheetsApi, cyclesApi } from '../../services/api';
import { GoalSheet, GoalCycle } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';

const GoalSheetView: React.FC = () => {
  const [sheet, setSheet] = useState<GoalSheet | null>(null);
  const [cycle, setCycle] = useState<GoalCycle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const cycleData = await cyclesApi.getActive();
        setCycle(cycleData);
        if (cycleData) {
          const sheetData = await goalSheetsApi.getMySheet(cycleData.id);
          setSheet(sheetData);
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  if (!sheet) return (
    <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <h2 className="text-lg font-semibold text-gray-700">No Goal Sheet Found</h2>
      <p className="text-sm text-gray-500 mt-1 mb-5">You haven't created a goal sheet for the current cycle.</p>
      <Link to="/goals/create" className="btn-primary">Create Goal Sheet</Link>
    </div>
  );

  const totalWeightage = sheet.goals.reduce((acc, g) => acc + g.weightage, 0);
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

  const computeGoalScore = (goal: typeof sheet.goals[0], quarter: string) => {
    const achievement = goal.achievements?.find((a) => a.quarter === quarter);
    if (!achievement || achievement.actual === undefined) return null;
    if (goal.uomType === 'MAX') return Math.min(Math.round((achievement.actual / goal.target) * 100), 120);
    if (goal.uomType === 'MIN') { if (achievement.actual === 0) return 100; return Math.min(Math.round((goal.target / achievement.actual) * 100), 120); }
    if (goal.uomType === 'ZERO') return achievement.actual === 1 ? 100 : 0;
    if (goal.uomType === 'TIMELINE') return achievement.status === 'COMPLETED' ? 100 : achievement.status === 'ON_TRACK' ? 50 : 0;
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{sheet.cycle?.name ?? 'Goal Sheet'}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{sheet.cycle?.year} • {sheet.cycle?.phase}</p>
          </div>
          <StatusBadge status={sheet.status} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Employee</p>
            <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-gray-400" /><p className="font-medium text-gray-800">{sheet.employee?.name}</p></div>
          </div>
          {sheet.submittedAt && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Submitted</p>
              <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" /><p className="font-medium text-gray-800">{format(new Date(sheet.submittedAt), 'MMM d, yyyy')}</p></div>
            </div>
          )}
          {sheet.approvedAt && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Approved</p>
              <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /><p className="font-medium text-gray-800">{format(new Date(sheet.approvedAt), 'MMM d, yyyy')}</p></div>
            </div>
          )}
          {sheet.approvedBy && (
            <div><p className="text-xs text-gray-500 mb-0.5">Approved By</p><p className="font-medium text-gray-800">{sheet.approvedBy.name}</p></div>
          )}
        </div>

        {sheet.status === 'APPROVED' && (
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
            <Lock className="w-4 h-4" />Goals are locked and approved. You can now record quarterly achievements.
          </div>
        )}
        {sheet.status === 'APPROVED' && (
          <div className="mt-3">
            <Link to="/goals/achievements" className="btn-primary text-sm"><ArrowRight className="w-4 h-4" />Update Achievements</Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-500 mb-1">Total Goals</p><p className="text-2xl font-bold text-gray-900">{sheet.goals.length}</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-500 mb-1">Total Weightage</p><p className={`text-2xl font-bold ${totalWeightage === 100 ? 'text-emerald-600' : 'text-red-500'}`}>{totalWeightage}%</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-500 mb-1">Check-ins Received</p><p className="text-2xl font-bold text-gray-900">{sheet.checkIns?.length ?? 0}</p></div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-900">Goals</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Goal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Thrust Area</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">UoM</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Target</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Weight</th>
                {quarters.map((q) => <th key={q} className="text-right px-4 py-3 text-xs font-semibold text-gray-600">{q}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sheet.goals.map((goal, idx) => (
                <tr key={goal.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-900 text-xs max-w-xs truncate">{goal.title}</span>
                      {goal.isShared && <span title="Shared goal"><Share2 className="w-3 h-3 text-teal-500 flex-shrink-0" /></span>}
                      {goal.isLocked && <span title="Locked"><Lock className="w-3 h-3 text-gray-400 flex-shrink-0" /></span>}
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-gray-600">{goal.thrustArea?.name ?? '—'}</span></td>
                  <td className="px-4 py-3"><span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{goal.uomType}</span></td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-gray-700">{goal.uomType === 'TIMELINE' ? goal.targetDate ? format(new Date(goal.targetDate), 'MMM d, yyyy') : 'TBD' : goal.uomType === 'ZERO' ? 'Achieve' : goal.target}</td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-indigo-600">{goal.weightage}%</td>
                  {quarters.map((q) => {
                    const score = computeGoalScore(goal, q);
                    const achievement = goal.achievements?.find((a) => a.quarter === q);
                    return (
                      <td key={q} className="px-4 py-3 text-right">
                        {score !== null ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs font-semibold ${score >= 100 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{score}%</span>
                            <StatusBadge status={achievement?.status ?? 'NOT_STARTED'} size="sm" />
                          </div>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sheet.checkIns && sheet.checkIns.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-900">Manager Check-ins</h2></div>
          <div className="divide-y divide-gray-100">
            {sheet.checkIns.map((checkIn) => (
              <div key={checkIn.id} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{checkIn.quarter}</span>
                  <span className="text-xs text-gray-500">by {checkIn.manager?.name} • {format(new Date(checkIn.createdAt), 'MMM d, yyyy')}</span>
                </div>
                <p className="text-sm text-gray-700">{checkIn.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalSheetView;
