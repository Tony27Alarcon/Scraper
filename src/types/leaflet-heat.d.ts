declare module 'leaflet.heat' {
  import * as L from 'leaflet'

  interface HeatLayerOptions {
    minOpacity?: number
    maxZoom?:    number
    max?:        number
    radius?:     number
    blur?:       number
    gradient?:   Record<number, string>
  }

  type LatLngTuple = [number, number, number?]

  interface HeatLayer extends L.Layer {
    setLatLngs(latlngs: LatLngTuple[]): this
    addLatLng(latlng: LatLngTuple): this
    setOptions(options: HeatLayerOptions): this
    redraw(): this
  }

  namespace L {
    function heatLayer(latlngs: LatLngTuple[], options?: HeatLayerOptions): HeatLayer
  }
}
