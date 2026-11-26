import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient, getApiErrorMessage } from '../api/client';
import { ProductImage } from '../components/ProductImage';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { ApiEnvelope, CategoryTreeNode, PaginationMeta, Product } from '../types';
import { formatVnd } from '../utils/format';

const CATEGORY_VI: Record<string, string> = {
  electronics: 'Thiết bị điện tử',
  fashion: 'Thời trang & Phụ kiện',
  smartphones: 'Điện thoại',
  laptops: 'Laptop',
  audio: 'Âm thanh',
  smartwatches: 'Đồng hồ thông minh',
  sneakers: 'Giày thể thao',
  'apparel-bags': 'Trang phục & Balo',
};

function displayCategoryName(slug?: string, fallback?: string): string {
  if (slug && CATEGORY_VI[slug]) return CATEGORY_VI[slug];
  return fallback ?? 'Sản phẩm';
}

export function HomePage() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'price' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiClient
      .get<ApiEnvelope<CategoryTreeNode[]>>('/categories?tree=true')
      .then((res) => setCategories(res.data.data))
      .catch(() => {});
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = {
        page,
        limit: 9,
        sortBy,
        sortOrder,
      };
      if (search) params.search = search;
      if (categoryId) params.categoryId = categoryId;
      if (minPrice) params.minPrice = Number(minPrice);
      if (maxPrice) params.maxPrice = Number(maxPrice);

      const res = await apiClient.get<ApiEnvelope<Product[]>>('/products', { params });
      setProducts(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải danh sách sản phẩm'));
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryId, minPrice, maxPrice, sortBy, sortOrder]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const handleQuickAdd = async (product: Product) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await addToCart(product.id, 1);
      setToast(`Đã thêm "${product.name}" vào giỏ hàng`);
      setTimeout(() => setToast(''), 2500);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể thêm vào giỏ hàng'));
    }
  };

  const applyPricePreset = (min: string, max: string) => {
    setMinPrice(min);
    setMaxPrice(max);
    setPage(1);
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setCategoryId('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilter = Boolean(search || categoryId || minPrice || maxPrice);

  return (
    <div className="space-y-8">
      {/* Centered Hero & Search */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-6 py-10 text-white shadow-sm sm:px-10 sm:py-12">
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
            Khám phá Công nghệ & Thời trang chính hãng
          </h1>
          <p className="mx-auto max-w-xl text-sm text-indigo-100 sm:text-base">
            Sản phẩm chọn lọc chất lượng cao, giá minh bạch và giao hàng tận nơi nhanh chóng.
          </p>

          <form
            onSubmit={handleSearch}
            className="mx-auto flex max-w-xl items-center gap-2 rounded-2xl bg-white p-1.5 shadow-lg shadow-indigo-900/15"
          >
            <div className="relative flex flex-1 items-center">
              <Search className="pointer-events-none ml-3 h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Bạn đang tìm sản phẩm gì hôm nay?"
                className="w-full bg-transparent py-2 pr-8 pl-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Xóa từ khóa"
                  className="absolute right-2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Tìm kiếm
            </button>
          </form>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar Filters */}
        <aside className="space-y-6 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs lg:col-span-1 lg:self-start">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
              Danh mục & Bộ lọc
            </h2>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Xóa lọc
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                setCategoryId('');
                setPage(1);
              }}
              className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                categoryId === ''
                  ? 'bg-indigo-50 font-semibold text-indigo-700'
                  : 'font-medium text-slate-700 hover:bg-slate-50'
              }`}
            >
              Tất cả sản phẩm
            </button>
            {categories.map((parent) => (
              <div key={parent.id} className="space-y-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryId(parent.id);
                    setPage(1);
                  }}
                  className={`block w-full rounded-xl px-3 py-1.5 text-left text-sm font-semibold transition ${
                    categoryId === parent.id
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {displayCategoryName(parent.slug, parent.name)}
                </button>
                {parent.children.length > 0 && (
                  <div className="ml-3 space-y-0.5 border-l-2 border-slate-100 pl-2.5">
                    {parent.children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => {
                          setCategoryId(child.id);
                          setPage(1);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                          categoryId === child.id
                            ? 'bg-indigo-50 font-semibold text-indigo-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span>{displayCategoryName(child.slug, child.name)}</span>
                        <span className="text-[11px] text-slate-400">{child.productCount}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Price Range */}
          <div className="space-y-3 border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Mức giá
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Dưới 5 triệu', min: '', max: '5000000' },
                { label: '5 - 20 triệu', min: '5000000', max: '20000000' },
                { label: 'Trên 20 triệu', min: '20000000', max: '' },
              ].map((preset) => {
                const active = minPrice === preset.min && maxPrice === preset.max;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      active ? applyPricePreset('', '') : applyPricePreset(preset.min, preset.max)
                    }
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                      active
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <input
                type="number"
                min={0}
                placeholder="Giá từ"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="number"
                min={0}
                placeholder="Đến giá"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </aside>

        {/* Product Grid Area */}
        <div className="space-y-5 lg:col-span-3">
          {/* Top toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3">
            <p className="text-sm text-slate-600">
              {meta ? (
                <>
                  Hiển thị <strong className="text-slate-900">{products.length}</strong> trên tổng số{' '}
                  <strong className="text-slate-900">{meta.total}</strong> sản phẩm
                </>
              ) : (
                'Đang tải sản phẩm...'
              )}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-xs font-medium text-slate-500">
                Sắp xếp:
              </label>
              <select
                id="sort-select"
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split(':') as [
                    'createdAt' | 'price' | 'name',
                    'asc' | 'desc',
                  ];
                  setSortBy(field);
                  setSortOrder(order);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
              >
                <option value="createdAt:desc">Mới ra mắt</option>
                <option value="price:asc">Giá thấp đến cao</option>
                <option value="price:desc">Giá cao đến thấp</option>
                <option value="name:asc">Tên A → Z</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white p-4"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center">
              <p className="text-base font-semibold text-slate-800">
                Không tìm thấy sản phẩm phù hợp
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Bạn hãy thử từ khóa khác hoặc xóa bớt bộ lọc để xem thêm sản phẩm nhé.
              </p>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Xem tất cả sản phẩm
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const outOfStock = product.stock <= 0;
                const lowStock = product.stock > 0 && product.stock <= 5;
                return (
                  <article
                    key={product.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Link to={`/products/${product.id}`} className="relative block w-full shrink-0">
                      <ProductImage
                        src={product.images[0]}
                        alt={product.name}
                        ratio="4/3"
                        hoverZoom
                      />
                      {outOfStock && (
                        <span className="absolute top-3 right-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white">
                          Tạm hết hàng
                        </span>
                      )}
                      {lowStock && (
                        <span className="absolute top-3 right-3 rounded-full bg-amber-500/95 px-2.5 py-1 text-xs font-semibold text-white">
                          Sắp hết hàng
                        </span>
                      )}
                    </Link>

                    <div className="flex flex-1 flex-col p-4">
                      <span className="mb-1.5 text-xs font-medium text-indigo-600">
                        {displayCategoryName(product.category?.slug, product.category?.name)}
                      </span>

                      <Link
                        to={`/products/${product.id}`}
                        className="line-clamp-2 text-[15px] leading-snug font-semibold text-slate-900 transition hover:text-indigo-600"
                      >
                        {product.name}
                      </Link>

                      <p className="mt-1.5 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-500">
                        {product.description}
                      </p>

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
                        <span className="text-base font-bold text-slate-900">
                          {formatVnd(product.price)}
                        </span>
                        <button
                          type="button"
                          disabled={outOfStock}
                          onClick={() => void handleQuickAdd(product)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          Chọn mua
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-sm">
              <span className="text-slate-600">
                Trang <strong>{meta.page}</strong> / {meta.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3.5 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Trang trước
                </button>
                <button
                  type="button"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3.5 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  Trang sau <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Toast */}
      {toast && (
        <div className="fixed right-5 bottom-5 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
