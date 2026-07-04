package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/DevWalrus/UrlShortener/creator-api/internal/db"
	"github.com/DevWalrus/UrlShortener/creator-api/internal/handler"
	"github.com/go-chi/chi/v5"
)

// mockStore satisfies handler.Store without a real MongoDB connection.
type mockStore struct {
	createFn      func(ctx context.Context, link *db.Link) error
	listFn        func(ctx context.Context) ([]db.Link, error)
	listDeletedFn func(ctx context.Context) ([]db.Link, error)
	deleteFn      func(ctx context.Context, slug string) error
	existsFn      func(ctx context.Context, slug string) (bool, error)
}

func (m *mockStore) Create(ctx context.Context, link *db.Link) error {
	return m.createFn(ctx, link)
}
func (m *mockStore) List(ctx context.Context) ([]db.Link, error) { return m.listFn(ctx) }
func (m *mockStore) ListDeleted(ctx context.Context) ([]db.Link, error) {
	return m.listDeletedFn(ctx)
}
func (m *mockStore) Delete(ctx context.Context, slug string) error { return m.deleteFn(ctx, slug) }
func (m *mockStore) Exists(ctx context.Context, slug string) (bool, error) {
	return m.existsFn(ctx, slug)
}

func newHandler(store handler.Store, pingErr error) *handler.Handler {
	return handler.New(store, func(_ context.Context) error { return pingErr })
}

func jsonBody(v any) *bytes.Buffer {
	b, _ := json.Marshal(v)
	return bytes.NewBuffer(b)
}

func newSlugRequest(method, slug string) *http.Request {
	r := httptest.NewRequest(method, "/links/"+slug, nil)
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
}

func TestHandleHealth_DBUnavailable(t *testing.T) {
	h := newHandler(nil, errors.New("timeout"))
	w := httptest.NewRecorder()
	h.HandleHealth(w, httptest.NewRequest(http.MethodGet, "/health", nil))
	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
}

// --- HandleCreate ---

