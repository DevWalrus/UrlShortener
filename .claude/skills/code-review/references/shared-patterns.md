# Shared Architectural Patterns

Architectural decisions and patterns that apply across the entire stack.

## API Contract

All services (Node.js and Go) follow the same API response contract for consistency.

### Success Response

```json
{
  "success": true,
  "data": { /* resource data */ },
  "meta": {
    "count": 10,
    "page": 1,
    "total": 100
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "User not found",
  "code": "NOT_FOUND",
  "details": {
    "userId": "123"
  }
}
```

### Status Code Standards

- **200** - Successful GET, PUT, PATCH, DELETE
- **201** - Successful POST (resource created)
- **400** - Bad request (validation error)
- **401** - Unauthenticated (missing or invalid token)
- **403** - Forbidden (authenticated but lacks permission)
- **404** - Not found
- **409** - Conflict (e.g., duplicate resource)
- **429** - Too many requests (rate limited)
- **500** - Server error
- **503** - Service unavailable

## Authentication

### Token-Based Auth

All services use JWT tokens for authentication:

1. **Login endpoint** returns `{ token: "jwt...", expiresIn: 3600 }`
2. **Requests** include `Authorization: Bearer <token>`
3. **Token validation** happens in middleware/auth layer
4. **Expiration** is 1 hour (3600 seconds)
5. **Refresh** via dedicated endpoint (not login)

### Frontend Token Storage

- Store token in memory (not localStorage)
- On page reload, use refresh endpoint to get new token
- Clear token on logout

### Backend Token Validation

- Verify signature using shared JWT secret
- Check expiration
- Extract user ID from claims
- Return 401 if invalid/expired

## Data Validation

### Three-Layer Validation

1. **Frontend** - User-facing, immediate feedback
2. **API Input** - Reject invalid data at entry
3. **Database** - Constraints for final safety

### Frontend Validation

```typescript
// Vite component validation
const validateEmail = (email: string): string | null => {
  if (!email) return 'Email is required'
  if (!email.includes('@')) return 'Invalid email format'
  return null
}
```

### API Input Validation

**Node.js:**
```javascript
const validateUserInput = (req, res, next) => {
  const { email, name } = req.body;
  const errors = {};
  
  if (!email || !/^.+@.+\..+$/.test(email)) {
    errors.email = 'Valid email required';
  }
  
  if (!name || name.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }
  
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', details: errors });
  }
  
  next();
};
```

**Go:**
```go
type ValidationError struct {
  Fields map[string]string
}

func ValidateUser(user User) error {
  errors := make(map[string]string)
  
  if user.Email == "" || !strings.Contains(user.Email, "@") {
    errors["email"] = "Valid email required"
  }
  
  if len(user.Name) < 2 {
    errors["name"] = "Name must be at least 2 characters"
  }
  
  if len(errors) > 0 {
    return ValidationError{Fields: errors}
  }
  
  return nil
}
```

## Logging and Observability

### Log Levels

- **Error** - Something went wrong, user affected
- **Warn** - Potential issue, but user not affected
- **Info** - Significant events (login, resource created)
- **Debug** - Detailed info for development

### Structured Logging

Always log with context, not just strings:

**Node.js:**
```javascript
logger.info('user_created', {
  userId: user.id,
  email: user.email,
  timestamp: new Date().toISOString()
});

logger.error('database_error', {
  query: 'SELECT * FROM users',
  error: err.message,
  stack: err.stack
});
```

**Go:**
```go
logger.Infof("user created: userId=%s email=%s", user.ID, user.Email)
logger.Errorf("database error: %v", err)
```

**Frontend:**
```javascript
console.error('API request failed', {
  url: '/api/users',
  status: error.status,
  message: error.message
});
```

## Testing Strategy

### Test Coverage Goals
- **Node.js API**: >80% unit test coverage
- **Go APIs**: >80% unit test coverage
- **Frontend**: >60% coverage (UI testing is complex)

### Test Types

**Unit Tests** - Test individual functions
**Integration Tests** - Test components working together
**E2E Tests** - Test user workflows (frontend)
**Performance Tests** - Benchmark critical paths

### Naming Convention

```javascript
// Node.js / JavaScript
describe('UserService', () => {
  describe('getUser', () => {
    it('returns user when found', () => { ... })
    it('throws NotFound when user missing', () => { ... })
    it('handles database errors gracefully', () => { ... })
  })
})

// Go
func TestGetUser(t *testing.T) {
  t.Run("returns user when found", func(t *testing.T) { ... })
  t.Run("throws NotFound when user missing", func(t *testing.T) { ... })
}

// Vite / Vue
describe('UserForm', () => {
  it('shows validation errors', () => { ... })
  it('submits valid form data', () => { ... })
})
```

