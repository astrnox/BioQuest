import urllib.request, os
url = "http://localhost:8000/fonts/lxgw-wenkai.woff2"
req = urllib.request.Request(url)
resp = urllib.request.urlopen(req, timeout=10)
content = resp.read()
print(f"Status: {resp.status}")
print(f"Content-Type: {resp.headers.get('Content-Type', 'N/A')}")
print(f"Content-Length: {len(content)} bytes")
print(f"Magic bytes: {content[:4].hex()}")
# woff2 magic: 0x774F4632 (wOF2)
expected = "774f4632"
print(f"Is woff2: {content[:4].hex() == expected}")