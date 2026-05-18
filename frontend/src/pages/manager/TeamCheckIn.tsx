import React, { useEffect, useState } from 'react';
import { Loader2, Save, Users, MessageSquare, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi, goalSheetsApi, checkInsApi } from '../../services/api';
import { TeamMemberStatus, GoalSheet, Quarter, CheckIn } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { format } from 'date-fns';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

const getCurrentQuarter = (): Quarter => {
  const month = new Date().getMonth() + 1;
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
};

const computeScore = (uomType: string, target: number, actual: number | undefined, status: string): number | null => {
  if (actual === undefined) return null;
  if (uomType === 'MAX') return Math.min(Math.round((actual / target) * 100), 120);
  if (uomType === 'MIN') { if (actual === 0) return 100; return Math.min(Math.round((target / actual) * 100), 120); }
  if (uomType === 'ZERO') return status === 'COMPLETED' ? 100 : 0;
  if (uomType === 'TIMELINE') { if (status === 'COMPLETED') return 100; if (status === 'ON_TRACK') return 50; return 0; }
  return null;
};

const TeamCheckIn: React.FC = () => {
  const [team, setTeam] = useState<TeamMemberStatus[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>(getCurrentQuarter());
  const [sheet, setSheet] = useState<GoalSheet | null>(null);
  const [existingCheckIn, setExistingCheckIn] = useState<CheckIn | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTeam = async () => {
      setLoading(true);
      try { const data = await usersApi.getTeam(); setTeam(data); }
      catch { toast.error('Failed to load team'); } finally { setLoading(false); }
    };
    fetchTeam();
  }, []);

  useEffect(() => {
    if (!selectedMemberId) { setSheet(null); setExistingCheckIn(null); return; }
    const fetchSheet = async () => {
      setLoadingSheet(true);
      setSheet(null);
      setExistingCheckIn(null);
      setComment('');
      try {
        const allSheets = await goalSheetsApi.getTeamSheets();
        const memberSheet = allSheets.find((s) => s.employeeId === selectedMemberId);
        if (memberSheet) {
          setSheet(memberSheet);
          const checkIns = await checkInsApi.getBySheet(memberSheet.id);
          const existing = checkIns.find((c) => c.quarter === selectedQuarter);
          if (existing) { setExistingCheckIn(existing); setComment(existing.comment); }
        }
      } catch { toast.error('Failed to load sheet'); } finally { setLoadingSheet(false); }
    };
    fetchSheet();
  }, [selectedMemberId, selectedQuarter]);

  const handleSaveCheckIn = async () => {
    if (!sheet || !comment.trim()) { toast.error('Please enter a check-in comment'); return; }
    setSaving(true);
    try {
      if (existingCheckIn) { await checkInsApi.update(sheet.id, existingCheckIn.id, comment.trim()); }
      else { await checkInsApi.create(sheet.id, selectedQuarter, comment.trim()); }
      toast.success('Check-in saved successfully!');
    } catch { toast.error('Failed to save check-in'); } finally { setSaving(false); }
  };

  const selectedMember = team.find((m) => m.employee.id === selectedMemberId);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Check-ins</h1>
        <p className="text-sm text-gray-500 mt-1">Review team progress and record quarterly check-in notes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-2"><Users className="w-4 h-4" />Select Team Member</p>
            </div>
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {team.map((member) => (
                <button key={member.employee.id} onClick={() => setSelectedMemberId(member.employee.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${selectedMemberId === member.employee.id ? 'bg-indigo-50' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${selectedMemberId === member.employee.id ? 'bg-indigo-200' : 'bg-indigo-100'}`}>
                    <span className="text-xs font-semibold text-indigo-600">{member.employee.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${selectedMemberId === member.employee.id ? 'text-indigo-700' : 'text-gray-900'}`}>{member.employee.name}</p>
                    <p className="text-xs text-gray-500 truncate">{member.employee.department}</p>
                  </div>
                  {member.goalSheet && <StatusBadge status={member.goalSheet.status} size="sm" />}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-700 mb-3">Quarter</p>
            <div className="grid grid-cols-2 gap-2">
              {QUARTERS.map((q) => (
                <button key={q} onClick={() => setSelectedQuarter(q)}
                  className={`py-2 rounded-lg text-sm font-semibold transition-colors ${selectedQuarter === q ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {q}{q === getCurrentQuarter() && <span className="block text-xs opacity-70 font-normal">current</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!selectedMemberId ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Select a team member from the left to view their goals and record a check-in.</p>
            </div>
          ) : loadingSheet ? (
            <div className="flex items-center justify-center py-16 bg-white rounded-xl border border-gray-200">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
            </div>
          ) : !sheet ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{selectedMember?.employee.name} has no approved goal sheet for the current cycle.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-indigo-600">{selectedMember?.employee.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedMember?.employee.name}</p>
                    <p className="text-xs text-gray-500">{selectedMember?.employee.department} • {selectedQuarter} Check-in</p>
                  </div>
                  <div className="ml-auto"><StatusBadge status={sheet.status} /></div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-semibold text-gray-900">{selectedQuarter} Progress</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {sheet.goals.map((goal) => {
                    const achievement = goal.achievements?.find((a) => a.quarter === selectedQuarter);
                    const score = computeScore(goal.uomType, goal.target, achievement?.actual, achievement?.status ?? 'NOT_STARTED');
                    return (
                      <div key={goal.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{goal.title}</p>
                            <p className="text-xs text-gray-500">{goal.thrustArea?.name} • {goal.uomType} • <span className="font-medium text-indigo-600">{goal.weightage}%</span></p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-gray-500">Target: <span className="font-medium text-gray-700">{goal.uomType === 'TIMELINE' ? goal.targetDate ? format(new Date(goal.targetDate), 'MMM d') : 'TBD' : goal.uomType === 'ZERO' ? 'Achieve' : goal.target}</span></div>
                              <div className="text-xs text-gray-500">Actual: <span className="font-medium text-gray-700">{achievement?.actual !== undefined ? goal.uomType === 'TIMELINE' ? achievement.actualDate ? format(new Date(achievement.actualDate), 'MMM d') : '—' : achievement.actual : '—'}</span></div>
                            </div>
                            {achievement && <div className="mt-1"><StatusBadge status={achievement.status} size="sm" /></div>}
                          </div>
                        </div>
                        {score !== null ? <ProgressBar value={score} size="sm" /> : <div className="h-1.5 bg-gray-100 rounded-full" />}
                        {score !== null && <p className={`text-xs mt-1 font-medium ${score >= 100 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>Score: {score}%</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{existingCheckIn ? 'Update Check-in Notes' : 'Record Check-in Notes'}</h3>
                <p className="text-xs text-gray-500 mb-3">Provide feedback on progress, challenges, and next steps for {selectedQuarter}.</p>
                {existingCheckIn && <div className="text-xs text-gray-500 mb-2 flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span>Existing check-in from {format(new Date(existingCheckIn.createdAt), 'MMM d, yyyy')}</div>}
                <textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g., Employee is on track with most goals..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-gray-400">{comment.length} characters</p>
                  <button onClick={handleSaveCheckIn} disabled={saving || !comment.trim()} className="btn-primary text-sm">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {existingCheckIn ? 'Update Check-in' : 'Save Check-in'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamCheckIn;
