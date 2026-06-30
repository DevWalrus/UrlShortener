package middleware

import (
	"net/http"
	"os"
)

func RequireAPIKey(next http.Handler) http.Handler {
	expectedKey := os.Getenv("API_KEY")

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		providedKey := r.Header.Get("X-API-Key")

		if expectedKey == "" || providedKey != expectedKey {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}
