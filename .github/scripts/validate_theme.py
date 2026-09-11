#!/usr/bin/env python3
"""
Structural checks that Shopify's theme-check does not cover.

theme-check validates Liquid and schema semantics. This covers the
wiring around them: that JSON templates point at sections that exist,
that every rendered snippet and referenced asset is present, that Liquid
tags balance, and that the stylesheet has not grown duplicate rules.

Exits non-zero on the first category that fails, listing every instance.
"""

import glob
import json
import os
import re
import sys
from collections import Counter

THEME_ROOT = os.environ.get("THEME_ROOT", ".")
errors: list[str] = []


def rel(path: str) -> str:
    return os.path.relpath(path, THEME_ROOT)


# --------------------------------------------------------------------------
# JSON: every template, config and locale file must parse
# --------------------------------------------------------------------------

json_files = (
    glob.glob(f"{THEME_ROOT}/templates/**/*.json", recursive=True)
    + glob.glob(f"{THEME_ROOT}/config/*.json")
    + glob.glob(f"{THEME_ROOT}/locales/*.json")
)
for path in json_files:
    try:
        json.load(open(path))
    except Exception as exc:
        errors.append(f"{rel(path)}: invalid JSON -- {exc}")


# --------------------------------------------------------------------------
# Section schemas: valid JSON, unique setting ids, unique block types
# --------------------------------------------------------------------------

SCHEMA_RE = re.compile(r"\{%\s*schema\s*%\}(.*?)\{%\s*endschema\s*%\}", re.S)

for path in sorted(glob.glob(f"{THEME_ROOT}/sections/*.liquid")):
    match = SCHEMA_RE.search(open(path).read())
    if not match:
        continue
    try:
        schema = json.loads(match.group(1))
    except Exception as exc:
        errors.append(f"{rel(path)}: invalid section schema JSON -- {exc}")
        continue

    def check_ids(settings, where):
        seen = set()
        for setting in settings or []:
            sid = setting.get("id")
            if sid is None:
                continue
            if sid in seen:
                errors.append(f"{rel(path)}: duplicate setting id '{sid}' in {where}")
            seen.add(sid)

    check_ids(schema.get("settings"), "section settings")
    for block in schema.get("blocks") or []:
        check_ids(block.get("settings"), f"block '{block.get('type')}'")

    block_types = [b.get("type") for b in schema.get("blocks") or []]
    duplicates = [t for t, n in Counter(block_types).items() if n > 1]
    if duplicates:
        errors.append(f"{rel(path)}: duplicate block types {duplicates}")


# --------------------------------------------------------------------------
# JSON templates: sections exist, and `order` matches the section keys
# --------------------------------------------------------------------------

for path in sorted(glob.glob(f"{THEME_ROOT}/templates/**/*.json", recursive=True)):
    try:
        data = json.load(open(path))
    except Exception:
        continue  # already reported above

    sections = data.get("sections") or {}
    order = data.get("order") or []

    for key, section in sections.items():
        section_type = section.get("type")
        if section_type and not os.path.exists(f"{THEME_ROOT}/sections/{section_type}.liquid"):
            errors.append(f"{rel(path)}: section '{key}' references missing sections/{section_type}.liquid")

    for key in order:
        if key not in sections:
            errors.append(f"{rel(path)}: order lists '{key}', which is not defined in sections")

    if order:
        for key in sections:
            if key not in order:
                errors.append(f"{rel(path)}: section '{key}' is missing from order and will not render")


# --------------------------------------------------------------------------
# Every rendered snippet and referenced asset must exist
# --------------------------------------------------------------------------

liquid_files = glob.glob(f"{THEME_ROOT}/**/*.liquid", recursive=True)

