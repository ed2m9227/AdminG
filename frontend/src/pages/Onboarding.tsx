import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000';

type GovernanceMode = 'comunitario' | 'organizacional_civil' | 'territorial_publico' | 'institucional_estatal';
type OperationLevel = 'operativo' | 'administrativo' | 'estrategico' | 'control_auditoria';
type PrimaryObjective =
  | 'gestion_proyectos_casos'
  | 'control_recursos'
  | 'seguimiento_ciudadano'
  | 'transparencia_auditoria'
  | 'prevencion_riesgos'
  | 'inteligencia_territorial';

interface GovernanceOption {
  id: GovernanceMode;
  title: string;
  subtitle: string;
  detail: string;
}

interface OptionCard<T extends string> {
  id: T;
  title: string;
  subtitle: string;
}

interface MeResponse {
  id: number;
  email: string;
  plan?: string;
  governance_mode?: string | null;
}

interface PolicyItem {
  id: number;
  policy_type: string;
  version_label: string;
  jurisdiction_code: string;
  is_mandatory: boolean;
  effective_from: string | null;
  content_summary: string;
}

interface ConsentStatusItem {
  code: string;
  layer: string;
  is_mandatory: boolean;
  purpose: string;
  active: boolean;
}

interface PolicyResponse {
  policies: PolicyItem[];
}

interface ConsentStatusResponse {
  items: ConsentStatusItem[];
}

interface InitializeResponse {
  success: boolean;
  activation?: {
    modules?: string[];
    analytics_depth?: string;
    traceability_mode?: string;
  };
  trial_preview?: {
    eligible: boolean;
    policy_code: string | null;
    approval_mode: string | null;
    duration_days: number | null;
  };
}

interface TrialMeResponse {
  active: boolean;
  status?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  trial_policy_id?: number | null;
}

const GOVERNANCE_OPTIONS: GovernanceOption[] = [
  {
    id: 'comunitario',
    title: 'Comunitario',
    subtitle: 'Juntas de Accion Comunal y liderazgo barrial',
    detail: 'Diseñado para JAC, comites locales y organizaciones de base con gestion comunitaria.',
  },
  {
    id: 'organizacional_civil',
    title: 'Organizacional Civil',
    subtitle: 'Fundaciones, asociaciones y colectivos',
    detail: 'Ideal para entidades civiles con estructura organizacional y gestion de programas.',
  },
  {
    id: 'territorial_publico',
    title: 'Territorial Publico',
    subtitle: 'Alcaldias, gobernaciones y entes territoriales',
    detail: 'Orientado a gestion publica territorial, trazabilidad y seguimiento ciudadano.',
  },
  {
    id: 'institucional_estatal',
    title: 'Institucional Estatal',
    subtitle: 'Instituciones del orden estatal y control',
    detail: 'Pensado para entornos institucionales con auditoria, control y cumplimiento estricto.',
  },
];

const OPERATION_LEVEL_OPTIONS: OptionCard<OperationLevel>[] = [
  {
    id: 'operativo',
    title: 'Operativo',
    subtitle: 'Ejecucion diaria, seguimiento de tareas y cumplimiento basico.',
  },
  {
    id: 'administrativo',
    title: 'Administrativo',
    subtitle: 'Control de recursos, procesos internos y reportes de gestion.',
  },
  {
    id: 'estrategico',
    title: 'Estrategico',
    subtitle: 'Planeacion de mediano plazo, indicadores y direccion institucional.',
  },
  {
    id: 'control_auditoria',
    title: 'Control y Auditoria',
    subtitle: 'Trazabilidad reforzada, supervision y enfoque de cumplimiento.',
  },
];

const OBJECTIVE_OPTIONS: OptionCard<PrimaryObjective>[] = [
  {
    id: 'gestion_proyectos_casos',
    title: 'Gestion de Proyectos y Casos',
    subtitle: 'Seguimiento de iniciativas, responsables, hitos y evidencias.',
  },
  {
    id: 'control_recursos',
    title: 'Control de Recursos',
    subtitle: 'Monitoreo presupuestal, asignaciones y uso eficiente de recursos.',
  },
  {
    id: 'seguimiento_ciudadano',
    title: 'Seguimiento Ciudadano',
    subtitle: 'Vinculacion comunitaria, atencion a casos y trazabilidad social.',
  },
  {
    id: 'transparencia_auditoria',
    title: 'Transparencia y Auditoria',
    subtitle: 'Control documental, evidencia verificable y reportes de transparencia.',
  },
  {
    id: 'prevencion_riesgos',
    title: 'Prevencion de Riesgos',
    subtitle: 'Deteccion temprana de eventos criticos y mitigacion preventiva.',
  },
  {
    id: 'inteligencia_territorial',
    title: 'Inteligencia Territorial',
    subtitle: 'Analisis territorial y decisiones basadas en patron de datos.',
  },
];

