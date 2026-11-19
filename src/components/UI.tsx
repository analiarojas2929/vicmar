import { Link } from 'react-router-dom';
import { Boxes, Droplets, ShieldCheck, ClipboardList, MapPin, FileCheck2, Check } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { services } from '../config/content';
export function Reveal({ children, className = '' }: {
    children: ReactNode;
    className?: string;
}) {
    const reduced = useReducedMotion();
    return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.45 }}>{children}</motion.div>;
}
export function Heading({ eyebrow, title, text }: {
    eyebrow: string;
    title: string;
    text?: string;
}) {
    return <div className="section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{text && <p>{text}</p>}</div>;
}
export function ServiceCards() { return <div className="service-grid">{services.map((s, i) => { const Icon = [Boxes, Droplets, ShieldCheck][i]; return <Reveal className="service-card" key={s.id}><div className="card-top"><span className="icon-box"><Icon size={27}/></span><span className="service-type">{s.id === 'especiales' ? 'Evaluación a medida' : 'Gestión industrial'}</span></div><h3>{s.title}</h3><p>{s.description}</p><Link className="text-link" to={`/servicios#${s.id}`}>Explorar servicio <span aria-hidden="true">+</span></Link></Reveal>; })}</div>; }
export function Process() { return <section className="section process-section"><div className="container"><Heading eyebrow="SIMPLE DESDE EL PRIMER PASO" title="Así funciona tu cotización" text="De la necesidad de tu empresa a una solicitud bien preparada."/><div className="process-grid">{[{ Icon: ClipboardList, title: 'Cuéntanos qué necesitas', text: 'Selecciona el servicio y describe tu residuo.' }, { Icon: MapPin, title: 'Agrega los detalles', text: 'Indica cantidad, ubicación y datos de contacto.' }, { Icon: FileCheck2, title: 'Revisa tu solicitud', text: 'Consulta la estimación demo y prepara tu resumen.' }].map(({ Icon, title, text }) => <div className="process-item" key={title}><span className="process-icon"><Icon size={26}/></span><h3>{title}</h3><p>{text}</p></div>)}</div><div className="center"><Link to="/cotizador" className="button dark">Comenzar mi cotización</Link><p className="small muted mt-4">Sin compromiso · Simulación sin envío de datos</p></div></div></section>; }
export function CTA() { return <section className="container cta-wrap"><div className="cta-panel"><div><p className="eyebrow">EL SIGUIENTE PASO ES SIMPLE</p><h2>Tu operación avanza.<br />Tu gestión ambiental también.</h2><p>Cuéntanos qué necesitas y explora una nueva forma de cotizar.</p></div><Link to="/cotizador" className="button lime">Solicitar cotización</Link></div></section>; }
export function TrustNote() { return <p className="trust-note"><Check size={16}/> Catálogo propuesto · Servicios y alcance sujetos a validación con VICMAR</p>; }
