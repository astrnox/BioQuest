#!/usr/bin/env python3
"""
一次性脚本：把 js/ 根目录的 .js 按分类迁入子目录，并统一更新所有 `js/<name>.js` 引用路径。

分类（子目录 -> 文件 basename，不含 .js）：
  core/       启动与基础设施（含 __jsBase/_resolveModuleUrl 锚定的地基 + 全页静态依赖）
  pages/      各学习业务页面模块
  ai/         AI 能力
  algo/       学习/记忆算法（含 fsrs.worker）
  admin/      管理后台
  engagement/ 激励/成长/社交/工具组件

执行后需要再人工微调少量「代码级路径拼接」的调用点（app.js _resolveModuleUrl/_pendingModules/
__jsBase、study.js 内嵌 base、minify-assets.js、admin-split.test.js 正则）。
"""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, 'js')

# name -> subdir
MAPPING = {
    # core
    'app': 'core', 'app-routes': 'core', 'boot-mask': 'core', 'boot-lazy': 'core',
    'sw-register': 'core', 'theme-init': 'core', 'theme-transition': 'core',
    'config': 'core', 'utils': 'core', 'storage': 'core', 'supabase': 'core',
    'supabase-client': 'core', 'loader': 'core', 'question-utils': 'core',
    'event-bus': 'core', 'csp-events': 'core', 'error-recovery': 'core',
    'empty-state': 'core', 'a11y-utils': 'core', 'sync-tabs': 'core',
    'cell-loader': 'core', 'lazy-images': 'core', 'offline-queue': 'core',
    'offline-status': 'core', 'shortcut-panel': 'core', 'hamburger': 'core',
    'hero-sketch': 'core', 'micro-details': 'core',
    # pages
    'practice': 'pages', 'exam': 'pages', 'review': 'pages', 'review-deep': 'pages',
    'wrongbook': 'pages', 'study': 'pages', 'dashboard': 'pages', 'quiz': 'pages',
    'cards': 'pages', 'habits': 'pages', 'wiki': 'pages', 'resources': 'pages',
    'ebook': 'pages', 'trends': 'pages', 'discussion': 'pages', 'tutor': 'pages',
    'teacher': 'pages', 'user': 'pages', 'learning-hub': 'pages',
    'knowledge-graph': 'pages', 'biology-history': 'pages', 'bio-lab': 'pages',
    'bio-animation': 'pages', 'phet-sims': 'pages', 'photo-quiz': 'pages',
    'daily-question': 'pages', 'daily-billion': 'pages', 'pomodoro': 'pages',
    'onboarding': 'pages', 'analytic': 'pages', 'community': 'pages',
    'bounty': 'pages', 'learning-dna': 'pages', 'classmate': 'pages',
    'classroom': 'pages', 'classroom-player': 'pages',
    # ai
    'ajke': '',  # placeholder never used
    'ai-client': 'ai', 'ai-key-store': 'ai', 'ai-diagnostic-engine': 'ai',
    'smart-diagnosis': 'ai', 'multi-agent': 'ai',
    # algo
    'fsrs-algorithm': 'algo', 'fsrs-optimizer': 'algo', 'fsrs.worker': 'algo',
    'irt-engine': 'algo',
    # admin
    'admin': 'admin', 'admin-aigen': 'admin', 'admin-cards': 'admin',
    'admin-community': 'admin', 'admin-ebook': 'admin', 'admin-ocr': 'admin',
    'admin-ops': 'admin', 'admin-questions': 'admin', 'admin-users': 'admin',
    # engagement
    'achievements': 'engagement', 'badge-motifs': 'engagement', 'eggs': 'engagement',
    'countdown': 'engagement', 'soundscape': 'engagement', 'social-impact': 'engagement',
    'mood-tracker': 'engagement', 'points-ui': 'engagement', 'notifications': 'engagement',
    'whiteboard': 'engagement', 'tts': 'engagement',
}

# 去除占位
MAPPING.pop('ajke', None)


def top_level_js():
    out = set()
    for fn in os.listdir(JS):
        if fn.endswith('.js'):
            out.add(fn[:-3])
    return out


def run(cmd):
    subprocess.run(cmd, cwd=ROOT, check=True)


def main():
    names = top_level_js()
    unmapped = [n for n in names if n not in MAPPING]
    if unmapped:
        print('WARN unmapped root js (will stay at root):', sorted(unmapped))

    # 1) git mv into subdirs
    moved = {}
    for name in sorted(names):
        sub = MAPPING.get(name)
        if not sub:
            continue
        src = os.path.join('js', name + '.js')
        dst_dir = os.path.join('js', sub)
        os.makedirs(os.path.join(ROOT, dst_dir), exist_ok=True)
        dst = os.path.join(dst_dir, name + '.js')
        if os.path.exists(os.path.join(ROOT, dst)):
            print('SKIP already exists:', dst)
            continue
        run(['git', 'mv', src, dst])
        moved[name] = sub

    print(f'moved {len(moved)} files')

    # 2) update references
    def allowed(f):
        rel = os.path.relpath(f, ROOT)
        if '/node_modules/' in rel or rel.startswith('node_modules'):
            return False
        if '/.git/' in rel or rel.startswith('.git'):
            return False
        if '/dist/' in rel or rel.startswith('dist'):
            return False
        if '/js/vendor/' in rel:
            return False
        if f.endswith('.min.js'):
            return False
        if f.endswith(('.html', '.js', '.json', '.py', '.md', '.css')):
            return True
        return False

    targets = []
    for dirpath, _, files in os.walk(ROOT):
        for fn in files:
            fp = os.path.join(dirpath, fn)
            if allowed(fp):
                targets.append(fp)

    total = 0
    per_file = {}
    for fp in targets:
        try:
            with open(fp, 'r', encoding='utf-8') as fh:
                text = fh.read()
        except (UnicodeDecodeError, IsADirectoryError):
            continue
        orig = text
        for name, sub in moved.items():
            old = 'js/' + name + '.js'
            new = 'js/' + sub + '/' + name + '.js'
            text = text.replace(old, new)
        if text != orig:
            cnt = sum(1 for _ in range(0))
            per_file[os.path.relpath(fp, ROOT)] = None
            with open(fp, 'w', encoding='utf-8') as fh:
                fh.write(text)
            total += 1

    print(f'updated {total} files:')
    for rel in sorted(per_file):
        print('  -', rel)


if __name__ == '__main__':
    main()