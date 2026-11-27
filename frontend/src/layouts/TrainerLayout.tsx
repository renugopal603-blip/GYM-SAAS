import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import GymSmartAssistant from '../components/GymSmartAssistant';
import GymoraConfirmModal from '../components/GymoraConfirmModal';
import { markAuthorizedNavigation } from '../components/NavigationGuard';
import {
  LayoutDashboard, User, Users, FileText,
  Utensils, Calendar,
  MessageSquare, IndianRupee, Bell,
  Activity, Menu, LogOut, Bot,
  Dumbbell, Star, Video, CheckCircle2, Wrench, Gift, Award,
  Search, Briefcase, Mail, X, CheckCheck, AlertCircle, CheckCircle
} from 'lucide-react';

const TrainerLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [gym, setGym] = useState<any>(null);

  const fetchNotifications = () => {
    api.get('/notifications')
      .then(res => {
        if (res.data.success) {
          setUnreadCount(res.data.unreadCount || 0);
          setNotifications(res.data.notifications || []);
        }
      })
      .catch(err => console.error('Failed to fetch notifications', err));
  };

  useEffect(() => {
    if (user?.gymId) {
      import('../utils/api').then(({ default: api }) => {
        api.get(`/gyms/${user.gymId}`)
          .then(res => setGym(res.data.gym))
          .catch(err => console.error('Failed to fetch gym', err));
        
        fetchNotifications();
      });
    }
  }, [user]);

  // Click outside listener for notification dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notifOpen]);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const routePrefetchMap: Record<string, string[]> = {
    '/trainer/dashboard': ['/trainer-sessions/trainer', '/trainers/my-clients'],
    '/trainer/profile': ['/auth/me'],
    '/trainer/ai-assistant': ['/ai/recommendations'],
    '/trainer/members': ['/trainers/my-clients'],
    '/trainer/schedule': ['/trainer-sessions/trainer'],
    '/trainer/workout-plans': ['/workout-plans/trainer'],
    '/trainer/diet-plans': ['/diet-progress'],
    '/trainer/equipments': ['/equipment'],
    '/trainer/earnings': ['/trainer-payments/my'],
    '/trainer/my-fee': ['/trainer-payments/fee'],
    '/trainer/notifications': ['/notifications'],
  };

  const handlePrefetch = (path: string) => {
    const endpoints = routePrefetchMap[path];
    if (endpoints && Array.isArray(endpoints)) {
      endpoints.forEach(ep => {
        (api as any).prefetch(ep);
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      ['/trainer/dashboard', '/trainer/members', '/trainer/schedule', '/trainer/workout-plans'].forEach(p => {
        routePrefetchMap[p]?.forEach(ep => (api as any).prefetch(ep));
      });
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const navGroups = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', path: '/trainer/dashboard', icon: LayoutDashboard },
        { label: 'My Profile', path: '/trainer/profile', icon: User },
      ]
    },
    {
      title: 'AI Tools',
      items: [
        { label: 'AI Recommendations', path: '/trainer/ai-assistant', icon: Bot },
        { label: 'Feedback', path: '/trainer/ai-feedback', icon: MessageSquare },
      ]
    },
    {
      title: 'Clients',
      items: [
        { label: 'Clients', path: '/trainer/members', icon: Users },
      ]
    },
    {
      title: 'Scheduling',
      items: [
        { label: 'Scheduling', path: '/trainer/schedule', icon: Calendar },
      ]
    },
    {
      title: 'Programs',
      items: [
        { label: 'Exercise Library', path: '/trainer/exercises', icon: Dumbbell },
        { label: 'Gym Exercise Videos', path: '/trainer/exercise-videos', icon: Video },
        { label: 'Workout Plans', path: '/trainer/workout-plans', icon: FileText },
        { label: 'Diet Plans', path: '/trainer/diet-plans', icon: Utensils },
        { label: 'Gym Equipments', path: '/trainer/equipments', icon: Wrench },
        { label: 'Customer Workplan Completed', path: '/trainer/customer-workplan-completed', icon: CheckCircle2 },
      ]
    },
    {
      title: 'Rewards & Performance',
      items: [
        { label: 'Rewards & Performance', path: '/trainer/rewards', icon: Award },
      ]
    },
    {
      title: 'Financials',
      items: [
        { label: 'Financials', path: '/trainer/my-fee', icon: IndianRupee },
      ]
    },
    {
      title: 'Job Opportunities',
      items: [
        { label: 'Find Jobs', path: '/trainer/jobs', icon: Search },
        { label: 'My Applications', path: '/trainer/applications', icon: Briefcase },
      ]
    },
    {
      title: 'Communication',
      items: [
        { label: 'Messages', path: '/trainer/messages', icon: MessageSquare },
        { label: 'Notifications', path: '/trainer/notifications', icon: Bell },
        { label: 'Reviews & Ratings', path: '/trainer/reviews', icon: Star },
      ]
    }
  ];

  const isClientsRoute = ['/trainer/members', '/trainer/customer-progress', '/trainer/member-progress', '/trainer/attendance'].some(p => location.pathname.startsWith(p));
  const isSchedulingRoute = ['/trainer/schedule', '/trainer/session-bookings', '/trainer/online-sessions'].some(p => location.pathname.startsWith(p));
  const isFinancialsRoute = ['/trainer/my-fee', '/trainer/payments-received', '/trainer/payment-history', '/trainer/earnings'].some(p => location.pathname.startsWith(p));

  const currentNav = navGroups.flatMap(g => g.items).find(item => item.path === location.pathname)
    || (isClientsRoute ? { label: 'Clients', path: '/trainer/members', icon: Users } : null)
    || (isSchedulingRoute ? { label: 'Scheduling', path: '/trainer/schedule', icon: Calendar } : null)
    || (isFinancialsRoute ? { label: 'Financials', path: '/trainer/my-fee', icon: IndianRupee } : null);

  const renderSidebar = () => (
    <>
      {/* Logo Header aligned with main header h-16 */}
      <div className="h-16 px-5 border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
        <Link
          to="/"
          className="flex items-center space-x-2.5 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            setSidebarOpen(false);
            setShowLeaveConfirm(true);
          }}
        >
          <div className="w-9 h-9 bg-[#C2410C] text-white font-bold rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
            <Activity className="text-white" size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#111827] truncate max-w-[150px]" title={gym?.name || 'Gymora'}>
            {gym?.name || 'Gymora'}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden w-8 h-8 flex items-center justify-center bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#EA580C] rounded-lg hover:bg-[#FFF7ED] active:bg-[#FFEDD5] transition-colors shrink-0 cursor-pointer"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Trainer Profile User Badge */}
      <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center space-x-3 shrink-0">
        <div className="w-9 h-9 bg-[#FFF7ED] border border-[#FFEDD5] rounded-full flex items-center justify-center text-[#C2410C] font-bold text-sm shadow-xs shrink-0">
          {user?.firstName?.[0] || 'T'}
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="font-semibold text-sm text-[#111827] truncate">{user?.firstName} {user?.lastName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-[#64748B] font-medium truncate">Elite Trainer</span>
            <span className="px-1.5 py-0.5 bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5] rounded text-[9px] font-bold uppercase tracking-wider">COACH</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            <h3 className="px-3 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">{group.title}</h3>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isClientsItem = item.path === '/trainer/members';
                const isSchedulingItem = item.path === '/trainer/schedule';
                const isFinancialsItem = item.path === '/trainer/my-fee';
                const isActive = location.pathname === item.path
                  || (isClientsItem && isClientsRoute)
                  || (isSchedulingItem && isSchedulingRoute)
                  || (isFinancialsItem && isFinancialsRoute);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onMouseEnter={() => handlePrefetch(item.path)}
                    onClick={() => {
                      markAuthorizedNavigation();
                      setSidebarOpen(false);
                    }}
                    className={clsx(
                      'flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-150 text-sm font-medium group',
                      isActive
                        ? 'bg-[#FFF7ED] text-[#C2410C] font-semibold border-l-4 border-[#F97316] shadow-xs'
                        : 'text-[#475569] hover:bg-[#FFEDD5] hover:text-[#C2410C]'
                    )}
                  >
                    <Icon
                      size={18}
                      className={clsx(
                        'shrink-0 transition-colors',
                        isActive ? 'text-[#EA580C]' : 'text-[#64748B] group-hover:text-[#EA580C]'
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-[#E2E8F0]">
        <button
          onClick={logout}
          className="flex items-center justify-center space-x-2 px-3 py-2.5 w-full text-[#B91C1C] hover:bg-red-50 hover:text-[#B91C1C] rounded-xl transition-colors font-semibold text-sm cursor-pointer border border-transparent hover:border-red-200"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#FFFFFF] text-[#1F2937] overflow-hidden">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:static top-0 left-0 h-full w-64 bg-[#FFFFFF] text-[#1F2937] border-r border-[#E2E8F0] flex flex-col z-40 shrink-0 transition-transform duration-300 ease-in-out shadow-lg lg:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {renderSidebar()}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0 bg-[#FFFFFF]">
        {/* Header */}
        <header className="h-16 pt-safe border-b border-[#E2E8F0] flex items-center px-3.5 sm:px-4 md:px-8 justify-between bg-[#FFFFFF] z-10 sticky top-0 shrink-0 text-[#111827]">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <button
              className="lg:hidden text-[#64748B] hover:text-[#EA580C] transition-colors w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC] shrink-0"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            {currentNav && <currentNav.icon size={20} className="text-[#EA580C] hidden sm:block shrink-0" />}
            <h2 className="text-base md:text-lg font-bold tracking-tight text-[#111827] truncate">
              {currentNav?.label || 'Trainer Portal'}
            </h2>
          </div>

          <div className="flex items-center space-x-2.5 sm:space-x-3 md:space-x-5 shrink-0">
            {/* Notification Bell with Dropdown Preview */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  if (!notifOpen) {
                    fetchNotifications();
                  }
                  setNotifOpen(!notifOpen);
                }}
                className="relative text-[#64748B] hover:text-[#EA580C] transition-colors w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC] cursor-pointer"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#C2410C] text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow shadow-orange-500/30">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Popup */}
              {notifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/20 sm:hidden animate-fade-in"
                    onClick={() => setNotifOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 top-16 sm:top-12 sm:w-96 max-w-sm sm:max-w-md bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                    <div className="p-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#111827] text-sm">Coach Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5] text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={markAllAsRead}
                            className="text-[11px] font-semibold text-[#EA580C] hover:underline cursor-pointer"
                          >
                            Mark All as Read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setNotifOpen(false)}
                          className="w-7 h-7 rounded-full bg-[#FFFFFF] border border-[#E2E8F0] text-[#64748B] hover:text-[#EA580C] hover:bg-[#FFF7ED] active:bg-[#FFEDD5] flex items-center justify-center cursor-pointer transition-colors shrink-0"
                          title="Close"
                          aria-label="Close"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-[#E2E8F0] max-h-[60vh] sm:max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#64748B]">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.slice(0, 5).map(notif => (
                          <div
                            key={notif._id}
                            onClick={() => {
                              if (!notif.isRead) markAsRead(notif._id);
                              setNotifOpen(false);
                              if (notif.link) {
                                navigate(notif.link);
                              } else {
                                navigate('/trainer/notifications');
                              }
                            }}
                            className={`flex items-start gap-3 px-4 py-3 hover:bg-[#FFF7ED] transition-colors cursor-pointer ${
                              !notif.isRead ? 'bg-[#FFF7ED]/50' : ''
                            }`}
                          >
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-[#F8FAFC] border border-[#E2E8F0]">
                              {notif.type === 'alert' ? <AlertCircle size={15} className="text-[#B91C1C]" /> :
                               notif.type === 'success' ? <CheckCircle size={15} className="text-[#15803D]" /> :
                               notif.type === 'message' ? <MessageSquare size={15} className="text-[#C2410C]" /> :
                               <Bell size={15} className="text-[#EA580C]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold text-[#111827] truncate ${!notif.isRead ? 'font-bold' : ''}`}>
                                {notif.title}
                              </p>
                              <p className="text-[11px] text-[#64748B] mt-0.5 line-clamp-2 leading-relaxed break-words">
                                {notif.message}
                              </p>
                              <p className="text-[9px] text-[#94A3B8] mt-1">
                                {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : ''}
                              </p>
                            </div>
                            {!notif.isRead && (
                              <div className="w-2 h-2 bg-[#F97316] rounded-full mt-1.5 shrink-0" />
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
                      <button
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          navigate('/trainer/notifications');
                        }}
                        className="w-full py-2.5 text-xs font-bold text-[#C2410C] hover:underline transition-colors text-center block cursor-pointer"
                      >
                        View All Notifications →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <Link to="/trainer/profile" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-[#111827] leading-none mb-0.5">{user?.firstName || 'Trainer'} {user?.lastName || ''}</p>
                <p className="text-xs text-[#64748B] leading-none">Fitness Coach</p>
              </div>
              <div className="w-9 h-9 bg-[#C2410C] text-white rounded-full flex items-center justify-center font-bold text-sm shadow shadow-orange-500/20">
                {user?.firstName?.[0] || 'T'}
              </div>
            </Link>
          </div>
        </header>

        <div className={clsx(
          'flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 lg:p-8',
          location.pathname.includes('/messages') ? 'pb-3 sm:pb-4 md:pb-6' : 'pb-32 sm:pb-28'
        )}>
          <Outlet />
        </div>
      </main>
      <GymSmartAssistant />

      <GymoraConfirmModal
        isOpen={showLeaveConfirm}
        title="Leave Dashboard?"
        message="Do you want to leave the dashboard and go to the home page?"
        confirmText="Continue"
        cancelText="Cancel"
        onConfirm={() => {
          setShowLeaveConfirm(false);
          markAuthorizedNavigation();
          navigate('/');
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </div>
  );
};

export default TrainerLayout;
