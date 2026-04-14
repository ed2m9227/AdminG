export const PLAN_CATALOG = [
    {
        code: 'free',
        name: 'GRATUITO',
        priceCOP: 0,
        color: 'gray',
        features: ['1 usuario', 'Funciones basicas', 'Solo lectura', 'Trial completo 15 dias'],
        limits: '1 usuario, solo lectura',
        nequiLink: null,
        nequiQrUrl: null,
    },
    {
        code: 'starter',
        name: 'STARTER',
        priceCOP: 39900,
        color: 'blue',
        features: ['Hasta 5 usuarios', 'Hasta 100 clientes', 'Hasta 200 citas', 'CRUD completo', 'Reportes basicos'],
        limits: '5 usuarios, 100 clientes',
        nequiLink: 'https://checkout.nequi.wompi.co/l/tBJ1zT',
        nequiQrUrl: null,
    },
    {
        code: 'pro',
        name: 'PRO',
        priceCOP: 99900,
        color: 'purple',
        features: ['Hasta 25 usuarios', 'Hasta 1000 clientes', 'Citas ilimitadas', 'Reportes avanzados', 'Exportar datos', 'API acceso'],
        limits: '25 usuarios, 1000 clientes',
        nequiLink: 'https://checkout.nequi.wompi.co/l/WiuhXg',
        nequiQrUrl: null,
        lockedFeatures: ['Documentos', 'Autorizaciones'],
    },
    {
        code: 'max',
        name: 'MAX',
        priceCOP: 249900,
        color: 'indigo',
        features: ['Hasta 100 usuarios', 'Clientes ilimitados', 'Citas ilimitadas', 'Analytics avanzado', 'API completa', 'IA integrada', 'Documentos y autorizaciones', 'Soporte prioritario'],
        limits: 'Ilimitado',
        nequiLink: 'https://checkout.nequi.wompi.co/l/qDXh8p',
        nequiQrUrl: null,
    },
];

export function normalizePlanCode(planCode) {
    const aliases = {
        basic: 'starter',
        AdminG_Basic: 'starter',
        plus: 'pro',
        start: 'pro',
        AdminG_Plus: 'pro',
        AdminPro_Start: 'pro',
        AdminPro_Max: 'max',
    };
    return aliases[planCode] || planCode || 'free';
}
