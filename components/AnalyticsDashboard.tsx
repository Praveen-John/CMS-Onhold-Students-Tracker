
import React, { useMemo } from 'react';
import type { Student } from '../types';
import { Status } from '../types';
import { UsersIcon, SparklesIcon } from './icons';

interface AnalyticsDashboardProps {
  students: Student[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ students }) => {
  // 1. Calculate Basic KPIs
  const kpis = useMemo(() => {
    const total = students.length;

    // Debug: Log all unique status values to see what's in the database
    const uniqueStatuses = [...new Set(students.map(s => s.status))];
    console.log('All unique status values in database:', uniqueStatuses);
    console.log('Total students passed to dashboard:', total);
    console.log('Sample student data:', students.slice(0, 3));

    // Count students by status - handle case sensitivity and whitespace
    const onHold = students.filter(s => {
      const status = (s.status || '').toLowerCase().trim();
      return status.includes('hold') || status === Status.ON_HOLD.toLowerCase();
    }).length;

    const added = students.filter(s => {
      const status = (s.status || '').toLowerCase().trim();
      return status === 'added' || status === Status.ADDED.toLowerCase();
    }).length;

    const pending = students.filter(s => {
      const status = (s.status || '').toLowerCase().trim();
      return status === 'pending' || status === Status.PENDING.toLowerCase();
    }).length;

    const refunded = students.filter(s => {
      const status = (s.status || '').toLowerCase().trim();
      return status === 'refunded' || status === Status.REFUNDED.toLowerCase();
    }).length;

    const discontinued = students.filter(s => {
      const status = (s.status || '').toLowerCase().trim();
      return status === 'discontinued' || status === Status.DISCONTINUED.toLowerCase();
    }).length;

    console.log('KPIs calculated:', { total, onHold, added, pending, refunded, discontinued });

    return { total, onHold, added, pending, refunded, discontinued };
  }, [students]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Analytics Overview</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time insights into student tracking.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Students */}
        <div className="bg-purple-600 p-6 rounded-2xl shadow-lg shadow-purple-200 dark:shadow-none text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-100">Total Students</p>
              <p className="text-3xl font-bold mt-1">{kpis.total}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl text-white">
              <UsersIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-purple-100">
            <span className="font-medium mr-1">Live</span> data from directory
          </div>
        </div>

        {/* Active On Hold */}
        <div className="bg-orange-500 p-6 rounded-2xl shadow-lg shadow-orange-200 dark:shadow-none text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-100">Active On Hold</p>
              <p className="text-3xl font-bold mt-1">{kpis.onHold}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl text-white">
              <SparklesIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-orange-100">
            Requires follow-up
          </div>
        </div>

        {/* Added */}
        <div className="bg-teal-500 p-6 rounded-2xl shadow-lg shadow-teal-200 dark:shadow-none text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-teal-100">Added</p>
              <p className="text-3xl font-bold mt-1">{kpis.added}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-teal-100">
            Recently added
          </div>
        </div>

        {/* Pending */}
        <div className="bg-blue-500 p-6 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">Pending</p>
              <p className="text-3xl font-bold mt-1">{kpis.pending}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-blue-100">
            Awaiting action
          </div>
        </div>

        {/* Refunded */}
        <div className="bg-rose-500 p-6 rounded-2xl shadow-lg shadow-rose-200 dark:shadow-none text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-rose-100">Refunded</p>
              <p className="text-3xl font-bold mt-1">{kpis.refunded}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-rose-100">
            Fees refunded
          </div>
        </div>

        {/* Discontinued */}
        <div className="bg-emerald-500 p-6 rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-100">Discontinued</p>
              <p className="text-3xl font-bold mt-1">{kpis.discontinued}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-emerald-100">
            Process completed
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
