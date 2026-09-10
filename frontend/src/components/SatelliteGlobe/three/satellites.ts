import * as THREE from 'three'
import type { SatellitePos } from '../../../@types/types'
import { GROUP_COLORS } from '../../../@types/types'
import { EARTH_RADIUS, latLonToVector3 } from './coords'
import { anchorSiderealDeg } from './sidereal'
import { satSvgDataUri } from '../utils/icons'

const SAT_ICON_SIZE = 340
const LABEL_TEXTURE_WIDTH = 256
const LABEL_TEXTURE_HEIGHT = 64
const LABEL_HEIGHT = 340
const HIGHLIGHT_RADIUS = 150
const HIGHLIGHT_TUBE = 5
const PICK_RADIUS_PX = 26

interface Visual {
  id: number
  data: SatellitePos
  group: THREE.Group
  marker: THREE.Sprite
  label: THREE.Sprite
  color: THREE.Color
}

const textureCache = new Map<string, THREE.Texture>()

const colorFor = (group: string): THREE.Color =>
  new THREE.Color(GROUP_COLORS[group as keyof typeof GROUP_COLORS] ?? '#00e5ff')

const iconTexture = (color: THREE.Color): THREE.Texture => {
  const key = color.getStyle()
  let texture = textureCache.get(key)
  if (!texture) {
    texture = new THREE.TextureLoader().load(satSvgDataUri(key))
    texture.colorSpace = THREE.SRGBColorSpace
    textureCache.set(key, texture)
  }
  return texture
}

const makeLabel = (name: string): THREE.Sprite => {
  const canvas = document.createElement('canvas')
  canvas.width = LABEL_TEXTURE_WIDTH
  canvas.height = LABEL_TEXTURE_HEIGHT
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.font = '600 26px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 6
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)'
    ctx.strokeText(name, LABEL_TEXTURE_WIDTH / 2, LABEL_TEXTURE_HEIGHT / 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(name, LABEL_TEXTURE_WIDTH / 2, LABEL_TEXTURE_HEIGHT / 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  )
  const scale = LABEL_HEIGHT * (LABEL_TEXTURE_WIDTH / LABEL_TEXTURE_HEIGHT)
  sprite.scale.set(scale, LABEL_HEIGHT, 1)
  sprite.renderOrder = 10
  return sprite
}

export class SatelliteManager {
  private readonly globeRoot: THREE.Group
  private readonly camera: THREE.PerspectiveCamera
  private readonly visuals = new Map<number, Visual>()
  private readonly tmpVec = new THREE.Vector3()
  private highlight: THREE.Mesh | null = null
  private highlightId: number | null = null

  constructor(
    globeRoot: THREE.Group,
    camera: THREE.PerspectiveCamera,
  ) {
    this.globeRoot = globeRoot
    this.camera = camera
  }

  sync(sats: SatellitePos[]): void {
    const seen = new Set<number>()

    for (const sat of sats) {
      seen.add(sat.id)

      let visual = this.visuals.get(sat.id)
      if (!visual) {
        visual = this.createVisual(sat)
        this.visuals.set(sat.id, visual)
        this.globeRoot.add(visual.group)
      } else {
        visual.data = sat
        this.updateVisual(visual)
      }
    }

    for (const [id, visual] of this.visuals) {
      if (seen.has(id)) continue
      visual.group.parent?.remove(visual.group)
      this.disposeVisual(visual)
      this.visuals.delete(id)
      if (this.highlightId === id) this.clearHighlight()
    }

    this.syncHighlight()
  }

  setSelected(id: number | null): void {
    if (id === this.highlightId) return
    this.clearHighlight()
    if (id === null) return

    const visual = this.visuals.get(id)
    if (!visual) return

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(HIGHLIGHT_RADIUS, HIGHLIGHT_TUBE, 8, 48),
      new THREE.MeshBasicMaterial({
        color: visual.color,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    )
    this.globeRoot.add(ring)
    this.highlight = ring
    this.highlightId = id
    this.syncHighlight()
  }

  pick(clientX: number, clientY: number, rect: DOMRect): SatellitePos | null {
    let best: SatellitePos | null = null
    let bestDist = PICK_RADIUS_PX

    for (const visual of this.visuals.values()) {
      visual.marker.getWorldPosition(this.tmpVec)
      const ndc = this.tmpVec.clone().project(this.camera)
      if (ndc.z > 1 || ndc.z < -1) continue

      const sx = (ndc.x * 0.5 + 0.5) * rect.width
      const sy = (-ndc.y * 0.5 + 0.5) * rect.height
      const dx = sx - (clientX - rect.left)
      const dy = sy - (clientY - rect.top)
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < bestDist) {
        bestDist = dist
        best = visual.data
      }
    }

    return best
  }

  dispose(): void {
    for (const [id, visual] of this.visuals) {
      visual.group.parent?.remove(visual.group)
      this.disposeVisual(visual)
      this.visuals.delete(id)
    }
    this.clearHighlight()
  }

  private createVisual(sat: SatellitePos): Visual {
    const color = colorFor(sat.group)
    const marker = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: iconTexture(color),
        transparent: true,
        depthWrite: false,
      }),
    )
    marker.scale.set(SAT_ICON_SIZE, SAT_ICON_SIZE, 1)

    const label = makeLabel(sat.name)

    const group = new THREE.Group()
    group.add(marker)
    group.add(label)

    const visual: Visual = {
      id: sat.id,
      data: sat,
      group,
      marker,
      label,
      color,
    }
    this.updateVisual(visual)
    return visual
  }

  private updateVisual(visual: Visual): void {
    const radius = EARTH_RADIUS + visual.data.alt
    const position = latLonToVector3(
      visual.data.lat,
      visual.data.lon + anchorSiderealDeg(),
      radius,
    )

    visual.marker.position.copy(position)
    visual.label.position
      .copy(position)
      .addScaledVector(position.clone().normalize(), SAT_ICON_SIZE)
  }

  private syncHighlight(): void {
    if (this.highlightId === null || !this.highlight) return
    const visual = this.visuals.get(this.highlightId)
    if (!visual) return

    const position = visual.marker.position
    this.highlight.position.copy(position)
    this.highlight.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      position.clone().normalize(),
    )
  }

  private clearHighlight(): void {
    if (this.highlight) {
      this.highlight.parent?.remove(this.highlight)
      this.highlight.geometry.dispose()
      materialOf(this.highlight.material)
      this.highlight = null
    }
    this.highlightId = null
  }

  private disposeVisual(visual: Visual): void {
    materialOf(visual.marker.material)
    if (visual.label.material.map) visual.label.material.map.dispose()
    visual.label.material.dispose()
  }
}

const materialOf = (mat: unknown): void => {
  if (Array.isArray(mat)) {
    for (const m of mat) {
      ;(m as THREE.Material).dispose()
    }
  } else {
    ;(mat as THREE.Material).dispose()
  }
}