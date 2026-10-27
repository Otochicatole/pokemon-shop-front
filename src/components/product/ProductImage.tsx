'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { ProductCardImage } from './ProductCard';
import styles from './ProductImage.module.css';

export function ProductImage({
  image,
  alt,
  href,
  kind,
  badge,
  className = '',
}: {
  image?: ProductCardImage;
  alt: string;
  href?: string;
  kind?: string;
  badge?: ReactNode;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const content = (
    <>
      {image && image.url !== failedUrl ? (
        <Image src={image.url} alt={image.altText || alt} fill sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 280px" onError={() => setFailedUrl(image.url)} />
      ) : (
        <div className={`${styles.imagePlaceholder} image-placeholder`}><ImageOff size={32} aria-hidden="true" /><span>Imagen no disponible</span></div>
      )}
      {(kind || badge) && (
        <div className={`${styles.productBadges} product-badges`}>
          {kind && <span className={`${styles.productKind} product-kind`}>{kind}</span>}
          {badge}
        </div>
      )}
    </>
  );

  return href ? (
    <Link href={href} aria-label={alt} className={`${styles.productImage} product-image ${className}`.trim()}>{content}</Link>
  ) : (
    <div className={`${styles.productImage} product-image ${className}`.trim()}>{content}</div>
  );
}
