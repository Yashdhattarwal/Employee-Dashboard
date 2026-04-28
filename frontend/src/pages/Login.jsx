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
    <div className="min-h-screen flex lg:grid lg:grid-cols-2 bg-slate-50 relative overflow-hidden">
      {/* Left side: Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 relative z-10 bg-slate-50">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <div className="flex justify-center lg:justify-start">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                <Building2 size={24} className="text-white" />
              </div>
            </div>
            <h2 className="mt-6 text-center lg:text-left text-3xl font-extrabold text-slate-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center lg:text-left text-sm text-slate-600">
              RTN Employee Dashbord
            </p>
          </div>

          <div className="mt-8">
            <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 rounded-xl sm:px-10 border border-slate-100">
              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field"
                      placeholder="admin@employeeportal.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="mt-1">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field"
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
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <a href="#" className="font-medium text-primary hover:text-blue-500">
                      Forgot your password?
                    </a>
                  </div>
                </div>

                <div>
                  <button type="submit" className="w-full flex justify-center btn-primary py-2.5">
                    Sign in
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Image */}
      <div className="hidden lg:block relative w-full">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={teamPic}
          alt="Our Team"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/60 via-slate-900/30 to-transparent"></div>
      </div>
    </div>
  );
};

export default Login;
