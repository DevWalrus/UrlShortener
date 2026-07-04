# Node.js API Standards

Standards and best practices for the Node.js API component of the application.

## File Organization

- API endpoints in `/api/routes/` or `/api/handlers/`
- Middleware in `/api/middleware/`
- Database logic in `/api/db/` or `/api/models/`
- Utilities in `/api/utils/`
- Config in root or `/config/`

## Code Style

Node.js code is linted with ESLint. The linter is the source of truth for:
- Indentation (spaces/tabs)
- Semicolons and commas
- Quote style
- Spacing and line length

**When reviewing**: Check ESLint output first. If ESLint passes, style is good.

Run linting with:
```bash
npm run lint
npm run lint:fix  # Auto-fix style issues
```

## Error Handling

### Always Handle Errors

❌ **Bad**: Ignoring errors
```javascript
const result = await db.query('SELECT * FROM users');
```

✅ **Good**: Explicit error handling
```javascript
try {
  const result = await db.query('SELECT * FROM users');
  return result;
} catch (error) {
  logger.error('Database query failed', { error });
  throw new AppError('Failed to fetch users', 500);
}
```

### Async/Await Only

❌ **Bad**: Mixing promises without await
```javascript
async function getUser(id) {
  const user = User.findById(id);  // Not awaited!
  return user;
}
```

✅ **Good**: Always await promises
```javascript
async function getUser(id) {
  const user = await User.findById(id);
  return user;
}
```

### Middleware Error Propagation

Errors in middleware must be passed to the error handler:

❌ **Bad**: Throwing in middleware without try-catch
```javascript
app.get('/users', (req, res) => {
  const id = JSON.parse(req.query.id);  // Can throw!
  res.json({ id });
});
```

✅ **Good**: Catching and passing to error handler
```javascript
app.get('/users', (req, res, next) => {
  try {
    const id = JSON.parse(req.query.id);
    res.json({ id });
  } catch (error) {
    next(error);  // Passes to error middleware
  }
});
```

## API Contract

### Request Validation

All user input must be validated:

```javascript
// Good: Validates before use
const validateUser = (req, res, next) => {
  const { email, name } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (!name || name.length < 2) {
    return res.status(400).json({ error: 'Name too short' });
  }
  next();
};

app.post('/users', validateUser, handler);
```

### Response Consistency

All endpoints should return consistent response format:

```javascript
// Good: Consistent response
res.json({
  success: true,
  data: users,
  meta: { count: users.length }
});

// Error responses
res.status(400).json({
  success: false,
  error: 'Invalid request',
  code: 'VALIDATION_ERROR'
});
```

### HTTP Status Codes

- **200** - Success, resource returned
- **201** - Created
- **400** - Bad request (validation failed)
- **401** - Unauthorized (auth failed)
- **403** - Forbidden (permissions)
- **404** - Not found
- **500** - Server error

## Async Patterns

### Parallel Operations

Use `Promise.all()` for independent operations:

```javascript
// Good: Run in parallel
const [users, posts] = await Promise.all([
  User.find(),
  Post.find()
]);
```

Don't wait sequentially:

```javascript
// Bad: Waits for users, then posts (slower)
const users = await User.find();
const posts = await Post.find();
```

### Sequential Operations

When order matters, use await in sequence:

```javascript
// Good: Wait for user, then create their profile
const user = await User.create(userData);
const profile = await Profile.create({ userId: user.id });
```

## Logging

Use structured logging for debugging:

```javascript
// Good: Structured logs
logger.info('User created', { userId: user.id, email: user.email });
logger.error('Database error', { query, error, stack: error.stack });

// Avoid: Unstructured console.log in production
console.log('User created');
```

## Environment Variables

Configuration must come from environment, never hardcoded:

❌ **Bad**:
```javascript
const DATABASE_URL = 'postgres://localhost/mydb';
const API_KEY = 'secret123';
```

✅ **Good**:
```javascript
const DATABASE_URL = process.env.DATABASE_URL;
const API_KEY = process.env.API_KEY;

if (!DATABASE_URL || !API_KEY) {
  throw new Error('Missing required environment variables');
}
```

## Middleware Chain

Middleware order matters:

```javascript
// Good: Correct order
app.use(bodyParser);           // Parse requests first
app.use(authentication);       // Authenticate user
app.use(authorization);        // Check permissions
app.use(routes);              // Then handle routes
app.use(errorHandler);        // Finally, handle errors
```

## Common Patterns

### Route Handler
```javascript
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'ID required' });
    }
    
    const item = await Item.findById(id);
    
    if (!item) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});
```

### Middleware
```javascript
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Database Operation
```javascript
async function getUserWithPosts(userId) {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    const posts = await Post.find({ userId });
    
    return { ...user.toJSON(), posts };
  } catch (error) {
    logger.error('Failed to get user with posts', { userId, error });
    throw error;
  }
}
```

## What to Check When Reviewing

1. **ESLint passes** - Run linter first
2. **All errors handled** - No uncaught async operations
3. **No missing awaits** - Promises are awaited
4. **Middleware order** - Correct sequence
5. **No hardcoded config** - Environment variables used
6. **Validation on input** - Request data validated
7. **Consistent responses** - Standard format
8. **Proper status codes** - HTTP semantics correct
9. **No secrets** - Credentials not in code
10. **Descriptive logs** - Good error context
