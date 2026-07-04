package cache_test

import (
	"testing"
	"time"

	"github.com/DevWalrus/UrlShortener/redirect/internal/cache"
)

func newCache() *cache.Cache {
	return cache.New(5*time.Minute, 10*time.Minute)
}

func TestGet_Miss(t *testing.T) {
	c := newCache()
	_, found := c.Get("NOTEXIST")
	if found {
		t.Fatal("expected cache miss, got hit")
	}
}

func TestSet_ThenGet(t *testing.T) {
	c := newCache()
	c.Set("ABC1234", "https://example.com")

	val, found := c.Get("ABC1234")
	if !found {
		t.Fatal("expected cache hit after Set")
	}
	if val != "https://example.com" {
		t.Fatalf("expected %q, got %q", "https://example.com", val)
	}
}

func TestSetMiss_ReturnsCachedMiss(t *testing.T) {
	c := newCache()
	c.SetMiss("GONE123")

	val, found := c.Get("GONE123")
	if !found {
		t.Fatal("expected SetMiss to be findable via Get")
	}
	if val != "" {
		t.Fatalf("expected empty string for cached miss, got %q", val)
	}
}

func TestSet_OverwritesExisting(t *testing.T) {
	c := newCache()
	c.Set("ABC1234", "https://old.com")
	c.Set("ABC1234", "https://new.com")

	val, found := c.Get("ABC1234")
	if !found {
		t.Fatal("expected cache hit")
	}
	if val != "https://new.com" {
		t.Fatalf("expected %q, got %q", "https://new.com", val)
	}
}

func TestGet_DifferentKeys_Independent(t *testing.T) {
	c := newCache()
	c.Set("KEY1", "https://one.com")
	c.Set("KEY2", "https://two.com")

	v1, _ := c.Get("KEY1")
	v2, _ := c.Get("KEY2")

	if v1 != "https://one.com" {
		t.Errorf("KEY1: expected %q, got %q", "https://one.com", v1)
	}
	if v2 != "https://two.com" {
		t.Errorf("KEY2: expected %q, got %q", "https://two.com", v2)
	}
}
