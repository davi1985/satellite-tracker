import type * as CesiumNS from 'cesium'
import type { SatellitePos } from '../../../@types/types'

const PICK_RADIUS = 24

export type FindSatArgs = {
  viewer: CesiumNS.Viewer
  sats: Map<number, SatellitePos>
  clientX: number
  clientY: number
}

export const findSatAtPosition = ({
  viewer,
  sats,
  clientX,
  clientY,
}: FindSatArgs): SatellitePos | null => {
  const canvas = viewer.scene.canvas
  const rect = canvas.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top

  let closest: SatellitePos | null = null
  let closestDist = PICK_RADIUS

  for (const [, sat] of sats) {
    const cart3 = Cesium.Cartesian3.fromDegrees(
      sat.lon,
      sat.lat,
      sat.alt * 1000,
    )
    const windowCoord = Cesium.SceneTransforms.wgs84ToWindowCoordinates(
      viewer.scene,
      cart3,
    )
    if (!windowCoord) continue

    const dx = windowCoord.x - x
    const dy = windowCoord.y - y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < closestDist) {
      closestDist = dist
      closest = sat
    }
  }

  return closest
}
