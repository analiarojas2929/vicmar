import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Instagram, Leaf, ExternalLink } from 'lucide-react';
import { company } from '../config/content';
const navigation = [{ to: '/', label: 'Inicio' }, { to: '/nosotros', label: 'Nosotros' }, { to: '/servicios', label: 'Servicios' }, { to: '/contacto', label: 'Contacto' }];
export default function Layout() {
    const [open, setOpen] = useState(false);
    const location = useLocation();
    const toggle = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        setOpen(false);
        if (location.hash) {
            setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
        else
            window.scrollTo(0, 0);
        const titles: Record<string, string> = { '/': 'Gestión ambiental para tu empresa', '/nosotros': 'Nosotros', '/servicios': 'Servicios ambientales', '/cotizador': 'Cotizador demostrativo', '/contacto': 'Contacto', '/demo': 'Propuesta de A&D DIGITAL' };
        document.title = `VICMAR · ${titles[location.pathname] ?? 'Página no encontrada'}`;
        document.getElementById('main')?.focus({ preventScroll: true });
    }, [location.pathname, location.hash]);
    return <><a className="skip-link" href="#main">Saltar al contenido</a><div className="demo-bar"><span>Una nueva experiencia digital para VICMAR</span><Link to="/demo">Prototipo demostrativo <ExternalLink size={12}/></Link></div><header className="site-header"><div className="container nav-inner"><Link className="brand" to="/" aria-label="VICMAR, inicio"><img src="/images/vicmar-logo.webp" alt="" width="56" height="56"/><span>VICMAR<small>GESTIÓN AMBIENTAL</small></span></Link><nav className="desktop-nav" aria-label="Principal">{navigation.map(n => <NavLink end={n.to === '/'} key={n.to} to={n.to}>{n.label}</NavLink>)}</nav><Link to="/cotizador" className="button dark nav-quote">Solicitar cotización</Link><button ref={toggle} className="menu-toggle" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div>{open && <nav id="mobile-menu" className="mobile-nav" aria-label="Menú móvil" onKeyDown={e => { if (e.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
    } }}>{navigation.map(n => <NavLink key={n.to} to={n.to}>{n.label}</NavLink>)}<Link to="/cotizador">Solicitar cotización</Link><Link to="/demo">Acerca del prototipo</Link></nav>}</header><main id="main" tabIndex={-1}><Outlet /></main><footer className="footer"><div className="container footer-top"><div><Link to="/" className="footer-brand"><Leaf /> VICMAR</Link><p>Una mirada responsable.<br />Una solución para tu empresa.</p><span className="footer-demo">Prototipo demostrativo</span></div><div><h3>Explora</h3><Link to="/nosotros">Nosotros</Link><Link to="/servicios">Servicios</Link><Link to="/cotizador">Cotizador demo</Link></div><div><h3>Conversemos</h3><Link to="/contacto">Contacto</Link><a href={company.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={16}/> Instagram oficial</a><a href={company.website} target="_blank" rel="noopener noreferrer">Web actual de VICMAR</a></div><div className="footer-credit"><h3>Una propuesta de</h3><strong>A&D DIGITAL<span>Diseño, tecnología y nuevas posibilidades.</span></strong><Link to="/demo">Conoce esta propuesta</Link></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} · VICMAR · Propuesta visual para presentación comercial</span><span>Diseñado por A&D DIGITAL</span></div></footer></>;
}
