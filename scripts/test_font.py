import urllib.request
import sys

# Test font loading
url = "http://localhost:8000/fonts/lxgw-wenkai.ttf"
try:
    req = urllib.request.Request(url)
    resp = urllib.request.urlopen(req, timeout=10)
    content = resp.read()
    print(f"Status: {resp.status}")
    print(f"Content-Type: {resp.headers.get('Content-Type', 'N/A')}")
    print(f"Content-Length: {len(content)} bytes")
    print(f"First 20 bytes (hex): {content[:20].hex()}")
except Exception as e:
    print(f"Error: {e}")

# Check if woff2 conversion is feasible
print("\n--- Checking conversion options ---")
try:
    import subprocess
    result = subprocess.run(["pip", "list"], capture_output=True, text=True)
    if "fonttools" in result.stdout:
        print("fonttools is installed")
    else:
        print("fonttools NOT installed - would need pip install fonttools brotli")
except:
    pass