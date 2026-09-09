package fetcher

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"satellite-worker/internal/config"

	"github.com/akhenakh/sgp4"
)

type SatRecord struct {
	OMM   sgp4.OMM
	TLE   *sgp4.TLE
	Group string
}

var defaultHTTPClient = &http.Client{Timeout: 30 * time.Second}

func LoadSatellites(groups []config.TLEGroup) ([]SatRecord, error) {
	var allSats []SatRecord

	for _, group := range groups {
		log.Printf("Fetching %s satellites...", group.Name)
		omms, err := fetchOMMData(group.URL, 3)
		if err != nil {
			log.Printf("Warning: failed to fetch %s: %v", group.Name, err)
			continue
		}
		log.Printf("Loaded %d %s satellites", len(omms), group.Name)

		for _, omm := range omms {
			tle, err := omm.ToTLE()
			if err != nil {
				continue
			}
			allSats = append(allSats, SatRecord{
				OMM:   omm,
				TLE:   tle,
				Group: group.Name,
			})
		}
	}

	return allSats, nil
}

func fetchOMMData(url string, retries int) ([]sgp4.OMM, error) {
	for attempt := 0; attempt <= retries; attempt++ {
		omms, err := fetchOMMOnce(url)
		if err != nil {
			if attempt < retries {
				log.Printf("Fetch failed (attempt %d/%d): %v. Retrying...", attempt+1, retries, err)
				time.Sleep(5 * time.Second)
				continue
			}
			return nil, err
		}
		return omms, nil
	}
	return nil, nil
}

func fetchOMMOnce(url string) ([]sgp4.OMM, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("User-Agent", "satellite-tracker/1.0 (local simulation)")

	resp, err := defaultHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching %s: %w", url, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	omms, err := sgp4.ParseOMMs(body)
	if err != nil {
		return nil, fmt.Errorf("parsing OMMs: %w", err)
	}

	return omms, nil
}
