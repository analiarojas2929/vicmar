import { z } from 'zod';
import { demoRates } from '../config/demoRates';
import type { ServiceId } from '../config/content';
export const quoteSchema = z.object({
    service: z.enum(['solidos', 'liquidos', 'especiales'], { error: 'Selecciona un servicio.' }),
    waste: z.string().trim().min(5, 'Describe el residuo con al menos 5 caracteres.').max(500, 'Máximo 500 caracteres.'),
    quantity: z.number({ error: 'Ingresa una cantidad válida.' }).positive('La cantidad debe ser mayor que cero.').max(1000000, 'Para volúmenes mayores, solicita una evaluación personalizada.'),
    unit: z.enum(['kg', 'L']),
    region: z.string().trim().min(3, 'Indica la región.').max(100),
    commune: z.string().trim().min(3, 'Indica la comuna.').max(100),
    address: z.string().trim().min(5, 'Indica una dirección de retiro.').max(200),
    company: z.string().trim().min(2, 'Indica el nombre de tu empresa.').max(100),
    name: z.string().trim().min(3, 'Indica tu nombre.').max(100),
    email: z.email('Ingresa un correo válido.').max(150),
    phone: z.string().trim().regex(/^\+?[\d\s()-]{8,20}$/, 'Ingresa un teléfono válido (8 a 15 dígitos).').refine(v => { const n = v.replace(/\D/g, '').length; return n >= 8 && n <= 15; }, 'Ingresa entre 8 y 15 dígitos.'),
    consent: z.boolean().refine(v => v, 'Confirma que entiendes el carácter demostrativo.'),
}).superRefine((v, ctx) => {
    const expected = v.service === 'liquidos' ? 'L' : 'kg';
    if (v.unit !== expected)
        ctx.addIssue({ code: 'custom', path: ['unit'], message: 'La unidad no corresponde al servicio.' });
});
export type QuoteData = z.infer<typeof quoteSchema>;
export function calculateEstimate(service: ServiceId, quantity: number, unit: string): number | null {
    const rate = demoRates[service];
    if (!rate || rate.unit !== unit || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000)
        return null;
    return Math.round(rate.base + quantity * rate.perUnit);
}
export const money = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
