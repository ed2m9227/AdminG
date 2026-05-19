/**
 * Business Type Registry — Frontend
 * ==================================
 * Mirror of the backend's app/core/business_registry.py.
 *
 * Single source of truth for all business-type-specific configuration on the
 * client side.  To add a new business type add ONE entry to BUSINESS_REGISTRY
 * — no other file needs to change.
 *
 * Design principles applied:
 *   OCP  — extend by adding registry entries, not by modifying filtering logic.
 *   SRP  — this module only owns business-type configuration.
 *   DIP  — Sidebar, app.js and views depend on this abstraction instead of
 *           scattered hardcoded arrays.
 */

// ─── AI intent group constants ───────────────────────────────────────────────
const SHARED_INTENTS = [
    'monthly_revenue',
    'recurrent_clients',
    'top_services',
    'recent_appointments',
];

const HEALTHCARE_INTENTS = [
    ...SHARED_INTENTS,
    'appointments_this_week',
    'patients_without_visit_6_months',
];

const VETERINARY_INTENTS = [
    ...HEALTHCARE_INTENTS,
    'consultations_this_week',
    'pets_without_visit_6_months',
];

// ─── Feature group constants ─────────────────────────────────────────────────
const CRM_FEATURES = [
    'view_crm', 'create_crm', 'edit_crm', 'delete_crm',
    'view_crm_analytics', 'use_crm_ai_chat',
];

const MEDICAL_DOC_FEATURES = [
    'view_documents', 'create_documents', 'edit_documents', 'delete_documents',
    'view_authorizations', 'create_authorizations', 'manage_authorizations',
];

const NON_HEALTHCARE_BLOCKED  = [...CRM_FEATURES, ...MEDICAL_DOC_FEATURES];
const HEALTHCARE_NON_VET_BLOCKED = [...CRM_FEATURES];

