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
