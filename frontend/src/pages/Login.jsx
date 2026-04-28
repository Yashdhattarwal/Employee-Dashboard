import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import teamPic from '../assets/team_pic.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'manager') navigate('/manager');
      else navigate('/employee');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-end justify-end p-6 md:p-12 relative bg-slate-950 overflow-hidden">
      {/* Background Image - contain ensures NO cropping */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          className="w-full h-full object-contain"
          src={teamPic}
          alt="Our Team Background"
        />
      </div>

      {/* Subtle overlay to ensure the form is readable without blur */}
      <div className="absolute inset-0 bg-slate-950/10"></div>

      {/* Transparent Login Table / Form */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-slate-950/40 border border-white/20 py-5 px-5 shadow-2xl rounded-2xl text-white">
          <div>
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 size={24} className="text-white" />
              </div>
            </div>
            <h2 className="mt-4 text-center text-2xl font-extrabold text-white">
              Sign in to your account
            </h2>
            <p className="mt-1 text-center text-sm text-slate-300">
              RTN Employee Dashboard
            </p>
          </div>

          <form className="space-y-6 mt-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-danger/20 border border-danger/30 text-white px-4 py-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Email address
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field bg-white/10 border-white/20 text-white placeholder-slate-400 focus:bg-white/20"
                  placeholder="admin@employeeportal.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">
                Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field bg-white/10 border-white/20 text-white placeholder-slate-400 focus:bg-white/20"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-white/20 bg-white/10 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-200">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-400 hover:text-blue-300">
                  Forgot your password?
                </a>
              </div>
            </div>

            <div>
              <button type="submit" className="w-full flex justify-center btn-primary py-2.5 bg-primary/90 hover:bg-primary border-0">
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
