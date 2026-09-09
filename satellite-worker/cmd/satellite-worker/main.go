package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"
	"time"

	"satellite-worker/internal/config"
	"satellite-worker/internal/fetcher"
	"satellite-worker/internal/propagator"
	"satellite-worker/internal/publisher"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg := config.Load()

	pub, err := publisher.NewRedis(cfg.RedisAddr)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer pub.Close()

	sats, err := fetcher.LoadSatellites(cfg.Groups)
	if err != nil {
		log.Fatalf("Failed to load satellites: %v", err)
	}
	log.Printf("Total satellites loaded: %d", len(sats))

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	log.Println("Starting satellite position worker...")

	for {
		select {
		case <-ctx.Done():
			log.Println("Shutting down...")
			return
		case now := <-ticker.C:
			positions := propagator.ComputePositions(sats, now.UTC())

			if err := publisher.Publish(ctx, pub, cfg.Channel, positions); err != nil {
				log.Printf("Error publishing to Redis: %v", err)
				continue
			}

			log.Printf("Published %d satellite positions", len(positions))
		}
	}
}
