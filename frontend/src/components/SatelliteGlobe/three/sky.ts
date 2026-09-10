import * as THREE from 'three'
import { EARTH_RADIUS } from './coords'

const STAR_RADIUS = EARTH_RADIUS * 60

const randomUnitVector = (): THREE.Vector3 => {
  const u = Math.random() * 2 - 1
  const theta = Math.random() * Math.PI * 2
  const r = Math.sqrt(1 - u * u)
  return new THREE.Vector3(r * Math.cos(theta), u, r * Math.sin(theta))
}

interface StarFieldOptions {
  count: number
  minSize: number
  maxSize: number
  minBrightness: number
  maxBrightness: number
}

const createStarField = (options: StarFieldOptions): THREE.Points => {
  const { count, minSize, maxSize, minBrightness, maxBrightness } = options

  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const dir = randomUnitVector()

    positions[i * 3] = dir.x * STAR_RADIUS
    positions[i * 3 + 1] = dir.y * STAR_RADIUS
    positions[i * 3 + 2] = dir.z * STAR_RADIUS

    const brightness = minBrightness + Math.random() * (maxBrightness - minBrightness)
    colors[i * 3] = brightness
    colors[i * 3 + 1] = brightness
    colors[i * 3 + 2] = brightness

    sizes[i] = minSize + Math.random() * (maxSize - minSize)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.ShaderMaterial({
    vertexShader: `
      attribute float aSize;
      attribute vec3 aColor;
      varying vec3 vColor;
      void main() {
        vColor = aColor;
        gl_PointSize = aSize;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float alpha = 1.0 - smoothstep(0.0, 0.5, d);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  return points
}

export const createSky = (scene: THREE.Scene): void => {
  scene.background = new THREE.Color(0x04050a)

  scene.add(
    createStarField({
      count: 4800,
      minSize: 1.5,
      maxSize: 3,
      minBrightness: 0.35,
      maxBrightness: 0.8,
    }),
  )
  scene.add(
    createStarField({
      count: 400,
      minSize: 3.5,
      maxSize: 6,
      minBrightness: 0.7,
      maxBrightness: 1,
    }),
  )
}