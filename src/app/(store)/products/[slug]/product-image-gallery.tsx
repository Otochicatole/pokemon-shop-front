'use client';

import Image from 'next/image';
import { ArrowLeft, ArrowRight, ImageOff, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/overlay/Dialog';
import type { Product } from '@/shared/api/contracts';

import styles from './product-image-gallery.module.css';

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
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const [zoomOpen, setZoomOpen] = useState(false);
  const [detailZoom, setDetailZoom] = useState(false);
  const zoomViewportRef = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(0, images.findIndex((image) => image.id === activeId));
  const activeImage = images[activeIndex];
  const imageAvailable = !!activeImage && !failedImages.has(activeImage.url);
  const caption = activeImage?.altText?.trim();
  const showCaption = caption && caption.toLowerCase() !== productName.trim().toLowerCase();

  useEffect(() => {
    const viewport = zoomViewportRef.current;
    if (!viewport) return;
    viewport.scrollLeft = detailZoom ? (viewport.scrollWidth - viewport.clientWidth) / 2 : 0;
    viewport.scrollTop = 0;
  }, [detailZoom, activeId, zoomOpen]);

  function markFailed(url: string) {
    setFailedImages((current) => new Set(current).add(url));
  }

  function changeImage(direction: number) {
    if (!images.length) return;
    setActiveId(images[(activeIndex + direction + images.length) % images.length].id);
  }

  const fallback = (
    <div className={styles.emptyImage}>
      <ImageOff size={32} aria-hidden="true" />
      <strong>{activeImage ? 'No pudimos cargar esta imagen' : 'Imagen no disponible'}</strong>
      <span>{images.length > 1 ? 'Podés ver las otras imágenes del producto.' : productName}</span>
    </div>
  );

  return (
    <div className={`${styles.gallery} detail-gallery`}>
      <figure className={styles.figure}>
        <div className={styles.mainImage}>
          {imageAvailable ? (
            <button type="button" className={styles.expandImage} onClick={() => setZoomOpen(true)} aria-label={`Ampliar imagen de ${productName}`}>
              <Image
                key={activeImage.url}
                src={activeImage.url}
                alt={activeImage.altText || productName}
                fill
                loading="eager"
                fetchPriority="high"
                sizes="(max-width: 800px) 92vw, (max-width: 1400px) 48vw, 640px"
                onError={() => markFailed(activeImage.url)}
              />
              <span className={styles.zoomHint}><ZoomIn size={17} aria-hidden="true" /> Ampliar imagen</span>
            </button>
          ) : fallback}
          {images.length > 0 && <span className={styles.counter} aria-label={`Imagen ${activeIndex + 1} de ${images.length}`}>{activeIndex + 1} / {images.length}</span>}
        </div>
        {showCaption && <figcaption className={styles.caption}>{caption}</figcaption>}
      </figure>
      {images.length > 1 && (
        <div className={styles.thumbnails} role="group" aria-label="Imágenes del producto">
          {images.map((item, index) => (
            <button type="button" key={item.id} className={`${styles.thumbnail} ${index === activeIndex ? styles.active : ''}`} onClick={() => setActiveId(item.id)} aria-label={`Ver imagen ${index + 1}`} aria-pressed={index === activeIndex}>
              {failedImages.has(item.url) ? <ImageOff size={22} aria-hidden="true" /> : (
                <Image src={item.url} alt="" fill sizes="76px" onError={() => markFailed(item.url)} />
              )}
            </button>
          ))}
        </div>
      )}
      <p className={styles.sku}>SKU <span>{sku}</span></p>
      <Dialog open={zoomOpen} title={productName} onClose={() => { setZoomOpen(false); setDetailZoom(false); }} className={styles.zoomDialog}>
        <div className={styles.zoomContent} onKeyDown={(event) => {
          if (detailZoom) return;
          if (event.key === 'ArrowLeft') { event.preventDefault(); changeImage(-1); }
          if (event.key === 'ArrowRight') { event.preventDefault(); changeImage(1); }
        }}>
          <div className={styles.zoomToolbar}>
            <span>{detailZoom ? 'Desplazá la imagen para ver los detalles.' : 'Vista completa'}</span>
            <button type="button" disabled={!imageAvailable} aria-pressed={detailZoom} onClick={() => setDetailZoom((current) => !current)}>
              {detailZoom ? <ZoomOut size={18} aria-hidden="true" /> : <ZoomIn size={18} aria-hidden="true" />}
              {detailZoom ? 'Ajustar imagen' : 'Ver en detalle'}
            </button>
          </div>
          <div ref={zoomViewportRef} className={styles.zoomViewport} role="region" aria-label={`Vista ampliada de ${productName}`} tabIndex={detailZoom ? 0 : undefined}>
            <figure className={`${styles.zoomFigure} ${detailZoom && imageAvailable ? styles.zoomFigureEnlarged : ''}`}>
              {imageAvailable ? (
                <Image key={activeImage.url} src={activeImage.url} alt={activeImage.altText || productName} fill sizes={detailZoom ? '(max-width: 760px) 180vw, 1760px' : '(max-width: 760px) 90vw, 880px'} onError={() => markFailed(activeImage.url)} />
              ) : fallback}
            </figure>
          </div>
          {showCaption && <p className={styles.caption}>{caption}</p>}
          {images.length > 1 && (
            <div className={styles.zoomControls}>
              <button type="button" onClick={() => changeImage(-1)} aria-label="Imagen anterior"><ArrowLeft size={18} aria-hidden="true" /><span>Anterior</span></button>
              <span aria-live="polite">{activeIndex + 1} / {images.length}</span>
              <button type="button" onClick={() => changeImage(1)} aria-label="Imagen siguiente"><span>Siguiente</span><ArrowRight size={18} aria-hidden="true" /></button>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
