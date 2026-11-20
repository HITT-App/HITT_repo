export type LatLng = [number, number]
export type Box = { x: number; y: number; width: number; height: number }

// Flat projection with longitude scaled by latitude, so a route keeps its real shape at
// workout distances. The outline is centred in the box and keeps its aspect ratio.
export function routeOutlinePath(route: LatLng[], box: Box): string | null {
  const points = route.filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))
  if (points.length < 2) return null

  const meanLat = points.reduce((sum, [lat]) => sum + lat, 0) / points.length
  const kx = Math.cos((meanLat * Math.PI) / 180)
  const projected = points.map(([lat, lng]) => [lng * kx, -lat] as const)

  const xs = projected.map(([x]) => x)
  const ys = projected.map(([, y]) => y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const spanX = Math.max(...xs) - minX
  const spanY = Math.max(...ys) - minY
  if (spanX === 0 && spanY === 0) return null

  const scale = Math.min(
    spanX > 0 ? box.width / spanX : Infinity,
    spanY > 0 ? box.height / spanY : Infinity,
  )
  const offsetX = box.x + (box.width - spanX * scale) / 2
  const offsetY = box.y + (box.height - spanY * scale) / 2

  return projected
    .map(([x, y], i) => {
      const px = (offsetX + (x - minX) * scale).toFixed(1)
      const py = (offsetY + (y - minY) * scale).toFixed(1)
      return `${i === 0 ? "M" : "L"} ${px} ${py}`
    })
    .join(" ")
}
