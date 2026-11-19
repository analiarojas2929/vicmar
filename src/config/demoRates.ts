import type { ServiceId } from './content';
export type Rate = {
    base: number;
    perUnit: number;
    unit: 'kg' | 'L';
};
// Cifras ficticias en CLP. No representan tarifas oficiales, impuestos ni costos reales.
export const demoRates: Partial<Record<ServiceId, Rate>> = {
    solidos: { base: 35000, perUnit: 120, unit: 'kg' },
    liquidos: { base: 45000, perUnit: 90, unit: 'L' },
};
