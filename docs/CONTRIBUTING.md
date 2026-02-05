# Contributing to Firewall AI

## Branch Workflow

We use a **feature branch workflow** to maintain code quality and enable parallel development.

### Branch Naming Convention

Branches should follow this naming pattern:

```
<type>/<short-description>
```

**Types:**
- `feature/` - New features or enhancements
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `perf/` - Performance improvements
- `test/` - Test additions or improvements
- `chore/` - Maintenance tasks (dependencies, config, etc.)

**Examples:**
- `feature/distributed-caching`
- `fix/cache-invalidation-bug`
- `refactor/agent-orchestration`
- `docs/api-documentation`
- `perf/query-optimization`
- `test/unit-tests-for-agents`

### Creating a New Branch

#### Option 1: Using the Helper Script
```bash
# Create and switch to a new feature branch
./scripts/development/create-branch.sh feature/my-new-feature

# Or for a fix
./scripts/development/create-branch.sh fix/bug-description
```

#### Option 2: Manual Git Commands
```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create and switch to new branch
git checkout -b feature/my-new-feature

# Push branch to remote (sets upstream)
git push -u origin feature/my-new-feature
```

### Working on a Branch

1. **Start from main**: Always create branches from the latest `main`
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/my-feature
   ```

2. **Make commits**: Commit frequently with clear messages
   ```bash
   git add .
   git commit -m "Add distributed caching implementation"
   ```

3. **Keep branch updated**: Regularly sync with main
   ```bash
   git checkout main
   git pull origin main
   git checkout feature/my-feature
   git rebase main  # or git merge main
   ```

4. **Push regularly**: Push your branch to remote
   ```bash
   git push origin feature/my-feature
   ```

### Pull Request Process

1. **Create Pull Request**: When your feature is ready, create a PR on GitHub
   - Target branch: `main`
   - Fill out the PR template
   - Link related issues

2. **Code Review**: 
   - Address review comments
   - Update PR with fixes
   - Keep PR focused and small when possible

3. **Merge**: 
   - Squash and merge (preferred) or merge commit
   - Delete branch after merge

### Branch Protection

The `main` branch is protected:
- ✅ Requires pull request reviews
- ✅ Requires status checks to pass
- ✅ No direct pushes to main
- ✅ Must be up to date with main before merging

### Commit Message Guidelines

Follow conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `perf`: Performance improvements
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(caching): add Redis distributed caching

Implement Redis-based distributed cache to enable
multi-instance cache sharing and persistence.

Closes #123
```

```
fix(agents): resolve LangGraph workflow initialization

Fix issue where LangGraph workflow was not properly
initialized, causing audit failures.

Fixes #456
```

### Quick Reference

```bash
# Create feature branch
git checkout main
git pull origin main
git checkout -b feature/my-feature

# Work and commit
git add .
git commit -m "feat: add new feature"

# Push branch
git push -u origin feature/my-feature

# Update from main
git checkout main
git pull origin main
git checkout feature/my-feature
git rebase main

# After PR is merged, clean up
git checkout main
git pull origin main
git branch -d feature/my-feature  # Delete local branch
```

## Development Workflow

### Before Starting Work

1. Check current issues and roadmap
2. Create an issue for your feature (if not exists)
3. Create a branch from `main`
4. Start coding!

### During Development

1. Write tests for new features
2. Update documentation as needed
3. Follow code style guidelines
4. Commit frequently with clear messages

### Before Submitting PR

1. Ensure all tests pass
2. Update documentation
3. Rebase on latest `main`
4. Write clear PR description
5. Link related issues

## Questions?

- Open an issue for questions
- Check existing documentation in `docs/`
- Review the roadmap in `docs/ROADMAP.md`