// ─── Registry ────────────────────────────────────────────────────────────────
const BUSINESS_REGISTRY = {
    veterinaria: {
        displayName: 'Veterinaria',
        category: 'healthcare',
        vocabulary: { customer: 'Propietario', customers: 'Propietarios', appointment: 'Cita', appointments: 'Citas', product: 'Medicamento / Producto', service: 'Procedimiento' },
        blockedFeatures: [],
        aiIntents: VETERINARY_INTENTS,
        crmLabel: 'CRM Veterinario', crmIcon: '🐾',
    },
    consultorio: {
        displayName: 'Consultorio Médico',
        category: 'healthcare',
        vocabulary: { customer: 'Paciente', customers: 'Pacientes', appointment: 'Consulta', appointments: 'Consultas', product: 'Medicamento / Insumo', service: 'Procedimiento' },
        blockedFeatures: HEALTHCARE_NON_VET_BLOCKED,
        aiIntents: HEALTHCARE_INTENTS,
        crmLabel: 'CRM Clínico', crmIcon: '🏥',
    },
    clinica: {
        displayName: 'Clínica',
        category: 'healthcare',
        vocabulary: { customer: 'Paciente', customers: 'Pacientes', appointment: 'Consulta', appointments: 'Consultas', product: 'Medicamento / Insumo', service: 'Procedimiento' },
        blockedFeatures: HEALTHCARE_NON_VET_BLOCKED,
        aiIntents: HEALTHCARE_INTENTS,
        crmLabel: 'CRM Clínico', crmIcon: '🏥',
    },
    dentista: {
        displayName: 'Dentista',
        category: 'healthcare',
        vocabulary: { customer: 'Paciente', customers: 'Pacientes', appointment: 'Cita', appointments: 'Citas', product: 'Insumo', service: 'Tratamiento' },
        blockedFeatures: HEALTHCARE_NON_VET_BLOCKED,
        aiIntents: HEALTHCARE_INTENTS,
        crmLabel: 'CRM Dental', crmIcon: '🦷',
    },
    dental: {
        displayName: 'Clínica Dental',
        category: 'healthcare',
        vocabulary: { customer: 'Paciente', customers: 'Pacientes', appointment: 'Cita', appointments: 'Citas', product: 'Insumo', service: 'Tratamiento' },
        blockedFeatures: HEALTHCARE_NON_VET_BLOCKED,
        aiIntents: HEALTHCARE_INTENTS,
        crmLabel: 'CRM Dental', crmIcon: '🦷',
    },
    fisioterapia: {
        displayName: 'Fisioterapia',
        category: 'healthcare',
        vocabulary: { customer: 'Paciente', customers: 'Pacientes', appointment: 'Sesión', appointments: 'Sesiones', product: 'Insumo', service: 'Sesión de terapia' },
        blockedFeatures: HEALTHCARE_NON_VET_BLOCKED,
        aiIntents: HEALTHCARE_INTENTS,
        crmLabel: 'CRM Pacientes', crmIcon: '🏥',
    },
    nutricion: {
        displayName: 'Nutrición',
        category: 'healthcare',
        vocabulary: { customer: 'Paciente', customers: 'Pacientes', appointment: 'Consulta', appointments: 'Consultas', product: 'Suplemento', service: 'Consulta nutricional' },
        blockedFeatures: HEALTHCARE_NON_VET_BLOCKED,
        aiIntents: HEALTHCARE_INTENTS,
        crmLabel: 'CRM Pacientes', crmIcon: '🥗',
    },
    medicina_general: {
        displayName: 'Medicina General',
        category: 'healthcare',
        vocabulary: { customer: 'Paciente', customers: 'Pacientes', appointment: 'Consulta', appointments: 'Consultas', product: 'Medicamento', service: 'Consulta' },
        blockedFeatures: HEALTHCARE_NON_VET_BLOCKED,
        aiIntents: HEALTHCARE_INTENTS,
        crmLabel: 'CRM Pacientes', crmIcon: '🏥',
    },
    barberia: {
        displayName: 'Barbería',
        category: 'service',
        vocabulary: { customer: 'Cliente', customers: 'Clientes', appointment: 'Turno', appointments: 'Turnos', product: 'Producto', service: 'Servicio' },
        blockedFeatures: NON_HEALTHCARE_BLOCKED,
        aiIntents: SHARED_INTENTS,
        crmLabel: 'CRM Clientes', crmIcon: '💈',
    },
    salon: {
        displayName: 'Salón de Belleza',
        category: 'service',
        vocabulary: { customer: 'Cliente', customers: 'Clientes', appointment: 'Turno', appointments: 'Turnos', product: 'Producto', service: 'Servicio' },
        blockedFeatures: NON_HEALTHCARE_BLOCKED,
        aiIntents: SHARED_INTENTS,
        crmLabel: 'CRM Clientes', crmIcon: '💅',
    },
    spa: {
        displayName: 'Spa',
        category: 'service',
        vocabulary: { customer: 'Cliente', customers: 'Clientes', appointment: 'Reserva', appointments: 'Reservas', product: 'Producto', service: 'Tratamiento' },
        blockedFeatures: NON_HEALTHCARE_BLOCKED,
        aiIntents: SHARED_INTENTS,
        crmLabel: 'CRM Clientes', crmIcon: '🧖',
    },
    inmobiliaria: {
        displayName: 'Inmobiliaria',
        category: 'commercial',
        vocabulary: { customer: 'Cliente', customers: 'Clientes', appointment: 'Visita', appointments: 'Visitas', product: 'Producto', service: 'Servicio' },
        blockedFeatures: NON_HEALTHCARE_BLOCKED,
        aiIntents: SHARED_INTENTS,
        crmLabel: 'CRM Inmuebles', crmIcon: '🏠',
    },
    propiedad_horizontal: {
        displayName: 'Propiedad Horizontal',
        category: 'commercial',
        vocabulary: { customer: 'Residente', customers: 'Residentes', appointment: 'Reserva', appointments: 'Reservas', product: 'Producto', service: 'Servicio' },
        blockedFeatures: NON_HEALTHCARE_BLOCKED,
        aiIntents: SHARED_INTENTS,
        crmLabel: 'CRM Residentes', crmIcon: '🏢',
    },
    consultoria: {
        displayName: 'Consultoría',
        category: 'professional',
        vocabulary: { customer: 'Cliente', customers: 'Clientes', appointment: 'Sesión', appointments: 'Sesiones', product: 'Entregable', service: 'Consultoría' },
        blockedFeatures: NON_HEALTHCARE_BLOCKED,
        aiIntents: SHARED_INTENTS,
        crmLabel: 'CRM Clientes', crmIcon: '💼',
    },
    publicidad: {
        displayName: 'Publicidad / Marketing',
        category: 'commercial',
        vocabulary: { customer: 'Cliente', customers: 'Clientes', appointment: 'Reunión', appointments: 'Reuniones', product: 'Material', service: 'Campaña' },
        blockedFeatures: NON_HEALTHCARE_BLOCKED,
        aiIntents: SHARED_INTENTS,
        crmLabel: 'CRM Clientes', crmIcon: '📢',
    },
    otro: {
        displayName: 'Otro',
        category: 'commercial',
        vocabulary: { customer: 'Cliente', customers: 'Clientes', appointment: 'Cita', appointments: 'Citas', product: 'Producto', service: 'Servicio' },
        blockedFeatures: NON_HEALTHCARE_BLOCKED,
        aiIntents: SHARED_INTENTS,
        crmLabel: 'CRM', crmIcon: '🤝',
    },
};

const _DEFAULT = BUSINESS_REGISTRY.otro;

// ─── Public API ───────────────────────────────────────────────────────────────
class BusinessRegistry {
    /** Return the config for businessType, falling back to 'otro'. */
    getConfig(businessType) {
        const key = (businessType || '').toLowerCase().trim();
        return BUSINESS_REGISTRY[key] || _DEFAULT;
    }

    /** Return the localised label for key, falling back to fallback. */
    getVocabulary(businessType, key, fallback = '') {
        return this.getConfig(businessType).vocabulary[key] || fallback;
    }

    /** Return features with blocked entries removed for this business type. */
    filterFeatures(features, businessType) {
        const blocked = new Set(this.getConfig(businessType).blockedFeatures);
        if (blocked.size === 0) return features;
        return features.filter(f => !blocked.has(f));
    }

    /** Return the array of AI intent IDs available for this business type. */
    getAIIntents(businessType) {
        return this.getConfig(businessType).aiIntents;
    }

    /** Return true if businessType is in the healthcare category. */
    isHealthcare(businessType) {
        return this.getConfig(businessType).category === 'healthcare';
    }

    /** Return true when businessType is specifically 'veterinaria'. */
    isVeterinary(businessType) {
        return (businessType || '').toLowerCase().trim() === 'veterinaria';
    }

    /** Return { label, icon } for the CRM sidebar item based on business type. */
    getCrmConfig(businessType) {
        const cfg = this.getConfig(businessType);
        return { label: cfg.crmLabel || 'CRM', icon: cfg.crmIcon || '🤝' };
    }

    /** Return all registered business type IDs. */
    getAllTypes() {
        return Object.keys(BUSINESS_REGISTRY);
    }
}

export const businessRegistry = new BusinessRegistry();
export default businessRegistry;
