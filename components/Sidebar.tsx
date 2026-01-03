
import React from 'react';
import {
    HomeIcon,
    UsersIcon,
    UserPlusIcon,
    ChartBarIcon,
    Cog6ToothIcon,
    CloseIcon,
    ChevronRightIcon,
    ClipboardDocumentListIcon
} from './icons';

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    isOpen: boolean;
    onClose: () => void;
    currentUser: string;
    isAdmin: boolean;
}

const navItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: HomeIcon },
    { id: 'All Students', label: 'All Students', icon: UsersIcon },
    { id: 'Add Student', label: 'Add Student', icon: UserPlusIcon },
    { id: 'Activities', label: 'Activities', icon: ClipboardDocumentListIcon },
    { id: 'Analytics', label: 'Analytics', icon: ChartBarIcon },
    { id: 'Settings', label: 'Settings', icon: Cog6ToothIcon },
];

const ADMIN_USERS = ['praveen_k@lmes.in', 'support@lmes.in'];

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isOpen, onClose, currentUser, isAdmin }) => {

    // Filter Nav Items based on role
    const filteredNavItems = navItems.filter(item => {
        if (item.id === 'Activities') {
            return isAdmin;
        }
        return true;
    });

    const sidebarContent = (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-6 h-20">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-md shadow-purple-200 dark:shadow-none">
                        <span className="text-white font-bold text-lg">C</span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
                        CMS Tracker
                    </h2>
                </div>
                <button
                    onClick={onClose}
                    className="md:hidden p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400"
                >
                    <CloseIcon className="w-6 h-6" />
                </button>
            </div>
            
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">
                    Main Menu
                </div>
                {filteredNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                onTabChange(item.id);
                                onClose();
                            }}
                            className={`group flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out ${
                                isActive
                                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-200/50 dark:shadow-none'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <div className="flex items-center">
                                <Icon className={`w-5 h-5 mr-3 transition-colors ${
                                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                                }`} />
                                {item.label}
                            </div>
                            {isActive && <ChevronRightIcon className="w-4 h-4 text-purple-100" />}
                        </button>
                    );
                })}
            </nav>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden md:flex w-64 flex-col fixed inset-y-0 z-30">
                {sidebarContent}
            </div>

            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Mobile Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:hidden ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                {sidebarContent}
            </div>
        </>
    );
};

export default Sidebar;
