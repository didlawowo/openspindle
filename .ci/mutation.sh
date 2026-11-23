#!/usr/bin/env bash
# OpenSpindle's scoped mutation gate.
#
# OpenSpindle is an Electron desktop app whose upstream carries no test
# infrastructure, and whose project rules (AGENTS.md) keep automated tests
# opt-in. The central whole-repo default would demand a 100 % kill score over
# every changed UI file, which the project cannot pay. This protected runner
# keeps a real 100 % bar where the project can pay it: the pure-TypeScript
# logic modules (domain, machine adapters, file formats, persistence, i18n
# core). Presentation (src/features, src/routes, src/components, src/app,
# src/platform), host glue (electron/**, packages/**) and resource data
# (src/i18n/resources) are verified by typecheck, lint, build and manual
# machine recipes instead.
#
# Evidence follows the central Node contract: .quality/stryker.json when
# mutants were measured, .quality/mutation-no-targets.json when the scoped
# diff has no mutation target.
set -euo pipefail

BASE_SHA="${MUTATION_BASE_SHA:-}"
HEAD_SHA="${MUTATION_HEAD_SHA:-}"
DEPTH="${MUTATION_DEPTH:-medium}"
[[ -n "$BASE_SHA" && -n "$HEAD_SHA" ]] || {
  echo "mutation gate failed: MUTATION_BASE_SHA and MUTATION_HEAD_SHA must both be set" >&2
  exit 1
}
case "$DEPTH" in
  medium | high) ;;
  *)
    echo "mutation gate failed: unsupported MUTATION_DEPTH=$DEPTH" >&2
    exit 1
    ;;
esac

# Pure-logic modules under the mutation bar. Everything else is presentation,
# host glue or data, and produces no mutation target.
is_mutable_ts() {
  case "$1" in
    src/domain/* | src/machine/* | src/formats/* | src/persistence/* | src/i18n/*)
      case "$1" in
        src/i18n/resources/* | src/i18n/renderer.ts | *.test.ts) return 1 ;;
      esac
      return 0
      ;;
  esac
  return 1
}

mapfile -t CHANGED < <(
  git diff --name-only --diff-filter=ACMR "$BASE_SHA...$HEAD_SHA" -- src |
    grep -E '\.ts$' || true
)

targets=()
for file in "${CHANGED[@]}"; do
  if is_mutable_ts "$file"; then
    targets+=("$file")
  fi
done

mkdir -p .quality

if ((${#targets[@]} == 0)); then
  python3 - "$BASE_SHA" "$HEAD_SHA" <<'PY'
import json
import sys
from pathlib import Path

payload = {
    "engine": {"name": "stryker", "version": "9.6.1"},
    "scope": {"base_sha": sys.argv[1], "head_sha": sys.argv[2], "no_targets": True},
    "stats": {"killed": 0, "survived": 0, "timeouts": 0, "not_covered": 0, "total": 0},
}
Path(".quality/mutation-no-targets.json").write_text(
    json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
)
PY
  echo "No scoped mutation target in ${BASE_SHA}...${HEAD_SHA} (UI, host glue and resource data are outside the mutation scope)."
  exit 0
fi

echo "Scoped mutation targets ($DEPTH):"
printf '  - %s\n' "${targets[@]}"

mutate_entries=()
for repo_file in "${targets[@]}"; do
  if [[ "$DEPTH" == "high" ]]; then
    mutate_entries+=("$repo_file")
    continue
  fi
  while IFS= read -r hunk; do
    [[ -n "$hunk" ]] || continue
    start="${hunk%% *}"
    count="${hunk#* }"
    [[ "$count" != "$hunk" ]] || count=1
    [[ -n "$count" ]] || count=1
    if ((count > 0)); then
      mutate_entries+=("$repo_file:$start-$((start + count - 1))")
    fi
  done < <(
    git diff --unified=0 "$BASE_SHA...$HEAD_SHA" -- "$repo_file" |
      sed -nE 's/^@@ -[0-9]+(,[0-9]+)? \+([0-9]+)(,([0-9]+))? @@.*/\2 \4/p'
  )
done

