package publisher

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"satellite-worker/internal/propagator"

	"github.com/redis/go-redis/v9"
)

type Publisher interface {
	Publish(ctx context.Context, channel string, data []byte) error
}

type redisPublisher struct {
	client *redis.Client
}

func NewRedis(addr string) (*redisPublisher, error) {
	client := redis.NewClient(&redis.Options{Addr: addr})
	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("connecting to Redis: %w", err)
	}
	log.Println("Connected to Redis")
	return &redisPublisher{client: client}, nil
}

func (p *redisPublisher) Publish(ctx context.Context, channel string, data []byte) error {
	return p.client.Publish(ctx, channel, data).Err()
}

func (p *redisPublisher) Close() error {
	return p.client.Close()
}

func Publish(ctx context.Context, pub Publisher, channel string, frame *propagator.Frame) error {
	data, err := json.Marshal(frame)
	if err != nil {
		return fmt.Errorf("marshaling positions: %w", err)
	}
	return pub.Publish(ctx, channel, data)
}