## Environment Configuration

### Environment Variables

All services use environment variables for configuration. Never hardcode:

**Node.js:**
```bash
# .env or environment
DATABASE_URL=postgres://localhost/mydb
JWT_SECRET=very-secret-key
API_PORT=3000
NODE_ENV=production
```

Access via:
```javascript
const dbUrl = process.env.DATABASE_URL;
const port = process.env.API_PORT || 3000;
```

**Go:**
```bash
DATABASE_URL=postgres://localhost/mydb
JWT_SECRET=very-secret-key
API_PORT=8080
ENV=production
```

Access via:
```go
dbUrl := os.Getenv("DATABASE_URL")
port := os.Getenv("API_PORT")
if port == "" {
  port = "8080"
}
```

**Frontend (Vite):**
```bash
# .env
VITE_API_URL=http://localhost:3000
VITE_ENV=production
```

Access via:
```javascript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Database Access Patterns

### Connection Pooling

All database connections should use pooling to avoid exhaustion:

**Node.js:**
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Maximum pool size
  idleTimeoutMillis: 30000
});
```

**Go:**
```go
db, _ := sql.Open("postgres", os.Getenv("DATABASE_URL"))
db.SetMaxOpenConns(25)
db.SetMaxIdleConns(5)
```

### Transaction Patterns

**Node.js:**
```javascript
async function transferBalance(from, to, amount) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, from]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, to]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Go:**
```go
func TransferBalance(ctx context.Context, from, to string, amount int) error {
  tx, err := db.BeginTx(ctx, nil)
  if err != nil {
    return err
  }
  
  defer func() {
    if err != nil {
      tx.Rollback()
    } else {
      tx.Commit()
    }
  }()
  
  // Perform transfers
  return nil
}
```

## Cross-Service Communication

### Service-to-Service Calls

When one service calls another:

1. **Use service discovery** - Reference services by name, not hardcoded URLs
2. **Include timeout** - All calls must timeout
3. **Retry logic** - Implement exponential backoff for transient failures
4. **Circuit breaker** - Stop calling broken services temporarily
5. **Log calls** - Track which service called which

**Node.js example:**
```javascript
const fetchUserFromService = async (userId) => {
  const timeout = 5000;
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(`${USER_SERVICE_URL}/users/${userId}`, {
        signal: AbortSignal.timeout(timeout)
      });
      
      if (response.ok) return response.json();
      if (response.status === 404) throw new NotFoundError();
      if (response.status >= 500 && attempt < maxRetries - 1) {
        await delay(Math.pow(2, attempt) * 1000);
        continue;
      }
      
      throw new Error(`Service returned ${response.status}`);
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      logger.warn(`Service call failed, retrying`, { userId, attempt, error: error.message });
    }
  }
};
```

## Deployment Considerations

### Health Checks

All services should expose a health check endpoint:

```
GET /health
Response: { status: "ok", version: "1.0.0" }
```

### Graceful Shutdown

Services should:
1. Stop accepting new requests
2. Complete in-flight requests (timeout: 30 seconds)
3. Close database connections
4. Release resources

### Versioning

API endpoints can include version if needed:
- `/api/v1/users` - Keep backward compatibility
- `/api/v2/users` - New interface, old still supported

Prefer endpoint versioning over major version in code.

## Security Checklist

When reviewing any code:

- [ ] No hardcoded secrets or credentials
- [ ] Passwords hashed (bcrypt, scrypt, argon2)
- [ ] SQL injection prevented (parameterized queries)
- [ ] CSRF tokens used for state-changing requests
- [ ] CORS properly configured
- [ ] Rate limiting on public endpoints
- [ ] Input validation on all external data
- [ ] No sensitive data in logs
- [ ] HTTPS enforced in production
- [ ] Dependencies up to date

## Common Issues Across Stack

When reviewing any code:

1. **No error handling** - Every operation can fail
2. **Hardcoded config** - Use environment variables
3. **No logging** - Should understand what happened
4. **Poor validation** - Never trust user input
5. **Race conditions** - Concurrent access needs safety
6. **Resource leaks** - Close files, connections, etc.
7. **No timeouts** - Operations should have limits
8. **Silent failures** - Errors should propagate
9. **Tight coupling** - Depend on interfaces, not implementation
10. **No monitoring** - Production needs observability
