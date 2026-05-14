import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Bell, Search, Menu, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="hidden md:flex items-center bg-slate-100 rounded-xl px-4 py-2 w-64 md:w-80 group focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 transition-all border border-transparent focus-within:border-primary/20">
          <Search size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Search dashboard..." 
            className="bg-transparent border-none outline-none text-sm ml-2 w-full text-slate-700"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-6">
        <button 
          onClick={() => navigate(`/${user?.role}/notifications`)}
          className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors group"
        >
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-white group-hover:scale-110 transition-transform"></span>
        </button>

        <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-6 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800 leading-tight">{user?.name}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user?.role}</p>
          </div>
          <div className="relative group">
            <button className="w-9 h-9 md:w-10 md:h-10 bg-slate-100 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all overflow-hidden border border-slate-200">
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={20} />
              )}
            </button>
            
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <p className="px-4 py-2 text-xs font-bold text-slate-400 uppercase sm:hidden">{user?.name}</p>
              <button 
                onClick={() => navigate('/profile')}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <User size={16} /> My Profile
              </button>
              <button 
                onClick={logout}
                className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/5 flex items-center gap-2"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
