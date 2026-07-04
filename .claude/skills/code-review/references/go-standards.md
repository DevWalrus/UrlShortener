# Go API Standards

Standards and best practices for the Go-based microservices.

## Error Handling

### Always Check Errors

❌ **Bad**: Ignoring errors
```go
data, _ := os.ReadFile("config.json")
// If ReadFile fails, data is nil and program likely crashes later
```

✅ **Good**: Check and handle all errors
```go
data, err := os.ReadFile("config.json")
if err != nil {
  logger.Errorf("Failed to read config: %v", err)
  return fmt.Errorf("reading config: %w", err)
}
```

### Use Error Wrapping

```go
// Good: Wrap errors with context
if err := db.Query(); err != nil {
  return fmt.Errorf("querying database: %w", err)
}

// Enables error chain inspection
if errors.Is(err, sql.ErrNoRows) {
  // Handle "not found" specifically
}
```

### Custom Error Types

```go
// Good: Typed errors for different scenarios
type ValidationError struct {
  Field   string
  Message string
}

func (e ValidationError) Error() string {
  return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// Can then type assert
if err := validate(user); err != nil {
  if ve, ok := err.(ValidationError); ok {
    response.Errors = append(response.Errors, ve.Message)
  }
}
```

## Concurrency

### Goroutine Leaks

❌ **Bad**: Goroutine that never exits
```go
func startWorker() {
  go func() {
    for {
      time.Sleep(time.Second)
      doWork()
    }
  }()
  // No way to stop this goroutine!
}
```

✅ **Good**: Goroutine with cancel signal
```go
func startWorker(ctx context.Context) {
  go func() {
    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()
    
    for {
      select {
      case <-ctx.Done():
        return  // Can exit cleanly
      case <-ticker.C:
        doWork()
      }
    }
  }()
}
```

### Safe Map Access

❌ **Bad**: Concurrent map access without synchronization
```go
var cache map[string]interface{}

go func() {
  cache["key1"] = value1  // Race!
}()

go func() {
  cache["key2"] = value2  // Race!
}()
```

✅ **Good**: Use sync.RWMutex for thread safety
```go
type Cache struct {
  mu    sync.RWMutex
  items map[string]interface{}
}

func (c *Cache) Set(key string, value interface{}) {
  c.mu.Lock()
  defer c.mu.Unlock()
  c.items[key] = value
}

func (c *Cache) Get(key string) (interface{}, bool) {
  c.mu.RLock()
  defer c.mu.RUnlock()
  val, ok := c.items[key]
  return val, ok
}
```

### Channel Communication

```go
// Good: Use channels for goroutine communication
func fetchData(ctx context.Context, ch chan<- Result) {
  select {
  case ch <- result:
    // Sent successfully
  case <-ctx.Done():
    return
  }
}

// Good: Timeout handling
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

select {
case result := <-ch:
  handleResult(result)
case <-ctx.Done():
  return ctx.Err()
}
```

## Interface Design

### Small, Focused Interfaces

❌ **Bad**: Large interface with many methods
```go
type Database interface {
  Query(sql string) Rows
  Insert(table string, data map[string]interface{}) error
  Update(table string, id int, data map[string]interface{}) error
  Delete(table string, id int) error
  Close() error
  Backup() error
  Restore() error
  // ... many more methods
}
```

✅ **Good**: Small, specific interfaces
```go
type Reader interface {
  Query(sql string) (Rows, error)
}

type Writer interface {
  Insert(table string, data map[string]interface{}) error
  Update(table string, id int, data map[string]interface{}) error
  Delete(table string, id int) error
}

type Closer interface {
  Close() error
}

// Compose as needed
type Database interface {
  Reader
  Writer
  Closer
}
```

### Depend on Interfaces, Not Concrete Types

```go
// Good: Accepts interface, not concrete type
func FetchUser(ctx context.Context, db Reader, id int) (*User, error) {
  rows, err := db.Query("SELECT * FROM users WHERE id = ?", id)
  // ...
}

// Bad: Tightly coupled to specific DB
func FetchUser(ctx context.Context, db *postgres.DB, id int) (*User, error) {
  // ...
}
```

## Defer and Cleanup

### Use Defer for Cleanup

```go
// Good: Guaranteed cleanup
func processFile(filename string) error {
  file, err := os.Open(filename)
  if err != nil {
    return err
  }
  defer file.Close()  // Always closes, even if error
  
  // Process file
  return nil
}
```

### Defer Order Matters

```go
// Good: Resources released in reverse order
func transaction(db *sql.DB) error {
  tx, _ := db.Begin()
  defer tx.Rollback()  // Cleanup second (or commit first)
  
  row := tx.QueryRow("SELECT ...")
  defer row.Close()    // Cleanup first
  
  return tx.Commit().Error  // Success, so commit instead of rollback
}
```

## Project Structure

```
service/
├── cmd/
│   └── server/
│       └── main.go          # Entry point
├── internal/
│   ├── api/
│   │   ├── handlers.go      # HTTP handlers
│   │   └── middleware.go
│   ├── database/
│   │   ├── query.go
│   │   └── models.go
│   ├── service/
│   │   └── user.go          # Business logic
│   └── config/
│       └── config.go
├── pkg/
│   └── logger/              # Shareable packages
└── go.mod
```

