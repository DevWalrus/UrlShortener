package db

import (
	"context"
	"errors"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Link struct {
	Slug        string `bson:"slug"`
	Destination string `bson:"destination"`
	HitCount    int64  `bson:"hitCount"`
}

type LinkStore struct {
	collection *mongo.Collection
}

func Connect(ctx context.Context, uri string) (*mongo.Client, error) {
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}
	return client, nil
}

func NewLinkStore(client *mongo.Client, dbName, collectionName string) *LinkStore {
	return &LinkStore{
		collection: client.Database(dbName).Collection(collectionName),
	}
}

func (s *LinkStore) FindBySlug(ctx context.Context, slug string) (*Link, error) {
	slug = strings.ToUpper(slug)

	var link Link
	err := s.collection.FindOne(ctx, bson.M{
		"slug":      slug,
		"deletedAt": bson.M{"$exists": false},
	}).Decode(&link)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &link, nil
}

func (s *LinkStore) IncrementHitCount(ctx context.Context, slug string) {
	// Fire and forget - don't block the redirect
	go func() {
		s.collection.UpdateOne(
			context.Background(),
			bson.M{"slug": slug},
			bson.M{"$inc": bson.M{"hitCount": 1}},
		)
	}()
}
