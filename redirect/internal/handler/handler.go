package handler

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/DevWalrus/UrlShortener/redirect/internal/cache"
	"github.com/DevWalrus/UrlShortener/redirect/internal/db"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	store       *db.LinkStore
	cache       *cache.Cache
	notFoundURL string
}

func New(store *db.LinkStore, cache *cache.Cache) *Handler {
	notFoundURL := os.Getenv("NOT_FOUND_URL")
	if notFoundURL == "" {
		notFoundURL = "https://create.clinten.dev/404"
	}
	return &Handler{store: store, cache: cache, notFoundURL: notFoundURL}
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
	http.Redirect(w, r, h.notFoundURL+"?slug="+chi.URLParam(r, "slug"), http.StatusFound)
}
