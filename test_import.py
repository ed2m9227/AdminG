#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

try:
    from app.main import app
    print("SUCCESS: App imported successfully")
    print(f"App title: {app.title}")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()