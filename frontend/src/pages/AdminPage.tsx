import { Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiClient, getApiErrorMessage } from '../api/client';
import type { ApiEnvelope, CategoryFlat, Order, OrderStatus, Product } from '../types';
import { formatDate, formatVnd } from '../utils/format';

type Tab = 'products' | 'categories' | 'orders';

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('products');
  const [categories, setCategories] = useState<CategoryFlat[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Forms
  const [catForm, setCatForm] = useState({ name: '', description: '', parentId: '' });
  const [prodForm, setProdForm] = useState({
    name: '',
    sku: '',
    price: '',
    stock: '10',
    categoryId: '',
    imageUrl: '',
    description: '',
  });

  const loadAll = useCallback(async () => {
    try {
      const [catRes, prodRes, ordRes] = await Promise.all([
        apiClient.get<ApiEnvelope<CategoryFlat[]>>('/categories'),
        apiClient.get<ApiEnvelope<Product[]>>('/products?limit=50&includeInactive=true'),
        apiClient.get<ApiEnvelope<Order[]>>('/orders?limit=50'),
      ]);
      setCategories(catRes.data.data);
      setProducts(prodRes.data.data);
      setOrders(ordRes.data.data);
      if (!prodForm.categoryId && catRes.data.data[0]) {
        setProdForm((prev) => ({ ...prev, categoryId: catRes.data.data[0].id }));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải dữ liệu Admin'));
    }
  }, [prodForm.categoryId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await apiClient.post('/categories', {
        name: catForm.name,
        ...(catForm.description.trim() ? { description: catForm.description.trim() } : {}),
        ...(catForm.parentId ? { parentId: catForm.parentId } : {}),
      });
      setCatForm({ name: '', description: '', parentId: '' });
      setMessage('Đã tạo danh mục mới!');
      await loadAll();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Tạo danh mục thất bại'));
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setError('');
    setMessage('');
    try {
      await apiClient.delete(`/categories/${id}`);
      setMessage('Đã xóa danh mục!');
      await loadAll();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể xóa danh mục'));
    }
  };

  const handleCreateProduct = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await apiClient.post('/products', {
        name: prodForm.name,
        sku: prodForm.sku,
        price: Number(prodForm.price),
        stock: Number(prodForm.stock),
        categoryId: prodForm.categoryId,
        ...(prodForm.description.trim() ? { description: prodForm.description.trim() } : {}),
        ...(prodForm.imageUrl.trim() ? { images: [prodForm.imageUrl.trim()] } : {}),
      });
      setProdForm((prev) => ({
        ...prev,
        name: '',
        sku: '',
        price: '',
        stock: '10',
        imageUrl: '',
        description: '',
      }));
      setMessage('Đã tạo sản phẩm mới!');
      await loadAll();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Tạo sản phẩm thất bại'));
    }
  };

  const handleAdjustStock = async (productId: string, delta: number) => {
    setError('');
    try {
      await apiClient.patch(`/products/${productId}/stock`, { delta });
      await loadAll();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể cập nhật tồn kho'));
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setError('');
    try {
      await apiClient.delete(`/products/${id}`);
      setMessage('Đã xóa sản phẩm!');
      await loadAll();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể xóa sản phẩm'));
    }
  };

  const handleOrderStatus = async (orderId: string, status: OrderStatus) => {
    setError('');
    setMessage('');
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status });
      setMessage(`Đã chuyển đơn hàng sang trạng thái ${status}`);
      await loadAll();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Cập nhật trạng thái thất bại'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          {(['products', 'categories', 'orders'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                tab === t ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t === 'products'
                ? `Sản phẩm (${products.length})`
                : t === 'categories'
                  ? `Danh mục (${categories.length})`
                  : `Đơn hàng (${orders.length})`}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      )}
      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {/* PRODUCTS TAB */}
      {tab === 'products' && (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateProduct}
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"
          >
            <h2 className="flex items-center gap-1.5 font-semibold text-slate-900">
              <Plus className="h-4 w-4 text-indigo-600" /> Thêm sản phẩm mới
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                required
                placeholder="Tên sản phẩm"
                value={prodForm.name}
                onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Mã SKU (vd: SKU-IP17)"
                value={prodForm.sku}
                onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                required
                value={prodForm.categoryId}
                onChange={(e) => setProdForm({ ...prodForm, categoryId: e.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                required
                type="number"
                min={0}
                placeholder="Giá (VNĐ)"
                value={prodForm.price}
                onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                required
                type="number"
                min={0}
                placeholder="Tồn kho"
                value={prodForm.stock}
                onChange={(e) => setProdForm({ ...prodForm, stock: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="url"
                placeholder="URL hình ảnh (tùy chọn)"
                value={prodForm.imageUrl}
                onChange={(e) => setProdForm({ ...prodForm, imageUrl: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Mô tả ngắn"
                value={prodForm.description}
                onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-3"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Tạo sản phẩm
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Sản phẩm</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Giá</th>
                  <th className="px-4 py-3">Tồn kho</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-600">{formatVnd(p.price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleAdjustStock(p.id, -1)}
                          className="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-50"
                        >
                          -1
                        </button>
                        <span className="w-8 text-center font-semibold">{p.stock}</span>
                        <button
                          type="button"
                          onClick={() => void handleAdjustStock(p.id, 5)}
                          className="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-50"
                        >
                          +5
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void handleDeleteProduct(p.id)}
                        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CATEGORIES TAB */}
      {tab === 'categories' && (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateCategory}
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"
          >
            <h2 className="flex items-center gap-1.5 font-semibold text-slate-900">
              <Plus className="h-4 w-4 text-indigo-600" /> Thêm danh mục mới
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                required
                placeholder="Tên danh mục"
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={catForm.parentId}
                onChange={(e) => setCatForm({ ...catForm, parentId: e.target.value })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">-- Danh mục gốc (không có cha) --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="Mô tả"
                value={catForm.description}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Tạo danh mục
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Tên</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Danh mục cha</th>
                  <th className="px-4 py-3">Số SP</th>
                  <th className="px-4 py-3 text-right">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.slug}</td>
                    <td className="px-4 py-3 text-slate-600">{c.parent?.name ?? '—'}</td>
                    <td className="px-4 py-3">{c._count?.products ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void handleDeleteCategory(c.id)}
                        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {tab === 'orders' && (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">{order.orderNumber}</span>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    {order.status}
                  </span>
                  <span className="text-xs text-slate-500">{formatDate(order.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Tổng: <strong className="text-indigo-600">{formatVnd(order.totalAmount)}</strong>{' '}
                  • {order.items.length} mặt hàng • {order.shippingAddress.recipientName}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {NEXT_STATUSES[order.status].map((nextStatus) => (
                  <button
                    key={nextStatus}
                    type="button"
                    onClick={() => void handleOrderStatus(order.id, nextStatus)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      nextStatus === 'CANCELLED'
                        ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    → {nextStatus}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
