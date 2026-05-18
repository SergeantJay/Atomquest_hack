import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ClipboardList, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { goalSheetsApi } from '../../services/api';
import { GoalSheet } from '../../types';
import StatusBadge from '../../components/StatusBadge';

const PendingApprovals: React.FC = () => {
  const [sheets, setSheets] = useState<GoalSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'SUBMITTED' | 'RETURNED'>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try { const data = await goalSheetsApi.getPending(); setSheets(data); }
      catch { /* ignore */ } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const filtered = sheets.filter((s) => filter === 'ALL' || s.status === filter);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">Goal sheets awaiting your review</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
          <p className="text-2xl font-bold text-amber-700">{sheets.filter(s => s.status === 'SUBMITTED').length}</p>
          <p className="text-xs text-amber-600">Awaiting Review</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['ALL', 'SUBMITTED', 'RETURNED'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {f === 'ALL' ? 'All' : f === 'SUBMITTED' ? 'Pending' : 'Returned'}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
              {f === 'ALL' ? sheets.length : sheets.filter(s => s.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-700">No Pending Approvals</h2>
          <p className="text-sm text-gray-500 mt-1">{filter === 'ALL' ? 'All goal sheets have been reviewed.' : `No ${filter.toLowerCase()} sheets at this time.`}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Employee</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Department</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Cycle</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Goals</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Submitted</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((sheet) => (
                <tr key={sheet.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-indigo-600">{sheet.employee?.name?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{sheet.employee?.name}</p>
                        <p className="text-xs text-gray-500">{sheet.employee?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-xs">{sheet.employee?.department ?? '—'}</td>
                  <td className="px-5 py-4 text-gray-600 text-xs">{sheet.cycle?.name ?? '—'}</td>
                  <td className="px-5 py-4"><span className="text-sm font-medium text-gray-900">{sheet.goals?.length ?? 0}</span><span className="text-xs text-gray-500 ml-1">goals</span></td>
                  <td className="px-5 py-4 text-gray-600 text-xs">{sheet.submittedAt ? format(new Date(sheet.submittedAt), 'MMM d, yyyy') : '—'}</td>
                  <td className="px-5 py-4"><StatusBadge status={sheet.status} size="sm" /></td>
                  <td className="px-5 py-4">
                    <Link to={`/approvals/${sheet.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                      Review<ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;
