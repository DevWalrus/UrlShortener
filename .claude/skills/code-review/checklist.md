# Code Review Checklist

Reference guide for detailed review criteria across all stacks.

## Pre-Review
- [ ] Run linter first (objective signal)
- [ ] Identify the stack (file extension/path)
- [ ] Read the code in context with surrounding lines
- [ ] Note any patterns that stand out as unusual

## Node.js/TypeScript API (creator-fe/api/, any .js/.ts)

### Async & Promises
- [ ] All promises awaited (no missing `await`)
- [ ] No `fire-and-forget` patterns without explicit intent
- [ ] Async functions don't silently swallow errors

### Error Handling
- [ ] All errors checked (not ignored with `_`)
- [ ] Error messages have context (not just generic strings)
- [ ] Try/catch blocks catch the right scope
- [ ] Middleware chains have error handlers

### Config & Secrets
- [ ] No hardcoded API keys, passwords, connection strings
- [ ] All secrets from environment variables
- [ ] Default values safe for public exposure

### Input Validation
- [ ] All `req.body` and `req.query` validated
- [ ] Type checking (not just presence)
- [ ] Request size limits set

### Middleware & Order
- [ ] Middleware in correct order (auth before protected routes)
- [ ] No middleware gaps (e.g., auth skipped on some routes unintentionally)

## React/Vite Frontend (creator-fe/src/, any .tsx/.jsx)

### Imports
- [ ] No unused imports (bloats bundle)
- [ ] No wildcard imports (`import *`)
- [ ] All used exports are actually imported

### Components & Props
- [ ] Props defined with `defineProps` or TypeScript types
- [ ] Props have sensible defaults or are marked `required`
- [ ] Emits declared (if applicable)
- [ ] Component has single responsibility (not doing too much)

### State Management
- [ ] Local state stays local (`useState`)
- [ ] Global state used intentionally (not over-used)
- [ ] State updates are correct and don't mutate directly

### DOM & Accessibility
- [ ] No direct DOM access (`document.getElementById`, `.innerHTML`)
- [ ] Form fields have associated `<label>` elements
- [ ] Buttons have readable text (not empty `<button>`)
- [ ] Semantic HTML used (main heading is `<h1>`, not `<h3>`)
- [ ] ARIA labels where needed

### Debugging
- [ ] No `console.log` left in code
- [ ] No `debugger` statements

## Go Services (redirect/, creator-api/, any .go)

### Error Handling
- [ ] All errors checked (never use bare `_`)
- [ ] Errors wrapped with context (`fmt.Errorf("doing X: %w", err)`)
- [ ] Error paths return early

### Resource Cleanup
- [ ] Files closed (defer after Open)
- [ ] Database connections closed
- [ ] Goroutines always terminate

### Concurrency
- [ ] No goroutine leaks (all goroutines have exit conditions)
- [ ] Shared data protected by `sync.Mutex` or channels
- [ ] No concurrent map access without protection
- [ ] Context cancellation respected in loops

### Nil Safety
- [ ] No unchecked nil pointer dereferences
- [ ] Nil checks before type assertions
- [ ] Safe slice/map access

### Performance
- [ ] No obvious N+1 queries or loops
- [ ] Allocations reasonable (not creating huge slices in loops)

## All Code

### Naming
- [ ] Variable names are descriptive (not `x`, `data`, `temp`)
- [ ] Function names describe what they do
- [ ] Boolean variables start with `is`, `has`, `can`, `should`

### Comments
- [ ] Comments explain "why" (not just repeat the code)
- [ ] No commented-out code left behind
- [ ] Comments are current (not outdated)

### Security
- [ ] No secrets in code (check terraform.tfvars, .env examples)
- [ ] No SQL injection (use parameterized queries)
- [ ] No XSS vectors (sanitize user input in React)
- [ ] No CSRF issues (tokens where needed)

### Logging
- [ ] Production logging has context (request ID, user, timestamp)
- [ ] No PII in logs
- [ ] Appropriate log levels (warn vs error vs info)

### Code Quality
- [ ] No obvious code duplication (3+ similar lines = extraction candidate)
- [ ] Methods/functions are focused (do one thing)
- [ ] Dead code removed

## Post-Review
- [ ] All 🔴 Critical issues fixed
- [ ] 🟡 Important issues addressed (or documented why deferred)
- [ ] ✅ Passes checks are observed
- [ ] Code is ready to commit
