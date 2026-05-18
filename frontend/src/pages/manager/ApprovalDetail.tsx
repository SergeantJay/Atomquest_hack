import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, CheckCircle, RotateCcw, ArrowLeft, Lock, Share2, AlertTriangle, Save, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { goalSheetsApi, goalsApi } from '../../services/api';
import { GoalSheet, Goal } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import WeightageValidator from '../../components/WeightageValidator';
import { format } from 'date-fns';

interface InlineEdit {
  target: string;
  weightage: string;
}

const ApprovalDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<GoalSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [returning, setReturning] = useState(false);
  const [returnComment, setReturnComment] = useState('');
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [inlineEdits, setInlineEdits] = useState<Record<string, InlineEdit>>({});
  const [savingGoal, setSavingGoal] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await goalSheetsApi.getById(id);
        setSheet(data);
        const edits: Record<string, InlineEdit> = {};
        data.goals.forEach((g) => { edits[g.id] = { target: g.target.toString(), weightage: g.weightage.toString() }; });
        setInlineEdits(edits);
      } catch { toast.error('Failed to load goal sheet'); navigate('/approvals'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id, navigate]);

  const totalWeightage = sheet?.goals?.reduce((acc, g) => {
    const edit = inlineEdits[g.id];
    return acc + (edit ? Number(edit.weightage) : g.weightage);
  }, 0) ?? 0;

  const handleSaveInlineEdit = async (goal: Goal) => {
    if (!sheet) return;
    const edit = inlineEdits[goal.id];
    if (!edit) return;
    setSavingGoal(goal.id);
    try {
      const updated = await goalsApi.updateGoal(sheet.id, goal.id, { target: Number(edit.target), weightage: Number(edit.weightage) });
      setSheet((prev) => prev ? { ...prev, goals: prev.goals.map((g) => (g.id === goal.id ? updated : g)) } : null);
      setEditingGoalId(null);
      toast.success('Goal updated');
    } catch { toast.error('Failed to update goal'); } finally { setSavingGoal(null); }
  };

  const handleApprove = async () => {
    if (!sheet) return;
    if (totalWeightage !== 100) { toast.error('Total weightage must be 100% before approving'); return; }
    setApproving(true);
    try {
      const updated = await goalSheetsApi.approve(sheet.id);
      setSheet(updated);
      toast.success('Goal sheet approved successfully!');
      setTimeout(() => navigate('/approvals'), 1500);
    } catch { toast.error('Failed to approve goal sheet'); } finally { setApproving(false); }
  };

  const handleReturn = async () => {
    if (!sheet) return;
    if (!returnComment.trim()) { toast.error('Please provide a reason for returning the sheet'); return; }
    setReturning(true);
    try {
      const updated = await goalSheetsApi.returnForRework(sheet.id, returnComment.trim());
      setSheet(updated);
      toast.success('Goal sheet returned for rework');
      setTimeout(() => navigate('/approvals'), 1500);
    } catch { toast.error('Failed to return goal sheet'); } finally { setReturning(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  if (!sheet) return null;

  const isAlreadyProcessed = sheet.status === 'APPROVED';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link to="/approvals" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft className="w-4 h-4" />Back to Approvals
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-4">
          <div><h1 className="text-xl font-bold text-gray-900">Goal Sheet Review</h1><p className="text-sm text-gray-500 mt-0.5">{sheet.cycle?.name}</p></div>
          <StatusBadge status={sheet.status} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-xs text-gray-500 mb-0.5">Employee</p><p className="font-medium text-gray-800">{sheet.employee?.name}</p><p className="text-xs text-gray-500">{sheet.employee?.department}</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">Submitted</p><p className="font-medium text-gray-800">{sheet.submittedAt ? format(new Date(sheet.submittedAt), 'MMM d, yyyy') : '—'}</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">Goals</p><p className="font-medium text-gray-800">{sheet.goals.length}</p></div>
        </div>
        {isAlreadyProcessed && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
            <Lock className="w-4 h-4" />This goal sheet has been approved and is now locked.
          </div>
        )}
      </div>

      <WeightageValidator totalWeightage={totalWeightage} goalCount={sheet.goals.length} />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Goals</h2>
          {!isAlreadyProcessed && <p className="text-xs text-gray-500">Click <span className="text-indigo-600 font-medium">Edit</span> to modify target or weightage</p>}
        </div>
        <div className="divide-y divide-gray-100">
          {sheet.goals.map((goal, idx) => {
            const isEditing = editingGoalId === goal.id;
            const edit = inlineEdits[goal.id];
            return (
              <div key={goal.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-indigo-600">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900">{goal.title}</h3>
                        {goal.isShared && <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded-full"><Share2 className="w-2.5 h-2.5" />Shared</span>}
                      </div>
                      {goal.description && <p className="text-xs text-gray-500 mt-0.5">{goal.description}</p>}
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                        <span>Thrust: <span className="font-medium text-gray-700">{goal.thrustArea?.name}</span></span>
                        <span>UoM: <span className="font-medium text-gray-700">{goal.uomType}</span></span>
                      </div>

                      {isEditing ? (
                        <div className="mt-3 grid grid-cols-2 gap-3 p-3 bg-indigo-50 rounded-lg">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Target</label>
                            <input type={goal.uomType === 'TIMELINE' ? 'date' : 'number'} value={edit?.target}
                              onChange={(e) => setInlineEdits((prev) => ({ ...prev, [goal.id]: { ...prev[goal.id], target: e.target.value } }))}
                              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Weightage (%)</label>
                            <input type="number" min={10} max={100} value={edit?.weightage}
                              onChange={(e) => setInlineEdits((prev) => ({ ...prev, [goal.id]: { ...prev[goal.id], weightage: e.target.value } }))}
                              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                          </div>
                          <div className="col-span-2 flex gap-2">
                            <button onClick={() => handleSaveInlineEdit(goal)} disabled={savingGoal === goal.id} className="btn-primary text-xs py-1.5">
                              {savingGoal === goal.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Save
                            </button>
                            <button onClick={() => setEditingGoalId(null)} className="btn-secondary text-xs py-1.5"><X className="w-3.5 h-3.5" />Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-gray-600">Target: <span className="font-semibold text-gray-900">{goal.uomType === 'TIMELINE' ? goal.targetDate ? format(new Date(goal.targetDate), 'MMM d, yyyy') : 'TBD' : goal.uomType === 'ZERO' ? 'Achieve' : goal.target}</span></span>
                          <span className="text-gray-600">Weight: <span className="font-semibold text-indigo-600">{edit?.weightage ?? goal.weightage}%</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                  {!isAlreadyProcessed && !isEditing && !goal.isShared && (
                    <button onClick={() => setEditingGoalId(goal.id)} className="flex-shrink-0 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors">
                      <Edit2 className="w-3 h-3" />Edit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!isAlreadyProcessed && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Approval Decision</h2>

          {showReturnForm && (
            <div className="mb-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <label className="block text-xs font-semibold text-gray-700 mb-2">Reason for Return <span className="text-red-500">*</span></label>
              <textarea rows={3} value={returnComment} onChange={(e) => setReturnComment(e.target.value)}
                placeholder="Explain what changes are needed before this can be approved…"
                className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
              <div className="flex gap-2 mt-3">
                <button onClick={handleReturn} disabled={returning || !returnComment.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                  {returning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}Confirm Return
                </button>
                <button onClick={() => { setShowReturnForm(false); setReturnComment(''); }} className="btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          )}

          {totalWeightage !== 100 && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mb-4">
              <AlertTriangle className="w-4 h-4" />Total weightage is {totalWeightage}%. Adjust goal weightages to reach exactly 100% before approving.
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleApprove} disabled={approving || totalWeightage !== 100}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Approve Goal Sheet
            </button>
            {!showReturnForm && (
              <button onClick={() => setShowReturnForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors">
                <RotateCcw className="w-4 h-4" />Return for Rework
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalDetail;
