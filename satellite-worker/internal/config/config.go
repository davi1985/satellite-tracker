package config

import "os"

type Config struct {
	RedisAddr string
	Channel   string
	Groups    []TLEGroup
}

type TLEGroup struct {
	Name string
	URL  string
}

func Load() Config {
	return Config{
		RedisAddr: envOr("REDIS_ADDR", "localhost:6379"),
		Channel:   envOr("REDIS_CHANNEL", "satellite:positions"),
		Groups: []TLEGroup{
			{Name: "stations", URL: "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json"},
			{Name: "visual", URL: "https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=json"},
			{Name: "gnss", URL: "https://celestrak.org/NORAD/elements/gp.php?GROUP=gnss&FORMAT=json"},
			{Name: "weather", URL: "https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=json"},
			{Name: "science", URL: "https://celestrak.org/NORAD/elements/gp.php?GROUP=science&FORMAT=json"},
		},
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
