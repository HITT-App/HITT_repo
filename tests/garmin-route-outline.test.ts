import { describe, expect, it } from "bun:test"
import { routeOutlinePath } from "../src/lib/route-outline"

const box = { x: 100, y: 200, width: 800, height: 400 }

const coords = (path: string) =>
  path.split(/[ML]/).map(s => s.trim()).filter(Boolean).map(s => s.split(" ").map(Number))

describe("routeOutlinePath", () => {
  it("returns null without at least two usable points", () => {
    expect(routeOutlinePath([], box)).toBeNull()
    expect(routeOutlinePath([[51.5, -0.1]], box)).toBeNull()
    expect(routeOutlinePath([[51.5, -0.1], [NaN, 0]], box)).toBeNull()
    expect(routeOutlinePath([[51.5, -0.1], [51.5, -0.1]], box)).toBeNull()
  })

  it("keeps every point inside the box", () => {
    const route: [number, number][] = [[51.5, -0.1], [51.51, -0.09], [51.505, -0.12], [51.52, -0.11]]
    for (const [x, y] of coords(routeOutlinePath(route, box)!)) {
      expect(x).toBeGreaterThanOrEqual(box.x - 0.1)
      expect(x).toBeLessThanOrEqual(box.x + box.width + 0.1)
      expect(y).toBeGreaterThanOrEqual(box.y - 0.1)
      expect(y).toBeLessThanOrEqual(box.y + box.height + 0.1)
    }
  })

  it("draws north at the top and keeps a north-south line centred", () => {
    const [[x1, y1], [x2, y2]] = coords(routeOutlinePath([[51.5, -0.1], [51.6, -0.1]], box)!)
    expect(y2).toBeLessThan(y1)
    expect(x1).toBeCloseTo(box.x + box.width / 2, 1)
    expect(x2).toBeCloseTo(box.x + box.width / 2, 1)
  })

  it("scales longitude by latitude so shapes aren't stretched", () => {
    // Equal real distances east and north at 60°N: 0.02° of longitude ≈ 0.01° of latitude.
    const [a, b, c] = coords(routeOutlinePath([[60, 10], [60, 10.02], [60.01, 10.02]], box)!)
    expect(Math.abs(b[0] - a[0])).toBeCloseTo(Math.abs(c[1] - b[1]), 0)
  })
})
