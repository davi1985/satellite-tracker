import type * as CesiumNS from 'cesium'
import type { SatelliteGroup, SatellitePos } from '../../../@types/types'
import { GROUP_COLORS } from '../../../@types/types'
import { satSvgDataUri } from './icons'

export const getGroupColor = (group: string): string => {
  return GROUP_COLORS[group as SatelliteGroup] ?? '#00e5ff'
}

export type SatPositionArgs = {
  lon: number
  lat: number
  alt: number
}

export const satPosition = ({
  lon,
  lat,
  alt,
}: SatPositionArgs): CesiumNS.Cartesian3 =>
  Cesium.Cartesian3.fromDegrees(lon, lat, alt * 1000)

export const createSatelliteEntity = (
  viewer: CesiumNS.Viewer,
  sat: SatellitePos,
): CesiumNS.Entity => {
  const color = getGroupColor(sat.group)

  return viewer.entities.add({
    id: `sat_${sat.id}`,
    position: new Cesium.ConstantPositionProperty(
      satPosition({ lon: sat.lon, lat: sat.lat, alt: sat.alt }),
    ),
    billboard: {
      image: satSvgDataUri(color),
      width: 28,
      height: 28,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.2, 2.0e6, 0.6),
    },
    label: {
      text: sat.name,
      font: '600 13px Inter, sans-serif',
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      outlineColor: Cesium.Color.BLACK,
      showBackground: false,
      pixelOffset: new Cesium.Cartesian2(0, -20),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 2.0e6, 0.7),
    },
  })
}

export const updateSatellitePosition = (
  entity: CesiumNS.Entity,
  sat: SatellitePos,
): void => {
  if (entity.position instanceof Cesium.ConstantPositionProperty) {
    entity.position.setValue(
      satPosition({ lon: sat.lon, lat: sat.lat, alt: sat.alt }),
    )
  }
}

export const createHighlightEntity = (
  viewer: CesiumNS.Viewer,
  sat: SatellitePos,
): CesiumNS.Entity => {
  const color = getGroupColor(sat.group)

  return viewer.entities.add({
    id: `highlight_${sat.id}`,
    position: satPosition({ lon: sat.lon, lat: sat.lat, alt: sat.alt }),
    ellipse: {
      semiMajorAxis: 80000,
      semiMinorAxis: 80000,
      material: Cesium.Color.fromCssColorString(color).withAlpha(0.2),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString(color).withAlpha(0.9),
      outlineWidth: 2,
      height: sat.alt * 1000,
      numberOfVerticalLines: 0,
    },
  })
}

export const updateHighlightPosition = (
  entity: CesiumNS.Entity,
  sat: SatellitePos,
) => {
  if (entity.position instanceof Cesium.ConstantPositionProperty) {
    entity.position.setValue(
      satPosition({ lon: sat.lon, lat: sat.lat, alt: sat.alt }),
    )
  }
}
