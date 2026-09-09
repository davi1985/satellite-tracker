import type * as CesiumNS from 'cesium'

const ESRI_IMAGERY_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

const SKYBOX_FACES = {
  positiveX: '/skybox/tycho2t3_80_px.jpg',
  negativeX: '/skybox/tycho2t3_80_mx.jpg',
  positiveY: '/skybox/tycho2t3_80_py.jpg',
  negativeY: '/skybox/tycho2t3_80_my.jpg',
  positiveZ: '/skybox/tycho2t3_80_pz.jpg',
  negativeZ: '/skybox/tycho2t3_80_mz.jpg',
}

export const createViewer = (container: HTMLElement): CesiumNS.Viewer => {
  const viewer = new Cesium.Viewer(container, {
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    creditContainer: document.createElement('div'),
    baseLayer: new Cesium.ImageryLayer(
      new Cesium.UrlTemplateImageryProvider({
        url: ESRI_IMAGERY_URL,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        maximumLevel: 19,
      }),
    ),
  })

  viewer.scene.skyBox = new Cesium.SkyBox({ sources: SKYBOX_FACES })
  viewer.scene.globe.enableLighting = false
  viewer.scene.skyAtmosphere.show = true

  return viewer
}