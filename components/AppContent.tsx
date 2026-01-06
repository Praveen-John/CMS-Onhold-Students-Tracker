
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { Student, Activity, User as UserType } from '../types';
import { Status, teams, schoolSections, initiators } from '../types';
import StudentForm from './StudentForm';
import StudentTable from './StudentTable';
import GeminiAnalysisModal from './GeminiAnalysisModal';
import Sidebar from './Sidebar';
import AnalyticsDashboard from './AnalyticsDashboard';
import Activities from './Activities';
import TeamTasks from './TeamTasks';
import UserManagement from './UserManagement';
import { MenuIcon, SparklesIcon, UsersIcon, ChartBarIcon, HomeIcon, FunnelIcon, ArrowPathIcon, UserPlusIcon, SunIcon, MoonIcon, ExclamationCircleIcon, EnvelopeIcon, LoaderIcon, CheckCircleIcon, ClipboardDocumentListIcon } from './icons';

// --- CONFIGURATION ---
const STORAGE_KEY_USER = 'cms_user_session_v2';
// Auto-detect API base URL based on environment
const getApiBaseUrl = () => {
  // If VITE_BASE_URL is set, use it
  if (import.meta.env.VITE_BASE_URL) {
    return import.meta.env.VITE_BASE_URL;
  }

  // In production, use relative URL (same domain)
  if (import.meta.env.PROD) {
    return '/api';
  }

  // Development fallback
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

// User interface for app state
interface AppUser {
  email: string;
  name: string;
  picture?: string;
  isAdmin: boolean;
}

// Helper to generate HTML table for emails
const generateEmailTable = (students: Student[], title: string, agentName: string) => {
    const rows = students.map(s => `
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${s.studentName}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${s.phoneNumber || '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${s.category}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${s.reasonToHold || 'N/A'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${s.reminderDate}</td>
        </tr>
    `).join('');

    return `
        <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #6d28d9;">Hello ${agentName},</h2>
            <p>You have pending follow-ups for the following students as of <strong>${title}</strong>:</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="background-color: #f3f4f6;">
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Name</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Phone</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Category</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Reason</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Reminder Date</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
};

const AppContent: React.FC<{ user: AppUser | null; setUser: (user: AppUser | null) => void }> = ({ user, setUser }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<string>('Dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('All Teams');
  const [selectedStatus, setSelectedStatus] = useState<string>('All Statuses');
  const [selectedSection, setSelectedSection] = useState<string>('All Sections');

  // Dark mode with localStorage persistence - default to true
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('cms_dark_mode');
    return saved ? saved === 'true' : true; // Default to dark mode
  });

  const [selectedStudentForAnalysis, setSelectedStudentForAnalysis] = useState<Student | null>(null);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  // Lock body scroll when modals are open
  useEffect(() => {
    if (studentToEdit || selectedStudentForAnalysis) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [studentToEdit, selectedStudentForAnalysis]);

  // UI Feedback State
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.isAdmin || false;

  // --- DATA FETCHING ---
  const fetchData = async () => {
      try {
          const [studentsRes, activitiesRes] = await Promise.all([
              fetch(`${API_BASE_URL}/students`, { credentials: 'include' }),
              fetch(`${API_BASE_URL}/activities`, { credentials: 'include' })
          ]);
          if (!studentsRes.ok || !activitiesRes.ok) throw new Error('Failed to fetch data');

          const studentsData = await studentsRes.json();
          const activitiesData = await activitiesRes.json();
          setStudents(studentsData);
          setActivities(activitiesData);
          setDbError(false);
      } catch (error) {
          console.error('Error fetching data:', error);
          setDbError(true);
      }
  };

  useEffect(() => {
    if (user) {
        fetchData();
    }
  }, [user]);

  // Apply dark mode to document and save to localStorage
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('cms_dark_mode', darkMode.toString());
  }, [darkMode]);

  // --- SESSION CHECK ---
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const userData = await res.json();
          setUser({
            email: userData.email,
            name: userData.name,
            picture: userData.picture,
            isAdmin: userData.isAdmin
          });
        } else {
          localStorage.removeItem(STORAGE_KEY_USER);
          setUser(null);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        localStorage.removeItem(STORAGE_KEY_USER);
        setUser(null);
      }
      setSessionChecked(true);
    };
    checkSession();
  }, []);

  // --- FILTERING ---
  const viewableStudents = useMemo(() => {
    if (!user) return [];

    const currentUserInitiator = initiators.find(i => i.email.toLowerCase() === user.email.toLowerCase());
    const currentUserName = currentUserInitiator ? currentUserInitiator.name : '';

    return students.filter(s =>
      s.createdByEmail === user.email || s.initiatedBy === currentUserName
    );
  }, [students, user]);

  useEffect(() => {
    let filtered = isAdmin ? students : viewableStudents;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.studentName.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term) ||
        s.category?.toLowerCase().includes(term) ||
        s.reasonToHold?.toLowerCase().includes(term) ||
        s.registeredMailId?.toLowerCase().includes(term)
      );
    }

    if (selectedTeam !== 'All Teams') {
      filtered = filtered.filter(s => s.team === selectedTeam);
    }

    if (selectedStatus !== 'All Statuses') {
      filtered = filtered.filter(s => s.status === selectedStatus);
    }

    if (selectedSection !== 'All Sections') {
      filtered = filtered.filter(s => s.section === selectedSection);
    }

    setFilteredStudents(filtered);
  }, [viewableStudents, searchTerm, selectedTeam, selectedStatus, selectedSection]);

  // --- ACTIVITY LOGGING ---
  const logActivity = async (action: string, details: string, specificUser?: string) => {
    try {
      const actor = specificUser || user?.email || 'unknown';

      const newActivity = {
        id: Date.now().toString(),
        action,
        details,
        user: actor,
        timestamp: new Date().toLocaleString()
      };

      console.log('Logging activity:', newActivity);

      const response = await fetch(`${API_BASE_URL}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newActivity)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to log activity:', response.status, errorText);
        return;
      }

      const savedActivity = await response.json();
      console.log('Activity logged successfully:', savedActivity);

      // Add to activities list with the server-generated ID
      setActivities(prev => [savedActivity, ...prev]);
    } catch (e) {
      console.error("Failed to log activity", e);
    }
  };

  // --- AUTH HANDLERS ---
  const handleLogin = async (email: string, name: string, picture: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });

      if (res.ok) {
        const userData = await res.json();
        setUser({
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          isAdmin: userData.isAdmin
        });

        // Note: Login activity is logged by the backend and in the session check effect
        // No need to log here to avoid duplicates
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    // Log logout activity before clearing user
    await logActivity('LOGOUT', 'User logged out', user?.email);

    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem(STORAGE_KEY_USER);
      sessionStorage.removeItem('login_logged'); // Clear the login flag
      setUser(null);
      navigate('/');
    }
  };

  // --- STUDENT OPERATIONS ---
  const handleAddStudent = async (newStudent: Student) => {
    const studentWithUser = {
      ...newStudent,
      createdByEmail: user?.email || 'unknown',
    };

    try {
      const res = await fetch(`${API_BASE_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(studentWithUser)
      });

      if (!res.ok) throw new Error('Failed to add student');

      const savedStudent = await res.json();
      setStudents(prev => [savedStudent, ...prev]);
      logActivity('Student Added', `Added student: ${savedStudent.studentName} (${savedStudent.id})`);
      showNotification('Student added successfully!', 'success');

      // Send email notification
      await sendEmailNotification([savedStudent]);
    } catch (error) {
      console.error('Error adding student:', error);
      showNotification('Failed to add student', 'error');
    }
  };

  const handleUpdateStudent = async (updatedStudent: Student) => {
    try {
      const res = await fetch(`${API_BASE_URL}/students/${updatedStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedStudent)
      });

      if (!res.ok) throw new Error('Failed to update student');

      const savedStudent = await res.json();
      setStudents(prev => prev.map(s => s.id === savedStudent.id ? savedStudent : s));
      logActivity('Student Updated', `Updated student: ${savedStudent.studentName} (${savedStudent.id})`);
      showNotification('Student updated successfully!', 'success');
      setStudentToEdit(null);
    } catch (error) {
      console.error('Error updating student:', error);
      showNotification('Failed to update student', 'error');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/students/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to delete student');

      setStudents(prev => prev.filter(s => s.id !== id));
      logActivity('Student Deleted', `Deleted student with ID: ${id}`);
      showNotification('Student deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting student:', error);
      showNotification('Failed to delete student', 'error');
    }
  };

  // --- EMAIL NOTIFICATIONS ---
  const sendEmailNotification = async (students: Student[]) => {
    setIsSendingEmail(true);
    try {
      const recipientEmail = 'gokul_s@lmes.in';

      // Group students by "Initiated By" field
      const tasksByAgent: Record<string, Student[]> = {};
      students.forEach(student => {
        const agentName = student.initiatedBy || 'Unassigned';
        if (!tasksByAgent[agentName]) {
          tasksByAgent[agentName] = [];
        }
        tasksByAgent[agentName].push(student);
      });

      // Send one email per agent with their assigned students
      let successCount = 0;
      for (const [agentName, agentStudents] of Object.entries(tasksByAgent)) {
        const emailTable = generateEmailTable(
          agentStudents,
          new Date().toLocaleDateString(),
          agentName  // Use the "Initiated By" field as agent name
        );

        const res = await fetch(`${API_BASE_URL}/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            to: recipientEmail,
            subject: `[${agentName}] Pending Follow-ups - ${new Date().toLocaleDateString()} - CMS Tracker`,
            htmlBody: emailTable
          })
        });

        if (res.ok) {
          successCount++;
        }
      }

      if (successCount > 0) {
        showNotification(`Email notifications sent for ${successCount} agent(s)!`, 'success');
      } else {
        throw new Error('Failed to send emails');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      showNotification('Failed to send email notification', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // --- UI HANDLERS ---
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
    setSidebarOpen(false);

    // Map tab names to routes
    const routeMap: Record<string, string> = {
      'Dashboard': '/',
      'All Students': '/all-students',
      'Add Student': '/add-student',
      'Team Tasks': '/team-tasks',
      'Activities': '/activities',
      'Analytics': '/analytics',
      'Settings': '/settings'
    };

    if (routeMap[tabName]) {
      navigate(routeMap[tabName]);
    }
  };

  // Sync activeTab with current route
  useEffect(() => {
    const routeTabMap: Record<string, string> = {
      '/': 'Dashboard',
      '/all-students': 'All Students',
      '/add-student': 'Add Student',
      '/team-tasks': 'Team Tasks',
      '/activities': 'Activities',
      '/analytics': 'Analytics',
      '/settings': 'Settings'
    };

    const currentPath = location.pathname;
    if (routeTabMap[currentPath]) {
      setActiveTab(routeTabMap[currentPath]);
    }
  }, [location]);

  // --- RENDER CONTENT BASED ON ACTIVE TAB ---
  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Welcome back, {user?.name || user?.email}! Here's your overview.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 shadow-sm flex items-center">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                    {isAdmin ? 'Admin Access' : 'Standard Access'}
                </div>
            </div>

            <AnalyticsDashboard students={isAdmin ? students : viewableStudents} />
            {isAdmin && <TeamTasks students={students} />}
          </div>
        );

      case 'All Students':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Student Directory</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Manage and track all students. {isAdmin && "Auto-reminders active if tab is open."}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/add-student')}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-purple-500/30"
                >
                  <UserPlusIcon className="w-4 h-4" />
                  Add Student
                </button>
                {isAdmin && (
                  <button
                    onClick={() => sendEmailNotification(filteredStudents)}
                    disabled={isSendingEmail}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingEmail ? (
                      <LoaderIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      <EnvelopeIcon className="w-4 h-4" />
                    )}
                    Send Reminder
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Search</label>
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Team</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option>All Teams</option>
                  {teams.map(team => <option key={team} value={team}>{team}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option>All Statuses</option>
                  <option>{Status.ON_HOLD}</option>
                  <option>{Status.ADDED}</option>
                  <option>{Status.PENDING}</option>
                  <option>{Status.REFUNDED}</option>
                  <option>{Status.DISCONTINUED}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Section</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option>All Sections</option>
                  {schoolSections.map(section => <option key={section} value={section}>{section}</option>)}
                </select>
              </div>
            </div>

            <StudentTable
              students={filteredStudents}
              onEdit={(student) => setStudentToEdit(student)}
              onDelete={handleDeleteStudent}
              currentUser={user?.email || ''}
              isAdmin={isAdmin}
              onToggleReminder={async (student) => {
                const updatedStudent = { ...student, stopReminders: !student.stopReminders };
                await handleUpdateStudent(updatedStudent);
                showNotification(
                  updatedStudent.stopReminders ? 'Auto-reminders stopped' : 'Auto-reminders activated',
                  'success'
                );
              }}
            />
          </div>
        );

      case 'Add Student':
        return (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Add New Student</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create a new record for an on-hold student.</p>
            </div>
            <StudentForm
              onAddStudent={handleAddStudent}
              existingStudents={students}
            />
          </div>
        );

      case 'Team Tasks':
        return (
          <div className="space-y-6 animate-fade-in">
            <TeamTasks students={isAdmin ? students : viewableStudents} />
          </div>
        );

      case 'Activities':
        if (!isAdmin) return <div className="p-8 text-center text-slate-500">Access Denied</div>;
        return <Activities activities={activities} />;

      case 'Analytics':
        return <AnalyticsDashboard students={isAdmin ? students : viewableStudents} />;

      case 'Settings':
        return (
            <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
                 <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your application preferences.</p>
                 </div>

                 {/* User Management Section */}
                 {isAdmin && (
                     <div className="mb-8">
                         <UserManagement currentUser={user?.email || ''} onBack={() => navigate('/')} />
                     </div>
                 )}

                 {/* Account Section */}
                 <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                     <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Account Information</h3>
                     <div className="space-y-3">
                         <div className="flex items-center space-x-3">
                             {user?.picture && (
                                 <img src={user.picture} alt="Profile" className="w-12 h-12 rounded-full" />
                             )}
                             <div>
                                 <p className="font-medium text-slate-900 dark:text-white">{user?.name}</p>
                                 <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
                             </div>
                         </div>
                         <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                             <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                 isAdmin
                                   ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                   : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                             }`}>
                               {isAdmin ? 'Administrator' : 'Standard User'}
                             </span>
                         </div>
                     </div>
                 </div>

                 {/* Appearance Section */}
                 <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                     <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Appearance</h3>
                     <div className="flex items-center justify-between">
                         <div>
                             <p className="font-medium text-slate-900 dark:text-white">Dark Mode</p>
                             <p className="text-sm text-slate-500 dark:text-slate-400">Toggle dark theme</p>
                         </div>
                         <button
                             onClick={() => setDarkMode(!darkMode)}
                             className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                 darkMode ? 'bg-purple-600' : 'bg-slate-200'
                             }`}
                         >
                             <span
                                 className={`inline-block w-5 h-5 transform rounded-full bg-white shadow transition-transform ${
                                     darkMode ? 'translate-x-6' : 'translate-x-1'
                                 }`}
                             />
                         </button>
                     </div>
                 </div>

                 {/* Logout Section */}
                 <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                     <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Account Actions</h3>
                     <button
                         onClick={handleLogout}
                         className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-red-500/30"
                     >
                         <ClipboardDocumentListIcon className="w-5 h-5" />
                         Logout
                     </button>
                 </div>
            </div>
        );

      default:
        return <Navigate to="/" replace />;
    }
  };

  // --- LOADING STATE ---
  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <LoaderIcon className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (dbError) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-slate-900 p-4">
              <div className="max-w-md w-full bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-red-200 dark:border-red-900 text-center">
                  <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Server Connection Failed</h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Could not connect to the backend server. Please ensure the server is running.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    Retry
                  </button>
              </div>
          </div>
      );
  }

  // --- MAIN APP RENDER ---
  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentUser={user?.email || ''}
          isAdmin={isAdmin}
        />

        {/* Notification */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 max-w-sm">
            <div className={`rounded-lg p-4 shadow-lg border ${
              notification.type === 'success'
                ? 'bg-green-600 border-green-700'
                : 'bg-red-600 border-red-700'
            }`}>
              <div className="flex">
                {notification.type === 'success' ? (
                  <CheckCircleIcon className="w-5 h-5 text-white" />
                ) : (
                  <ExclamationCircleIcon className="w-5 h-5 text-white" />
                )}
                <span className="font-medium text-sm text-white">{notification.message}</span>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <header className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between z-20 sticky top-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">C</span>
            </div>
            <h1 className="font-bold text-lg text-slate-800 dark:text-white">CMS Tracker</h1>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-600 dark:text-slate-300">
            <MenuIcon className="w-6 h-6" />
          </button>
        </header>

        {/* Main Content */}
        <main className="lg:pl-64">
          <div className="max-w-7xl mx-auto px-4 py-8">
            {renderContent()}
          </div>
        </main>

        {/* Edit Modal */}
        {studentToEdit && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setStudentToEdit(null)} />
              <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 rounded-t-2xl z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Student</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Update student information</p>
                    </div>
                    <button
                      onClick={() => setStudentToEdit(null)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      aria-label="Close modal"
                    >
                      <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <StudentForm
                    initialData={studentToEdit}
                    onSave={handleUpdateStudent}
                    existingStudents={students}
                    isEditing={true}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Modal */}
        {selectedStudentForAnalysis && (
          <GeminiAnalysisModal
            student={selectedStudentForAnalysis}
            onClose={() => setSelectedStudentForAnalysis(null)}
          />
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
         @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.9) translateY(20px); }
          70% { transform: scale(1.05) translateY(-5px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-bounce-in {
          animation: bounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </div>
  );
};

export default AppContent;
