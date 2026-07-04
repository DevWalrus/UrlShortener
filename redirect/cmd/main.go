package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/DevWalrus/UrlShortener/redirect/internal/cache"
	"github.com/DevWalrus/UrlShortener/redirect/internal/db"
	"github.com/DevWalrus/UrlShortener/redirect/internal/handler"
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

	store := db.NewLinkStore(mongoClient, dbName, "links")
	linkCache := cache.New(5*time.Minute, 10*time.Minute)
	h := handler.New(store, linkCache, func(ctx context.Context) error {
		return db.Ping(ctx, mongoClient)
	})

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/health", h.HandleHealth)

	r.Get("/{slug}", h.HandleRedirect)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("starting server on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
