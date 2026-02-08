PLAN_FEATURES = {
    "AdminG": {
        "price": 0,
        "features": [
            "users", "appointments"
        ], "limits" : {
            "users": 1,
            "branches": 1
        }

    },

    "AdminPro": {
        "price": 30000,
        "features": [
            "users", "appointments", "inventory", "billing", "reports"
        ], "limits": {
            "users": 3,
            "branches": 1
        }
    },

    "AdminProPlus": {
        "price": 50000,
        "features": ["users", "appointments", "inventory", "billing", "reports"
        ], "limits": {
            "users": 10,
            "branches": 3
        }
    },

    "AdminProMax": {
        "price": 100000,
        "features": ["users", "appointments", "inventory", "billing", "reports", "api"],
        "limits": {
            "users": None,
            "branches": None
        }
    }
}