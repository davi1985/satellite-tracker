import * as THREE from 'three'
import { EARTH_RADIUS } from './coords'

const EARTH_TEXTURE_URL = '/textures/earth-blue-marble.jpg'

export const createEarth = (parent: THREE.Object3D): THREE.Group => {
  const earth = new THREE.Group()

  const geometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64)
  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    specular: new THREE.Color(0x223344),
    shininess: 8,
  })
  const mesh = new THREE.Mesh(geometry, material)
  earth.add(mesh)

  new THREE.TextureLoader().load(EARTH_TEXTURE_URL, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace
    material.map = texture
    material.needsUpdate = true
  })

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS * 1.035, 32, 32),
    new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  )
  earth.add(atmosphere)

  parent.add(earth)

  parent.add(new THREE.AmbientLight(0x334466, 0.6))

  const sun = new THREE.DirectionalLight(0xffffff, 2)
  sun.position.set(EARTH_RADIUS * 2, EARTH_RADIUS * 3, EARTH_RADIUS * 4)
  parent.add(sun)

  return earth
}