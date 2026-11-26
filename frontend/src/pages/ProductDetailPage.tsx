import {
  ArrowLeft,
  CheckCircle2,
  Minus,
  Plus,
  RefreshCcw,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient, getApiErrorMessage } from '../api/client';
import { ProductImage } from '../components/ProductImage';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { ApiEnvelope, Product } from '../types';
import { formatVnd } from '../utils/format';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [addedMsg, setAddedMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiClient
      .get<ApiEnvelope<Product>>(`/products/${id}`)
      .then((res) => setProduct(res.data.data))
      .catch((err) => setError(getApiErrorMessage(err, 'Không tìm thấy sản phẩm')))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdd = async (buyNow = false) => {
    if (!product) return;
    if (!user) {
      navigate('/login');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await addToCart(product.id, quantity);
      if (buyNow) {
        navigate('/cart');
        return;
      }
      setAddedMsg(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);
      setTimeout(() => setAddedMsg(''), 3000);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể thêm vào giỏ hàng'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="h-96 animate-pulse rounded-3xl bg-white p-8" />;
  }

  if (!product) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        {error || 'Sản phẩm không tồn tại'}
      </div>
    );
  }

  const images = product.images.length > 0 ? product.images : [''];
  const outOfStock = product.stock <= 0;

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" /> Tiếp tục mua sắm
      </Link>

      <div className="grid grid-cols-1 gap-8 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs md:grid-cols-2 md:p-8">
        {/* Image Gallery */}
        <div className="space-y-3">
          <ProductImage
            src={images[activeImage]}
            alt={product.name}
            ratio="4/3"
            className="rounded-2xl"
          />
          {images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pt-1">
              {images.map((img, idx) => (
                <button
                  key={img + idx}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  className={`w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    activeImage === idx
                      ? 'border-indigo-600 ring-2 ring-indigo-600/20'
                      : 'border-slate-200 opacity-75 hover:opacity-100'
                  }`}
                >
                  <ProductImage src={img} alt={product.name} ratio="4/3" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col space-y-5">
          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {product.category?.name ?? 'Sản phẩm chính hãng'}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                outOfStock
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {outOfStock ? 'Tạm hết hàng' : 'Còn hàng sẵn sàng giao'}
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{product.name}</h1>
            <p className="mt-3 text-3xl font-extrabold text-indigo-600">
              {formatVnd(product.price)}
            </p>
          </div>

          <p className="text-sm leading-relaxed text-slate-600">
            {product.description || 'Sản phẩm chính hãng chất lượng cao được phân phối bởi ShopNest.'}
          </p>

          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          )}
          {addedMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {addedMsg}
            </div>
          )}

          {/* Quantity & Actions */}
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700">Số lượng:</span>
              <div className="inline-flex items-center rounded-xl border border-slate-200">
                <button
                  type="button"
                  disabled={outOfStock || quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center text-sm font-semibold text-slate-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={outOfStock || quantity >= product.stock}
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  className="p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {!outOfStock && (
                <span className="text-xs text-slate-400">{product.stock} sản phẩm có sẵn</span>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={outOfStock || submitting}
                onClick={() => void handleAdd(false)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-indigo-600 bg-indigo-50/50 px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <ShoppingCart className="h-4 w-4" />
                Thêm vào giỏ
              </button>
              <button
                type="button"
                disabled={outOfStock || submitting}
                onClick={() => void handleAdd(true)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Mua ngay
              </button>
            </div>
          </div>

          {/* Customer Perks */}
          <div className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 shrink-0 text-indigo-600" />
              <span>Giao nhanh toàn quốc</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-600" />
              <span>Cam kết chính hãng 100%</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 shrink-0 text-indigo-600" />
              <span>Đổi trả trong 7 ngày</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
