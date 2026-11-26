import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient, getApiErrorMessage } from '../api/client';
import { ProductImage } from '../components/ProductImage';
import { useCart } from '../context/CartContext';
import type { Address, ApiEnvelope, Order, PaymentMethod } from '../types';
import { formatVnd } from '../utils/format';

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  COD: 'Thanh toán khi nhận hàng (COD)',
  MOCK: 'Thanh toán trực tuyến (Thẻ / Ví điện tử)',
  VNPAY: 'Ví VNPay',
  MOMO: 'Ví MoMo',
  STRIPE: 'Thẻ quốc tế (Stripe)',
};

export function CartPage() {
  const { cart, loading, updateQuantity, removeItem, clearCart, refreshCart } = useCart();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>(['COD', 'MOCK']);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get<ApiEnvelope<Address[]>>('/users/addresses')
      .then((res) => {
        setAddresses(res.data.data);
        const def = res.data.data.find((a) => a.isDefault) ?? res.data.data[0];
        if (def) setSelectedAddressId(def.id);
      })
      .catch(() => {});

    apiClient
      .get<ApiEnvelope<PaymentMethod[]>>('/payments/methods')
      .then((res) => {
        if (res.data.data.length > 0) {
          setMethods(res.data.data);
          setPaymentMethod(res.data.data.includes('COD') ? 'COD' : res.data.data[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handleQty = async (productId: string, nextQty: number) => {
    setError('');
    try {
      if (nextQty <= 0) {
        await removeItem(productId);
      } else {
        await updateQuantity(productId, nextQty);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể cập nhật số lượng'));
    }
  };

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiClient.post<ApiEnvelope<Order>>('/orders/checkout', {
        ...(selectedAddressId ? { addressId: selectedAddressId } : {}),
        paymentMethod,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      await refreshCart();
      navigate('/orders');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Đặt hàng thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !cart) {
    return <div className="h-64 animate-pulse rounded-3xl bg-white" />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Giỏ hàng của bạn đang trống</h1>
        <p className="mt-1 text-sm text-slate-500">
          Hãy khám phá thêm các sản phẩm yêu thích và thêm vào giỏ nhé!
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Khám phá sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Giỏ hàng của bạn ({cart.totalItems} sản phẩm)
        </h1>
        <button
          type="button"
          onClick={() => void clearCart()}
          className="text-xs font-medium text-rose-600 hover:underline"
        >
          Làm trống giỏ hàng
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="space-y-3 lg:col-span-2">
          {cart.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:flex-row sm:items-center"
            >
              <div className="w-20 shrink-0">
                <ProductImage
                  src={item.product.images[0]}
                  alt={item.product.name}
                  ratio="1/1"
                  className="rounded-xl"
                />
              </div>
              <div className="flex-1">
                <Link
                  to={`/products/${item.productId}`}
                  className="font-semibold text-slate-900 hover:text-indigo-600"
                >
                  {item.product.name}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500">
                  Đơn giá: {formatVnd(item.unitPrice)}
                </p>
                <p className="mt-1 text-sm font-bold text-indigo-600">{formatVnd(item.subtotal)}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => void handleQty(item.productId, item.quantity - 1)}
                    className="p-2 text-slate-600 hover:bg-slate-50"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-9 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => void handleQty(item.productId, item.quantity + 1)}
                    className="p-2 text-slate-600 hover:bg-slate-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void removeItem(item.productId)}
                  title="Xóa khỏi giỏ"
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Box */}
        <form
          onSubmit={handleCheckout}
          className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs lg:self-start"
        >
          <h2 className="text-lg font-bold text-slate-900">Thông tin thanh toán</h2>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">Địa chỉ nhận hàng</label>
              <Link to="/profile" className="text-xs font-semibold text-indigo-600 hover:underline">
                Thay đổi / Thêm mới
              </Link>
            </div>
            {addresses.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Bạn chưa có địa chỉ nhận hàng.{' '}
                <Link to="/profile" className="font-semibold underline">
                  Thêm địa chỉ ngay
                </Link>
              </div>
            ) : (
              <select
                value={selectedAddressId}
                onChange={(e) => setSelectedAddressId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {addresses.map((addr) => (
                  <option key={addr.id} value={addr.id}>
                    {addr.recipientName} ({addr.phone}) — {addr.street}, {addr.district}, {addr.city}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Phương thức thanh toán
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {methods.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_LABELS[m] ?? m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Lời nhắn cho cửa hàng <span className="font-normal text-slate-400">(tùy chọn)</span>
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Tạm tính ({cart.totalItems} sản phẩm)</span>
              <span>{formatVnd(cart.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Phí vận chuyển</span>
              <span className="font-medium text-emerald-600">Miễn phí</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2.5 text-base font-bold text-slate-900">
              <span>Tổng cộng</span>
              <span className="text-lg text-indigo-600">{formatVnd(cart.totalAmount)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || addresses.length === 0}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Đang xử lý đơn hàng...' : 'Đặt mua ngay'}
          </button>
        </form>
      </div>
    </div>
  );
}
