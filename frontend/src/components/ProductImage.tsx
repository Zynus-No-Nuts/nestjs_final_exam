import { getProductPlaceholder } from '../utils/format';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  ratio?: '4/3' | '1/1';
  className?: string;
  hoverZoom?: boolean;
}

export function ProductImage({
  src,
  alt,
  ratio = '4/3',
  className = '',
  hoverZoom = false,
}: ProductImageProps) {
  const ratioClass = ratio === '1/1' ? 'aspect-square' : 'aspect-[4/3]';
  const fallback = getProductPlaceholder(alt);

  return (
    <div
      className={`relative w-full shrink-0 overflow-hidden bg-slate-100 ${ratioClass} ${className}`}
    >
      <img
        src={src || fallback}
        alt={alt}
        loading="lazy"
        onError={(e) => {
          if (e.currentTarget.src !== fallback) {
            e.currentTarget.src = fallback;
          }
        }}
        className={`absolute inset-0 h-full w-full object-cover object-center ${
          hoverZoom ? 'transition-transform duration-300 group-hover:scale-105' : ''
        }`}
      />
    </div>
  );
}
