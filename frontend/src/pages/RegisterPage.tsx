import { UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { PasswordInput } from '../components/PasswordInput';
import { useAuth } from '../context/AuthContext';
import {
  MIN_PASSWORD_LENGTH,
  validateEmail,
  validatePassword,
  validateUsername,
} from '../utils/validation';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    const pwdErr = validatePassword(password);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      navigate('/');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tạo tài khoản'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-sm sm:p-9">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs">
            <UserPlus className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Đăng ký tài khoản</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Trải nghiệm mua sắm nhanh chóng và tiện lợi cùng ShopNest
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
              htmlFor="reg-username"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Tên đăng nhập
            </label>
            <input
              id="reg-username"
              type="text"
              required
              minLength={3}
              maxLength={30}
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ví dụ: nguyenvana"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Địa chỉ Email
            </label>
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="abc@gmail.com"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="reg-phone" className="mb-1.5 block text-sm font-medium text-slate-700">
              Số điện thoại <span className="font-normal text-slate-400">(không bắt buộc)</span>
            </label>
            <input
              id="reg-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901 234 567"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
            />
          </div>

          <PasswordInput
            id="reg-password"
            label="Mật khẩu"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tối thiểu 5 ký tự"
          />

          <PasswordInput
            id="reg-confirm-password"
            label="Nhập lại mật khẩu"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Xác nhận mật khẩu"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