## HTTP Handlers

### Standard Handler Pattern

```go
func (s *Server) GetUser(w http.ResponseWriter, r *http.Request) error {
  // Extract from path
  userID := r.PathValue("id")
  
  if userID == "" {
    return NewHTTPError(http.StatusBadRequest, "user ID required")
  }
  
  // Business logic
  user, err := s.db.GetUser(r.Context(), userID)
  if err != nil {
    if errors.Is(err, sql.ErrNoRows) {
      return NewHTTPError(http.StatusNotFound, "user not found")
    }
    return fmt.Errorf("database error: %w", err)
  }
  
  // Response
  w.Header().Set("Content-Type", "application/json")
  return json.NewEncoder(w).Encode(user)
}

// Middleware wrapper for error handling
func (s *Server) wrap(fn func(http.ResponseWriter, *http.Request) error) http.HandlerFunc {
  return func(w http.ResponseWriter, r *http.Request) {
    if err := fn(w, r); err != nil {
      s.handleError(w, err)
    }
  }
}

// Register with mux
mux.HandleFunc("GET /users/{id}", s.wrap(s.GetUser))
```

## Context Usage

### Pass Context Properly

```go
// Good: Context flows through the call chain
func (s *Server) ListUsers(w http.ResponseWriter, r *http.Request) error {
  users, err := s.db.ListUsers(r.Context())  // Pass request context
  if err != nil {
    return fmt.Errorf("listing users: %w", err)
  }
  
  return json.NewEncoder(w).Encode(users)
}

// Database layer also respects context
func (db *DB) ListUsers(ctx context.Context) ([]User, error) {
  // Check if context is cancelled before querying
  select {
  case <-ctx.Done():
    return nil, ctx.Err()
  default:
  }
  
  // Query with context timeout
  return db.queryWithContext(ctx, "SELECT * FROM users")
}
```

### Timeout Patterns

```go
// Good: Set timeout for operations
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

user, err := s.fetchUser(ctx, userID)
```

## Testing

### Table-Driven Tests

```go
func TestValidateUser(t *testing.T) {
  tests := []struct {
    name      string
    user      User
    wantError bool
    errMsg    string
  }{
    {
      name: "valid user",
      user: User{Name: "Alice", Email: "alice@example.com"},
      wantError: false,
    },
    {
      name:      "empty name",
      user:      User{Email: "bob@example.com"},
      wantError: true,
      errMsg:    "name required",
    },
  }
  
  for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
      err := ValidateUser(tt.user)
      
      if (err != nil) != tt.wantError {
        t.Errorf("got error %v, want error %v", err != nil, tt.wantError)
      }
      
      if tt.wantError && tt.errMsg != "" && err.Error() != tt.errMsg {
        t.Errorf("got %q, want %q", err.Error(), tt.errMsg)
      }
    })
  }
}
```

### Mock Interfaces

```go
type MockDB struct {
  GetUserFunc func(ctx context.Context, id string) (*User, error)
}

func (m *MockDB) GetUser(ctx context.Context, id string) (*User, error) {
  return m.GetUserFunc(ctx, id)
}

// Usage in test
t.Run("user not found", func(t *testing.T) {
  mockDB := &MockDB{
    GetUserFunc: func(ctx context.Context, id string) (*User, error) {
      return nil, sql.ErrNoRows
    },
  }
  
  _, err := GetUser(mockDB, "123")
  if err == nil {
    t.Fatal("expected error")
  }
})
```

## Naming Conventions

- **Packages**: lowercase, short, one word when possible
  - ✅ `handlers`, `models`, `database`
  - ❌ `HandlersPackage`, `modelsAndTypes`

- **Functions**: CamelCase, descriptive
  - ✅ `GetUser()`, `FetchUserWithPosts()`
  - ❌ `get_user()`, `Get()`

- **Variables**: CamelCase for exported, camelCase for unexported
  - ✅ `var DefaultTimeout time.Duration`
  - ✅ `var logLevel int`

- **Constants**: UPPER_CASE or CamelCase for exported
  - ✅ `const MaxRetries = 3`
  - ✅ `const DEFAULT_PORT = 8080`

## Common Issues to Catch When Reviewing

1. **Unchecked errors** - Every error should be handled
2. **Goroutine leaks** - Goroutines should have exit conditions
3. **Race conditions** - Concurrent map/slice access needs sync
4. **Nil pointer dereference** - Check for nil before dereferencing
5. **Resource leaks** - File/DB connections should be closed
6. **No defer** - Cleanup should use defer
7. **Missing context propagation** - Context should flow through calls
8. **Large interfaces** - Break into smaller, focused interfaces
9. **Panic recovery** - Critical sections should recover from panic
10. **No logging** - Errors should be logged with context

## Gofmt and Tools

Go code is automatically formatted with `gofmt`. Code review should check:
- `gofmt -w .` - Format all files
- `go vet ./...` - Check for common errors
- `golangci-lint run` - If configured

All formatting should pass these checks before review.
