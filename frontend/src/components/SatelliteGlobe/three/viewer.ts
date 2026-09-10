import * as THREE from 'three'
import { EARTH_RADIUS } from './coords'
import { createEarth } from './earth'
import { createSky } from './sky'
import { nowSiderealRad } from './sidereal'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export interface ThreeViewer {
  scene: THREE.Scene
  globeRoot: THREE.Group
  earth: THREE.Group
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  dispose: () => void
}

export const createRenderer = (): THREE.WebGLRenderer => {
  try {
    return new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
  } catch {
    return new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false,
    })
  }
}

export const createViewer = (container: HTMLElement): ThreeViewer => {
  const renderer = createRenderer()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight || 1,
    1,
    EARTH_RADIUS * 300,
  )
  camera.position.set(
    EARTH_RADIUS * 2.4,
    EARTH_RADIUS * 1.4,
    EARTH_RADIUS * 2.8,
  )
  camera.lookAt(0, 0, 0)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.rotateSpeed = 0.5
  controls.zoomSpeed = 0.7
  controls.minDistance = EARTH_RADIUS * 1.02
  controls.maxDistance = EARTH_RADIUS * 30
  controls.target.set(0, 0, 0)

  const globeRoot = new THREE.Group()
  globeRoot.rotation.y = -Math.PI / 2
  scene.add(globeRoot)

  createSky(scene)
  const earth = createEarth(globeRoot)

  const resize = () => {
    const width = container.clientWidth
    const height = container.clientHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }
  window.addEventListener('resize', resize)

  let raf = 0
  const tick = () => {
    earth.rotation.y = nowSiderealRad()
    controls.update()
    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }
  tick()

  return {
    scene,
    globeRoot,
    earth,
    camera,
    renderer,
    controls,
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      controls.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    },
  }
}