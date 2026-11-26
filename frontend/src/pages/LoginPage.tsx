import { ShoppingBag } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { PasswordInput } from '../components/PasswordInput';
import { useAuth } from '../context/AuthContext';
import { MIN_PASSWORD_LENGTH, validatePassword, validateUsername } from '../utils/validation';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const usernameErr = validateUsername(username);
    if (usernameErr) {
      setError(usernameErr);
      return;
    }

    const pwdErr = validatePassword(password);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }

    setLoading(true);
    try {
      const user = await login(username.trim(), password);
      navigate(user.role === 'ADMIN' ? '/admin' : '/');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Tên đăng nhập hoặc mật khẩu không chính xác'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-sm sm:p-9">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Chào mừng trở lại</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Đăng nhập để tiếp tục mua sắm và theo dõi đơn hàng
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="login-username"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Tên đăng nhập
            </label>
            <input
              id="login-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
            />
          </div>

          <PasswordInput
            id="login-password"
            label="Mật khẩu"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu (tối thiểu 5 ký tự)"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Bạn mới biết đến ShopNest?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
            Đăng ký tài khoản
          </Link>
        </p>
      </div>
    </div>
  );
}
