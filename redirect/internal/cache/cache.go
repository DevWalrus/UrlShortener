package cache

import (
	"time"

	gocache "github.com/patrickmn/go-cache"
)

type Cache struct {
	c *gocache.Cache
}

func New(defaultExpiration, cleanupInterval time.Duration) *Cache {
	return &Cache{
		c: gocache.New(defaultExpiration, cleanupInterval),
	}
}

func (c *Cache) Get(key string) (string, bool) {
	val, found := c.c.Get(key)
	if !found {
		return "", false
	}
	return val.(string), true
}

func (c *Cache) Set(key, value string) {
	c.c.SetDefault(key, value)
}

func (c *Cache) SetMiss(key string) {
	// Cache misses too so we don't hammer the DB for unknown slugs
	c.c.Set(key, "", 1*time.Minute)
}
