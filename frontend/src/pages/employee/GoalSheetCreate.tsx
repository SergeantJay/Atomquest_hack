import React, { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Trash2, Loader2, Lock, Share2, Info, ChevronDown, ChevronUp, Send, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { goalSheetsApi, goalsApi, cyclesApi, thrustAreasApi } from '../../services/api';
import { GoalSheet, GoalCycle, ThrustArea, Goal, UoMType } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import WeightageValidator from '../../components/WeightageValidator';

const UOM_OPTIONS: { value: UoMType; label: string; description: string; formula: string }[] = [
  { value: 'MAX', label: 'Maximize (MAX)', description: 'Higher actual is better. Score = (Actual / Target) × 100', formula: 'Score = (Actual ÷ Target) × 100' },
  { value: 'MIN', label: 'Minimize (MIN)', description: 'Lower actual is better. Score = (Target / Actual) × 100', formula: 'Score = (Target ÷ Actual) × 100' },
  { value: 'TIMELINE', label: 'Timeline (Date)', description: 'Completion by a target date. Enter a date instead of a number.', formula: 'Score = 100 if completed on time' },
  { value: 'ZERO', label: 'Binary (ZERO)', description: 'Either achieved (100%) or not (0%). No partial credit.', formula: 'Score = 100 if achieved, else 0' },
];

interface GoalFormData {
  thrustAreaId: string;
  title: string;
  description: string;
  uomType: UoMType;
  target: number;
  targetDate: string;
  weightage: number;
}

const defaultGoalForm: GoalFormData = { thrustAreaId: '', title: '', description: '', uomType: 'MAX', target: 0, targetDate: '', weightage: 10 };

const GoalSheetCreate: React.FC = () => {
  const [sheet, setSheet] = useState<GoalSheet | null>(null);
  const [cycle, setCycle] = useState<GoalCycle | null>(null);
  const [thrustAreas, setThrustAreas] = useState<ThrustArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm<GoalFormData>({ defaultValues: defaultGoalForm });
  const watchedUom = watch('uomType');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cycleData, areasData] = await Promise.all([cyclesApi.getActive(), thrustAreasApi.getAll()]);
      setCycle(cycleData);
      setThrustAreas(areasData);
      if (cycleData) {
        const sheetData = await goalSheetsApi.getMySheet(cycleData.id);
        setSheet(sheetData);
      }
    } catch { toast.error('Failed to load data'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalWeightage = sheet?.goals?.reduce((acc, g) => acc + g.weightage, 0) ?? 0;
  const canEdit = sheet?.status === 'DRAFT' || sheet?.status === 'RETURNED' || !sheet;
  const isLocked = sheet?.status === 'APPROVED';

  const handleCreateSheet = async () => {
    if (!cycle) return;
    try {
      const newSheet = await goalSheetsApi.create(cycle.id);
      setSheet(newSheet);
      toast.success('Goal sheet created');
    } catch { toast.error('Failed to create goal sheet'); }
  };

  const handleAddGoal = async (data: GoalFormData) => {
    if (!sheet) return;
    if (sheet.goals.length >= 8) { toast.error('Maximum 8 goals allowed per sheet'); return; }
    setSaving('add');
    try {
      const goalData = {
        thrustAreaId: data.thrustAreaId,
        title: data.title,
        description: data.description || undefined,
        uomType: data.uomType,
        target: data.uomType === 'TIMELINE' || data.uomType === 'ZERO' ? 1 : Number(data.target),
        targetDate: data.uomType === 'TIMELINE' ? data.targetDate : undefined,
        weightage: Number(data.weightage),
      };
      if (editingGoal) {
        const updated = await goalsApi.updateGoal(sheet.id, editingGoal.id, goalData);
        setSheet((prev) => prev ? { ...prev, goals: prev.goals.map((g) => (g.id === editingGoal.id ? updated : g)) } : null);
        toast.success('Goal updated');
        setEditingGoal(null);
      } else {
        await goalsApi.addGoal(sheet.id, goalData);
        const refreshed = await goalSheetsApi.getById(sheet.id);
        setSheet(refreshed);
        toast.success('Goal added');
      }
      reset(defaultGoalForm);
      setShowAddGoal(false);
    } catch { toast.error('Failed to save goal'); } finally { setSaving(null); }
  };

  const handleEditGoal = (goal: Goal) => {
    if (goal.isLocked || goal.isShared) return;
    setEditingGoal(goal);
    reset({ thrustAreaId: goal.thrustAreaId, title: goal.title, description: goal.description ?? '', uomType: goal.uomType, target: goal.target, targetDate: goal.targetDate ?? '', weightage: goal.weightage });
    setShowAddGoal(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!sheet) return;
    if (!window.confirm('Are you sure you want to remove this goal?')) return;
    try {
      await goalsApi.deleteGoal(sheet.id, goalId);
      setSheet((prev) => prev ? { ...prev, goals: prev.goals.filter((g) => g.id !== goalId) } : null);
      toast.success('Goal removed');
    } catch { toast.error('Failed to remove goal'); }
  };

  const handleSubmitSheet = async () => {
    if (!sheet) return;
    if (totalWeightage !== 100) { toast.error('Total weightage must be exactly 100% before submitting'); return; }
    if (sheet.goals.length === 0) { toast.error('Please add at least one goal before submitting'); return; }
    setSubmitting(true);
    try {
      const updated = await goalSheetsApi.submit(sheet.id);
      setSheet(updated);
      toast.success('Goal sheet submitted for approval!');
    } catch { toast.error('Failed to submit goal sheet'); } finally { setSubmitting(false); }
  };

  const toggleGoalExpand = (goalId: string) => {
    setExpandedGoals((prev) => { const next = new Set(prev); if (next.has(goalId)) next.delete(goalId); else next.add(goalId); return next; });
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  if (!cycle) return (
    <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
      <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <h2 className="text-lg font-semibold text-gray-700">No Active Cycle</h2>
      <p className="text-sm text-gray-500 mt-1">There is no active goal cycle. Please contact your administrator.</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between">
          <div><h1 className="text-xl font-bold text-gray-900">Goal Sheet</h1><p className="text-sm text-gray-500 mt-0.5">{cycle.name}</p></div>
          <div className="flex items-center gap-3">
            {sheet && <StatusBadge status={sheet.status} />}
            {sheet?.status === 'RETURNED' && <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">Returned for rework</span>}
          </div>
        </div>
        {isLocked && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
            <Lock className="w-4 h-4" />
            This goal sheet is approved and locked. You can view goals but cannot make changes.
          </div>
        )}
      </div>

      {!sheet && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <Plus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-700">Create Your Goal Sheet</h2>
          <p className="text-sm text-gray-500 mt-1 mb-5">Start by creating a goal sheet for {cycle.name}</p>
          <button onClick={handleCreateSheet} className="btn-primary">Create Goal Sheet</button>
        </div>
      )}

      {sheet && (
        <>
          <WeightageValidator totalWeightage={totalWeightage} goalCount={sheet.goals.length} />

          {canEdit && (
            <div className="bg-white rounded-xl border border-gray-200">
              <button
                onClick={() => { setShowAddGoal(!showAddGoal); if (!showAddGoal) { setEditingGoal(null); reset(defaultGoalForm); } }}
                className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors rounded-xl"
              >
                <div className="flex items-center gap-2"><Plus className="w-4 h-4 text-indigo-600" />{editingGoal ? 'Edit Goal' : 'Add New Goal'}</div>
                {showAddGoal ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {showAddGoal && (
                <form onSubmit={handleSubmit(handleAddGoal)} className="px-5 pb-5 border-t border-gray-100">
                  <div className="pt-4 grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Thrust Area <span className="text-red-500">*</span></label>
                      <select className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.thrustAreaId ? 'border-red-400' : 'border-gray-300'}`} {...register('thrustAreaId', { required: 'Thrust area is required' })}>
                        <option value="">Select thrust area…</option>
                        {thrustAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
                      </select>
                      {errors.thrustAreaId && <p className="text-xs text-red-600 mt-1">{errors.thrustAreaId.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Goal Title <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="e.g., Reduce average bug resolution time" className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.title ? 'border-red-400' : 'border-gray-300'}`} {...register('title', { required: 'Goal title is required', minLength: { value: 5, message: 'At least 5 characters' }, maxLength: { value: 200, message: 'Max 200 characters' } })} />
                      {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                      <textarea rows={2} placeholder="Brief description of this goal…" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" {...register('description')} />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Unit of Measure (UoM) <span className="text-red-500">*</span></label>
                      <Controller name="uomType" control={control} rules={{ required: true }} render={({ field }) => (
                        <div className="grid grid-cols-2 gap-2">
                          {UOM_OPTIONS.map((opt) => (
                            <button key={opt.value} type="button" onClick={() => field.onChange(opt.value)}
                              className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${field.value === opt.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                              <p className="font-medium text-xs">{opt.label}</p>
                              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{opt.description}</p>
                            </button>
                          ))}
                        </div>
                      )} />
                      {watchedUom && <p className="text-xs text-indigo-600 mt-1.5 bg-indigo-50 px-2.5 py-1.5 rounded-md">Formula: {UOM_OPTIONS.find((o) => o.value === watchedUom)?.formula}</p>}
                    </div>

                    {watchedUom !== 'ZERO' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{watchedUom === 'TIMELINE' ? 'Target Date' : 'Target Value'}<span className="text-red-500"> *</span></label>
                        {watchedUom === 'TIMELINE' ? (
                          <input type="date" className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.targetDate ? 'border-red-400' : 'border-gray-300'}`} {...register('targetDate', { required: watchedUom === 'TIMELINE' ? 'Target date is required' : false })} />
                        ) : (
                          <input type="number" min={0} step="any" placeholder="Enter numeric target" className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.target ? 'border-red-400' : 'border-gray-300'}`} {...register('target', { required: !(['TIMELINE', 'ZERO'] as UoMType[]).includes(watchedUom) ? 'Target is required' : false, min: { value: 0, message: 'Target must be positive' } })} />
                        )}
                        {errors.target && <p className="text-xs text-red-600 mt-1">{errors.target.message}</p>}
                        {errors.targetDate && <p className="text-xs text-red-600 mt-1">{errors.targetDate.message}</p>}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Weightage (%) <span className="text-red-500">*</span></label>
                      <div className="flex items-center gap-3">
                        <input type="number" min={10} max={100} step={5} className={`w-32 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.weightage ? 'border-red-400' : 'border-gray-300'}`} {...register('weightage', { required: 'Weightage is required', min: { value: 10, message: 'Minimum weightage is 10%' }, max: { value: 100, message: 'Maximum weightage is 100%' } })} />
                        <p className="text-xs text-gray-500">Min: 10%, Max: 100%</p>
                      </div>
                      {errors.weightage && <p className="text-xs text-red-600 mt-1">{errors.weightage.message}</p>}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button type="submit" disabled={saving === 'add'} className="btn-primary text-sm">
                        {saving === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {editingGoal ? 'Update Goal' : 'Add Goal'}
                      </button>
                      <button type="button" onClick={() => { setShowAddGoal(false); setEditingGoal(null); reset(defaultGoalForm); }} className="btn-secondary text-sm">Cancel</button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Goals ({sheet.goals.length}/8)</h2>
            </div>

            {sheet.goals.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <p className="text-sm text-gray-500">No goals added yet. Use the form above to add your first goal.</p>
              </div>
            ) : (
              sheet.goals.map((goal, index) => {
                const isExpanded = expandedGoals.has(goal.id);
                const area = thrustAreas.find((a) => a.id === goal.thrustAreaId);
                return (
                  <div key={goal.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleGoalExpand(goal.id)}>
                      <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-indigo-600">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{goal.title}</p>
                          {goal.isShared && <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded-full"><Share2 className="w-2.5 h-2.5" />Shared</span>}
                          {goal.isLocked && <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full"><Lock className="w-2.5 h-2.5" />Locked</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-500">{area?.name}</span>
                          <span className="text-xs text-indigo-600 font-medium">{goal.weightage}%</span>
                          <span className="text-xs text-gray-400">{goal.uomType}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {canEdit && !goal.isLocked && !goal.isShared && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleEditGoal(goal); }} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 hover:bg-indigo-50 rounded">Edit</button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal.id); }} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div><p className="text-gray-500 mb-0.5">Thrust Area</p><p className="font-medium text-gray-700">{area?.name ?? '—'}</p></div>
                          <div><p className="text-gray-500 mb-0.5">UoM Type</p><p className="font-medium text-gray-700">{goal.uomType}</p></div>
                          <div><p className="text-gray-500 mb-0.5">Target</p><p className="font-medium text-gray-700">{goal.uomType === 'TIMELINE' ? goal.targetDate ?? 'TBD' : goal.uomType === 'ZERO' ? 'Achieve' : goal.target}</p></div>
                          <div><p className="text-gray-500 mb-0.5">Weightage</p><p className="font-medium text-indigo-600">{goal.weightage}%</p></div>
                        </div>
                        {goal.description && <div className="mt-2"><p className="text-gray-500 text-xs mb-0.5">Description</p><p className="text-xs text-gray-700">{goal.description}</p></div>}
                        {goal.isShared && <div className="mt-2 flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 px-2 py-1.5 rounded-md"><Share2 className="w-3.5 h-3.5" />This is a shared goal. Title and target are set by your manager. You can adjust the weightage.</div>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {canEdit && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Submit for Approval</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Once submitted, your manager will review and approve your goals.</p>
                </div>
                <button onClick={handleSubmitSheet} disabled={submitting || totalWeightage !== 100 || sheet.goals.length === 0} className="btn-primary">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit for Approval
                </button>
              </div>
              {totalWeightage !== 100 && <p className="text-xs text-red-600 mt-2">Total weightage must be 100% to submit. Current: {totalWeightage}%</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GoalSheetCreate;