export default function Onboarding() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initializingStep3, setInitializingStep3] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [planName, setPlanName] = useState('');
  const [entityName, setEntityName] = useState('');
  const [selectedMode, setSelectedMode] = useState<GovernanceMode | null>('comunitario');
  const [selectedOperationLevel, setSelectedOperationLevel] = useState<OperationLevel>('operativo');
  const [selectedObjective, setSelectedObjective] = useState<PrimaryObjective>('gestion_proyectos_casos');
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [consents, setConsents] = useState<ConsentStatusItem[]>([]);
  const [acceptedConsents, setAcceptedConsents] = useState<Record<string, boolean>>({});
  const [activationModules, setActivationModules] = useState<string[]>([]);
  const [trialPreview, setTrialPreview] = useState<InitializeResponse['trial_preview'] | null>(null);
  const [trialState, setTrialState] = useState<TrialMeResponse | null>(null);

  useEffect(() => {
    validateSessionAndState();
  }, []);

  const validateSessionAndState = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login?next=/onboarding';
      return;
    }

    try {
      const meResponse = await axios.get<MeResponse>(`${API_BASE}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPlanName((meResponse.data.plan || '').toUpperCase());

      if (meResponse.data.governance_mode) {
        window.location.href = '/dashboard';
        return;
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
      }
      window.location.href = '/login?next=/onboarding';
      return;
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    setError('');
    if (!selectedMode) {
      setError('Debes seleccionar un tipo de gobernanza.');
      return;
    }
    setStep(2);
  };

  const loadPhase3Context = async (token: string) => {
    const [policiesResponse, consentsResponse] = await Promise.all([
      axios.get<PolicyResponse>(`${API_BASE}/onboarding/policies`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      axios.get<ConsentStatusResponse>(`${API_BASE}/onboarding/consents/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    ]);

    setPolicies(policiesResponse.data.policies || []);
    const consentItems = consentsResponse.data.items || [];
    setConsents(consentItems);

    const initialAcceptedState: Record<string, boolean> = {};
    consentItems.forEach((item) => {
      initialAcceptedState[item.code] = Boolean(item.active);
    });
    setAcceptedConsents(initialAcceptedState);
  };

  const handleGoToPolicies = async () => {
    setError('');

    if (!selectedMode) {
      setError('Debes seleccionar un tipo de gobernanza.');
      return;
    }

    if (entityName.trim().length < 3) {
      setError('El nombre de la entidad debe tener al menos 3 caracteres.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login?next=/onboarding';
      return;
    }

    setInitializingStep3(true);
    try {
      const initializeResponse = await axios.post<InitializeResponse>(
        `${API_BASE}/onboarding/initialize`,
        {
          governance_mode: selectedMode,
          operation_level: selectedOperationLevel,
          primary_objective: selectedObjective,
          entity_name: entityName.trim(),
          jurisdiction_code: 'CO',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setActivationModules(initializeResponse.data.activation?.modules || []);
      setTrialPreview(initializeResponse.data.trial_preview || null);

      await loadPhase3Context(token);
      setStep(3);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login?next=/onboarding';
        return;
      }
      setError(err.response?.data?.detail || 'No fue posible preparar politicas y consentimientos.');
    } finally {
      setInitializingStep3(false);
    }
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login?next=/onboarding';
      return;
    }

    const mandatoryMissing = consents
      .filter((item) => item.is_mandatory)
      .some((item) => !acceptedConsents[item.code]);

    if (mandatoryMissing) {
      setError('Debes aceptar todos los consentimientos obligatorios para continuar.');
      return;
    }

    setSaving(true);
    try {
      await axios.post(
        `${API_BASE}/onboarding/consents`,
        {
          items: consents.map((item) => ({
            code: item.code,
            accepted: Boolean(acceptedConsents[item.code]),
          })),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      await axios.post(
        `${API_BASE}/onboarding/complete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const trialResponse = await axios.get<TrialMeResponse>(`${API_BASE}/onboarding/trials/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTrialState(trialResponse.data);
      setStep(4);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login?next=/onboarding';
        return;
      }
      setError(err.response?.data?.detail || 'No fue posible guardar la configuracion inicial.');
    } finally {
      setSaving(false);
    }
  };

  const goToDashboard = () => {
    window.location.href = '/dashboard';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-800 to-cyan-700 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm tracking-wide uppercase">Preparando onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-800 to-cyan-700 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 md:p-10 border border-white/60">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm uppercase tracking-[0.2em] text-teal-700 font-semibold">Onboarding Fase 1-4</p>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              Paso {step} de 4
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">
            {step === 1 && 'Define tu tipo de gobernanza'}
            {step === 2 && 'Configura nivel y objetivo operativo'}
            {step === 3 && 'Acepta politicas y consentimiento'}
            {step === 4 && 'Activacion final completada'}
          </h1>
          <p className="text-slate-600 mt-3 max-w-3xl">
            {step === 1
              ? 'Esta decision activa una configuracion inicial para tu operacion. Si representas una junta barrial u organizacion de base, selecciona Comunitario.'
              : step === 2
                ? 'Ahora define el nivel operativo y el objetivo principal para personalizar la activacion de modulos.'
                : step === 3
                  ? 'Revisa politicas vigentes y habilita los consentimientos para continuar con el onboarding.'
                  : 'Tu perfil quedo activado. Revisa modulos habilitados y estado de trial antes de entrar al panel.'}
          </p>

          {planName && (
            <p className="mt-3 text-sm text-slate-500">
              Plan actual: <strong>{planName}</strong>. Esta configuracion inicial no bloquea el avance por plan en esta fase.
            </p>
          )}

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleContinue} className="mt-8 space-y-8">
            {step === 1 && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  {GOVERNANCE_OPTIONS.map((option, index) => {
                    const active = selectedMode === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedMode(option.id)}
                        className={`text-left rounded-xl border p-5 transition-all duration-200 ${
                          active
                            ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-500/30'
                            : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/40'
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Modo {index + 1}</p>
                        <h2 className="mt-1 text-xl font-bold text-slate-900">{option.title}</h2>
                        <p className="mt-1 text-sm text-teal-700 font-medium">{option.subtitle}</p>
                        <p className="mt-3 text-sm text-slate-600 leading-relaxed">{option.detail}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-lg transition"
                  >
                    Siguiente: configuracion operativa
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">Nivel operativo</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {OPERATION_LEVEL_OPTIONS.map((option) => {
                      const active = selectedOperationLevel === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSelectedOperationLevel(option.id)}
                          className={`text-left rounded-lg border p-4 transition ${
                            active
                              ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-500/25'
                              : 'border-slate-200 hover:border-teal-300'
                          }`}
                        >
                          <h3 className="font-semibold text-slate-900">{option.title}</h3>
                          <p className="text-sm text-slate-600 mt-1">{option.subtitle}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">Objetivo principal</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {OBJECTIVE_OPTIONS.map((option) => {
                      const active = selectedObjective === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSelectedObjective(option.id)}
                          className={`text-left rounded-lg border p-4 transition ${
                            active
                              ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-500/25'
                              : 'border-slate-200 hover:border-teal-300'
                          }`}
                        >
                          <h3 className="font-semibold text-slate-900">{option.title}</h3>
                          <p className="text-sm text-slate-600 mt-1">{option.subtitle}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre de tu entidad</label>
                  <input
                    type="text"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder="Ej: Junta de Accion Comunal Barrio La Esperanza"
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setStep(1);
                    }}
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-6 rounded-lg transition"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleGoToPolicies}
                    disabled={initializingStep3}
                    className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-3 px-6 rounded-lg transition"
                  >
                    {initializingStep3 ? 'Preparando fase 3...' : 'Siguiente: politicas y consentimiento'}
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">Politicas vigentes</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {policies.map((policy) => (
                      <div key={policy.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">{policy.policy_type}</p>
                        <h3 className="text-lg font-semibold text-slate-900 mt-1">{policy.version_label}</h3>
                        <p className="text-sm text-slate-600 mt-2">{policy.content_summary}</p>
                        <p className="text-xs text-slate-500 mt-3">Jurisdiccion: {policy.jurisdiction_code}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">Consentimientos</p>
                  <div className="space-y-3">
                    {consents.map((consent) => (
                      <label
                        key={consent.code}
                        className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 bg-white"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(acceptedConsents[consent.code])}
                          onChange={(e) => {
                            setAcceptedConsents((prev) => ({
                              ...prev,
                              [consent.code]: e.target.checked,
                            }));
                          }}
                          className="mt-1 h-4 w-4"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {consent.code}
                            {consent.is_mandatory ? ' (obligatorio)' : ' (opcional)'}
                          </p>
                          <p className="text-sm text-slate-600 mt-1">{consent.purpose}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setStep(2);
                    }}
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-6 rounded-lg transition"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-3 px-6 rounded-lg transition"
                  >
                    {saving ? 'Finalizando...' : 'Finalizar onboarding'}
                  </button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-emerald-700">Estado onboarding</p>
                    <h3 className="text-xl font-bold text-emerald-900 mt-1">Completado</h3>
                    <p className="text-sm text-emerald-800 mt-2">
                      Tu cuenta ya tiene gobernanza, politicas y consentimiento aplicado.
                    </p>
                  </div>
                  <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-sky-700">Trial y plan</p>
                    <h3 className="text-xl font-bold text-sky-900 mt-1">
                      {trialState?.active ? 'Trial activo' : 'Sin trial activo'}
                    </h3>
                    <p className="text-sm text-sky-800 mt-2">
                      {trialState?.active
                        ? `Estado: ${trialState.status || 'active'}.`
                        : trialPreview?.eligible
                          ? 'Eres elegible para trial segun politica de gobernanza.'
                          : 'Funciones premium se habilitan segun tu plan o aprobacion de trial.'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">Modulos activados para tu perfil</p>
                  <div className="flex flex-wrap gap-2">
                    {activationModules.length > 0 ? (
                      activationModules.map((moduleName) => (
                        <span
                          key={moduleName}
                          className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-sm"
                        >
                          {moduleName}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No se recibieron modulos de activacion.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-700">
                    Nota: los escenarios avanzados de business intelligence y funciones premium dependen del plan activo
                    y, cuando aplique, de politicas de trial/aprobacion administrativa.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={goToDashboard}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-lg transition"
                  >
                    Entrar al dashboard
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
