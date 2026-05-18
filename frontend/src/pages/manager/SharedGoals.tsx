import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Share2, Users, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { sharedGoalsApi, thrustAreasApi, cyclesApi, usersApi } from '../../services/api';
import { ThrustArea, GoalCycle, User, UoMType } from '../../types';
import { useAuth } from '../../hooks/useAuth';

const UOM_OPTIONS: { value: UoMType; label: string; description: string }[] = [
  { value: 'MAX', label: 'Maximize (MAX)', description: 'Higher actual is better' },
  { value: 'MIN', label: 'Minimize (MIN)', description: 'Lower actual is better' },
  { value: 'TIMELINE', label: 'Timeline (Date)', description: 'Completion by target date' },
  { value: 'ZERO', label: 'Binary (ZERO)', description: 'Zero = 100%, else 0%' },
];

interface FormData {
  thrustAreaId: string;
  title: string;
  description: string;
  uomType: UoMType;
  target: number;
  targetDate: string;
  cycleId: string;
}

const SharedGoals: React.FC = () => {
  const { user } = useAuth();
  const [thrustAreas, setThrustAreas] = useState<ThrustArea[]>([]);
  const [cycles, setCycles] = useState<GoalCycle[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pushed, setPushed] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({ defaultValues: { uomType: 'MAX', target: 0 } });
  const watchedUom = watch('uomType');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [areas, allCycles, allUsers] = await Promise.all([thrustAreasApi.getAll(), cyclesApi.getAll(), usersApi.getAll()]);
        setThrustAreas(areas);
        setCycles(allCycles);
        const employees = allUsers.filter((u) => u.role === 'EMPLOYEE' && (user?.role === 'ADMIN' || u.managerId === user?.id));
        setTeamMembers(employees);
      } catch { toast.error('Failed to load data'); } finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  const toggleEmployee = (id: string) => {
    setSelectedEmployees((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const selectAll = () => setSelectedEmployees(new Set(teamMembers.map((m) => m.id)));
  const clearAll = () => setSelectedEmployees(new Set());

  const onSubmit = async (data: FormData) => {
    if (selectedEmployees.size === 0) { toast.error('Select at least one employee to push the shared goal to.'); return; }
    setSubmitting(true);
    try {
      const activeCycle = cycles.find((c) => c.isActive);
      const cycleId = data.cycleId || activeCycle?.id;
      if (!cycleId) { toast.error('No cycle selected.'); return; }

      await sharedGoalsApi.push({
        goalData: {
          thrustAreaId: data.thrustAreaId,
          title: data.title.trim(),
          description: data.description?.trim() || undefined,
          uomType: data.uomType,
          target: Number(data.target),
          targetDate: data.targetDate || undefined,
          weightage: 10,
        },
        employeeIds: Array.from(selectedEmployees),
        cycleId,
      });

      toast.success(`Shared goal pushed to ${selectedEmployees.size} employee(s)!`);
      setPushed(true);
      reset();
      setSelectedEmployees(new Set());
      setTimeout(() => setPushed(false), 4000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to push shared goal');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Push Shared Goal</h1>
        <p className="text-sm text-gray-500 mt-0.5">Define a departmental KPI and push it to multiple employees. Recipients can only adjust the weightage — title and target are read-only for them.</p>
      </div>

      {pushed && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4 text-green-800">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm font-medium">Shared goal successfully pushed to selected employees!</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Share2 className="w-4 h-4 text-indigo-600" />Goal Details</h2>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Cycle <span className="text-red-500">*</span></label>
            <select {...register('cycleId')} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {cycles.map((c) => <option key={c.id} value={c.id}>{c.name} {c.isActive ? '(Active)' : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Thrust Area <span className="text-red-500">*</span></label>
            <select {...register('thrustAreaId', { required: 'Thrust area is required' })} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select thrust area…</option>
              {thrustAreas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {errors.thrustAreaId && <p className="text-xs text-red-600 mt-1">{errors.thrustAreaId.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Goal Title <span className="text-red-500">*</span></label>
            <input {...register('title', { required: 'Title is required', minLength: { value: 3, message: 'Min 3 characters' } })} type="text" placeholder="e.g., Achieve department NPS of 8.5+" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register('description')} rows={2} placeholder="Optional: provide additional context…" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Measurement (UoM) <span className="text-red-500">*</span></label>
              <select {...register('uomType', { required: true })} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {UOM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">{UOM_OPTIONS.find((o) => o.value === watchedUom)?.description}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{watchedUom === 'TIMELINE' ? 'Target Date' : watchedUom === 'ZERO' ? 'Target (0 = success)' : 'Target'} <span className="text-red-500">*</span></label>
              {watchedUom === 'TIMELINE' ? (
                <input {...register('targetDate', { required: 'Target date is required for Timeline goals' })} type="date" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              ) : (
                <input {...register('target', { required: 'Target is required', min: { value: 0, message: 'Must be ≥ 0' } })} type="number" step="any" placeholder={watchedUom === 'ZERO' ? '0' : 'e.g., 100'} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              )}
              {errors.target && <p className="text-xs text-red-600 mt-1">{errors.target.message}</p>}
              {errors.targetDate && <p className="text-xs text-red-600 mt-1">{errors.targetDate.message}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />Push to Employees
              {selectedEmployees.size > 0 && <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{selectedEmployees.size} selected</span>}
            </h2>
            <div className="flex gap-2">
              <button type="button" onClick={selectAll} className="text-xs text-indigo-600 hover:underline">Select all</button>
              <span className="text-gray-300">|</span>
              <button type="button" onClick={clearAll} className="text-xs text-gray-500 hover:underline">Clear</button>
            </div>
          </div>

          {teamMembers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No employees found.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {teamMembers.map((member) => (
                <label key={member.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${selectedEmployees.has(member.id) ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={selectedEmployees.has(member.id)} onChange={() => toggleEmployee(member.id)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.email} {member.department ? `· ${member.department}` : ''}</p>
                  </div>
                  {selectedEmployees.has(member.id) && <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                </label>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={submitting || selectedEmployees.size === 0}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Pushing goal…</> : <><Share2 className="w-4 h-4" />Push Shared Goal to {selectedEmployees.size || '…'} employee{selectedEmployees.size !== 1 ? 's' : ''}</>}
        </button>
      </form>
    </div>
  );
};

export default SharedGoals;
