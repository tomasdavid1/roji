#!/usr/bin/env python3
"""
Update the Roji privacy policy (page ID 51) on production WP.

This script is meant to run *on the Kinsta server* as part of a
one-shot ops command. It:

  1. Reads the current `_elementor_data` JSON from post meta 51.
  2. Updates the existing "Sites" paragraph to include
     `tools.rojipeptides.com` and `mcp.rojipeptides.com`.
  3. Appends 3 new (heading + text-editor) widget pairs to the
     last container, covering:
       - Tools subdomain data handling
       - COA Analyzer file handling
       - MCP server / ChatGPT App data flow
  4. Bumps the "Last updated" footer to today.
  5. Writes the updated JSON back to post meta and clears
     Elementor's compiled cache.

Idempotency:
  - Sites paragraph rewrite is keyed off the literal "(collectively,"
    string. Running twice won't double-apply.
  - New sections are keyed off their heading title strings ("13.
    Research Tools (tools.rojipeptides.com)" etc.). If those
    sections already exist (e.g. from a previous run), they're
    skipped.

Why we don't just paste the addendum into wp-admin:
  - The privacy page is fully Elementor-driven; `post_content` is
    empty. Pasting HTML into the WP block editor wouldn't render
    because the page template is `elementor_header_footer` which
    suppresses post_content rendering entirely.
  - Editing in the Elementor visual editor for 4 new sections is
    fine, but error-prone for the small "Sites" rewrite.

Usage on the server:
  python3 /tmp/update-privacy-policy.py
"""

import json
import subprocess
import sys
import uuid
from datetime import date


PAGE_ID = 51

# --- 1. Pull current Elementor data via WP-CLI ---

import os

# Resolve WP path from $HOME so the script works on whatever Kinsta
# host slug we're deployed to (e.g. /www/rojipeptides_336/public).
WP_PATH = os.environ.get("WP_PATH") or f"{os.environ['HOME']}/public"


def wp(*args, capture=True):
    cmd = ["wp", f"--path={WP_PATH}", *args]
    r = subprocess.run(cmd, capture_output=capture, text=True)
    if r.returncode != 0:
        sys.stderr.write(f"[wp-cli error] {' '.join(cmd)}\n{r.stderr}\n")
        sys.exit(2)
    return r.stdout


raw = wp("post", "meta", "get", str(PAGE_ID), "_elementor_data")
data = json.loads(raw)
print(f"[init] loaded {len(data)} top-level containers")


# --- 2. Update the existing "Sites" paragraph ---

OLD_SITES_FRAGMENT = "rojipeptides.com</a> and <a href=\"https://protocol.rojipeptides.com\">protocol.rojipeptides.com</a> (collectively, the \\\"Sites\\\")"
NEW_SITES_FRAGMENT = "rojipeptides.com</a>, <a href=\"https://protocol.rojipeptides.com\">protocol.rojipeptides.com</a>, <a href=\"https://tools.rojipeptides.com\">tools.rojipeptides.com</a>, and <a href=\"https://mcp.rojipeptides.com\">mcp.rojipeptides.com</a> (collectively, the \\\"Sites\\\" or \\\"Services\\\")"


def walk_widgets(elements):
    """Yield every widget node anywhere in the tree."""
    for el in elements:
        if el.get("elType") == "widget":
            yield el
        children = el.get("elements") or []
        if children:
            yield from walk_widgets(children)


sites_updated = False
for w in walk_widgets(data):
    if w.get("widgetType") != "text-editor":
        continue
    editor = w.get("settings", {}).get("editor", "")
    # Match by stable substring (the original copy).
    if "(collectively, the \\\"Sites\\\")" in json.dumps(editor):
        # The editor field is HTML, not encoded JSON, so substring match
        # the actual string.
        if "(collectively, the \"Sites\")" in editor and "tools.rojipeptides.com" not in editor:
            old = (
                "<a href=\"https://rojipeptides.com\">rojipeptides.com</a> "
                "and <a href=\"https://protocol.rojipeptides.com\">"
                "protocol.rojipeptides.com</a> "
                "(collectively, the \"Sites\") or make a purchase."
            )
            new = (
                "<a href=\"https://rojipeptides.com\">rojipeptides.com</a>, "
                "<a href=\"https://protocol.rojipeptides.com\">"
                "protocol.rojipeptides.com</a>, "
                "<a href=\"https://tools.rojipeptides.com\">"
                "tools.rojipeptides.com</a>, and "
                "<a href=\"https://mcp.rojipeptides.com\">"
                "mcp.rojipeptides.com</a> "
                "(collectively, the \"Sites\" or \"Services\") or make a purchase or use any of our research tools."
            )
            if old in editor:
                w["settings"]["editor"] = editor.replace(old, new)
                sites_updated = True
                print("[ok]   updated 'Sites' definition paragraph")
            else:
                print("[skip] 'Sites' paragraph found but didn't match exact original — leaving alone")

