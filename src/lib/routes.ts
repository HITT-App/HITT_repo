/** Type-safe route constants to avoid scattered string paths */
export const ROUTES = {
  HOME: "/",
  WELCOME: "/welcome",
  AUTH: "/auth",
  TERMS: "/terms",
  PRIVACY: "/privacy",
  ASSESSMENT: "/assessment",
  ASSESSMENT_RESULTS: "/assessment-results",
  PROFILE: "/profile",
  PROFILE_SETUP: "/profile-setup",
  SUBSCRIPTION: "/subscription",

  // AI Coach
  AI_COACH: "/ai-coach",
  CHAT_SETTINGS: "/chat-settings",
  MY_CONVERSATIONS: "/my-conversations",
  WEEKLY_REPORT: "/weekly-report",

  // Health
  HEALTH_METRICS: "/health-metrics",
  HEALTH_RECOMMENDATIONS: "/health-recommendations",
  HEART_RATE: "/heart-rate",
  STEPS: "/steps",
  WEIGHT: "/weight",
  HYDRATION: "/hydration",
  BLOOD_PRESSURE: "/blood-pressure",
  MOOD: "/mood",

  // Activity
  ACTIVITY: "/activity",
  ACTIVITY_ONBOARDING: "/activity-onboarding",
  ACTIVITY_DASHBOARD: "/activity-dashboard",
  ACTIVITY_LIVE: "/activity-live",
  ACTIVITY_HISTORY: "/activity-history",
  ACTIVITY_GOALS: "/activity-goals",
  LOG_ACTIVITY: "/log-activity",
  GYM_TIMER: "/gym-timer",

  // Sleep
  SLEEP: "/sleep",
  SLEEP_ONBOARDING: "/sleep-onboarding",
  SLEEP_DASHBOARD: "/sleep-dashboard",
  SLEEP_SCHEDULE: "/sleep-schedule",
  SLEEP_HISTORY: "/sleep-history",
  START_SLEEP: "/start-sleep",
  SLEEPING: "/sleeping",
  LOG_SLEEP: "/log-sleep",

  // Nutrition
  NUTRITION: "/nutrition",
  NUTRITION_ONBOARDING: "/nutrition-onboarding",
  NUTRITION_DASHBOARD: "/nutrition-dashboard",
  MEAL_SCANNER: "/meal-scanner",
  BROWSE_MEALS: "/browse-meals",
  LOG_MEAL: "/log-meal",
  mealDetail: (id: string) => `/meal/${id}` as const,

  // Workouts
  WORKOUTS: "/workouts",
  WORKOUT_ONBOARDING: "/workout-onboarding",
  WORKOUT_LIBRARY: "/workout-library",
  WORKOUT_SCHEDULE: "/workout-schedule",
  workoutDetail: (id: string) => `/workout/${id}` as const,
  workoutPlayer: (id: string) => `/workout-player/${id}` as const,

  // Coaching
  COACH_BOOKING: "/coach-booking",
  COACH_ONBOARDING: "/coach-onboarding",
  BROWSE_COACHES: "/browse-coaches",
  COACH_APPOINTMENTS: "/coach-appointments",
  coachProfile: (id: string) => `/coach/${id}` as const,
  bookCoach: (id: string) => `/book-coach/${id}` as const,
  liveSession: (id: string) => `/live-session/${id}` as const,

  // Community
  COMMUNITY: "/community",
  COMMUNITY_ONBOARDING: "/community/onboarding",
  COMMUNITY_FEED: "/community/feed",
  COMMUNITY_SEARCH: "/community/search",
  COMMUNITY_PROFILE: "/community/profile",
  COMMUNITY_PROFILE_SETTINGS: "/community/profile/settings",
  COMMUNITY_NOTIFICATIONS: "/community/notifications",
  COMMUNITY_CREATE: "/community/create",
  COMMUNITY_CREATE_STORY: "/community/create-story",
  COMMUNITY_CHATROOM: "/community/chatroom",
  communityChat: (userId: string) => `/community/chat/${userId}` as const,
  communityStory: (userId: string) => `/community/story/${userId}` as const,
  communityPostComments: (postId: string) => `/community/post/${postId}/comments` as const,
  communityUser: (userId: string) => `/community/user/${userId}` as const,
  communityMessages: (recipientId: string) => `/community/messages/${recipientId}` as const,

  // Resources
  RESOURCES: "/resources",

  // Notifications
  NOTIFICATIONS: "/notifications",

  // Gamification
  ACHIEVEMENTS_INTRO: "/achievements-intro",
  ACHIEVEMENTS: "/achievements",
  ACHIEVEMENTS_ALL: "/achievements/all",
  achievementDetail: (id: string) => `/achievements/${id}` as const,
  CHALLENGES: "/challenges",
  challengeDetail: (id: string) => `/challenge/${id}` as const,
  LEADERBOARD: "/leaderboard",

  // Routes & Trails
  ROUTES_EXPLORER: "/routes",
  CREATE_ROUTE: "/routes/create",
  routeDetail: (id: string) => `/route/${id}` as const,

  // Endurance
  TRIATHLON: "/triathlon",

  // Misc
  HIIT_TRIAL: "/hiit-trial",
  NOTIFICATION_DEMO: "/notification-demo",

  // Error pages
  SERVER_ERROR: "/server-error",
  NO_INTERNET: "/no-internet",
  MAINTENANCE: "/maintenance",
  FEATURE_LOCKED: "/feature-locked",
  UPDATE_REQUIRED: "/update-required",

  // Admin
  ADMIN: "/admin",
  ADMIN_NOTIFICATIONS: "/admin/notifications",
  ADMIN_USERS: "/admin/users",
  ADMIN_WORKOUTS: "/admin/workouts",
  ADMIN_MEALS: "/admin/meals",
  ADMIN_COACHES: "/admin/coaches",
  ADMIN_BADGES: "/admin/badges",
  ADMIN_COMMUNITY: "/admin/community",
  ADMIN_ANALYTICS: "/admin/analytics",
  ADMIN_SETTINGS: "/admin/settings",
  ADMIN_SUBSCRIPTIONS: "/admin/subscriptions",
  ADMIN_LAYOUT: "/admin/layout",
} as const;
