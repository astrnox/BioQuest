#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 PMC 文章提取 figure 原图（JATS XML 解析 + NCBI bin 下载）
用法:
  python3 scripts/fetch_pmc_figures.py list <PMCID>
  python3 scripts/fetch_pmc_figures.py get <PMCID> <figId|figNum> <outPath>
  python3 scripts/fetch_pmc_figures.py json <PMCID>         # 输出 JSON（供脚本消费）
"""
import sys, re, json, html, os, urllib.request, urllib.parse

UA = {"User-Agent": "Mozilla/5.0 (BioQuest figure fetch; cc-by reuse)", "Accept": "*/*"}

def fetch(url, max_redirects=8):
    req = urllib.request.Request(url, headers=UA)
    for _ in range(max_redirects + 1):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
                return r.status, dict(r.headers), data
        except urllib.error.HTTPError as e:
            if e.code in (301,302,303,307,308) and e.headers.get("Location"):
                req = urllib.request.Request(urllib.parse.urljoin(url, e.headers["Location"]), headers=UA)
                continue
            return e.code, dict(e.headers), b""
        except urllib.error.URLError as e:
            return -1, {}, str(e).encode()
    return -1, {}, b""

def strip_tags(s):
    s = re.sub(r"<[^>]+>", "", s or "")
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()

def get_xml(pmc_id):
    nid = pmc_id.upper().replace("PMC", "")
    st, _, body = fetch(f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id={nid}")
    if st == 200 and len(body) > 2000:
        return body.decode("utf8", "ignore")
    st, _, body = fetch(f"https://www.ebi.ac.uk/europepmc/webservices/rest/PMC{nid}/fullTextXML")
    return body.decode("utf8", "ignore")

def parse_figures(xml):
    figs = []
    # 先按 <fig> 块切分，避免捕获补充材料
    for m in re.finditer(r"<fig\b([^>]*)>([\s\S]*?)</fig>", xml):
        attrs, body = m.group(1), m.group(2)
        mid = re.search(r'id="([^"]+)"', attrs)
        fid = mid.group(1) if mid else f"fig{len(figs)+1}"
        label = strip_tags(re.search(r"<label[^>]*>([\s\S]*?)</label>", body).group(1)) if re.search(r"<label[^>]*>([\s\S]*?)</label>", body) else fid
        cap = strip_tags(re.search(r"<caption[^>]*>([\s\S]*?)</caption>", body).group(1)) if re.search(r"<caption[^>]*>([\s\S]*?)</caption>", body) else ""
        gm = re.search(r'graphic[^>]*?xlink:href="([^"]+)"', body) or re.search(r'graphic[^>]*?href="([^"]+)"', body)
        fname = os.path.basename(gm.group(1)) if gm else ""
        num = int(re.search(r"(\d+)\s*$", fid).group(1)) if re.search(r"(\d+)\s*$", fid) else len(figs) + 1
        if fname and not any(f["file"] == fname for f in figs):
            figs.append({"id": fid.lower(), "num": num, "label": label, "caption": cap, "file": fname})
    figs.sort(key=lambda f: f["num"])
    return figs

def _find_blob_url(pmc_id, fname):
    """在文章页 HTML 中查找与目标文件名匹配的 PMC blob CDN URL"""
    try:
        st, _, hb = fetch(f"https://pmc.ncbi.nlm.nih.gov/articles/{pmc_id}/")
        if st != 200:
            st, _, hb = fetch(f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmc_id}/")
        text = hb.decode("utf8", "ignore")
        base = os.path.splitext(fname)[0]
        for m in re.finditer(r'(https?:\\?/\\?/cdn\.ncbi\.nlm\.nih\.gov\\?/pmc\\?/blobs\\?/[^"\'\s<>]+?\.(?:jpg|png|gif|tif))', text):
            url = m.group(1).replace("\\/", "/").replace("\\", "").replace('"', "")
            if base.lower() in url.lower():
                return url
    except Exception:
        pass
    return None

def download(pmc_id, fname, out_path, min_bytes=3000):
    candidates = [
        f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmc_id}/bin/{urllib.parse.quote(fname)}",
        f"https://pmc.ncbi.nlm.nih.gov/articles/{pmc_id}/bin/{urllib.parse.quote(fname)}",
        f"https://europepmc.org/articles/{pmc_id}/bin/{urllib.parse.quote(fname)}",
    ]
    blob = _find_blob_url(pmc_id, fname)
    if blob:
        candidates.append(blob)
    st, hd, body = -1, {}, b""
    for url in candidates:
        try:
            s, h, b = fetch(url)
        except Exception:
            continue
        if s == 200 and len(b) >= min_bytes:
            st, hd, body = s, h, b
            break
    if st != 200 or len(body) < min_bytes:
        return False, f"all sources failed; last HTTP {st}, {len(body)} bytes"
    ct = str(hd.get("Content-Type", "")).lower()
    ext = ".png" if "png" in ct else (".tif" if ("tif" in ct or ".tif" in fname) else (".gif" if "gif" in ct else ".jpg"))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    final = out_path if os.path.splitext(out_path)[1].lower() in (".jpg", ".png", ".gif", ".tif", ".tiff") else out_path + ext
    with open(final, "wb") as f:
        f.write(body)
    return True, f"OK {len(body)} bytes -> {final}"

def license_of(xml):
    m = re.search(r"<license\b[^>]*>\s*<license-p[^>]*>([\s\S]*?)</license-p>", xml)
    if m:
        return strip_tags(m.group(1))[:180]
    return "NO LICENSE TAG"

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    pmc = sys.argv[2].upper() if len(sys.argv) > 2 else ""
    if cmd in ("list", "json"):
        xml = get_xml(pmc)
        figs = parse_figures(xml)
        lic = license_of(xml)
        if cmd == "json":
            print(json.dumps({"pmcid": pmc, "license": lic, "figures": figs}, ensure_ascii=False))
        else:
            print(f"[{pmc}] LICENSE: {lic}")
            print(f"[{pmc}] {len(figs)} figures")
            for f in figs:
                print(f"  {f['id']}\t{f['label']}\t{f['file']}")
                print(f"        {f['caption'][:160]}")
    elif cmd == "get":
        xml = get_xml(pmc)
        figs = parse_figures(xml)
        target_arg = sys.argv[3].lower()
        t = next((f for f in figs if f["id"] == target_arg or f["label"].lower() == target_arg), None)
        if t is None and target_arg.isdigit():
            t = next((f for f in figs if f["num"] == int(target_arg)), None)
        if not t:
            print("ERROR: figure not found: " + sys.argv[3]); sys.exit(1)
        ok, msg = download(pmc, t["file"], sys.argv[4])
        print(("OK " + msg) if ok else ("FAIL " + msg))
        sys.exit(0 if ok else 1)
    else:
        print(__doc__)
        sys.exit(2)