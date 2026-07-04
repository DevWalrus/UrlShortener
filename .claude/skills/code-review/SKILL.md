---
name: code-review
description: "Use when reviewing code changes across your full stack. Supports three modes: /code-review (all git changes), /code-review filename (entire file), /code-review filename@10-50 (specific lines). Reviews Node.js API, Vite frontend, and Go services against your stack's standards including Node linting rules."
compatibility: "Requires git repository and Node.js linting tools installed"
---

# Code Review Skill

Analyzes code changes across the stack (Node.js API, Vite frontend, Go services) against project standards.

## Critical: Minimize Investigation
- **Do NOT** read or glob for ESLint config files (eslint.config.js, .eslintrc, etc.)
- **Do NOT** verify linting setup before running
- **Just run the linter command directly** — it will work or fail, that's the feedback you need
- **Do NOT** explore the project structure unless explicitly needed for the review

## Immediate Actions

1. **Run ESLint** (for .js/.ts/.jsx/.tsx files):
   ```bash
   cd creator-fe && npx eslint path/to/file.tsx
   cd creator-fe/api && npx eslint path/to/file.js
   ```

2. **Extract and read the code** - Use Read tool to view the specific lines or full file

3. **Analyze against standards**:
   - **Node.js/TypeScript:** unused imports, error handling, missing await, hardcoded config
   - **React/Vite:** unused imports, props defined, no direct DOM access, accessibility
   - **Go:** error handling, resource cleanup, goroutine safety, nil checks

4. **Report findings** - List by severity (🔴 Critical, 🟡 Important, ✅ Passes) with line numbers

5. **Optionally apply fixes** - For objective, safe issues (semantic HTML, auto-fixable linting), use Edit to fix and report changes

## Invocation Modes

- `/code-review` — Review all git changes
- `/code-review filename` — Review entire file
- `/code-review filename@10-50` — Review specific lines (with context)

## Review Standards

**Node.js API:** Error handling, missing await, hardcoded config/secrets, unvalidated input, middleware order
**React/Vite:** Unused imports, props defined with defineProps, no direct DOM access, accessibility, semantic HTML
**Go:** Error handling (all errors checked), resource cleanup, goroutine safety, nil checks, race conditions

**All code:** Clear naming, no hardcoded secrets, no debug statements, proper logging, security practices

## Report Format

- 🔴 **Critical** — Affects correctness, security, or stability (fix before committing)
- 🟡 **Important** — Affects maintainability or performance (should fix)
- ✅ **Passes** — Code follows standards