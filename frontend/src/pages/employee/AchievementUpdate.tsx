import React, { useEffect, useState } from 'react';
import { Loader2, Save, Info, TrendingUp, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { goalSheetsApi, cyclesApi, achievementsApi } from '../../services/api';
import { GoalSheet, GoalCycle, Quarter } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { format } from 'date-fns';

type GoalStatus = 'NOT_STARTED' | 'ON_TRACK' | 'COMPLETED';

interface AchievementForm {
  actual: string;
  actualDate: string;
  status: GoalStatus;
}

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

const getCurrentQuarter = (): Quarter => {
  const month = new Date().getMonth() + 1;
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
};

const computeScore = (uomType: string, target: number, actual: number | undefined, actualDate: string | undefined, status: GoalStatus, targetDate?: string): number | null => {
  if (actual === undefined && !actualDate) return null;
  if (uomType === 'MAX') { if (actual === undefined) return null; return Math.min(Math.round((actual / target) * 100), 120); }
  if (uomType === 'MIN') { if (actual === undefined || actual === 0) return actual === 0 ? 100 : null; return Math.min(Math.round((target / actual) * 100), 120); }
  if (uomType === 'ZERO') return status === 'COMPLETED' ? 100 : 0;
  if (uomType === 'TIMELINE') {
    if (status === 'COMPLETED') {
      if (targetDate && actualDate) { const td = new Date(targetDate); const ad = new Date(actualDate); return ad <= td ? 100 : 80; }
      return 100;
    }
    if (status === 'ON_TRACK') return 50;
    return 0;
  }
  return null;
};

const AchievementUpdate: React.FC = () => {
  const [sheet, setSheet] = useState<GoalSheet | null>(null);
  const [cycle, setCycle] = useState<GoalCycle | null>(null);
  const [activeQuarter, setActiveQuarter] = useState<Quarter>(getCurrentQuarter());
  const [forms, setForms] = useState<Record<string, AchievementForm>>({});
  const [savingGoal, setSavingGoal] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
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
          if (sheetData) {
            const initialForms: Record<string, AchievementForm> = {};
            sheetData.goals.forEach((goal) => {
              const achievement = goal.achievements?.find((a) => a.quarter === activeQuarter);
              initialForms[goal.id] = { actual: achievement?.actual?.toString() ?? '', actualDate: achievement?.actualDate ?? '', status: (achievement?.status as GoalStatus) ?? 'NOT_STARTED' };
            });
            setForms(initialForms);
          }
        }
      } catch { toast.error('Failed to load data'); } finally { setLoading(false); }
    };
    fetchData();
  }, [activeQuarter]);

  const handleFormChange = (goalId: string, field: keyof AchievementForm, value: string) => {
    setForms((prev) => ({ ...prev, [goalId]: { ...prev[goalId], [field]: value } }));
  };

  const handleSaveGoal = async (goalId: string) => {
    if (!sheet) return;
    const form = forms[goalId];
    if (!form) return;
    setSavingGoal(goalId);
    try {
      await achievementsApi.updateAchievement(goalId, activeQuarter, { actual: form.actual ? Number(form.actual) : undefined, actualDate: form.actualDate || undefined, status: form.status });
      toast.success('Achievement saved');
    } catch { toast.error('Failed to save achievement'); } finally { setSavingGoal(null); }
  };

  const handleSaveAll = async () => {
    if (!sheet) return;
    setSavingAll(true);
    try {
      await Promise.all(sheet.goals.map((goal) => {
        const form = forms[goal.id];
        if (!form) return Promise.resolve();
        return achievementsApi.updateAchievement(goal.id, activeQuarter, { actual: form.actual ? Number(form.actual) : undefined, actualDate: form.actualDate || undefined, status: form.status });
      }));
      toast.success('All achievements saved!');
    } catch { toast.error('Some achievements could not be saved'); } finally { setSavingAll(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  if (!sheet || sheet.status !== 'APPROVED') return (
    <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
      <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
      <h2 className="text-lg font-semibold text-gray-700">No Approved Goal Sheet</h2>
      <p className="text-sm text-gray-500 mt-1">{!sheet ? 'You have no goal sheet for the active cycle.' : `Your goal sheet is currently ${sheet.status.toLowerCase()}. Achievements can only be recorded after approval.`}</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between">
          <div><h1 className="text-xl font-bold text-gray-900">Achievement Update</h1><p className="text-sm text-gray-500 mt-0.5">{cycle?.name}</p></div>
          <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" /><span className="text-sm font-medium text-indigo-600">Recording for {activeQuarter}</span></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-700 mb-3">Select Quarter</p>
        <div className="flex gap-2">
          {QUARTERS.map((q) => (
            <button key={q} onClick={() => setActiveQuarter(q)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeQuarter === q ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {q}{q === getCurrentQuarter() && <span className="ml-1 text-xs opacity-75">(current)</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {sheet.goals.map((goal) => {
          const form = forms[goal.id];
          if (!form) return null;
          const actualNum = form.actual ? Number(form.actual) : undefined;
          const score = computeScore(goal.uomType, goal.target, actualNum, form.actualDate || undefined, form.status, goal.targetDate);

          return (
            <div key={goal.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900">{goal.title}</h3>
                    {goal.thrustArea && <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">{goal.thrustArea.name}</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span>UoM: <span className="font-medium text-gray-700">{goal.uomType}</span></span>
                    <span>Target: <span className="font-medium text-gray-700">{goal.uomType === 'TIMELINE' ? goal.targetDate ? format(new Date(goal.targetDate), 'MMM d, yyyy') : 'TBD' : goal.uomType === 'ZERO' ? 'Achieve' : goal.target}</span></span>
                    <span>Weight: <span className="font-medium text-indigo-600">{goal.weightage}%</span></span>
                  </div>
                </div>
                {score !== null && (
                  <div className="text-right ml-3 flex-shrink-0">
                    <p className="text-xs text-gray-500 mb-0.5">Score</p>
                    <p className={`text-2xl font-bold ${score >= 100 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{score}%</p>
                  </div>
                )}
              </div>

              {score !== null && <div className="mb-4"><ProgressBar value={score} /></div>}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {goal.uomType !== 'ZERO' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">{goal.uomType === 'TIMELINE' ? 'Actual Date' : 'Actual Value'}</label>
                    {goal.uomType === 'TIMELINE' ? (
                      <input type="date" value={form.actualDate} onChange={(e) => handleFormChange(goal.id, 'actualDate', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    ) : (
                      <input type="number" step="any" min={0} value={form.actual} onChange={(e) => handleFormChange(goal.id, 'actual', e.target.value)} placeholder={`Target: ${goal.target}`} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => handleFormChange(goal.id, 'status', e.target.value as GoalStatus)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="ON_TRACK">On Track</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={() => handleSaveGoal(goal.id)} disabled={savingGoal === goal.id} className="btn-secondary text-sm w-full">
                    {savingGoal === goal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-start gap-1.5 text-xs text-gray-500">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  {goal.uomType === 'MAX' && 'Score = (Actual ÷ Target) × 100. Higher actual = higher score.'}
                  {goal.uomType === 'MIN' && 'Score = (Target ÷ Actual) × 100. Lower actual = higher score.'}
                  {goal.uomType === 'TIMELINE' && 'Score = 100 if completed on or before target date.'}
                  {goal.uomType === 'ZERO' && 'Score = 100 if completed, else 0. Select Completed status to achieve full score.'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Save All Achievements</h3>
          <p className="text-xs text-gray-500 mt-0.5">Save all {activeQuarter} achievements at once</p>
        </div>
        <button onClick={handleSaveAll} disabled={savingAll} className="btn-primary">
          {savingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save All
        </button>
      </div>
    </div>
  );
};

export default AchievementUpdate;
