#!/usr/bin/env python
"""
Test to verify payment status is working correctly in the system
"""

import subprocess
import time
import sys

def wait_for_server():
    """Wait for server to be ready"""
    for _ in range(30):
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('127.0.0.1', 8000))
            sock.close()
            if result == 0:
                print("✅ Server is ready!")
                return True
        except:
            pass
        time.sleep(1)
    return False

def main():
    print("=" * 60)
    print("🧪 TESTING PAYMENT STATUS SYNC")
    print("=" * 60)
    
    print("\n📋 Instructions:")
    print("1. Open http://127.0.0.1:8000 in your browser")
    print("2. Login with: fabian@admin.com / 123456")
    print("3. Go to PAGOS (Payments) and create a payment with status='completed'")
    print("4. Check the browser DevTools Console (F12) for debug messages")
    print("5. Check the Dashboard 'Ingresos Mes' value - should show total from completed payments")
    print("6. Go to Reportes and check 'Ventas del Mes' - should match dashboard")
    print("\n📊 Expected Results:")
    print("   - Dashboard 'Ingresos Mes' should show sum of all 'completed' payments")
    print("   - Reportes 'Ventas del Mes' should show sum of current month 'completed' payments")
    print("   - When you change payment status to 'completed', values should update")
    print("\n🔍 Watch for these console messages:")
    print("   - 🔍 DashboardView: Payments fetched:")
    print("   - ✅ DashboardView: Completed payments:")
    print("   - 💰 DashboardView: Total revenue calculated:")
    print("   - 🔄 ReportsView: Loading metrics from /reports/dashboard...")
    print("   - ✅ ReportsView: Metrics loaded:")
    print("   - 🎨 ReportsView: Updating metrics display with:")
    print("\n" + "=" * 60)
    
    if wait_for_server():
        print("\n✨ Ready to test! Open http://127.0.0.1:8000 in your browser")
        print("   Press Ctrl+C to continue when done testing")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n✅ Test complete!")
    else:
        print("❌ Server did not start in time!")
        sys.exit(1)

if __name__ == '__main__':
    main()