if ((${#mutate_entries[@]} == 0)); then
  python3 - "$BASE_SHA" "$HEAD_SHA" <<'PY'
import json
import sys
from pathlib import Path

payload = {
    "engine": {"name": "stryker", "version": "9.6.1"},
    "scope": {"base_sha": sys.argv[1], "head_sha": sys.argv[2], "no_targets": True},
    "stats": {"killed": 0, "survived": 0, "timeouts": 0, "not_covered": 0, "total": 0},
}
Path(".quality/mutation-no-targets.json").write_text(
    json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
)
PY
  echo "No mutated lines in ${BASE_SHA}...$HEAD_SHA (deletions and comments only inside the scoped modules)."
  exit 0
fi

SCRATCH="$(mktemp -d "${RUNNER_TEMP:-/tmp}/openspindle-stryker.XXXXXX")"
trap 'rm -rf "$SCRATCH"' EXIT
TOOLS="$SCRATCH/tools"
REPORT="$SCRATCH/report.json"
CONFIG="$SCRATCH/config.json"
mkdir -p "$TOOLS"

# The scoped path does not go through the central setup-node step, and the
# repository's test script needs Node 22.18+ (TypeScript run directly).
# Bootstrap a pinned Node into the scratch directory when the runner is older.
node_major="$(node --version | sed 's/^v\([0-9]*\).*/\1/')"
if ((node_major < 22)); then
  NODE_VERSION=22.18.0
  case "$(uname -m)" in
    x86_64) node_arch=x64 ;;
    aarch64 | arm64) node_arch=arm64 ;;
    *)
      echo "mutation gate failed: no Node bootstrap for arch $(uname -m)" >&2
      exit 1
      ;;
  esac
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${node_arch}.tar.xz" |
    tar -xJ -C "$SCRATCH"
  PATH="$SCRATCH/node-v${NODE_VERSION}-linux-${node_arch}/bin:$PATH"
fi

npm ci --no-audit --no-fund

cat >"$TOOLS/package.json" <<'JSON'
{
  "private": true,
  "dependencies": {
    "@stryker-mutator/core": "9.6.1",
    "typescript": "5.6.3"
  }
}
JSON
(cd "$TOOLS" && npm install --ignore-scripts --no-audit --no-fund)

python3 - "$CONFIG" "$REPORT" "${mutate_entries[@]}" <<'PY'
import json
import sys
from pathlib import Path

config, report, *mutate = sys.argv[1:]
payload = {
    "mutate": mutate,
    "testRunner": "command",
    "commandRunner": {"command": "npm test"},
    "coverageAnalysis": "off",
    "reporters": ["clear-text", "json"],
    "jsonReporter": {"fileName": report},
    "thresholds": {"high": 100, "low": 100, "break": 100},
    "concurrency": 2,
    "timeoutMS": 20000,
    "timeoutFactor": 2,
}
Path(config).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
PY

set +e
PATH="$TOOLS/node_modules/.bin:$PATH" stryker run "$CONFIG"
stryker_rc=$?
set -e

[[ -s "$REPORT" ]] || {
  echo "mutation gate failed: stryker produced no evidence (exit=$stryker_rc)" >&2
  exit 1
}

python3 - "$REPORT" ".quality/stryker.json" "$BASE_SHA" "$HEAD_SHA" "$DEPTH" "$stryker_rc" <<'PY'
import json
import sys
from collections import Counter
from pathlib import Path

raw_path, out_path, base, head, depth, rc = sys.argv[1:]
raw = json.loads(Path(raw_path).read_text(encoding="utf-8"))
mutants = []
for value in (raw.get("files") or {}).values():
    mutants.extend(value.get("mutants") or [])

statuses = Counter(str(item.get("status") or "") for item in mutants)
killed = statuses["Killed"]
survived = statuses["Survived"]
timeouts = statuses["Timeout"]
not_covered = statuses["NoCoverage"]
other_bad = sum(
    count
    for status, count in statuses.items()
    if status not in {"Killed", "Survived", "Timeout", "NoCoverage", "Ignored"}
)
total = killed + survived + timeouts + not_covered + other_bad

payload = {
    "engine": {"name": "stryker", "version": "9.6.1"},
    "depth": depth,
    "scope": {"base_sha": base, "head_sha": head, "no_targets": False},
    "stats": {
        "killed": killed,
        "survived": survived,
        "timeouts": timeouts,
        "not_covered": not_covered,
        "other_bad": other_bad,
        "total": total,
    },
}
Path(out_path).write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")

print(f"Scoped mutation evidence: {payload['stats']}")
if total <= 0:
    raise SystemExit("mutation gate failed: no scoped mutants were measured")
if survived or timeouts or not_covered or other_bad:
    raise SystemExit(
        "scoped mutation gate failed: "
        f"survived={survived}, timeouts={timeouts}, "
        f"not_covered={not_covered}, other_bad={other_bad}"
    )
if int(rc) != 0:
    raise SystemExit(f"stryker returned unexpected exit code {rc}")
PY
