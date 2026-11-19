import { describe, it, expect } from 'vitest';
import { calculateEstimate, quoteSchema } from './quote';
const valid = { service: 'solidos', waste: 'Envases de descarte', quantity: 500, unit: 'kg', region: 'Región de ejemplo', commune: 'Comuna demo', address: 'Calle de ejemplo 123', company: 'Empresa demo', name: 'Persona Demo', email: 'persona@example.com', phone: '+56 9 1234 5678', consent: true };
describe('Cotización demostrativa', () => {
    it('aplica la base y la tarifa por unidad de cada categoría', () => { expect(calculateEstimate('solidos', 500, 'kg')).toBe(95000); expect(calculateEstimate('liquidos', 1000, 'L')).toBe(135000); });
    it('exige evaluación para servicios sin tarifa o unidades incompatibles', () => { expect(calculateEstimate('especiales', 100, 'kg')).toBeNull(); expect(calculateEstimate('solidos', 100, 'L')).toBeNull(); });
    it('rechaza cantidades inválidas y fuera de alcance', () => { for (const value of [0, -5, NaN, Infinity, 1000001])
        expect(calculateEstimate('solidos', value, 'kg')).toBeNull(); });
    it('acepta antecedentes válidos y exige consentimiento demo', () => { expect(quoteSchema.safeParse(valid).success).toBe(true); expect(quoteSchema.safeParse({ ...valid, consent: false }).success).toBe(false); });
    it('rechaza datos incompletos, correo y teléfono inválidos y unidades incorrectas', () => { for (const override of [{ email: 'incorrecto' }, { phone: 'abc' }, { phone: '--------' }, { waste: ' ' }, { address: '' }, { quantity: 0 }, { unit: 'L' }])
        expect(quoteSchema.safeParse({ ...valid, ...override }).success).toBe(false); });
});
