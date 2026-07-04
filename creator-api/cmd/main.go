package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/DevWalrus/UrlShortener/creator-api/internal/db"
	"github.com/DevWalrus/UrlShortener/creator-api/internal/handler"
	customMiddleware "github.com/DevWalrus/UrlShortener/creator-api/internal/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load(".env.local")

	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Fatal("MONGODB_URI environment variable is required")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoClient, err := db.Connect(ctx, mongoURI)
	if err != nil {
		log.Fatalf("failed to connect to mongodb: %v", err)
	}
	defer mongoClient.Disconnect(context.Background())

	dbName := os.Getenv("MONGODB_DB")
	if dbName == "" {
		dbName = "clintendev"
	}

	userStore := db.NewUserStore(mongoClient, dbName)
	linkStore := db.NewLinkStore(mongoClient, dbName, "links")
	h := handler.New(linkStore, func(ctx context.Context) error {
		return db.Ping(ctx, mongoClient)
	})

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	allowedOrigins := map[string]bool{
		"https://create.clinten.dev": true,
	}

	if dev := os.Getenv("CORS_ORIGIN_DEV"); dev != "" {
		allowedOrigins[dev] = true
	}

	// CORS for create.clinten.dev calling this API
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if allowedOrigins[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-API-Key")
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}
			next.ServeHTTP(w, r)
		})
	})

	r.Get("/health", h.HandleHealth)

	r.Route("/links", func(r chi.Router) {
		r.Use(customMiddleware.RequireUserToken(userStore))
		r.Post("/", h.HandleCreate)
		r.Get("/", h.HandleList)
		r.Get("/deleted", h.HandleListDeleted)
		r.Delete("/{slug}", h.HandleDelete)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("starting server on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
