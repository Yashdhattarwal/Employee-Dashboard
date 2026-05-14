import { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Users, Calendar, Ticket, FileText, Settings, Bell, X, DollarSign } from 'lucide-react';
import clsx from 'clsx';

const Sidebar = ({ isOpen, setIsOpen }) => {
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
      items.push({ name: 'User Management', path: `/${base}/users`, icon: Users });
    }

    if (user?.role === 'manager' || user?.role === 'teamlead') {
      items.push({ name: 'Team Summary', path: `/${base}/team`, icon: Users });
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <aside className={clsx(
      "fixed inset-y-0 left-0 z-50 w-64 bg-secondary text-slate-300 flex flex-col h-full shrink-0 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 shadow-2xl lg:shadow-none",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-700/50 bg-slate-900/50">
        <div className="flex items-center gap-2 text-white font-bold text-lg tracking-wide">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">RTN</span>
          </div>
          RTN Employee
        </div>
        <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm',
                isActive 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon size={18} className={clsx(isActive ? 'text-white' : 'text-slate-400')} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700/50">
        <Link 
          to="/profile" 
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium"
        >
          <Settings size={18} className="text-slate-400" />
          Settings
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
