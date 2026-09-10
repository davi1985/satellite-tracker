package propagator

import (
	"log"
	"time"

	"satellite-worker/internal/fetcher"

	"github.com/akhenakh/sgp4"
)

type SatellitePos struct {
	ID    int     `json:"id"`
	Name  string  `json:"name"`
	Lat   float64 `json:"lat"`
	Lon   float64 `json:"lon"`
	Alt   float64 `json:"alt"`
	Group string  `json:"group"`
}

type Frame struct {
	Time      int64          `json:"time"`
	GMST      float64        `json:"gmst"`
	Positions []SatellitePos `json:"positions"`
}

// ComputeGMST returns Greenwich Mean Sidereal Time in radians at the given
// instant, using the exact same formula as the sgp4 library's
// GreenwichSiderealTime so the value matches the Earth rotation applied by
// ToGeodetic.
func ComputeGMST(now time.Time) float64 {
	return (&sgp4.Eci{DateTime: now.UTC()}).GreenwichSiderealTime()
}

func ComputePositions(sats []fetcher.SatRecord, now time.Time) []SatellitePos {
	positions := make([]SatellitePos, 0, len(sats))

	for i := range sats {
		lat, lon, alt, err := propagateSatellite(sats[i].TLE, now)
		if err != nil {
			log.Printf("Propagation error for %s: %v", sats[i].OMM.ObjectName, err)
			continue
		}
		if lat == 0 && lon == 0 {
			continue
		}
		positions = append(positions, SatellitePos{
			ID:    sats[i].OMM.NoradCatID,
			Name:  sats[i].OMM.ObjectName,
			Lat:   lat,
			Lon:   lon,
			Alt:   alt,
			Group: sats[i].Group,
		})
	}

	return positions
}

func propagateSatellite(tle *sgp4.TLE, now time.Time) (lat, lon, alt float64, err error) {
	epochTime := tle.EpochTime()
	tsince := now.Sub(epochTime).Minutes()

	eci, err := tle.FindPosition(tsince)
	if err != nil {
		return 0, 0, 0, err
	}

	lat, lon, alt = eci.ToGeodetic()
	return lat, lon, alt, nil
}
