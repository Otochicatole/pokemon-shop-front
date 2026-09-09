import Link from 'next/link';
import { ArrowUpRight, ShieldCheck, Sparkles, Truck, Package, Layers3, Gem } from 'lucide-react';
import { CatalogProductCard, listProducts } from '@/features/catalog';
import { SectionHeading, TexturePanel } from '@/components';
import { CompanionBattle } from '@/features/home';

const collections = [
  { href: '/catalog?kind=SINGLE_CARD', label: 'Cartas sueltas', eyebrow: 'Completá tu pokédex', icon: Layers3, tone: 'yellow' },
  { href: '/catalog?kind=SEALED_PRODUCT', label: 'Sobres y cajas', eyebrow: 'Tentá a la suerte', icon: Package, tone: 'red' },
  { href: '/catalog?kind=ACCESSORY', label: 'Accesorios', eyebrow: 'Protegé tu equipo', icon: Gem, tone: 'cyan' },
] as const;

export default async function Home() {
  const products = await listProducts(new URLSearchParams({ limit: '8' })).catch(() => ({ data: [], nextCursor: null }));
  return <>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">Ruta 10 // central de coleccionistas</p><h1>Viví la aventura.<br /><em>Coleccioná.</em></h1><p className="hero-text">Cartas Pokémon, productos sellados y equipo para entrenadores. Explorá el catálogo y encontrá tu próxima pieza favorita.</p><div className="hero-actions"><Link className="button button-primary" href="/catalog">Entrar a la tienda <ArrowUpRight size={16} /></Link><Link className="text-button" href="/catalog?kind=SINGLE_CARD">Atacar <Sparkles size={14} /></Link></div></div>
      <CompanionBattle />
    </section>
    <section className="trust-strip"><span><ShieldCheck size={16} /> Compra protegida</span><span><Sparkles size={16} /> Piezas verificadas</span><span><Truck size={16} /> Envíos a todo el país</span></section>
    <section className="collection-links">{collections.map(({ href, label, eyebrow, icon: Icon, tone }) => <Link className={`collection-link collection-link-${tone}`} href={href} key={label}><span className="collection-icon"><Icon size={22} /></span><span><small>{eyebrow}</small><strong>{label}</strong></span><ArrowUpRight size={17} /></Link>)}</section>
    <section className="home-section"><SectionHeading eyebrow="Inventario en vivo" title="Cartas destacadas" description="Stock real, precios claros y piezas listas para tu próxima colección." action={<Link className="text-button" href="/catalog">Catálogo completo <ArrowUpRight size={15} /></Link>} />{products.data.length ? <div className="product-grid">{products.data.map((product) => <CatalogProductCard key={product.id} product={product} />)}</div> : <div className="empty-home"><p>El catálogo se está preparando.</p><Link href="/catalog" className="text-button">Explorar la tienda <ArrowUpRight size={16} /></Link></div>}</section>
    <section className="explore-section"><TexturePanel className="explore-panel"><div><p className="eyebrow">Mapa de la aventura // Card Shop</p><h2>Explorá por categoría</h2><p>Cada zona esconde una colección diferente.</p></div><Link className="button button-secondary" href="/catalog">Ver todas las piezas <ArrowUpRight size={15} /></Link></TexturePanel></section>
    <section className="trainer-club"><div className="club-card"><span className="club-level">CLUB DE ENTRENADORES · NIVEL 01</span><h2>Sumá puntos.<br />Desbloqueá recompensas.</h2><p>Cada compra suma experiencia. Subí de nivel y conseguí envíos gratis, preventas y cartas exclusivas.</p><Link className="button button-primary" href="/auth/register">Unirme gratis <ArrowUpRight size={15} /></Link></div><div className="xp-box"><div className="xp-top"><span>TU PRÓXIMA RECOMPENSA</span><b>650 / 1000 XP</b></div><div className="xp-track"><i /></div><div className="reward-row"><span>◉<small>100 XP<br />STICKER</small></span><span>▣<small>500 XP<br />ENVÍO</small></span><span className="locked">◆<small>1000 XP<br />CARTA RARA</small></span></div></div></section>
  </>;
}
