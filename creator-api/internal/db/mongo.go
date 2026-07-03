package db

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Link struct {
	Slug        string     `bson:"slug" json:"slug"`
	Destination string     `bson:"destination" json:"destination"`
	HitCount    int64      `bson:"hitCount" json:"hitCount"`
	CreatedAt   time.Time  `bson:"createdAt" json:"createdAt"`
	ExpiresAt   *time.Time `bson:"expiresAt,omitempty" json:"expiresAt,omitempty"`
	DeletedAt   *time.Time `bson:"deletedAt,omitempty" json:"deletedAt,omitempty"`
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

func Ping(ctx context.Context, client *mongo.Client) error {
	return client.Ping(ctx, nil)
}

var ErrSlugExists = errors.New("slug already exists")

func (s *LinkStore) Create(ctx context.Context, link *Link) error {
	link.CreatedAt = time.Now().UTC()

	_, err := s.collection.InsertOne(ctx, link)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return ErrSlugExists
		}
		return err
	}
	return nil
}

func (s *LinkStore) Delete(ctx context.Context, slug string) error {
	now := time.Now().UTC()
	_, err := s.collection.UpdateOne(
		ctx,
		bson.M{"slug": slug},
		bson.M{"$set": bson.M{"deletedAt": now}},
	)
	return err
}

func (s *LinkStore) List(ctx context.Context) ([]Link, error) {
	cursor, err := s.collection.Find(ctx, bson.M{"deletedAt": bson.M{"$exists": false}})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	links := []Link{}
	if err := cursor.All(ctx, &links); err != nil {
		return nil, err
	}
	return links, nil
}

func (s *LinkStore) ListDeleted(ctx context.Context) ([]Link, error) {
	cursor, err := s.collection.Find(ctx, bson.M{"deletedAt": bson.M{"$exists": true}})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	links := []Link{}
	if err := cursor.All(ctx, &links); err != nil {
		return nil, err
	}
	return links, nil
}

func (s *LinkStore) Exists(ctx context.Context, slug string) (bool, error) {
	count, err := s.collection.CountDocuments(ctx, bson.M{"slug": slug})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

type User struct {
	Email     string     `bson:"email" json:"email"`
	APIToken  string     `bson:"apiToken" json:"-"` // never serialize token to JSON
	RevokedAt *time.Time `bson:"revokedAt,omitempty" json:"revokedAt,omitempty"`
	CreatedAt time.Time  `bson:"createdAt" json:"createdAt"`
}

type UserStore struct {
	collection *mongo.Collection
}

func NewUserStore(client *mongo.Client, dbName string) *UserStore {
	return &UserStore{
		collection: client.Database(dbName).Collection("users"),
	}
}

func (s *UserStore) FindByToken(ctx context.Context, token string) (*User, error) {
	var user User
	err := s.collection.FindOne(ctx, bson.M{
		"apiToken":  token,
		"revokedAt": bson.M{"$exists": false},
	}).Decode(&user)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}
