package slug_test

import (
	"strings"
	"testing"

	"github.com/DevWalrus/UrlShortener/creator-api/internal/slug"
)

// --- IsValid ---

func TestIsValid(t *testing.T) {
	cases := []struct {
		input string
		want  bool
	}{
		{"ABC1234", true},
		{"AAAAAAA", true},
		{"0000000", true},
		{"A1B2C3D", true},
		{"", true},  // empty passes character check; length 0 <= 7
		{"ABCDEFG", true},
		{"ABCDEFGH", false}, // 8 chars — too long
		{"abc1234", false},  // lowercase not allowed
		{"ABC-123", false},  // hyphen not allowed
		{"ABC 123", false},  // space not allowed
		{"ABC!234", false},  // special char not allowed
	}

	for _, tc := range cases {
		got := slug.IsValid(tc.input)
		if got != tc.want {
			t.Errorf("IsValid(%q) = %v, want %v", tc.input, got, tc.want)
		}
	}
}

// --- Generate ---

func TestGenerate_Length(t *testing.T) {
	s, err := slug.Generate()
	if err != nil {
		t.Fatalf("Generate() error: %v", err)
	}
	if len(s) != 7 {
		t.Errorf("expected length 7, got %d (%q)", len(s), s)
	}
}

func TestGenerate_OnlyUppercaseAlphanumeric(t *testing.T) {
	const allowed = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	for range 20 {
		s, err := slug.Generate()
		if err != nil {
			t.Fatalf("Generate() error: %v", err)
		}
		for _, ch := range s {
			if !strings.ContainsRune(allowed, ch) {
				t.Errorf("Generate() returned char %q not in alphabet (slug: %q)", ch, s)
			}
		}
	}
}

func TestGenerate_IsValidOutput(t *testing.T) {
	for range 20 {
		s, err := slug.Generate()
		if err != nil {
			t.Fatalf("Generate() error: %v", err)
		}
		if !slug.IsValid(s) {
			t.Errorf("Generate() produced invalid slug %q", s)
		}
	}
}

func TestGenerate_ProducesVariedOutput(t *testing.T) {
	seen := make(map[string]bool)
	for range 50 {
		s, err := slug.Generate()
		if err != nil {
			t.Fatalf("Generate() error: %v", err)
		}
		seen[s] = true
	}
	// With 36^7 ≈ 78 billion possibilities, 50 calls should give at least 40 unique values.
	if len(seen) < 40 {
		t.Errorf("Generate() produced only %d unique values in 50 calls — likely not random", len(seen))
	}
}
