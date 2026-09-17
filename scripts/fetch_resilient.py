#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""稳健的 PMC 图片下载器：magic-byte 校验 + 重试 + 多渠道回退
仅用于 CC-BY 开放获取文章图片的获取（来源合规）。"""
import sys, re, os, time, json, html, urllib.request, urllib.parse

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/124.0.0.0 Safari/537.36")
ACCEPT = "image/avif,image/webp,image/apng,image/*,*/*;q=0.8,text/html;q=0.5"

def fetch(url, timeout=60, referer=None):
    headers = {"User-Agent": UA, "Accept": ACCEPT, "Accept-Language": "en"}
    if referer: headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, dict(r.headers), r.read()

def is_image(b):
    return b[:3] == b"\xff\xd8\xff" or b[:4] == b"\x89PNG" or b[:4] == b"RIFF" or b[:4] in (b"GIF8",)

def not_challenge(b):
    t = b[:300].lower()
    return b"<!doctype html" not in t or (b"recaptcha" not in t and b"checking your browser" not in t)

def get_xml(pmc):
    nid = pmc.upper().replace("PMC", "")
    for base in (f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id={nid}",
                 f"https://www.ebi.ac.uk/europepmc/webservices/rest/PMC{nid}/fullTextXML"):
        try:
            st, _, b = fetch(base, timeout=60)
            if st == 200 and len(b) > 2000:
                return b.decode("utf8", "ignore")
        except Exception:
            continue
        time.sleep(1)
    raise RuntimeError("XML fetch failed: " + pmc)

def parse_figs(xml):
    figs = []
    for m in re.finditer(r"<fig\b([^>]*)>([\s\S]*?)</fig>", xml):
        attrs, body = m.group(1), m.group(2)
        mid = re.search(r'id="([^"]+)"', attrs)
        fid = (mid.group(1) if mid else f"fig{len(figs)+1}").lower()
        gm = re.search(r'graphic[^>]*?xlink:href="([^"]+)"', body) or re.search(r'graphic[^>]*?href="([^"]+)"', body)
        if not gm: continue
        fname = os.path.basename(gm.group(1))
        if any(f["file"] == fname for f in figs): continue
        num = int(re.search(r"(\d+)\s*$", fid).group(1)) if re.search(r"(\d+)\s*$", fid) else len(figs) + 1
        lbl = re.search(r"<label[^>]*>([\s\S]*?)</label>", body)
        cap = re.search(r"<caption[^>]*>([\s\S]*?)</caption>", body)
        figs.append({"id": fid, "num": num,
                     "label": html.unescape(re.sub(r"<[^>]+>", "", lbl.group(1))).strip() if lbl else fid,
                     "caption": html.unescape(re.sub(r"<[^>]+>", "", cap.group(1))).strip() if cap else "",
                     "file": fname})
    figs.sort(key=lambda f: f["num"])
    return figs

def article_page(pmc):
    bases = [f"https://pmc.ncbi.nlm.nih.gov/articles/{pmc}/",
             f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmc}/"]
    for base in bases:
        for attempt in range(4):
            try:
                st, _, b = fetch(base, timeout=60)
            except Exception:
                st = -1; b = b""
            if st == 200 and len(b) > 15000:
                t = b[:500].lower()
                if b"recaptcha" in t or b"checking your browser" in t:
                    time.sleep(3 + attempt)
                    continue
                return b.decode("utf8", "ignore")
            time.sleep(2 + attempt)
    return None

def blob_urls(html):
    out = []
    for m in re.finditer(r'(https?:\\?/\\?/cdn\.ncbi\.nlm\.nih\.gov\\?/pmc\\?/blobs\\?/[^\s"\'<>]+?\.(?:jpg|png|gif|tif|webp))', html):
        u = m.group(1).replace("\\/", "/")
        if u not in out: out.append(u)
    return out

def springer_url(pmc, doi, fname):
    """Springer 系（Nature/STTT/BMC/Genome Biol）的媒体代理 URL"""
    enc = urllib.parse.quote(doi, safe="")
    stem = os.path.splitext(fname)[0]
    for ext in ("png", "jpg", "jpeg", "webp"):
        for w in ("full", "w1200,orig", "lw1200", "orig"):
            yield f"https://media.springernature.com/{w}/springer-static/image/art%3A{enc}/MediaObjects/{stem}.{ext}"

def doi_of(pmc):
    nid = pmc.replace("PMC", "")
    try:
        url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pmc&id={nid}&retmode=json"
        d = json.loads(fetch(url, timeout=30)[2].decode())
        for a in d["result"][nid].get("articleids", []):
            if a["idtype"] == "doi":
                return a["value"]
    except Exception:
        pass
    # 从 XML 兜底
    try:
        m = re.search(r'<article-id pub-id-type="doi">([^<]+)</article-id>', get_xml(pmc))
        if m: return m.group(1)
    except Exception:
        pass
    return ""

def download(pmc, pick_num, out, min_bytes=10000):
    xml = get_xml(pmc)
    figs = parse_figs(xml)
    t = next((f for f in figs if str(f["num"]) == str(pick_num) or f["id"] == str(pick_num).lower()), None)
    if not t:
        return False, "figure not found"
    fname = t["file"]
    doi = doi_of(pmc)
    # 1) 文章页 blob CDN（最优先，静态 CDN 无挑战）
    page = article_page(pmc)
    if page:
        for u in blob_urls(page):
            if os.path.splitext(fname)[0].lower() in u.lower():
                try:
                    st, _, b = fetch(u, timeout=90)
                    if st == 200 and is_image(b) and len(b) >= 4000:
                        _save(b, out); return True, f"blob {len(b)}b"
                except Exception:
                    continue
    candidates = []
    if doi:
        candidates += list(springer_url(pmc, doi, fname))
    # 2) NCBI bin（少量重试）
    for host in ("https://www.ncbi.nlm.nih.gov", "https://pmc.ncbi.nlm.nih.gov"):
        for _ in range(2):
            candidates.append(f"{host}/articles/{pmc}/bin/{urllib.parse.quote(fname)}")
    for u in candidates:
        try:
            st, _, b = fetch(u, timeout=60, referer=f"https://pmc.ncbi.nlm.nih.gov/articles/{pmc}/")
            if st == 200 and is_image(b) and len(b) >= 4000:
                _save(b, out); return True, f"alt {len(b)}b"
        except Exception:
            continue
    return False, "no source; last try failed"

def _save(b, out):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "wb") as f:
        f.write(b)

if __name__ == "__main__":
    pmc = sys.argv[1].upper(); num = sys.argv[2]; out = sys.argv[3]
    ok, msg = download(pmc, num, out)
    print(("OK  " if ok else "FAIL ") + msg, "->", out)
    sys.exit(0 if ok else 1)