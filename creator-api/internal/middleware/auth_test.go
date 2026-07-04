package middleware_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DevWalrus/UrlShortener/creator-api/internal/db"
	"github.com/DevWalrus/UrlShortener/creator-api/internal/middleware"
)

type mockUserFinder struct {
	findByTokenFn func(ctx context.Context, token string) (*db.User, error)
}

func (m *mockUserFinder) FindByToken(ctx context.Context, token string) (*db.User, error) {
	return m.findByTokenFn(ctx, token)
}

var validUser = &db.User{Email: "user@example.com", APIToken: "tok_abc123"}

func nextHandler(t *testing.T, wantCalled bool) http.Handler {
	called := false
	t.Cleanup(func() {
		if wantCalled && !called {
			t.Error("expected next handler to be called, but it was not")
		}
		if !wantCalled && called {
			t.Error("expected next handler NOT to be called, but it was")
		}
	})
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})
}

func applyMiddleware(store middleware.UserFinder, next http.Handler, token string) *httptest.ResponseRecorder {
	mw := middleware.RequireUserToken(store)
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	if token != "" {
		r.Header.Set("X-API-Key", token)
	}
	w := httptest.NewRecorder()
	mw(next).ServeHTTP(w, r)
	return w
}

func TestRequireUserToken_MissingToken(t *testing.T) {
	store := &mockUserFinder{
		findByTokenFn: func(_ context.Context, _ string) (*db.User, error) {
			t.Fatal("DB should not be called when token is missing")
			return nil, nil
		},
	}
	w := applyMiddleware(store, nextHandler(t, false), "")
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRequireUserToken_DBError(t *testing.T) {
	store := &mockUserFinder{
		findByTokenFn: func(_ context.Context, _ string) (*db.User, error) {
			return nil, errors.New("connection failed")
		},
	}
	w := applyMiddleware(store, nextHandler(t, false), "some-token")
	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

func TestRequireUserToken_TokenNotFound(t *testing.T) {
	store := &mockUserFinder{
		findByTokenFn: func(_ context.Context, _ string) (*db.User, error) {
			return nil, nil
		},
	}
	w := applyMiddleware(store, nextHandler(t, false), "unknown-token")
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRequireUserToken_ValidToken_CallsNext(t *testing.T) {
	store := &mockUserFinder{
		findByTokenFn: func(_ context.Context, _ string) (*db.User, error) {
			return validUser, nil
		},
	}
	w := applyMiddleware(store, nextHandler(t, true), "tok_abc123")
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestRequireUserToken_ValidToken_SetsUserInContext(t *testing.T) {
	store := &mockUserFinder{
		findByTokenFn: func(_ context.Context, _ string) (*db.User, error) {
			return validUser, nil
		},
	}

	var gotUser *db.User
	next := http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		gotUser = middleware.UserFromContext(r.Context())
	})

	mw := middleware.RequireUserToken(store)
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Header.Set("X-API-Key", "tok_abc123")
	mw(next).ServeHTTP(httptest.NewRecorder(), r)

	if gotUser == nil || gotUser.Email != validUser.Email {
		t.Errorf("expected user %v in context, got %v", validUser, gotUser)
	}
}
