export const company = {
    name: 'VICMAR',
    instagram: 'https://www.instagram.com/vicmar.medioambiente/',
    website: 'https://vicmar.cl/',
    // Vacíos hasta que VICMAR valide sus datos actuales. Nunca usar números ficticios.
    whatsapp: '',
    email: '',
    address: '',
    about: 'Una propuesta para conectar las necesidades de tu operación con soluciones de retiro y transporte de residuos industriales. Queremos que el primer paso sea claro, simple y con la información que tu empresa necesita.',
    mission: 'Facilitar una gestión ambiental responsable a través de una atención cercana y una evaluación cuidadosa de cada necesidad.',
    experience: 'Este espacio está preparado para incorporar la trayectoria, el equipo y los hitos que VICMAR valide para su nueva web.',
};
export const services = [
    { id: 'solidos', title: 'Residuos sólidos', short: 'Orden para tu operación.', description: 'Solicita una evaluación para el retiro de materiales y residuos sólidos de tu actividad industrial.', examples: 'Materiales de descarte, envases y residuos de procesos.', benefit: 'Reúne cantidad, tipo de material y condiciones de retiro en una sola solicitud.', unit: 'kg', icon: 'boxes' },
    { id: 'liquidos', title: 'Residuos líquidos', short: 'Una solución para cada flujo.', description: 'Entrega los antecedentes de tus residuos líquidos para evaluar una alternativa de retiro y transporte.', examples: 'Líquidos de procesos y mezclas que requieren caracterización.', benefit: 'Describe el volumen y el almacenamiento para facilitar la evaluación técnica.', unit: 'L', icon: 'droplets' },
    { id: 'especiales', title: 'Residuos especiales', short: 'Cada residuo merece atención.', description: 'Un espacio para necesidades que requieren revisar su composición, manejo y condiciones particulares.', examples: 'Residuos con características o requerimientos específicos.', benefit: 'Recibe una evaluación personalizada antes de definir el alcance del servicio.', unit: 'kg', icon: 'shield' },
] as const;
export type ServiceId = typeof services[number]['id'];
export const disclaimer = 'Valor demostrativo, sujeto a evaluación y confirmación por VICMAR';
