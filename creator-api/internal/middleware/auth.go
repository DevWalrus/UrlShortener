package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/DevWalrus/UrlShortener/creator-api/internal/db"
)

type contextKey string

const UserContextKey contextKey = "user"

// UserFinder is the data access interface required by the auth middleware.
type UserFinder interface {
	FindByToken(ctx context.Context, token string) (*db.User, error)
}

func RequireUserToken(store UserFinder) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := r.Header.Get("X-API-Key")
			if token == "" {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
			defer cancel()

			user, err := store.FindByToken(ctx, token)
			if err != nil {
				http.Error(w, "internal server error", http.StatusInternalServerError)
				return
			}
			if user == nil {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			// Attach user to context so handlers can access it for logging later
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), UserContextKey, user)))
		})
	}
}

// Helper to pull user out of context in handlers
func UserFromContext(ctx context.Context) *db.User {
	user, _ := ctx.Value(UserContextKey).(*db.User)
	return user
}
