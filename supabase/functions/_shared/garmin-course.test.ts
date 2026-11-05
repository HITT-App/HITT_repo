import { describe, expect, it } from "bun:test";
import { canSendRoute, courseActivityType, type HiitRoute, mapCourse, planCourseSend } from "./garmin-course";

const route = (over: Partial<HiitRoute> = {}): HiitRoute => ({
  user_id: "owner",
  name: "Riverside loop",
  coordinates: [{ lat: 51.5, lng: -0.1 }, { lat: 51.5005, lng: -0.1 }],
  surface_type: "road",
  elevation_gain_m: 0,
  is_public: false,
  is_official: false,
  ...over,
});

const ok = (r: ReturnType<typeof mapCourse>) => {
  if (!r.ok) throw new Error(r.reason);
  return r.course;
};

function gapMetres(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

describe("canSendRoute", () => {
  it("allows the user's own, public and official routes", () => {
    expect(canSendRoute(route(), "owner")).toBe(true);
    expect(canSendRoute(route({ is_public: true }), "other")).toBe(true);
    expect(canSendRoute(route({ is_official: true, user_id: null }), "other")).toBe(true);
  });

  it("refuses someone else's private route", () => {
    expect(canSendRoute(route(), "other")).toBe(false);
    expect(canSendRoute(route({ user_id: null }), "other")).toBe(false);
  });
});

describe("courseActivityType", () => {
  it("defaults from the surface", () => {
    expect(courseActivityType("trail")).toBe("TRAIL_RUNNING");
    expect(courseActivityType("road")).toBe("RUNNING");
    expect(courseActivityType("gravel")).toBe("RUNNING");
    expect(courseActivityType(null)).toBe("RUNNING");
  });

  it("honours a valid choice and ignores anything else", () => {
    expect(courseActivityType("road", "ROAD_CYCLING")).toBe("ROAD_CYCLING");
    expect(courseActivityType("road", "SWIMMING")).toBe("RUNNING");
    expect(courseActivityType("road", 7)).toBe("RUNNING");
  });
});

describe("mapCourse", () => {
  it("builds the fields Garmin requires", () => {
    const course = ok(mapCourse(route()));
    expect(course.courseName).toBe("Riverside loop");
    expect(course.coordinateSystem).toBe("WGS84");
    expect(course.activityType).toBe("RUNNING");
    expect(course.distance).toBeCloseTo(55.6, 0);
    expect(course.elevationGain).toBe(0);
    expect(course.elevationLoss).toBe(0);
  });

  it("never sends a description", () => {
    const course = ok(mapCourse({ ...route(), description: "my home address" } as HiitRoute));
    expect("description" in course).toBe(false);
  });

  it("fills straight lines so no two points are over 100 m apart", () => {
    const course = ok(mapCourse(route({ coordinates: [{ lat: 51.5, lng: -0.1 }, { lat: 51.52, lng: -0.1 }] })));
    expect(course.geoPoints.length).toBeGreaterThan(20);
    for (let i = 1; i < course.geoPoints.length; i++) {
      expect(gapMetres(course.geoPoints[i - 1], course.geoPoints[i])).toBeLessThanOrEqual(100);
    }
    expect(course.geoPoints.at(-1)).toEqual({ latitude: 51.52, longitude: -0.1 });
  });

  it("doesn't count the filled points towards the distance", () => {
    const course = ok(mapCourse(route({ coordinates: [{ lat: 51.5, lng: -0.1 }, { lat: 51.52, lng: -0.1 }] })));
    expect(course.distance).toBeCloseTo(2223.9, 0);
  });

  it("leaves elevation to Garmin when the route has none", () => {
    const course = ok(mapCourse(route({ coordinates: [{ lat: 51.5, lng: -0.1 }, { lat: 51.51, lng: -0.1 }] })));
    expect(course.geoPoints.every(p => p.elevation === undefined)).toBe(true);
  });

  it("uses real heights and interpolates between them", () => {
    const course = ok(mapCourse(route({
      elevation_gain_m: 999,
      coordinates: [
        { lat: 51.5, lng: -0.1, alt: 10 },
        { lat: 51.503, lng: -0.1, alt: 40 },
        { lat: 51.506, lng: -0.1, alt: 25 },
      ],
    })));
    expect(course.elevationGain).toBe(30);
    expect(course.elevationLoss).toBe(15);
    expect(course.geoPoints.every(p => typeof p.elevation === "number")).toBe(true);
  });

  it("falls back on the route's stored gain without heights", () => {
    expect(ok(mapCourse(route({ elevation_gain_m: 120 }))).elevationGain).toBe(120);
    expect(ok(mapCourse(route({ elevation_gain_m: null }))).elevationGain).toBe(0);
  });

  it("drops unusable points", () => {
    const course = ok(mapCourse(route({
      coordinates: [{ lat: 51.5, lng: -0.1 }, { lat: 200, lng: 0 }, { lat: "x", lng: 1 }, null, { lat: 51.5005, lng: -0.1 }],
    })));
    expect(course.geoPoints.every(p => Math.abs(p.latitude) <= 90)).toBe(true);
  });

  it("refuses routes with no line", () => {
    expect(mapCourse(route({ coordinates: [] }))).toEqual({ ok: false, reason: "too_few_points" });
    expect(mapCourse(route({ coordinates: null }))).toEqual({ ok: false, reason: "too_few_points" });
    expect(mapCourse(route({ coordinates: [{ lat: 51.5, lng: -0.1 }] }))).toEqual({ ok: false, reason: "too_few_points" });
    expect(mapCourse(route({ coordinates: [{ lat: 51.5, lng: -0.1 }, { lat: 51.5, lng: -0.1 }] })))
      .toEqual({ ok: false, reason: "too_few_points" });
  });

  it("refuses routes over Garmin's point limit", () => {
    const result = mapCourse(route({ coordinates: [{ lat: 10, lng: 0 }, { lat: 25, lng: 0 }] }));
    expect(result).toEqual({ ok: false, reason: "too_long" });
  });

  it("always has a name, and trims long ones", () => {
    expect(ok(mapCourse(route({ name: "  " }))).courseName).toBe("HIIT route");
    expect(ok(mapCourse(route({ name: "x".repeat(300) }))).courseName.length).toBe(100);
  });

  it("gives the same output for the same route, so edits can be detected", () => {
    expect(JSON.stringify(mapCourse(route()))).toBe(JSON.stringify(mapCourse(route())));
  });
});

describe("planCourseSend", () => {
  const link = { garmin_course_id: 5, garmin_user_id: "g1", content_hash: "h" };

  it("creates when nothing was sent", () => {
    expect(planCourseSend(null, "g1", "h")).toBe("create");
    expect(planCourseSend({ ...link, garmin_course_id: null }, "g1", "h")).toBe("create");
  });

  it("skips when unchanged and updates when changed", () => {
    expect(planCourseSend(link, "g1", "h")).toBe("skip");
    expect(planCourseSend(link, "g1", "new")).toBe("update");
  });

  it("creates again after moving to another Garmin account", () => {
    expect(planCourseSend(link, "g2", "h")).toBe("create");
  });
});
