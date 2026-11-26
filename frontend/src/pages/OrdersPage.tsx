import { CreditCard, Package, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, getApiErrorMessage } from '../api/client';
import type { ApiEnvelope, Order, OrderStatus, PaymentMethod } from '../types';
import { formatDate, formatVnd } from '../utils/format';

const STATUS_CONFIG: Record<OrderStatus, { label: string; badge: string }> = {
  PENDING: {
    label: 'Chờ xác nhận',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  PAID: {
    label: 'Đã thanh toán',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  SHIPPING: {
    label: 'Đang giao hàng',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  DELIVERED: {
    label: 'Giao thành công',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

const PAYMENT_METHOD_VI: Record<PaymentMethod, string> = {
  COD: 'Thanh toán khi nhận hàng',
  MOCK: 'Thanh toán trực tuyến',
  VNPAY: 'VNPay',
  MOMO: 'MoMo',
  STRIPE: 'Thẻ quốc tế',
};

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page: 1, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get<ApiEnvelope<Order[]>>('/orders/my', { params });
      setOrders(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải danh sách đơn hàng'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handlePay = async (orderId: string) => {
    setMessage('');
    setError('');
    try {
      await apiClient.post(`/payments/orders/${orderId}/pay`, {
        paymentMethod: 'MOCK',
      });
      setMessage('Thanh toán đơn hàng thành công!');
      await loadOrders();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Thanh toán thất bại'));
    }
  };

  const handleCancel = async (orderId: string) => {
    setMessage('');
    setError('');
    try {
      await apiClient.post(`/orders/${orderId}/cancel`);
      setMessage('Đã hủy đơn hàng thành công.');
      await loadOrders();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể hủy đơn hàng'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Đơn mua của tôi</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Tất cả đơn hàng</option>
          <option value="PENDING">Chờ xác nhận</option>
          <option value="PAID">Đã thanh toán</option>
          <option value="SHIPPING">Đang giao hàng</option>
          <option value="DELIVERED">Giao thành công</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </div>

      {message && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-white" />
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-800">Bạn chưa có đơn hàng nào</p>
          <Link
            to="/"
            className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Mua sắm ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = STATUS_CONFIG[order.status];
            return (
              <div
                key={order.id}
                className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-sm font-bold text-slate-900">
                      Mã đơn: {order.orderNumber}
                    </span>
                    <span className="ml-3 text-xs text-slate-500">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-600">
                      {PAYMENT_METHOD_VI[order.paymentMethod] ?? order.paymentMethod}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${statusInfo.badge}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <span className="font-medium text-slate-800">{item.productName}</span>
                        <span className="ml-2 text-xs text-slate-500">
                          x{item.quantity} • {formatVnd(item.unitPrice)}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-900">
                        {formatVnd(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
                  <div className="text-xs text-slate-500">
                    Người nhận: <strong className="text-slate-700">{order.shippingAddress.recipientName}</strong> (
                    {order.shippingAddress.phone}) — {order.shippingAddress.street},{' '}
                    {order.shippingAddress.district}, {order.shippingAddress.city}
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="mr-2 text-sm text-slate-600">
                      Thành tiền:{' '}
                      <strong className="text-base text-indigo-600">
                        {formatVnd(order.totalAmount)}
                      </strong>
                    </div>

                    {order.status === 'PENDING' && order.paymentMethod !== 'COD' && (
                      <button
                        type="button"
                        onClick={() => void handlePay(order.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Thanh toán ngay
                      </button>
                    )}

                    {order.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => void handleCancel(order.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Hủy đơn hàng
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
