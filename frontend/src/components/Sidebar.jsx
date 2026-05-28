import { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Users, Calendar, Ticket, FileText, Settings, Bell, X, DollarSign, Activity } from 'lucide-react';
import clsx from 'clsx';

const Sidebar = ({ isOpen, setIsOpen, isCollapsed }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const getNavItems = () => {
    let base = 'employee';
    if (user?.role === 'admin') base = 'admin';
    else if (user?.role === 'manager' || user?.role === 'teamlead') base = 'manager';

    const items = [
      { name: 'Dashboard', path: `/${base}`, icon: LayoutDashboard },
    ];

    if (user?.role !== 'admin') {
      items.push({ name: 'My Attendance', path: `/${base}/attendance`, icon: Calendar });
    }

    items.push({ name: 'Payroll', path: `/${base}/payroll`, icon: DollarSign });

    if (user?.role === 'admin' || user?.role === 'manager' || user?.role === 'teamlead') {
      items.push({ name: 'Team Attendance', path: `/${base}/team-attendance`, icon: Users });
    }

    items.push(
      { name: 'Leaves', path: `/${base}/leaves`, icon: FileText },
      { name: 'Tickets', path: `/${base}/tickets`, icon: Ticket },
      { name: 'Notifications', path: `/${base}/notifications`, icon: Bell },
    );

    if (user?.role === 'admin') {
      items.push(
        { name: 'User Management', path: `/${base}/users`, icon: Users },
        { name: 'Work Tracking', path: `/${base}/work-tracking`, icon: Activity }
      );
    }

    if (user?.role === 'manager' || user?.role === 'teamlead') {
      items.push({ name: 'Team Summary', path: `/${base}/team`, icon: Users });
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <aside className={clsx(
      "fixed inset-y-0 left-0 z-50 bg-secondary text-slate-500 flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 shadow-2xl lg:shadow-none border-r border-slate-200/50",
      isOpen ? "translate-x-0" : "-translate-x-full",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className={clsx("h-16 flex items-center border-b border-slate-200/50 bg-secondary transition-all", isCollapsed ? "justify-center px-0" : "justify-between px-6")}>
        <div className="flex items-center gap-2 text-slate-800 font-bold text-lg tracking-wide overflow-hidden whitespace-nowrap">
          <div className="w-8 h-8 shrink-0 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">RTN</span>
          </div>
          {!isCollapsed && <span>RTN Employee</span>}
        </div>
        {!isCollapsed && (
          <button onClick={() => setIsOpen(false)} className="lg:hidden shrink-0 text-slate-400 hover:text-primary transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={clsx(
                'flex items-center rounded-xl transition-all font-medium text-sm overflow-hidden whitespace-nowrap',
                isCollapsed ? 'justify-center p-2.5 mx-2' : 'gap-3 px-3 py-2.5',
                isActive 
                  ? 'bg-primary text-white shadow-[0_0_15px_rgba(229,0,255,0.2)] font-bold' 
                  : 'hover:bg-slate-200/20 hover:text-slate-800'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon size={18} className={clsx("shrink-0", isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-800')} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={clsx("p-4 border-t border-slate-200/50", isCollapsed && "px-2")}>
        <Link 
          to="/profile" 
          onClick={() => setIsOpen(false)}
          className={clsx(
            "flex items-center rounded-xl hover:bg-slate-200/20 hover:text-slate-800 transition-colors text-sm font-medium overflow-hidden whitespace-nowrap",
            isCollapsed ? 'justify-center p-2.5 mx-2' : 'gap-3 px-3 py-2.5'
          )}
          title={isCollapsed ? "Settings" : undefined}
        >
          <Settings size={18} className="text-slate-400 shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
