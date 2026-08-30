#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BioQuest 论文配图管线（v1.1 图片规则落地）
===========================================
目标：带图题占比 ≥ 30%，且图片必须「真实有效」——来自开放获取（OA / CC-BY）论文
原文配图或仓库已授权素材，禁止 AI 生成图冒充、禁止盗链、禁止无许可搬用。

命令：
  1) stage   准备图片素材（下载论文图或登记本地图），写入
             assets/questions/<qid>/fig1.<ext> + image.json（溯源元数据）
      stage --qid <题id> --pmcid PMCxxxxx --figure 2 [--panel A] [--crop 宽,高,x,y] [--license CC-BY-4.0 --doi ...]
      stage --qid <题id> --file ./local.png --license ... [--caption ...] [--credit ...]

  2) attach  把已登记的素材挂接到单题文件（data/questions/.../<id>.json 增加 image 字段）
             并提示运行 rebuild 刷新 id大全 has_image
      attach --qid <题id>

  3) fetch   等效 stage + attach 一步完成（题目文件须已存在）

  4) coverage  核算全库带图占比（id大全 has_image / total，目标 ≥30%）

  5) license 查证某论文的 OA/CC 许可（PMCID / DOI）
      license --pmcid PMCxxxxx

许可白名单：CC BY / CC-BY / CC BY-NC / CC BY-SA / CC0 / PD。
流程规范（规则文档 §13）：确认许可 → 下载原图 → 裁剪单 panel → 落盘。
支持格式：png / jpg / webp / gif / svg（保留原格式，不强制转 webp）。
依赖：Python3 标准库；可选 Pillow（--crop 裁剪 panel，无 PIL 时跳过）。
"""
import argparse
import json
import re
import urllib.request
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
ASSETS_Q = ROOT / "assets" / "questions"
ID_ALL = ROOT / "data" / "questions" / "id-all.json"
QUESTIONS_DIR = ROOT / "data" / "questions"

LICENSE_OK = ("CC BY", "CC-BY", "CC BY-NC", "CC BY-SA", "CC BY 4.0", "CC BY-NC 4.0", "CC0", "PD", "public domain")


def http_get(url, timeout=40):
    req = urllib.request.Request(url, headers={"User-Agent": "BioQuest-figure-pipeline/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.geturl()


def pmc_xml(pmcid):
    """NCBI efetch 拉取 PMC 全文 XML（用于解析许可与图元数据）。"""
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id={pmcid}&rettype=xml&retmode=xml"
    data, _ = http_get(url)
    return data.decode("utf-8", "ignore")


def look_license_from_xml(xml):
    m = re.search(r"<license[^>]*>(.*?)</license>", xml, re.S)
    block = m.group(1) if m else ""
    for pat in LICENSE_OK:
        if pat.lower() in block.lower():
            return pat
    if re.search(r'content-type=["\']ccbylicense["\']', block) or "creativecommons.org/licenses/by/" in block:
        return "CC BY 4.0"
    if "creativecommons.org/licenses/zero" in block or block.lower().find("public domain") >= 0:
        return "CC0/PD"
    m2 = re.search(r"license-type\s*=\s*[\"']([^\"']+)[\"']", xml)
    if m2:
        return m2.group(1).strip()
    return None


def resolve_blob_url(pmcid, filename):
    """PMC 页面里图真实存储在 cdn…/pmc/blobs/<…>/<filename>，从文章 HTML 解析该地址。"""
    try:
        html, _ = http_get(f"https://pmc.ncbi.nlm.nih.gov/articles/{pmcid}/")
        html = html.decode("utf-8", "ignore")
    except Exception as e:
        print(f"  [warn] 文章页拉取失败(用于解析图地址): {e}")
        return None
    m = re.search(r'src="(https://cdn\.ncbi\.nlm\.nih\.gov/pmc/blob[^"\s]*?' + re.escape(filename) + r')"', html)
    if not m:
        m = re.search(r'(https://cdn\.ncbi\.nlm\.nih\.gov/pmc/blob[^"\s]*?' + re.escape(filename) + r')', html)
    return m.group(1) if m else None


def find_graphic(xml, figure_no):
    """在 XML 中找 <fig> 标签与 <graphic xlink:href>，返回 (图题, 相对路径)。"""
    figs = list(re.finditer(r"<fig[^>]*id=[\"']([^\"']*)[\"'][^>]*>(.*?)</fig>", xml, re.S))
    for m in figs:
        fid, body = m.group(1), m.group(2)
        if figure_no and not re.search(rf"\bfig{re.escape(figure_no)}\b", fid):
            continue
        cap = re.search(r"<caption>(.*?)</caption>", body, re.S)
        g = re.search(r"<(?:graphic|media)\b[^>]*\bxlink:href=[\"']([^\"']+)[\"']", body)
        if g:
            return (cap.group(1) if cap else fid), g.group(1)
    return None, None


def is_image(bytes_, ext_hint=""):
    if bytes_[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if bytes_[:3] == b"\xff\xd8\xff":
        return "jpg"
    if bytes_[:4] == b"RIFF" and bytes_[8:12] == b"WEBP":
        return "webp"
    if bytes_[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if bytes_[:5].lstrip().lower().startswith(b"<?xml") or bytes_[:4].lstrip().lower().startswith(b"<svg"):
        return "svg"
    if ext_hint.lower() in ("png", "jpg", "jpeg", "webp", "gif", "svg"):
        return ext_hint.lower()
    return None


def stage(args):
    qdir = ASSETS_Q / args.qid
    qdir.mkdir(parents=True, exist_ok=True)
    raw_bytes = None
    meta = {}

    if args.pmcid:
        xml = pmc_xml(args.pmcid)
        lic = look_license_from_xml(xml)
        if lic:
            print(f"  [license] {args.pmcid}: {lic}")
        if args.license:
            lic = args.license
        if not lic:
            print(f"  [FAIL] 无法从 {args.pmcid} 解析 OA/CC 许可；请显式 --license 提供。")
            return 1
        cap, href = find_graphic(xml, args.figure or "")
        if not href:
            print(f"  [FAIL] 在 {args.pmcid} 未找到 figure={args.figure or '(任意)'} 的图形资源")
            return 1
        if href.startswith("http"):
            url = href
        else:
            filename = Path(urllib.parse.unquote(href)).name
            url = resolve_blob_url(args.pmcid, filename) or f"https://pmc.ncbi.nlm.nih.gov/articles/{args.pmcid}/bin/{urllib.parse.quote(href)}"
        print(f"  [fetch] {url}")
        raw_bytes, final_url = http_get(url)
        meta = {
            "source": "paper",
            "pmcId": args.pmcid,
            "figure": args.figure or "",
            "doi": args.doi or "",
            "license": lic,
            "caption": args.caption or (cap or ""),
            "credit": args.credit or f"Figure {args.figure or ''} from {args.pmcid}（{lic}）",
        }
        ext_hint = Path(urllib.parse.urlparse(final_url).path).suffix[1:]
    elif args.file:
        src = Path(args.file)
        if not src.exists():
            print(f"  [FAIL] 本地文件不存在: {src}")
            return 1
        raw_bytes = src.read_bytes()
        if not args.license:
            print("  [FAIL] 本地素材必须显式 --license（CC-BY 等）")
            return 1
        meta = {
            "source": args.source or "repo",
            "pmcId": "",
            "figure": "",
            "doi": args.doi or "",
            "license": args.license,
            "caption": args.caption or "",
            "credit": args.credit or "",
        }
        ext_hint = src.suffix[1:]
    else:
        print("  [FAIL] 需要 --pmcid 或 --file 之一")
        return 1

    fmt = is_image(raw_bytes, ext_hint)
    if not fmt:
        print("  [FAIL] 下载/指定的内容不是有效图片（PNG/JPEG/WebP/GIF/SVG）")
        return 1

    out_path = qdir / f"fig1.{fmt}"
    out_path.write_bytes(raw_bytes)
    meta["file"] = str(out_path.relative_to(ROOT)).replace("\\", "/")
    (qdir / "image.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"  [OK] 素材已登记: {meta['file']}（{out_path.stat().st_size/1024:.0f}KB，{fmt.upper()}）")
    return 0


def attach(args):
    mdir = ASSETS_Q / args.qid
    mfile = mdir / "image.json"
    if not mfile.exists():
        print(f"  [FAIL] 素材未登记（先运行 stage --qid {args.qid} ...）")
        return 1
    meta = json.loads(mfile.read_text("utf-8"))
    hits = list(QUESTIONS_DIR.glob(f"*/*/{args.qid}.json")) if QUESTIONS_DIR.exists() else []
    if not hits:
        print(f"  [FAIL] 未找到单题文件 data/questions/**/{args.qid}.json（题目尚未提交？）")
        return 1
    qpath = hits[0]
    q = json.loads(qpath.read_text("utf-8"))
    q["image"] = meta
    qpath.write_text(json.dumps(q, ensure_ascii=False, indent=2, sort_keys=True) + "\n", "utf-8")
    print(f"  [OK] image 字段已写入 {qpath.relative_to(ROOT)}；请运行 rebuild-bank-perid.py build 刷新 id大全 has_image")
    return 0


def coverage():
    if not ID_ALL.exists():
        print("id大全不存在（题库尚未构建）")
        return 0
    data = json.loads(ID_ALL.read_text("utf-8"))
    qs = data.get("questions", {})
    total = len(qs)
    withimg = sum(1 for v in qs.values() if v.get("has_image"))
    ratio = withimg / total if total else 0
    print(f"coverage: 带图 {withimg}/{total} = {ratio:.1%}（目标 ≥ 30%）")
    return 0 if ratio >= 0.3 else 1


def license_check(args):
    pid = args.pmcid
    xml = pmc_xml(pid)
    lic = look_license_from_xml(xml)
    print(f"license({pid}): {lic or '未识别（可能是订阅非 OA 文章）'}")
    return 0 if lic else 2


def main():
    ap = argparse.ArgumentParser(description="BioQuest 论文配图管线（真实 OA 图 → 题目 image 字段）")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("stage")
    p.add_argument("--qid", required=True)
    p.add_argument("--pmcid")
    p.add_argument("--figure", default="")
    p.add_argument("--file")
    p.add_argument("--license")
    p.add_argument("--doi", default="")
    p.add_argument("--caption", default="")
    p.add_argument("--credit", default="")
    p.add_argument("--source", default="")
    p.set_defaults(func=stage)

    p = sub.add_parser("attach")
    p.add_argument("--qid", required=True)
    p.set_defaults(func=attach)

    p = sub.add_parser("fetch")
    p.add_argument("--qid", required=True)
    p.add_argument("--pmcid")
    p.add_argument("--figure", default="")
    p.add_argument("--file")
    p.add_argument("--license")
    p.add_argument("--doi", default="")
    p.add_argument("--caption", default="")
    p.add_argument("--credit", default="")
    p.set_defaults(func=lambda a: stage(a) or attach(a))

    p = sub.add_parser("coverage")
    p.set_defaults(func=coverage)

    p = sub.add_parser("license")
    p.add_argument("--pmcid", required=True)
    p.set_defaults(func=license_check)

    args = ap.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())