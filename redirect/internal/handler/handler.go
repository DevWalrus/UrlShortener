package handler

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/DevWalrus/UrlShortener/redirect/internal/cache"
	"github.com/DevWalrus/UrlShortener/redirect/internal/db"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	store *db.LinkStore
	cache *cache.Cache
}

func New(store *db.LinkStore, cache *cache.Cache) *Handler {
	return &Handler{store: store, cache: cache}
}

func (h *Handler) HandleRedirect(w http.ResponseWriter, r *http.Request) {
	slug := strings.ToUpper(chi.URLParam(r, "slug"))

	// Check cache first
	if dest, found := h.cache.Get(slug); found {
		if dest == "" {
			// Cached miss
			h.renderNotFound(w)
			return
		}
		h.store.IncrementHitCount(r.Context(), slug)
		http.Redirect(w, r, dest, http.StatusFound)
		return
	}

	// Cache miss - hit the DB
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	link, err := h.store.FindBySlug(ctx, slug)
	if err != nil {
		log.Printf("error looking up slug %s: %v", slug, err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	if link == nil {
		h.cache.SetMiss(slug)
		h.renderNotFound(w)
		return
	}

	h.cache.Set(slug, link.Destination)
	h.store.IncrementHitCount(r.Context(), slug)
	http.Redirect(w, r, link.Destination, http.StatusFound)
}

func (h *Handler) renderNotFound(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNotFound)
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(`<!DOCTYPE html>
<html>
  <head><title>Not Found</title></head>
  <body>
    <h1>Link not found</h1>
    <p>This short link doesn't exist or has expired.</p>
    <a href="https://clinten.dev">clinten.dev</a>
  </body>
</html>`))
}
