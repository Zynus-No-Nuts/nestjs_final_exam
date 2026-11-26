import { Lock, MapPin, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiClient, getApiErrorMessage } from '../api/client';
import { PasswordInput } from '../components/PasswordInput';
import { useAuth } from '../context/AuthContext';
import type { Address, ApiEnvelope } from '../types';
import { MIN_PASSWORD_LENGTH, validatePassword } from '../utils/validation';

export function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // New Address Form
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrForm, setAddrForm] = useState({
    recipientName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    street: '',
    ward: '',
    district: '',
    city: '',
    isDefault: true,
  });

  const loadAddresses = useCallback(async () => {
    try {
      const res = await apiClient.get<ApiEnvelope<Address[]>>('/users/addresses');
      setAddresses(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải danh sách địa chỉ'));
    }
  }, []);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await apiClient.patch('/users/profile', {
        fullName,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      await refreshProfile();
      setMessage('Đã lưu thông tin tài khoản!');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Cập nhật thất bại'));
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    const currErr = validatePassword(currentPassword, 'Mật khẩu hiện tại');
    if (currErr) {
      setError(currErr);
      return;
    }

    const nextErr = validatePassword(newPassword, 'Mật khẩu mới');
    if (nextErr) {
      setError(nextErr);
      return;
    }

    try {
      await apiClient.patch('/users/profile/password', {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Đổi mật khẩu thành công!');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể đổi mật khẩu'));
    }
  };

  const handleCreateAddress = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await apiClient.post('/users/addresses', {
        ...addrForm,
        ...(addrForm.ward.trim() ? { ward: addrForm.ward.trim() } : { ward: undefined }),
      });
      setShowAddrForm(false);
      setAddrForm({
        recipientName: user?.fullName ?? '',
        phone: user?.phone ?? '',
        street: '',
        ward: '',
        district: '',
        city: '',
        isDefault: false,
      });
      await loadAddresses();
      setMessage('Đã thêm địa chỉ nhận hàng mới!');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể thêm địa chỉ'));
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await apiClient.patch(`/users/addresses/${id}`, { isDefault: true });
      await loadAddresses();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await apiClient.delete(`/users/addresses/${id}`);
      await loadAddresses();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Tài khoản của tôi</h1>

      {message && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {/* Profile Card */}
      <form
        onSubmit={handleUpdateProfile}
        className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-6"
      >
        <h2 className="font-semibold text-slate-900">Thông tin cá nhân</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Email đăng nhập</label>
            <input
              type="email"
              disabled
              value={user?.email ?? ''}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">Họ và tên</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">Số điện thoại</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Cập nhật số điện thoại"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Lưu thông tin
        </button>
      </form>

      {/* Addresses */}
      <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <MapPin className="h-4 w-4 text-indigo-600" />
            Sổ địa chỉ nhận hàng ({addresses.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowAddrForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            <Plus className="h-4 w-4" /> Thêm địa chỉ mới
          </button>
        </div>

        {showAddrForm && (
          <form
            onSubmit={handleCreateAddress}
            className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                required
                placeholder="Họ tên người nhận"
                value={addrForm.recipientName}
                onChange={(e) => setAddrForm({ ...addrForm, recipientName: e.target.value })}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
              />
              <input
                required
                placeholder="Số điện thoại người nhận"
                value={addrForm.phone}
                onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
              />
              <input
                required
                placeholder="Số nhà, tên đường"
                value={addrForm.street}
                onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm sm:col-span-2"
              />
              <input
                placeholder="Phường / Xã (không bắt buộc)"
                value={addrForm.ward}
                onChange={(e) => setAddrForm({ ...addrForm, ward: e.target.value })}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
              />
              <input
                required
                placeholder="Quận / Huyện"
                value={addrForm.district}
                onChange={(e) => setAddrForm({ ...addrForm, district: e.target.value })}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
              />
              <input
                required
                placeholder="Tỉnh / Thành phố"
                value={addrForm.city}
                onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={addrForm.isDefault}
                  onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })}
                />
                Đặt làm địa chỉ mặc định
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Lưu địa chỉ
              </button>
              <button
                type="button"
                onClick={() => setShowAddrForm(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700"
              >
                Hủy
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{addr.recipientName}</span>
                  <span className="text-xs text-slate-500">• {addr.phone}</span>
                  {addr.isDefault && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      Mặc định
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {[addr.street, addr.ward, addr.district, addr.city].filter(Boolean).join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!addr.isDefault && (
                  <button
                    type="button"
                    onClick={() => void handleSetDefault(addr.id)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Đặt mặc định
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleDeleteAddress(addr.id)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  title="Xóa địa chỉ"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Password Change */}
      <form
        onSubmit={handleChangePassword}
        noValidate
        className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-6"
      >
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <Lock className="h-4 w-4 text-indigo-600" />
          Đổi mật khẩu
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PasswordInput
            id="current-pwd"
            label="Mật khẩu hiện tại"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Nhập mật khẩu hiện tại"
          />
          <PasswordInput
            id="new-pwd"
            label="Mật khẩu mới"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Tối thiểu 5 ký tự"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cập nhật mật khẩu
        </button>
      </form>
    </div>
  );
}
