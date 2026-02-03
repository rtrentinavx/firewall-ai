#!/usr/bin/env bash
# Install dev tools used by GitHub Actions so you can run the same checks locally.
# Run from repo root: ./scripts/install-dev-tools.sh
#
# Note: tflint is a Go binary, not a Python package — it cannot be installed in a venv.
# This script installs infra tools via Homebrew and Python tools in a venv.

set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Installing dev tools (CI parity)"
echo ""

# --- Homebrew (infra tools: tflint, terraform, terraform-docs, trivy) ---
if command -v brew &>/dev/null; then
  echo "==> Using Homebrew to install Terraform / TFLint / Trivy / terraform-docs..."
  for formula in terraform tflint terraform-docs trivy; do
    if command -v "$formula" &>/dev/null; then
      echo "  ✓ $formula: $(command -v "$formula")"
    else
      echo "  Installing $formula..."
      if brew install "$formula" 2>&1; then
        echo "  ✓ $formula installed"
      else
        echo "  ✗ $formula failed (install manually if needed)"
      fi
    fi
  done
else
  echo "==> Homebrew not found. Install infra tools manually:"
  echo "    terraform:  https://developer.hashicorp.com/terraform/install"
  echo "    tflint:     https://github.com/terraform-linters/tflint#installation"
  echo "    trivy:      https://github.com/aquasecurity/trivy#installation"
  echo "    terraform-docs: https://terraform-docs.io/user-guide/installation/"
fi

echo ""

# --- Python venv (backend + checkov) ---
# Prefer Python 3.11 (CI uses 3.11; pandas and others don't support 3.14 yet)
PYTHON_CMD=""
for p in python3.11 python3.12 python3; do
  if command -v "$p" &>/dev/null; then
    PYTHON_CMD="$p"
    break
  fi
done

echo "==> Backend Python venv (flake8, mypy, pytest, bandit, safety, checkov)..."
if [[ -n "$PYTHON_CMD" ]]; then
  PYTHON_VER=$("$PYTHON_CMD" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || true)
  if [[ "$PYTHON_VER" == "3.14" ]]; then
    echo "  ✗ Default Python is 3.14; backend deps (pandas/checkov) need 3.11 or 3.12."
    echo "  Install: brew install python@3.11"
    echo "  Then re-run this script."
    exit 1
  fi
  # Prefer .venv; if it exists and is Python 3.14, use .venv-ci instead (don't remove active venv)
  VENV_DIR="${VENV_DIR:-$REPO_ROOT/.venv}"
  VENV_PYTHON="$VENV_DIR/bin/python"
  if [[ -d "$VENV_DIR" ]] && [[ -x "$VENV_PYTHON" ]]; then
    VENV_VER=$("$VENV_PYTHON" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || true)
    if [[ "$VENV_VER" == "3.14" ]]; then
      echo "  Existing .venv uses Python 3.14 (in use). Using alternate venv .venv-ci (no removal)."
      VENV_DIR="$REPO_ROOT/.venv-ci"
    fi
  fi
  if [[ ! -d "$VENV_DIR" ]]; then
    echo "  Creating venv with $PYTHON_CMD ($PYTHON_VER) at $VENV_DIR..."
    "$PYTHON_CMD" -m venv "$VENV_DIR"
    echo "  Created venv at $VENV_DIR"
  fi
  echo "  Activating venv at $VENV_DIR"
  # shellcheck source=/dev/null
  source "$VENV_DIR/bin/activate"
  pip install --quiet --upgrade pip
  pip install --quiet -r backend/requirements.txt
  pip install --quiet -r backend/requirements-dev.txt
  echo "  ✓ Backend deps + dev tools (including checkov) installed in venv"
  echo "  To use for backend/checkov: source $VENV_DIR/bin/activate"
else
  echo "  ✗ python3 not found; install Python 3.11 or 3.12 (e.g. brew install python@3.11)"
fi

echo ""

# --- Node (frontend) ---
if command -v node &>/dev/null; then
  echo "==> Frontend: Node $(node -v) found. Install deps with: cd frontend && npm ci"
else
  echo "==> Node not found. Frontend CI uses Node 18; install from https://nodejs.org or use nvm"
fi

echo ""
echo "==> Done. Quick checks (run from repo root):"
echo "  Terraform:  cd terraform && terraform init -backend=false && terraform validate && terraform fmt -check -recursive"
echo "  TFLint:     cd terraform && tflint --init && tflint --recursive"
echo "  Checkov:    checkov -d terraform --framework terraform  (with venv active)"
echo "  Backend:   cd backend && pytest && flake8 . && mypy .  (with venv active)"
echo "  Frontend:  cd frontend && npm ci && npm run lint && npm run type-check && npm run test:ci && npm run build"
