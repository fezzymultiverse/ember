#!/usr/bin/env bash
# EMBER PART HANDLER  ·  S.O.I. × Bojack Security  ·  999
# Applies a part (parts/<id>/) onto an Ember project folder with backup, verification and automatic rollback.
#   bash ember_handler.sh apply    <project_dir> [part] [--dry-run] [--force]
#   bash ember_handler.sh verify   <project_dir> [part]
#   bash ember_handler.sh rollback <project_dir>
#   bash ember_handler.sh status   <project_dir>
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CMD="${1:-help}"; PROJ="${2:-}"; PART="p1"; DRY=0; FORCE=0
shift $(( $# > 1 ? 2 : $# )) 2>/dev/null
for a in "$@"; do case "$a" in --dry-run) DRY=1;; --force) FORCE=1;; p[0-9]*) PART="$a";; esac; done
if [ -t 1 ]; then G=$'\e[32m'; R=$'\e[31m'; Y=$'\e[33m'; O=$'\e[38;5;208m'; N=$'\e[0m'; else G=; R=; Y=; O=; N=; fi
ok(){ echo "${G}PASS${N} $*"; }; bad(){ echo "${R}FAIL${N} $*"; }; warn(){ echo "${Y}WARN${N} $*"; }; info(){ echo "${O}»${N} $*"; }
LOG=""; log(){ [ -n "$LOG" ] && echo "$(date '+%F %T') $*" >> "$LOG"; }
sha(){ if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
banner(){ echo; echo "${O}══ EMBER HANDLER · $1 ══${N}"; }

usage(){ sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }
[ "$CMD" = help ] && usage
[ -z "$PROJ" ] && { bad "Give the project folder, e.g. bash ember_handler.sh apply ~/ember"; exit 1; }
[ -d "$PROJ" ] || { bad "Folder not found: $PROJ"; exit 1; }
PROJ="$(cd "$PROJ" && pwd)"
[ -f "$PROJ/package.json" ] && [ -f "$PROJ/www/index.html" ] || { bad "$PROJ does not look like an Ember project (needs package.json and www/index.html)."; exit 1; }
grep -q '"name": *"ember"' "$PROJ/package.json" || { bad "package.json name is not \"ember\". Refusing."; exit 1; }
BK="$PROJ/.ember_backup"; LOG="$PROJ/ember_handler.log"; mkdir -p "$BK"
MAN="$HERE/parts/$PART/MANIFEST"

need_part(){ [ -f "$MAN" ] || { bad "Part '$PART' not found next to this script ($MAN)."; exit 1; }; }

syntax_check(){ # $1 file
  case "$1" in
    *.js) if command -v node >/dev/null 2>&1; then node --check "$1" 2>/tmp/.eh_err && return 0 || { cat /tmp/.eh_err; return 1; }; else return 2; fi;;
    *.json) if command -v node >/dev/null 2>&1; then node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "$1" 2>/tmp/.eh_err && return 0 || { cat /tmp/.eh_err; return 1; }; else return 2; fi;;
    *) return 0;;
  esac
}

markers_check(){ # proves the part's logic is really in place
  local f="$PROJ/www"; local bad_n=0
  chk(){ if grep -q -- "$2" "$1" 2>/dev/null; then ok "marker in $(basename "$1"): $2"; else bad "marker missing in $(basename "$1"): $2"; bad_n=$((bad_n+1)); fi; }
  case "$PART" in
    p1) chk "$f/ember_right_panel.js" "function setCc"; chk "$f/ember_right_panel.js" "function setSub"
        chk "$f/ember_right_panel.css" "erp-cc-mode"; chk "$f/ember_right_panel.css" "erp-sub-mode"; chk "$f/index.html" "ember_right_panel.js?v=1.10.18-p1"
        chk "$f/index.html" "ember_right_panel.css?v=1.10.18-p1"; chk "$f/sw.js" "ember-v1.10.18-panel-p1";;
  esac
  return $bad_n
}

do_verify(){
  need_part; banner "VERIFY $PART"; local fails=0
  while IFS='|' read -r path base new; do
    [ -z "$path" ] && continue
    if [ ! -f "$PROJ/$path" ]; then bad "missing $path"; fails=$((fails+1)); continue; fi
    cur="$(sha "$PROJ/$path")"
    if [ "$cur" = "$new" ]; then ok "$path matches part $PART"
    elif [ "$cur" = "$base" ]; then warn "$path is still the original (part not applied)"; fails=$((fails+1))
    else bad "$path differs from both original and part $PART"; fails=$((fails+1)); fi
    syntax_check "$PROJ/$path"; rc=$?
    [ $rc -eq 1 ] && { bad "syntax error in $path"; fails=$((fails+1)); }
  done < "$MAN"
  markers_check || fails=$((fails+$?))
  command -v node >/dev/null 2>&1 || warn "node not found: JS/JSON syntax checks skipped (pkg install nodejs)"
  echo; if [ $fails -eq 0 ]; then ok "VERIFY COMPLETE · $PART is in place and consistent"; return 0; else bad "VERIFY FOUND $fails problem(s)"; return 1; fi
}

