package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/DevWalrus/UrlShortener/creator-api/internal/db"
	"github.com/DevWalrus/UrlShortener/creator-api/internal/slug"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	store *db.LinkStore
}

func New(store *db.LinkStore) *Handler {
	return &Handler{store: store}
}

type createRequest struct {
	Destination string `json:"destination"`
	CustomSlug  string `json:"customSlug,omitempty"`
}

type createResponse struct {
	Slug        string `json:"slug"`
	Destination string `json:"destination"`
	ShortURL    string `json:"shortUrl"`
}

func (h *Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Destination == "" {
		http.Error(w, "destination is required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var finalSlug string

	if req.CustomSlug != "" {
		finalSlug = strings.ToUpper(req.CustomSlug)
		exists, err := h.store.Exists(ctx, finalSlug)
		if err != nil {
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}
		if exists {
			http.Error(w, "slug already taken", http.StatusConflict)
			return
		}
	} else {
		// Generate with collision retry
		for attempts := 0; attempts < 5; attempts++ {
			candidate, err := slug.Generate()
			if err != nil {
				http.Error(w, "internal server error", http.StatusInternalServerError)
				return
			}
			exists, err := h.store.Exists(ctx, candidate)
			if err != nil {
				http.Error(w, "internal server error", http.StatusInternalServerError)
				return
			}
			if !exists {
				finalSlug = candidate
				break
			}
		}
		if finalSlug == "" {
			http.Error(w, "failed to generate unique slug, try again", http.StatusInternalServerError)
			return
		}
	}

	link := &db.Link{
		Slug:        finalSlug,
		Destination: req.Destination,
	}

	if err := h.store.Create(ctx, link); err != nil {
		if err == db.ErrSlugExists {
			http.Error(w, "slug already taken", http.StatusConflict)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	resp := createResponse{
		Slug:        finalSlug,
		Destination: req.Destination,
		ShortURL:    "https://clinten.dev/" + finalSlug,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	links, err := h.store.List(ctx)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(links)
}

func (h *Handler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	slugParam := strings.ToUpper(chi.URLParam(r, "slug"))

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	if err := h.store.Delete(ctx, slugParam); err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) HandleListDeleted(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	links, err := h.store.ListDeleted(ctx)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(links)
}
