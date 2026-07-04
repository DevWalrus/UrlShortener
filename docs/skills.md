# Claude Code Skills

Specialized tools and workflows configured for this project.

## Code Review (`/code-review`)

Automated code reviews across the full stack (Node.js API, Vite frontend, Go services) against project standards.

### Usage

```bash
/code-review                            # Review all git changes
/code-review src/pages/Home.tsx         # Review entire file
/code-review src/pages/Home.tsx@8-23    # Review specific lines
```

### How It Works

1. **Runs ESLint** on TypeScript/JavaScript files (objective linting feedback)
2. **Analyzes code** against stack-specific standards
3. **Reports findings** by severity (🔴 Critical, 🟡 Important, ✅ Passes)
4. **Optionally applies fixes** for safe, objective issues (semantic HTML, unused imports, etc.)

### Standards

**Node.js/TypeScript API:**
- Error handling (all errors checked)
- Missing `await` on promises
- Hardcoded config/secrets
- Unvalidated user input
- Middleware order

**React/Vite Frontend:**
- Unused imports (bundle bloat)
- Component props defined with types
- No direct DOM manipulation
- Accessibility (labels, semantic HTML)
- No debug statements (`console.log`)

**Go Services:**
- All errors handled (no ignored errors with `_`)
- Resource cleanup (`defer`)
- Goroutine safety (no leaks, no race conditions)
- Nil pointer safety
- Concurrency protection

**All Code:**
- Clear naming (descriptive, not `x` or `temp`)
- Comments explain "why", not "what"
- No hardcoded secrets
- Proper logging with context
- Security best practices

### Reference Materials

- **Detailed criteria by stack:** [`.claude/skills/code-review/checklist.md`](../.claude/skills/code-review/checklist.md)
- **Skill definition:** [`.claude/skills/code-review/SKILL.md`](../.claude/skills/code-review/SKILL.md)

### Examples

**Review all pending changes:**
```bash
/code-review
```

**Deep dive into a component:**
```bash
/code-review creator-fe/src/components/LinkForm.tsx
```

**Audit specific function logic:**
```bash
/code-review redirect/cmd/main.go@45-120
```

## Adding More Skills

Skills are defined in `.claude/skills/*/SKILL.md`. To add a new skill:

1. Create `.claude/skills/skill-name/SKILL.md` with frontmatter and instructions
2. Add an entry to this file
3. Reference it in relevant workflows
