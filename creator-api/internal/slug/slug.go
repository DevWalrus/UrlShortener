package slug

import (
	"crypto/rand"
	"math/big"
)

const (
	alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	length   = 7
)

// Generate creates a random 7-character base36 uppercase slug.
func Generate() (string, error) {
	result := make([]byte, length)
	alphabetLen := big.NewInt(int64(len(alphabet)))

	for i := range result {
		n, err := rand.Int(rand.Reader, alphabetLen)
		if err != nil {
			return "", err
		}
		result[i] = alphabet[n.Int64()]
	}

	return string(result), nil
}

// IsValid checks if a slug is valid (only letters and numbers, up to 7 characters).
func IsValid(slug string) bool {
	if len(slug) > length {
		return false
	}

	for _, char := range slug {
		if !((char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9')) {
			return false
		}
	}

	return true
}
