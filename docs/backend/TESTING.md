# Backend Testing Guide

This guide explains how to test the backend locally.

## Prerequisites

- Python 3.11 or higher
- pip (Python package manager)

## Setup

### 1. Create a Virtual Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
# Install production dependencies
pip install -r requirements.txt

# Install development dependencies (includes pytest, flake8, mypy, etc.)
pip install -r requirements-dev.txt
```

## Running Tests

### Run All Tests

```bash
# From the backend directory
pytest

# With coverage report
pytest --cov=. --cov-report=term-missing

# With coverage report in HTML (opens in browser)
pytest --cov=. --cov-report=html
open htmlcov/index.html  # macOS
```

### Run Specific Test Files

```bash
# Run a specific test file
pytest tests/test_models.py

# Run a specific test class
pytest tests/test_models.py::TestFirewallRule

# Run a specific test function
pytest tests/test_models.py::TestFirewallRule::test_create_firewall_rule
```

### Run Tests with Verbose Output

```bash
pytest -v  # Verbose
pytest -vv  # More verbose
pytest -s   # Show print statements
```

### Run Tests in Parallel (faster)

```bash
pip install pytest-xdist
pytest -n auto  # Uses all CPU cores
```

## Code Quality Checks

### Linting (flake8)

```bash
# Check for critical errors only
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics

# Full linting check
flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
```

### Type Checking (mypy)

```bash
# Run type checking
mypy .

# With more verbose output
mypy . --verbose
```

### Formatting (black)

```bash
# Check formatting without making changes
black --check .

# Format code
black .
```

### Import Sorting (isort)

```bash
# Check import order
isort --check .

# Sort imports
isort .
```

## Running All Checks (Like CI)

To run all checks exactly as CI does:

```bash
# Set PYTHONPATH
export PYTHONPATH=.

# Run linting
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics

# Run type checking
mypy .

# Run tests with coverage
pytest --cov=. --cov-report=xml --cov-report=term-missing
```

## Test Structure

Tests are located in the `tests/` directory:

- `test_models.py` - Tests for Pydantic models (FirewallRule, AuditResult, etc.)
- `test_context_cache.py` - Tests for ContextCache functionality
- `test_normalization.py` - Tests for NormalizationEngine

## Writing New Tests

1. Create test files in the `tests/` directory
2. Name them `test_*.py`
3. Use pytest fixtures for setup/teardown
4. For async tests, use `@pytest.mark.asyncio`

Example:

```python
import pytest
from models.firewall_rule import FirewallRule, CloudProvider

def test_example():
    rule = FirewallRule(
        id="test-1",
        name="test",
        cloud_provider=CloudProvider.GCP,
        direction="ingress",
        action="allow"
    )
    assert rule.id == "test-1"

@pytest.mark.asyncio
async def test_async_example():
    # Your async test code
    pass
```

## Troubleshooting

### Import Errors

If you get import errors, make sure:
1. You're in the `backend/` directory
2. PYTHONPATH is set: `export PYTHONPATH=.`
3. Virtual environment is activated

### Missing Dependencies

If tests fail due to missing packages:
```bash
pip install -r requirements-dev.txt
```

### Async Test Issues

Make sure `pytest-asyncio` is installed and `asyncio_mode = auto` is set in `pytest.ini` (already configured).

## Coverage Goals

Current coverage can be viewed with:
```bash
pytest --cov=. --cov-report=term-missing
```

Aim for:
- Overall: >80%
- Critical modules: >90%