if not sites_updated:
    print("[skip] 'Sites' paragraph not modified (already updated, or copy drift)")


# --- 3. Update "Last updated" footer ---

today_iso = date.today().strftime("%B %Y")  # "May 2026"
for w in walk_widgets(data):
    if w.get("widgetType") != "text-editor":
        continue
    editor = w.get("settings", {}).get("editor", "")
    if "Last updated:" in editor:
        # Replace the inner date but keep the markup.
        import re
        new_editor = re.sub(
            r"Last updated:\s*[A-Z][a-z]+\s+\d{4}",
            f"Last updated: {today_iso}",
            editor,
        )
        if new_editor != editor:
            w["settings"]["editor"] = new_editor
            print(f"[ok]   bumped 'Last updated' to {today_iso}")
        break


# --- 4. Append new sections ---

def new_id():
    return uuid.uuid4().hex[:8]


def heading_widget(title):
    return {
        "id": new_id(),
        "elType": "widget",
        "widgetType": "heading",
        "settings": {
            "title": title,
            "header_size": "h2",
            "align": "left",
            "title_color": "#f0f0f5",
            "typography_typography": "custom",
            "typography_font_family": "Inter",
            "typography_font_weight": "700",
            "typography_letter_spacing": {"unit": "px", "size": -1, "sizes": []},
            "typography_font_size": {"unit": "px", "size": 22, "sizes": []},
        },
        "elements": [],
        "isInner": False,
    }


def text_widget(html):
    return {
        "id": new_id(),
        "elType": "widget",
        "widgetType": "text-editor",
        "settings": {
            "editor": html,
            "text_color": "#8a8a9a",
            "typography_typography": "custom",
            "typography_font_family": "Inter",
            "typography_line_height": {"unit": "em", "size": 1.7, "sizes": []},
        },
        "elements": [],
        "isInner": False,
    }


# Find the last top-level container's elements list — that's where
# the numbered sections live.
last_container = data[-1]
existing_elements = last_container.setdefault("elements", [])
existing_titles = {
    e.get("settings", {}).get("title", "")
    for e in existing_elements
    if e.get("widgetType") == "heading"
}

NEW_SECTIONS = [
    (
        "13. Research Tools (tools.rojipeptides.com)",
        "<p>We operate a free suite of peptide research calculators "
        "and reference databases at <strong>tools.rojipeptides.com</strong>. "
        "These tools run primarily in your browser and do not require "
        "an account. The information you input (vial sizes, water "
        "volumes, target measurements, body composition inputs, "
        "supplement names, PubMed search queries) is processed only "
        "to compute the answer you requested and is not associated "
        "with any identifiable user profile.</p>"
        "<p>We use Google Analytics 4 and Google Ads conversion "
        "tracking on the tools site to measure tool engagement and "
        "(where you click through) referrals to our store. We do "
        "not sell or share this analytics data with third parties "
        "beyond Google's standard product terms. You can opt out of "
        "Google Analytics tracking using the "
        "<a href=\"https://tools.google.com/dlpage/gaoptout\" "
        "rel=\"noopener\" target=\"_blank\">Google Analytics opt-out "
        "browser add-on</a>.</p>"
        "<p><strong>Certificate of Analysis (COA) verification:</strong> "
        "When you paste the text content of a Certificate of Analysis "
        "(whether from Roji or a third-party vendor) into our COA "
        "Analyzer at tools.rojipeptides.com/coa or via the Roji "
        "ChatGPT App, we process that text on our server to compute "
        "a trust score, identify the testing lab, extract purity and "
        "mass-spec fields, and surface red flags. The text you paste "
        "is processed in memory only and is not persisted to any "
        "database, log, or third-party service. We retain transient "
        "request logs (timestamp + anonymized session identifier) "
        "for up to 7 days for abuse prevention; those logs do not "
        "contain the COA content. We do not redistribute, resell, "
        "or otherwise share the COA documents you submit.</p>",
    ),
    (
        "14. Roji Research Tools — ChatGPT App and MCP server",
        "<p>We operate a Model Context Protocol (MCP) server at "
        "<strong>mcp.rojipeptides.com</strong> that powers the Roji "
        "Research Tools ChatGPT App and may be used directly by "
        "other AI clients (Anthropic Claude, Cursor, etc.). When you "
        "invoke a Roji research tool from inside ChatGPT (or another "
        "MCP-compatible client), the following data flows through "
        "our MCP server:</p>"
        "<ul>"
        "<li><strong>Tool inputs you provide:</strong> the values "
        "you specify for each calculator or lookup (e.g. vial size, "
        "compound name, COA text, PubMed query). We use these only "
        "to compute the requested answer and return it to you. They "
        "are not retained beyond the request.</li>"
        "<li><strong>Anonymized session identifier:</strong> ChatGPT "
        "sends an anonymized conversation ID with each tool call. We "
        "use it only to correlate multi-step tool invocations within "
        "a single conversation. It is not linked to any user "
        "profile, ChatGPT account, or external identity.</li>"
        "<li><strong>Platform identifier:</strong> we record which "
        "client (ChatGPT, Claude, Cursor) called the tool so we can "
        "serve the correct widget format. We do not record any user "
        "information beyond the platform.</li>"
        "<li><strong>Tool-call analytics:</strong> we keep an "
        "in-memory ring buffer of recent tool calls (tool name, "
        "anonymized session, duration, success/error) for "
        "operational debugging and product improvement. The buffer "
        "holds up to 10,000 events and resets on every server "
        "deploy. It does not contain the tool inputs or outputs.</li>"
        "</ul>"
        "<p>We do <strong>not</strong> collect: your ChatGPT email "
        "address, your ChatGPT user ID, your IP address (other than "
        "what our hosting provider's standard request logs capture "
        "for security purposes and discard within 30 days), the "
        "contents of your ChatGPT conversation outside the tool "
        "call, or any other conversation history. We do <strong>not"
        "</strong> ask for your ChatGPT account credentials and we "
        "do <strong>not</strong> require you to log in to use any "
        "of our tools.</p>",
    ),
    (
        "15. Third-party services for Research Tools",
        "<p>The research tools and MCP server rely on these "
        "third-party services:</p>"
        "<ul>"
        "<li><strong>NCBI / PubMed:</strong> when you use the "
        "PubMed search tool, your search query is sent to the "
        "public NCBI/PubMed E-utilities API to retrieve matching "
        "citations. We do not transmit any other information.</li>"
        "<li><strong>Fly.io:</strong> our MCP server is hosted on "
        "Fly.io, which receives standard HTTP request metadata "
        "for the purpose of routing and security. See "
        "<a href=\"https://fly.io/legal/privacy-policy/\" "
        "rel=\"noopener\" target=\"_blank\">Fly.io's privacy "
        "policy</a>.</li>"
        "<li><strong>OpenAI / Anthropic:</strong> when you use "
        "Roji Research Tools through the ChatGPT App or via "
        "Claude, those platforms process your conversation per "
        "their own terms. Roji has no access to your ChatGPT or "
        "Claude conversation history beyond what you explicitly "
        "send to one of our tools.</li>"
        "</ul>"
        "<p>Because the research tools and MCP server do not "
        "collect account data, the most actionable user controls "
        "are: closing the browser tab or removing the Roji "
        "Research Tools connector from your ChatGPT settings to "
        "end all data flow; using the Google Analytics opt-out "
        "described in section 13; or emailing "
        "<a href=\"mailto:support@rojipeptides.com\">"
        "support@rojipeptides.com</a> with the approximate "
        "timestamp window to request log deletion (we will delete "
        "matching log entries within 30 days).</p>",
    ),
]

