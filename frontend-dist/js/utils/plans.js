export const PLAN_CATALOG = [
    {
        code: 'free',
        name: 'GRATUITO',
        priceCOP: 0,
        color: 'gray',
        features: ['1 usuario', 'Funciones basicas', 'Solo lectura', 'Ideal para pruebas'],
        limits: '1 usuario, solo lectura',
        nequiLink: null,
    },
    {
        code: 'starter',
        name: 'STARTER',
        priceCOP: 39900,
        color: 'blue',
        features: ['Hasta 5 usuarios', 'Hasta 100 clientes', 'Hasta 200 citas', 'CRUD completo', 'Reportes basicos'],
        limits: '5 usuarios, 100 clientes',
        // ── REEMPLAZA esta URL con el enlace real de tu botón de cobro Nequi ──
        nequiLink: 'https://cobros.nequi.com/boton-de-cobro?d=STARTER_LINK_AQUI',
    },
    {
        code: 'pro',
        name: 'PRO',
        priceCOP: 99900,
        color: 'purple',
        features: ['Hasta 25 usuarios', 'Hasta 1000 clientes', 'Citas ilimitadas', 'Reportes avanzados', 'Exportar datos', 'API acceso'],
        limits: '25 usuarios, 1000 clientes',
        // ── REEMPLAZA esta URL con el enlace real de tu botón de cobro Nequi ──
        nequiLink: 'https://cobros.nequi.com/boton-de-cobro?d=PRO_LINK_AQUI',
        lockedFeatures: ['Documentos', 'Autorizaciones'],
    },
    {
        code: 'max',
        name: 'MAX',
        priceCOP: 249900,
        color: 'indigo',
        features: ['Hasta 100 usuarios', 'Clientes ilimitados', 'Citas ilimitadas', 'Analytics avanzado', 'API completa', 'IA integrada', 'Documentos y autorizaciones', 'Soporte prioritario'],
        limits: 'Ilimitado',
        // ── REEMPLAZA esta URL con el enlace real de tu botón de cobro Nequi ──
        nequiLink: 'https://cobros.nequi.com/boton-de-cobro?d=MAX_LINK_AQUI',
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
