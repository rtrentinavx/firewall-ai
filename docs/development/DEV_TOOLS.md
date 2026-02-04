# Dev tools (CI parity)

Tools used by GitHub Actions, so you can run the same checks locally and avoid CI failures.

## One-time setup

From repo root:

```bash
chmod +x scripts/install-dev-tools.sh
./scripts/install-dev-tools.sh
```

That script installs infra tools via **Homebrew** and Python tools in a **venv** (`.venv`). It does **not** install tflint inside the venv — **tflint is a Go binary**, not a Python package, so it’s installed system-wide via Homebrew.

---

## By workflow

### Infrastructure (terraform-validator.yml)

| Tool              | Install (macOS)        | Run locally |
|-------------------|------------------------|-------------|
| **Terraform**     | `brew install terraform` | `cd terraform && terraform init -backend=false && terraform validate` |
| **terraform fmt** | (same)                 | `terraform fmt -check -recursive` (in `terraform/`) |
| **TFLint**        | `brew install tflint`  | `cd terraform && tflint --init && tflint --recursive` |
| **Trivy** (IaC)   | `brew install trivy`   | `trivy config terraform` (optional) |
| **Checkov**       | In venv (see below)    | `checkov -d terraform --framework terraform` |
| **terraform-docs** | `brew install terraform-docs` | Used by CI to inject docs into README |

### Backend (backend-ci.yml)

| Tool     | Install                    | Run locally |
|----------|----------------------------|-------------|
| Python 3.11 | System / pyenv          | — |
| deps     | `pip install -r backend/requirements.txt -r backend/requirements-dev.txt` (in venv) | — |
| **flake8** | In `requirements-dev.txt` | `cd backend && flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics` then `flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics` |
| **mypy** | In `requirements-dev.txt` | `cd backend && mypy . --ignore-missing-imports` |
| **pytest** | In `requirements-dev.txt` | `cd backend && pytest --cov=. --cov-report=term-missing` (set `PYTHONPATH=.`) |
| **bandit** | In `requirements-dev.txt` | `cd backend && bandit -r .` |
| **safety** | In `requirements-dev.txt` | `cd backend && safety check` |

### Frontend (frontend-ci.yml)

| Tool        | Install              | Run locally |
|-------------|----------------------|-------------|
| Node 18     | https://nodejs.org or nvm | — |
| deps        | `cd frontend && npm ci` | — |
| **ESLint**  | devDependency        | `cd frontend && npm run lint` |
| **TypeScript** | devDependency     | `cd frontend && npm run type-check` |
| **Jest**    | devDependency        | `cd frontend && npm run test:ci` |
| **Build**   | —                    | `cd frontend && npm run build` |

### Security (security.yml)

- **CodeQL** – runs in CI only.
- **Trivy** (containers) – `brew install trivy` then e.g. `trivy image firewall-ai-backend` after building.
- **TruffleHog** – optional; install via `brew install trufflehog` if you want to run secret detection locally.
- **pip-licenses / license-checker** – CI uses these for license reports; optional locally.

---

## Quick reference

- **TFLint**: Not a Python tool; use `brew install tflint` (or [official install](https://github.com/terraform-linters/tflint#installation)).
- **Checkov**: Python; install in the same venv as the backend: `pip install -r backend/requirements-dev.txt` (checkov is listed there).
- **Venv**: Create with `python3 -m venv .venv`, then `source .venv/bin/activate` and install backend + dev deps as above.