func TestHandleCreate_InvalidJSON(t *testing.T) {
	h := newHandler(nil, nil)
	w := httptest.NewRecorder()
	h.HandleCreate(w, httptest.NewRequest(http.MethodPost, "/links", strings.NewReader("not-json")))
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestHandleCreate_MissingDestination(t *testing.T) {
	h := newHandler(nil, nil)
	w := httptest.NewRecorder()
	h.HandleCreate(w, httptest.NewRequest(http.MethodPost, "/links", jsonBody(map[string]string{})))
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestHandleCreate_InvalidURLScheme(t *testing.T) {
	cases := []string{"ftp://example.com", "javascript:alert(1)", "example.com"}
	for _, dest := range cases {
		h := newHandler(nil, nil)
		w := httptest.NewRecorder()
		h.HandleCreate(w, httptest.NewRequest(http.MethodPost, "/links",
			jsonBody(map[string]string{"destination": dest})))
		if w.Code != http.StatusBadRequest {
			t.Errorf("destination %q: expected 400, got %d", dest, w.Code)
		}
	}
}

func TestHandleCreate_CustomSlug_TooLong(t *testing.T) {
	h := newHandler(nil, nil)
	w := httptest.NewRecorder()
	h.HandleCreate(w, httptest.NewRequest(http.MethodPost, "/links",
		jsonBody(map[string]string{"destination": "https://example.com", "customSlug": "ABCDEFGH"})))
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestHandleCreate_CustomSlug_InvalidChars(t *testing.T) {
	h := newHandler(nil, nil)
	w := httptest.NewRecorder()
	h.HandleCreate(w, httptest.NewRequest(http.MethodPost, "/links",
		jsonBody(map[string]string{"destination": "https://example.com", "customSlug": "ABC-123"})))
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestHandleCreate_CustomSlug_AlreadyExists(t *testing.T) {
	store := &mockStore{
		existsFn: func(_ context.Context, _ string) (bool, error) { return true, nil },
	}
	h := newHandler(store, nil)
	w := httptest.NewRecorder()
	h.HandleCreate(w, httptest.NewRequest(http.MethodPost, "/links",
		jsonBody(map[string]string{"destination": "https://example.com", "customSlug": "ABC1234"})))
	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w.Code)
	}
}

func TestHandleCreate_CustomSlug_ExistsDBError(t *testing.T) {
	store := &mockStore{
		existsFn: func(_ context.Context, _ string) (bool, error) {
			return false, errors.New("db error")
		},
	}
	h := newHandler(store, nil)
	w := httptest.NewRecorder()
	h.HandleCreate(w, httptest.NewRequest(http.MethodPost, "/links",
		jsonBody(map[string]string{"destination": "https://example.com", "customSlug": "ABC1234"})))
	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

func TestHandleCreate_CustomSlug_CreateDBError(t *testing.T) {
	store := &mockStore{
		existsFn: func(_ context.Context, _ string) (bool, error) { return false, nil },
		createFn: func(_ context.Context, _ *db.Link) error { return errors.New("db error") },
	}
	h := newHandler(store, nil)
	w := httptest.NewRecorder()
	h.HandleCreate(w, httptest.NewRequest(http.MethodPost, "/links",
		jsonBody(map[string]string{"destination": "https://example.com", "customSlug": "ABC1234"})))
	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

func TestHandleCreate_CustomSlug_ErrSlugExists(t *testing.T) {
	store := &mockStore{
		existsFn: func(_ context.Context, _ string) (bool, error) { return false, nil },
		createFn: func(_ context.Context, _ *db.Link) error { return db.ErrSlugExists },
	}
	h := newHandler(store, nil)
	w := httptest.NewRecorder()
	h.HandleCreate(w, httptest.NewRequest(http.MethodPost, "/links",
		jsonBody(map[string]string{"destination": "https://example.com", "customSlug": "ABC1234"})))
	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w.Code)
	}
}

func TestHandleCreate_CustomSlug_Success(t *testing.T) {
	store := &mockStore{
		existsFn: func(_ context.Context, _ string) (bool, error) { return false, nil },
		createFn: func(_ context.Context, _ *db.Link) error { return nil },
	}
	h := newHandler(store, nil)
	w := httptest.NewRecorder()
	h.HandleCreate(w, httptest.NewRequest(http.MethodPost, "/links",
		jsonBody(map[string]string{"destination": "https://example.com", "customSlug": "abc1234"})))

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", w.Code)
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	// Custom slug is uppercased
	if resp["slug"] != "ABC1234" {
		t.Errorf("expected slug %q, got %q", "ABC1234", resp["slug"])
	}
	if resp["shortUrl"] != "https://clinten.dev/ABC1234" {
		t.Errorf("unexpected shortUrl %q", resp["shortUrl"])
	}
}

func TestHandleCreate_AutoSlug_Success(t *testing.T) {
	store := &mockStore{
		existsFn: func(_ context.Context, _ string) (bool, error) { return false, nil },
		createFn: func(_ context.Context, _ *db.Link) error { return nil },
	}
	h := newHandler(store, nil)
	w := httptest.NewRecorder()
	h.HandleCreate(w, httptest.NewRequest(http.MethodPost, "/links",
		jsonBody(map[string]string{"destination": "https://example.com"})))

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", w.Code)
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if len(resp["slug"]) != 7 {
		t.Errorf("expected 7-char slug, got %q", resp["slug"])
	}
}

func TestHandleCreate_AutoSlug_ExistsCheckDBError(t *testing.T) {
	store := &mockStore{
		existsFn: func(_ context.Context, _ string) (bool, error) {
			return false, errors.New("db error")
		},
	}
	h := newHandler(store, nil)
	w := httptest.NewRecorder()
	h.HandleCreate(w, httptest.NewRequest(http.MethodPost, "/links",
		jsonBody(map[string]string{"destination": "https://example.com"})))
	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

func TestHandleCreate_AutoSlug_AllCollisions(t *testing.T) {
	// Exists always returns true → all 5 attempts collide → 500
	store := &mockStore{
		existsFn: func(_ context.Context, _ string) (bool, error) { return true, nil },
	}
	h := newHandler(store, nil)
	w := httptest.NewRecorder()
	h.HandleCreate(w, httptest.NewRequest(http.MethodPost, "/links",
		jsonBody(map[string]string{"destination": "https://example.com"})))
	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

// --- HandleList ---

func TestHandleList_Success(t *testing.T) {
	links := []db.Link{{Slug: "ABC1234", Destination: "https://example.com"}}
	store := &mockStore{
		listFn: func(_ context.Context) ([]db.Link, error) { return links, nil },
	}
	h := newHandler(store, nil)
	w := httptest.NewRecorder()
	h.HandleList(w, httptest.NewRequest(http.MethodGet, "/links", nil))

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	var got []db.Link
	json.NewDecoder(w.Body).Decode(&got)
	if len(got) != 1 || got[0].Slug != "ABC1234" {
		t.Errorf("unexpected response body: %v", got)
	}
}

func TestHandleList_DBError(t *testing.T) {
	store := &mockStore{
		listFn: func(_ context.Context) ([]db.Link, error) {
			return nil, errors.New("db error")
		},
	}
	h := newHandler(store, nil)
	w := httptest.NewRecorder()
	h.HandleList(w, httptest.NewRequest(http.MethodGet, "/links", nil))
	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

// --- HandleListDeleted ---

func TestHandleListDeleted_Success(t *testing.T) {
	store := &mockStore{
		listDeletedFn: func(_ context.Context) ([]db.Link, error) { return []db.Link{}, nil },
	}
	h := newHandler(store, nil)
	w := httptest.NewRecorder()
	h.HandleListDeleted(w, httptest.NewRequest(http.MethodGet, "/links/deleted", nil))
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestHandleListDeleted_DBError(t *testing.T) {
	store := &mockStore{
		listDeletedFn: func(_ context.Context) ([]db.Link, error) {
			return nil, errors.New("db error")
		},
	}
	h := newHandler(store, nil)
	w := httptest.NewRecorder()
	h.HandleListDeleted(w, httptest.NewRequest(http.MethodGet, "/links/deleted", nil))
	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

// --- HandleDelete ---

func TestHandleDelete_Success(t *testing.T) {
	store := &mockStore{
		deleteFn: func(_ context.Context, _ string) error { return nil },
	}
	h := newHandler(store, nil)
	w := httptest.NewRecorder()
	h.HandleDelete(w, newSlugRequest(http.MethodDelete, "ABC1234"))
	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}
}

func TestHandleDelete_DBError(t *testing.T) {
	store := &mockStore{
		deleteFn: func(_ context.Context, _ string) error { return errors.New("db error") },
	}
	h := newHandler(store, nil)
	w := httptest.NewRecorder()
	h.HandleDelete(w, newSlugRequest(http.MethodDelete, "ABC1234"))
	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

func TestHandleDelete_SlugNormalizedToUppercase(t *testing.T) {
	var receivedSlug string
	store := &mockStore{
		deleteFn: func(_ context.Context, slug string) error {
			receivedSlug = slug
			return nil
		},
	}
	h := newHandler(store, nil)
	h.HandleDelete(httptest.NewRecorder(), newSlugRequest(http.MethodDelete, "abc1234"))
	if receivedSlug != "ABC1234" {
		t.Errorf("expected slug %q, got %q", "ABC1234", receivedSlug)
	}
}
