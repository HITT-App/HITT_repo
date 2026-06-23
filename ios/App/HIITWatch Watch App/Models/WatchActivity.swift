import SwiftUI

// Design-spec activity catalog — 34 sports with brand colours and MET values
struct WatchActivity: Identifiable {
    let id: String
    let name: String
    let category: String
    let icon: String          // SF Symbol name
    let color: Color
    let met: Double

    // Activity IDs that should engage the watch's onboard GPS + route recording.
    // HKLiveWorkoutBuilder also auto-collects distanceWalkingRunning / distanceCycling
    // when the workout configuration is outdoor with the right activity type.
    private static let outdoorIds: Set<String> = [
        "run", "trail", "walk", "powerwalk", "hike",
        "cycling", "mtb",
        "kayak", "paddle", "surf",
    ]

    var isOutdoor: Bool { Self.outdoorIds.contains(id) }
}

let WATCH_ACTIVITIES: [WatchActivity] = [
    WatchActivity(id:"run",       name:"Run",          category:"cardio",    icon:"figure.run",          color:Color(hex:"#FF8A26"), met:9.8),
    WatchActivity(id:"trail",     name:"Trail Run",    category:"cardio",    icon:"figure.hiking",       color:Color(hex:"#5BE3A0"), met:9.0),
    WatchActivity(id:"walk",      name:"Walk",         category:"cardio",    icon:"figure.walk",         color:Color(hex:"#A78BFA"), met:3.5),
    WatchActivity(id:"powerwalk", name:"Power Walk",   category:"cardio",    icon:"figure.walk.motion",  color:Color(hex:"#818CF8"), met:4.8),
    WatchActivity(id:"hike",      name:"Hike",         category:"outdoor",   icon:"mountain.2",          color:Color(hex:"#34D399"), met:6.0),
    WatchActivity(id:"cycling",   name:"Cycling",      category:"cardio",    icon:"figure.outdoor.cycle",color:Color(hex:"#38BDF8"), met:7.5),
    WatchActivity(id:"mtb",       name:"Mountain Bike",category:"outdoor",   icon:"bicycle",             color:Color(hex:"#2DD4BF"), met:8.5),
    WatchActivity(id:"weights",   name:"Weight Train", category:"strength",  icon:"dumbbell",            color:Color(hex:"#FB923C"), met:5.0),
    WatchActivity(id:"bodyweight",name:"Bodyweight",   category:"strength",  icon:"figure.strengthtraining.functional", color:Color(hex:"#F97316"), met:5.0),
    WatchActivity(id:"functional",name:"Functional",   category:"strength",  icon:"figure.cross.training",color:Color(hex:"#EF4444"), met:5.0),
    WatchActivity(id:"crossfit",  name:"CrossFit",     category:"strength",  icon:"bolt.circle",         color:Color(hex:"#EF4444"), met:8.0),
    WatchActivity(id:"hiit",      name:"HIIT",         category:"hiit",      icon:"bolt",                color:Color(hex:"#FF8A26"), met:8.0),
    WatchActivity(id:"tabata",    name:"Tabata",        category:"hiit",      icon:"timer",               color:Color(hex:"#FF8A26"), met:8.0),
    WatchActivity(id:"circuit",   name:"Circuit",      category:"hiit",      icon:"arrow.triangle.2.circlepath", color:Color(hex:"#F59E0B"), met:7.0),
    WatchActivity(id:"jumprope",  name:"Jump Rope",    category:"hiit",      icon:"figure.jumprope",     color:Color(hex:"#FBBF24"), met:10.0),
    WatchActivity(id:"stair",     name:"Stair Climber",category:"cardio",    icon:"figure.stair.stepper",color:Color(hex:"#A78BFA"), met:7.0),
    WatchActivity(id:"rowing",    name:"Rowing",       category:"cardio",    icon:"figure.rower",        color:Color(hex:"#60A5FA"), met:7.0),
    WatchActivity(id:"elliptical",name:"Elliptical",   category:"cardio",    icon:"figure.elliptical",   color:Color(hex:"#818CF8"), met:5.0),
    WatchActivity(id:"swim",      name:"Swim",         category:"water",     icon:"figure.pool.swim",    color:Color(hex:"#38BDF8"), met:8.0),
    WatchActivity(id:"surf",      name:"Surf",         category:"water",     icon:"water.waves",         color:Color(hex:"#0EA5E9"), met:6.0),
    WatchActivity(id:"kayak",     name:"Kayak",        category:"water",     icon:"oar.2.crossed",       color:Color(hex:"#06B6D4"), met:5.0),
    WatchActivity(id:"paddle",    name:"Paddleboard",  category:"water",     icon:"figure.water.fitness",color:Color(hex:"#22D3EE"), met:5.0),
    WatchActivity(id:"yoga",      name:"Yoga",         category:"mindful",   icon:"figure.yoga",         color:Color(hex:"#C084FC"), met:2.5),
    WatchActivity(id:"pilates",   name:"Pilates",      category:"mindful",   icon:"figure.mind.and.body",color:Color(hex:"#E879F9"), met:3.0),
    WatchActivity(id:"stretch",   name:"Stretching",   category:"mindful",   icon:"figure.flexibility",  color:Color(hex:"#A78BFA"), met:2.5),
    WatchActivity(id:"taichi",    name:"Tai Chi",      category:"mindful",   icon:"figure.taichi",       color:Color(hex:"#818CF8"), met:4.0),
    WatchActivity(id:"boxing",    name:"Boxing",       category:"combat",    icon:"figure.boxing",       color:Color(hex:"#F87171"), met:9.0),
    WatchActivity(id:"kickbox",   name:"Kickboxing",   category:"combat",    icon:"figure.kickboxing",   color:Color(hex:"#EF4444"), met:9.0),
    WatchActivity(id:"mma",       name:"MMA",          category:"combat",    icon:"figure.martial.arts", color:Color(hex:"#DC2626"), met:10.0),
    WatchActivity(id:"tennis",    name:"Tennis",       category:"sport",     icon:"figure.tennis",       color:Color(hex:"#86EFAC"), met:7.0),
    WatchActivity(id:"basketball",name:"Basketball",   category:"sport",     icon:"figure.basketball",   color:Color(hex:"#FB923C"), met:8.0),
    WatchActivity(id:"football",  name:"Football",     category:"sport",     icon:"figure.american.football", color:Color(hex:"#4ADE80"), met:8.0),
    WatchActivity(id:"triathlon", name:"Triathlon",    category:"race",      icon:"medal",               color:Color(hex:"#FBBF24"), met:9.0),
    WatchActivity(id:"hyrox",     name:"Hyrox",        category:"race",      icon:"trophy",              color:Color(hex:"#FF8A26"), met:9.0),
]

extension Color {
    init(hex: String) {
        let h = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: h).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8) & 0xFF) / 255
        let b = Double(int & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
