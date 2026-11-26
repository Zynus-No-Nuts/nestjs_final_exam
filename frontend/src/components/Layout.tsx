import { LogOut, Package, Shield, ShoppingBag, ShoppingCart, User as UserIcon } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-indigo-50 text-indigo-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/70">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-indigo-600 transition hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <span>ShopNest</span>
          </Link>

          <nav className="flex items-center gap-1.5 sm:gap-2">
            {user ? (
              <>
                <NavLink to="/orders" className={navLinkClass}>
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Đơn mua</span>
                </NavLink>

                <NavLink to="/cart" className={navLinkClass}>
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden sm:inline">Giỏ hàng</span>
                  {(cart?.totalItems ?? 0) > 0 && (
                    <span className="ml-0.5 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                      {cart?.totalItems}
                    </span>
                  )}
                </NavLink>

                {isAdmin && (
                  <NavLink to="/admin" className={navLinkClass}>
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Quản trị</span>
                  </NavLink>
                )}

                <NavLink to="/profile" className={navLinkClass}>
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden md:inline max-w-36 truncate">{user.fullName}</span>
                </NavLink>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                  title="Đăng xuất"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden lg:inline">Đăng xuất</span>
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Đăng nhập
                </NavLink>
                <Link
                  to="/register"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <ShoppingBag className="h-4 w-4 text-indigo-600" />
            <span>ShopNest</span>
          </div>
          <p className="text-center text-xs sm:text-sm">
            © {new Date().getFullYear()} ShopNest. Sản phẩm chính hãng • Giao hàng toàn quốc • Đổi trả dễ dàng.
          </p>
        </div>
      </footer>
    </div>
  );
}
