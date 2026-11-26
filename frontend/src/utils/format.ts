export function formatVnd(amount: string | number): string {
  const num = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getProductPlaceholder(name: string): string {
  const encoded = encodeURIComponent(name.slice(0, 22));
  return `https://placehold.co/600x450/e2e8f0/334155?text=${encoded}`;
}
