
import React, { useState } from 'react';
import type { Activity } from '../types';
import { FunnelIcon, ArrowPathIcon, ClipboardDocumentListIcon } from './icons';

interface ActivitiesProps {
  activities: Activity[];
}

const Activities: React.FC<ActivitiesProps> = ({ activities }) => {
  const [filterUser, setFilterUser] = useState('');

  // Get unique users for filter dropdown (handle missing user field)
  const users = [...new Set(activities.map(a => a.user || 'System').filter(Boolean))];

  const filteredActivities = filterUser
    ? activities.filter(a => (a.user || 'System') === filterUser)
    : activities;

  const getActionBadgeClass = (action: string) => {
    switch (action) {
        case 'LOGIN': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        case 'LOGOUT': return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        case 'ADD_STUDENT': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
        case 'EDIT_STUDENT': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
        case 'DELETE_STUDENT': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        case 'ANALYZE_STUDENT': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
        case 'SEND_EMAIL': return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Activity Log</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Audit trail of all actions performed by users in the system.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
            <div className="relative">
                <FunnelIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <select
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    className="pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-black dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">All Users</option>
                    {users.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
            </div>
            {filterUser && (
                <button 
                    onClick={() => setFilterUser('')}
                    className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    title="Clear Filter"
                >
                    <ArrowPathIcon className="w-4 h-4" />
                </button>
            )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {filteredActivities.length > 0 ? (
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-6 py-4 font-bold">Timestamp</th>
                            <th className="px-6 py-4 font-bold">User</th>
                            <th className="px-6 py-4 font-bold">Action</th>
                            <th className="px-6 py-4 font-bold">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredActivities.map((activity) => {
                            const user = activity.user || 'System';
                            const userInitial = user.substring(0, 1);
                            return (
                            <tr key={activity.id || activity._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                                    {activity.timestamp}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 mr-2 uppercase">
                                            {userInitial}
                                        </div>
                                        <span className="font-medium text-slate-900 dark:text-white">{user}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadgeClass(activity.action)}`}>
                                        {activity.action.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                    {activity.details}
                                </td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <ClipboardDocumentListIcon className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">No Activities Found</h3>
                <p className="mt-1 text-slate-500 dark:text-slate-400 text-center max-w-sm">
                    There are no logs matching your criteria. Actions performed by users will appear here.
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Activities;