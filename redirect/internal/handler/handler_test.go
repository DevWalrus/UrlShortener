package handler_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/DevWalrus/UrlShortener/redirect/internal/cache"
	"github.com/DevWalrus/UrlShortener/redirect/internal/db"
	"github.com/DevWalrus/UrlShortener/redirect/internal/handler"
	"github.com/go-chi/chi/v5"
)

// mockStore satisfies handler.Store without a real MongoDB connection.
type mockStore struct {
	findBySlugFn        func(ctx context.Context, slug string) (*db.Link, error)
	incrementHitCountFn func(ctx context.Context, slug string)
}

func (m *mockStore) FindBySlug(ctx context.Context, slug string) (*db.Link, error) {
	return m.findBySlugFn(ctx, slug)
}

func (m *mockStore) IncrementHitCount(ctx context.Context, slug string) {
	if m.incrementHitCountFn != nil {
		m.incrementHitCountFn(ctx, slug)
	}
}

func newHandler(store handler.Store, pingErr error) *handler.Handler {
	c := cache.New(5*time.Minute, 10*time.Minute)
	return handler.New(store, c, func(_ context.Context) error { return pingErr })
}

// newRedirectRequest creates a request with the chi route context set so
// handler code can call chi.URLParam(r, "slug").
func newRedirectRequest(slug string) *http.Request {
	r := httptest.NewRequest(http.MethodGet, "/"+slug, nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("slug", slug)
	return r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
}

// --- HandleHealth ---

func TestHandleHealth_OK(t *testing.T) {
	h := newHandler(nil, nil)
	w := httptest.NewRecorder()
	h.HandleHealth(w, httptest.NewRequest(http.MethodGet, "/health", nil))

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if body := w.Body.String(); body != "ok" {
		t.Errorf("expected body %q, got %q", "ok", body)
	}
}

func TestHandleHealth_DBUnavailable(t *testing.T) {
	h := newHandler(nil, errors.New("connection refused"))
	w := httptest.NewRecorder()
	h.HandleHealth(w, httptest.NewRequest(http.MethodGet, "/health", nil))

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
}

// --- HandleRedirect ---

func TestHandleRedirect_CacheHit_Destination(t *testing.T) {
	store := &mockStore{
		findBySlugFn: func(_ context.Context, _ string) (*db.Link, error) {
			t.Fatal("DB should not be called on cache hit")
			return nil, nil
		},
	}
	c := cache.New(5*time.Minute, 10*time.Minute)
	c.Set("ABC1234", "https://example.com")
	h := handler.New(store, c, func(_ context.Context) error { return nil })

	w := httptest.NewRecorder()
	h.HandleRedirect(w, newRedirectRequest("ABC1234"))

	if w.Code != http.StatusFound {
		t.Errorf("expected 302, got %d", w.Code)
	}
	if loc := w.Header().Get("Location"); loc != "https://example.com" {
		t.Errorf("expected redirect to %q, got %q", "https://example.com", loc)
	}
}

func TestHandleRedirect_CacheHit_Miss(t *testing.T) {
	store := &mockStore{
		findBySlugFn: func(_ context.Context, _ string) (*db.Link, error) {
			t.Fatal("DB should not be called on cached miss")
			return nil, nil
		},
	}
	c := cache.New(5*time.Minute, 10*time.Minute)
	c.SetMiss("GONE123")
	h := handler.New(store, c, func(_ context.Context) error { return nil })

	w := httptest.NewRecorder()
	h.HandleRedirect(w, newRedirectRequest("GONE123"))

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestHandleRedirect_DBHit_Redirects(t *testing.T) {
	incremented := false
	store := &mockStore{
		findBySlugFn: func(_ context.Context, slug string) (*db.Link, error) {
			return &db.Link{Slug: slug, Destination: "https://example.com"}, nil
		},
		incrementHitCountFn: func(_ context.Context, _ string) {
			incremented = true
		},
	}
	h := newHandler(store, nil)

	w := httptest.NewRecorder()
	h.HandleRedirect(w, newRedirectRequest("ABC1234"))

	if w.Code != http.StatusFound {
		t.Errorf("expected 302, got %d", w.Code)
	}
	if loc := w.Header().Get("Location"); loc != "https://example.com" {
		t.Errorf("expected redirect to %q, got %q", "https://example.com", loc)
	}
	if !incremented {
		t.Error("expected IncrementHitCount to be called")
	}
}

func TestHandleRedirect_DBMiss_NotFound(t *testing.T) {
	store := &mockStore{
		findBySlugFn: func(_ context.Context, _ string) (*db.Link, error) {
			return nil, nil
		},
	}
	h := newHandler(store, nil)

	w := httptest.NewRecorder()
	h.HandleRedirect(w, newRedirectRequest("NOTEXIST"))

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestHandleRedirect_DBError_InternalServerError(t *testing.T) {
	store := &mockStore{
		findBySlugFn: func(_ context.Context, _ string) (*db.Link, error) {
			return nil, errors.New("mongo timeout")
		},
	}
	h := newHandler(store, nil)

	w := httptest.NewRecorder()
	h.HandleRedirect(w, newRedirectRequest("ABC1234"))

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

func TestHandleRedirect_SlugNormalizedToUppercase(t *testing.T) {
	var receivedSlug string
	store := &mockStore{
		findBySlugFn: func(_ context.Context, slug string) (*db.Link, error) {
			receivedSlug = slug
			return nil, nil
		},
	}
	h := newHandler(store, nil)

	h.HandleRedirect(httptest.NewRecorder(), newRedirectRequest("abc1234"))

	if receivedSlug != "ABC1234" {
		t.Errorf("expected slug normalized to %q, got %q", "ABC1234", receivedSlug)
	}
}

func TestHandleRedirect_NotFound_EscapesSlugInHTML(t *testing.T) {
	store := &mockStore{
		findBySlugFn: func(_ context.Context, _ string) (*db.Link, error) {
			return nil, nil
		},
	}
	h := newHandler(store, nil)

	w := httptest.NewRecorder()
	h.HandleRedirect(w, newRedirectRequest("<script>"))

	body := w.Body.String()
	if strings.Contains(body, "<script>") {
		t.Error("response body contains unescaped <script> tag — XSS risk")
	}
	if !strings.Contains(body, "&lt;script&gt;") {
		t.Error("expected HTML-escaped slug in 404 body")
	}
}

func TestHandleRedirect_DBHit_SetsCache(t *testing.T) {
	callCount := 0
	store := &mockStore{
		findBySlugFn: func(_ context.Context, slug string) (*db.Link, error) {
			callCount++
			return &db.Link{Slug: slug, Destination: "https://example.com"}, nil
		},
		incrementHitCountFn: func(_ context.Context, _ string) {},
	}
	c := cache.New(5*time.Minute, 10*time.Minute)
	h := handler.New(store, c, func(_ context.Context) error { return nil })

	// First request — DB hit, populates cache
	h.HandleRedirect(httptest.NewRecorder(), newRedirectRequest("ABC1234"))
	// Second request — should be served from cache, DB not called again
	h.HandleRedirect(httptest.NewRecorder(), newRedirectRequest("ABC1234"))

	if callCount != 1 {
		t.Errorf("expected DB to be called once, was called %d times", callCount)
	}
}
