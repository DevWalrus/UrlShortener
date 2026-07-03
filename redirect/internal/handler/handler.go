package handler

import (
	"context"
	"fmt"
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
			h.renderNotFound(w, r)
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
		h.renderNotFound(w, r)
		return
	}

	h.cache.Set(slug, link.Destination)
	h.store.IncrementHitCount(r.Context(), slug)
	http.Redirect(w, r, link.Destination, http.StatusFound)
}

func (h *Handler) renderNotFound(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusNotFound)
	fmt.Fprintf(w, `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>404 – Link Not Found</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 4rem 1rem; color: #333; }
    h1 { font-size: 6rem; font-weight: 700; color: #999; margin: 0; }
    h2 { font-size: 1.5rem; margin: 0.5rem 0 1rem; }
    p { color: #666; }
  </style>
</head>
<body>
  <h1>404</h1>
  <h2>Link not found</h2>
  <p>The link <strong>%s</strong> doesn't exist or has been deleted.</p>
</body>
</html>`, slug)
}