do_rollback(){
  banner "ROLLBACK"
  [ -f "$BK/latest" ] || { bad "No backup recorded in $BK"; exit 1; }
  local dir; dir="$(cat "$BK/latest")"; [ -d "$dir" ] || { bad "Backup folder missing: $dir"; exit 1; }
  local n=0
  while IFS= read -r rel; do
    [ -z "$rel" ] && continue
    if [ -f "$dir/files/$rel" ]; then mkdir -p "$PROJ/$(dirname "$rel")"; cp -p "$dir/files/$rel" "$PROJ/$rel" && { ok "restored $rel"; n=$((n+1)); } || bad "could not restore $rel"
    else warn "no backup copy of $rel"; fi
  done < "$dir/FILELIST"
  log "ROLLBACK from $dir ($n files)"; ok "ROLLBACK COMPLETE · $n file(s) restored from $(basename "$dir")"
}

do_apply(){
  need_part; banner "APPLY $PART → $PROJ"; [ $DRY -eq 1 ] && info "DRY RUN: nothing will be written"
  local pre=0 already=0 total=0
  # 1. preflight: payload integrity + base guard
  while IFS='|' read -r path base new; do
    [ -z "$path" ] && continue; total=$((total+1))
    [ -f "$HERE/parts/$PART/$path" ] || { bad "payload file missing: $path"; pre=$((pre+1)); continue; }
    [ "$(sha "$HERE/parts/$PART/$path")" = "$new" ] || { bad "payload corrupted: $path (re-download the zip)"; pre=$((pre+1)); continue; }
    if [ ! -f "$PROJ/$path" ]; then bad "project is missing $path"; pre=$((pre+1)); continue; fi
    cur="$(sha "$PROJ/$path")"
    if [ "$cur" = "$new" ]; then ok "$path already at part $PART"; already=$((already+1))
    elif [ "$cur" = "$base" ]; then ok "$path is the expected base"
    elif [ $FORCE -eq 1 ]; then warn "$path differs from the expected base: overwriting because of --force"
    else bad "$path is not the expected base version (this part was built on Ember 1.10.18 'part1-one-settings'). Use --force only if you accept losing local edits to it."; pre=$((pre+1)); fi
  done < "$MAN"
  [ $pre -gt 0 ] && { bad "PREFLIGHT FAILED ($pre problem(s)) · nothing changed"; exit 1; }
  [ $already -eq $total ] && { ok "Part $PART is already applied · nothing to do"; do_verify; exit $?; }
  [ $DRY -eq 1 ] && { ok "PREFLIGHT OK · $total file(s) would be applied"; exit 0; }
  # 2. backup
  local stamp dir; stamp="$(date +%Y%m%d-%H%M%S)"; dir="$BK/$PART-$stamp"; mkdir -p "$dir/files"; : > "$dir/FILELIST"
  while IFS='|' read -r path base new; do
    [ -z "$path" ] && continue; mkdir -p "$dir/files/$(dirname "$path")"; cp -p "$PROJ/$path" "$dir/files/$path"; echo "$path" >> "$dir/FILELIST"
  done < "$MAN"
  echo "$dir" > "$BK/latest"; ok "backup saved: .ember_backup/$(basename "$dir")"; log "APPLY $PART backup=$dir"
  # 3. apply
  while IFS='|' read -r path base new; do
    [ -z "$path" ] && continue
    cp "$HERE/parts/$PART/$path" "$PROJ/$path" && ok "applied $path" || { bad "copy failed: $path"; do_rollback; exit 1; }
  done < "$MAN"
  # 4. verify, auto-rollback on failure
  if do_verify; then log "APPLY $PART OK"; echo; ok "PART $PART APPLIED · hard-refresh Ember / clear site data once so the new service worker loads"; else bad "Verification failed · rolling back"; log "APPLY $PART FAILED, rolled back"; do_rollback; exit 1; fi
}

do_status(){
  banner "STATUS"; echo "project: $PROJ"; echo "version: $(grep -m1 '"version"' "$PROJ/package.json" | tr -d ' ,')"
  grep -o "const V = '[^']*'" "$PROJ/www/sw.js" | head -1
  [ -f "$BK/latest" ] && echo "last backup: $(basename "$(cat "$BK/latest")")" || echo "last backup: none"
  for p in "$HERE"/parts/p*/; do PART="$(basename "$p")"; MAN="$p/MANIFEST"; s=0; t=0
    while IFS='|' read -r path base new; do [ -z "$path" ] && continue; t=$((t+1)); [ -f "$PROJ/$path" ] && [ "$(sha "$PROJ/$path")" = "$new" ] && s=$((s+1)); done < "$MAN"
    [ $s -eq $t ] && ok "$PART applied ($s/$t files)" || info "$PART not applied ($s/$t files match)"; done
}

case "$CMD" in apply) do_apply;; verify) do_verify; exit $?;; rollback) do_rollback;; status) do_status;; *) usage;; esac
