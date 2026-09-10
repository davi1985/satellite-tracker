import * as THREE from 'three'

export const EARTH_RADIUS = 6371

const DEG2RAD = Math.PI / 180

export const latLonToVector3 = (
  lat: number,
  lon: number,
  radius: number,
): THREE.Vector3 => {
  const phi = (90 - lat) * DEG2RAD
  const theta = (90 - lon) * DEG2RAD

  const x = radius * Math.sin(phi) * Math.cos(theta)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)

  return new THREE.Vector3(x, y, z)
}