added_count = 0
for title, body_html in NEW_SECTIONS:
    if title in existing_titles:
        print(f"[skip] section '{title[:40]}…' already present")
        continue
    existing_elements.append(heading_widget(title))
    existing_elements.append(text_widget(body_html))
    added_count += 1
    print(f"[ok]   appended section '{title[:40]}…'")

print(f"[done] {added_count} new section(s) appended; container now has {len(existing_elements)} elements")


# --- 5. Write back ---

new_json = json.dumps(data, ensure_ascii=False, separators=(",", ":"))

# Use --format=plaintext + stdin so we don't have to worry about
# argument escaping for the large JSON payload.
import tempfile
with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
    f.write(new_json)
    tmp_path = f.name

print(f"[write] writing {len(new_json)} chars from {tmp_path}")

# WP-CLI's `post meta update` accepts a value via stdin when the
# value is "-".
import shlex
cmd = (
    f"wp --path={shlex.quote(WP_PATH)} post meta update {PAGE_ID} "
    f"_elementor_data \"$(cat {shlex.quote(tmp_path)})\""
)
r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
if r.returncode != 0:
    sys.stderr.write(f"[error] meta update failed: {r.stderr}\n")
    sys.exit(3)
print("[ok]   _elementor_data written back")

# Clear Elementor's compiled cache so the new widgets render on the
# next page load instead of waiting for the cache TTL.
wp("post", "meta", "delete", str(PAGE_ID), "_elementor_element_cache")
wp("post", "meta", "delete", str(PAGE_ID), "_elementor_css")
print("[ok]   cleared Elementor compiled caches")

# Bump the post's modified timestamp so Yoast/sitemap pings catch it.
wp("post", "update", str(PAGE_ID), "--post_modified=now", "--post_modified_gmt=now")
print("[ok]   bumped post_modified")

print("\nDone. Privacy policy now covers:")
print("  - tools.rojipeptides.com (Section 13)")
print("  - COA file handling on server (Section 13)")
print("  - mcp.rojipeptides.com data flow (Section 14)")
print("  - Third-party (NCBI, Fly, OpenAI/Anthropic) (Section 15)")
print("  - 'Sites' definition expanded")
print(f"  - 'Last updated' bumped to {today_iso}")