for path in sorted(liquid_files):
    source = open(path).read()
    for snippet in re.findall(r"render\s+'([a-z0-9\-_]+)'", source):
        if not os.path.exists(f"{THEME_ROOT}/snippets/{snippet}.liquid"):
            errors.append(f"{rel(path)}: renders missing snippet '{snippet}'")
    for asset in re.findall(r"'([A-Za-z0-9._\-]+)'\s*\|\s*asset_url", source):
        if not os.path.exists(f"{THEME_ROOT}/assets/{asset}"):
            errors.append(f"{rel(path)}: references missing asset '{asset}'")


# --------------------------------------------------------------------------
# Liquid tag balance
# --------------------------------------------------------------------------

PAIRS = {
    "if": "endif", "unless": "endunless", "for": "endfor", "case": "endcase",
    "form": "endform", "paginate": "endpaginate", "capture": "endcapture",
    "comment": "endcomment", "schema": "endschema", "style": "endstyle",
    "javascript": "endjavascript", "doc": "enddoc", "raw": "endraw",
    "tablerow": "endtablerow",
}
CLOSERS = {v: k for k, v in PAIRS.items()}

for path in sorted(liquid_files):
    source = open(path).read()
    # Strip regions whose contents are not Liquid control flow.
    for tag in ("comment", "doc", "schema", "raw"):
        source = re.sub(
            rf"\{{%-?\s*{tag}\s*-?%\}}.*?\{{%-?\s*end{tag}\s*-?%\}}", "", source, flags=re.S
        )

    stack = []
    for match in re.finditer(r"\{%-?\s*(\w+)", source):
        tag = match.group(1)
        if tag in PAIRS:
            stack.append(tag)
        elif tag in CLOSERS:
            expected = CLOSERS[tag]
            if not stack:
                errors.append(f"{rel(path)}: stray {{% {tag} %}}")
            elif stack[-1] != expected:
                errors.append(f"{rel(path)}: {{% {tag} %}} closes {{% {stack[-1]} %}}")
                stack.pop()
            else:
                stack.pop()

    # `{% liquid %}` bodies use bare keywords rather than tag delimiters.
    for match in re.finditer(r"\{%-?\s*liquid\b(.*?)-?%\}", source, re.S):
        inner = []
        for line in match.group(1).splitlines():
            word = line.strip().split(" ")[0].strip()
            if word in PAIRS:
                inner.append(word)
            elif word in CLOSERS:
                if not inner or inner[-1] != CLOSERS[word]:
                    errors.append(f"{rel(path)}: unbalanced '{word}' inside a liquid tag")
                    inner = []
                    break
                inner.pop()
        if inner:
            errors.append(f"{rel(path)}: liquid tag leaves {inner} open")

    if stack:
        errors.append(f"{rel(path)}: unclosed {stack}")


# --------------------------------------------------------------------------
# CSS: braces balance, and no selector is defined twice outside a media query
# --------------------------------------------------------------------------

for path in sorted(glob.glob(f"{THEME_ROOT}/assets/*.css")):
    css = open(path).read()
    if css.count("{") != css.count("}"):
        errors.append(f"{rel(path)}: unbalanced braces ({css.count('{')} open, {css.count('}')} close)")

    # Only compare rules at the top level; media-query variants are expected.
    top_level = re.sub(r"@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}", "", css, flags=re.S)
    top_level = re.sub(r"@(keyframes|supports|font-face)[^{]*\{(?:[^{}]|\{[^{}]*\})*\}", "", top_level, flags=re.S)
    selectors = [
        s[1].strip().replace("\n", " ")
        for s in re.findall(r"(^|\n)\s*([^{}@\n][^{}]*?)\s*\{", top_level)
    ]
    for selector, count in Counter(selectors).items():
        if count > 1 and len(selector) < 120:
            errors.append(f"{rel(path)}: selector defined {count}x at top level -- '{selector}'")


# --------------------------------------------------------------------------

if errors:
    print(f"Theme structure check failed with {len(errors)} problem(s):\n")
    for error in errors:
        print(f"  - {error}")
    sys.exit(1)

print(
    f"Theme structure OK: {len(liquid_files)} Liquid files, "
    f"{len(json_files)} JSON files, schemas, references, tag balance and CSS all clean."
)
