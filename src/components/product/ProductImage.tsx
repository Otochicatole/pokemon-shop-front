import Image from 'next/image';
import Link from 'next/link';
import type { ProductCardImage } from './ProductCard';
import styles from './ProductImage.module.css';

export function ProductImage({ image, alt, href, kind, className = '' }: { image?: ProductCardImage; alt: string; href?: string; kind?: string; className?: string }) {
  const content = (
    <>
      {image ? <Image src={image.url} alt={image.altText || alt} fill sizes="(max-width: 640px) 50vw, 25vw" /> : <div className={`${styles.imagePlaceholder} image-placeholder`}><span>◈</span></div>}
      {kind && <span className={`${styles.productKind} product-kind`}>{kind}</span>}
    </>
  );
  return href ? (
    <Link href={href} className={`${styles.productImage} product-image ${className}`.trim()}>{content}</Link>
  ) : (
    <div className={`${styles.productImage} product-image ${className}`.trim()}>{content}</div>
  );
}

