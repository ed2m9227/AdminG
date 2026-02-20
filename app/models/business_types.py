from enum import Enum

class BusinessType(str, Enum):
    """Tipos de negocio soportados"""
    VETERINARIA = "veterinaria"
    BARBERIA = "barberia"
    PELUQUERIA = "peluqueria"
    SPA = "spa"
    SALON = "salon"
    CONSULTORIO = "consultorio"
    CLINICA = "clinica"
    ESTETICA = "estetica"
    MASAJES = "masajes"
    DENTISTA = "dentista"
    PODOLOGIA = "podologia"
    FISIOTERAPIA = "fisioterapia"
    NUTRICION = "nutricion"
    PSICOLOGIA = "psicologia"
    COACHING = "coaching"
    PERSONAL_TRAINING = "personal_training"
    OTRO = "otro"
    
    @classmethod
    def get_defaults(cls, business_type: str) -> dict:
        """Retorna configuración default según tipo de negocio"""
        defaults = {
            "veterinaria": {
                "customer_label": "Dueño",
                "pet_label": "Mascota",
                "appointment_label": "Cita",
                "has_pet_relationship": True,
                "pet_fields_enabled": {
                    "name": True,
                    "animal_type": True,
                    "breed": True,
                    "color_description": True,
                    "weight_kg": True,
                    "gender": True,
                    "date_of_birth": True,
                    "microchip": True,
                    "neutered_spayed": True,
                    "allergies": True,
                    "current_medications": True,
                    "last_checkup_date": True,
                    "vaccination_status": True,
                    "notes": True,
                    "age_years": True,
                    "age_months": True
                }
            },
            "barberia": {
                "customer_label": "Cliente",
                "pet_label": None,
                "appointment_label": "Cita",
                "has_pet_relationship": False,
                "pet_fields_enabled": {}
            },
            "peluqueria": {
                "customer_label": "Cliente",
                "pet_label": None,
                "appointment_label": "Cita",
                "has_pet_relationship": False,
                "pet_fields_enabled": {}
            },
            "spa": {
                "customer_label": "Cliente",
                "pet_label": None,
                "appointment_label": "Sesión",
                "has_pet_relationship": False,
                "pet_fields_enabled": {}
            },
            "consultorio": {
                "customer_label": "Paciente",
                "pet_label": None,
                "appointment_label": "Consulta",
                "has_pet_relationship": False,
                "pet_fields_enabled": {}
            },
            "clinica": {
                "customer_label": "Paciente",
                "pet_label": None,
                "appointment_label": "Cita",
                "has_pet_relationship": False,
                "pet_fields_enabled": {}
            },
            "dentista": {
                "customer_label": "Paciente",
                "pet_label": None,
                "appointment_label": "Cita",
                "has_pet_relationship": False,
                "pet_fields_enabled": {}
            }
        }
        return defaults.get(business_type, defaults.get("otro", {
            "customer_label": "Cliente",
            "pet_label": None,
            "appointment_label": "Cita",
            "has_pet_relationship": False
        }))
