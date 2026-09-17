'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Product } from '@/shared/api/contracts';

import styles from './page.module.css';

type ProductImage = Product['images'][number];

export function ProductImageGallery({
  images,
  productName,
  sku,
}: {
  images: ProductImage[];
  productName: string;
  sku: string;
}) {
  const [activeId, setActiveId] = useState(images[0]?.id ?? '');
  const activeImage = images.find((image) => image.id === activeId) ?? images[0];

  return (
    <div className={`${styles.detailGallery} detail-gallery`}>
      <div className={`${styles.detailGalleryHeader} detail-gallery-header`}>
        <span>PIEZA // {sku}</span>
        <span>
          {images.length
            ? `${images.length} ${images.length === 1 ? 'vista' : 'vistas'}`
            : 'Vista única'}
        </span>
      </div>
      <figure className={`${styles.detailMainImage} detail-main-image`}>
        <span
          className={`${styles.detailImageCorner} ${styles.detailImageCornerTl} detail-image-corner detail-image-corner-tl`}
          aria-hidden="true"
        />
        <span
          className={`${styles.detailImageCorner} ${styles.detailImageCornerBr} detail-image-corner detail-image-corner-br`}
          aria-hidden="true"
        />
        {activeImage ? (
          <Image
            src={activeImage.url}
            alt={activeImage.altText || productName}
            fill
            priority
            sizes="(max-width: 900px) 100vw, 56vw"
          />
        ) : (
          <div className="image-placeholder large">
            <span>◈</span>
          </div>
        )}
      </figure>
      {images.length > 1 && (
        <div className={`${styles.detailThumbnails} detail-thumbnails`} aria-label="Vistas del producto">
          {images.map((item, index) => {
            const isActive = item.id === activeImage?.id;
            return (
              <button
                type="button"
                key={item.id}
                className={`${styles.detailThumbnail} ${isActive ? `${styles.isActive} is-active` : ''} detail-thumbnail`}
                onClick={() => setActiveId(item.id)}
                aria-label={`Ver imagen ${index + 1}`}
                aria-pressed={isActive}
              >
                <Image
                  src={item.url}
                  alt={item.altText || `${productName}, vista ${index + 1}`}
                  fill
                  sizes="80px"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
