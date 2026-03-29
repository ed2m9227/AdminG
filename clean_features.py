#!/usr/bin/env python
import re

# Leer el archivo
with open('app/core/features.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Remover líneas que contengan servicios y recordatorios
lines_to_remove = [
    r'\s*Feature\.VIEW_SERVICES.*\n',
    r'\s*Feature\.CREATE_SERVICES.*\n',
    r'\s*Feature\.EDIT_SERVICES.*\n',
    r'\s*Feature\.DELETE_SERVICES.*\n',
    r'\s*Feature\.VIEW_REMINDERS.*\n',
    r'\s*Feature\.CREATE_REMINDERS.*\n',
    r'\s*Feature\.EDIT_REMINDERS.*\n',
    r'\s*# Services.*\n',
    r'\s*# Reminders.*\n',
]

for pattern in lines_to_remove:
    content = re.sub(pattern, '', content)

# Escribir el archivo limpio
with open('app/core/features.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ Archivo limpiado: servicios y recordatorios removidos')
