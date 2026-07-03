import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { TTSProvider } from "@/contexts/TTSContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { PushPermissionBanner } from "@/components/notifications/PushPermissionBanner";
import { VerificationBanner } from "@/components/auth/VerificationBanner";
import { VoiceController } from "@/components/coach/VoiceController";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppLayout } from "@/components/AppLayout";
import { NavVisibilityProvider } from "@/contexts/NavVisibilityContext";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PageLoader } from "@/components/PageLoader";
import { useCacheVersion } from "@/hooks/useCacheVersion";
import { useNativePush } from "@/hooks/useNativePush";
import { useHealthKitBackgroundSync } from "@/hooks/useHealthKitBackgroundSync";
import { initWatchEventHandler } from "@/lib/watch-event-handler";
import { initHealthKitSync } from "@/lib/healthkit-sync";

// Activate watch workout event → Supabase write-back (no-op on non-native)
initWatchEventHandler();

// HealthKit aggregator: pulls workouts/HR/steps/sleep from any wearable that
// syncs to Apple Health (Garmin, Fitbit, Whoop, Oura, etc.) into Supabase so
// Jarvis can reason about them. No-op on non-native.
initHealthKitSync();

// Critical pages loaded eagerly
import Index from "./pages/Index";
import ActivityShareCardsPreview from "./pages/ActivityShareCardsPreview";
import Auth from "./pages/Auth";
import Welcome from "./pages/Welcome";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages
const DebugAI = lazy(() => import("./pages/DebugAI"));
const AICoach = lazy(() => import("./pages/AICoach"));
const AISurface = lazy(() => import("./components/AISurface").then(m => ({ default: m.AISurface })));
const Profile = lazy(() => import("./pages/Profile"));
const ConnectedDevices = lazy(() => import("./pages/ConnectedDevices"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const HealthMetrics = lazy(() => import("./pages/HealthMetrics"));
const ActivityTracker = lazy(() => import("./pages/ActivityTracker"));
const ActivityOnboarding = lazy(() => import("./pages/ActivityOnboarding"));
const ActivityDashboard = lazy(() => import("./pages/ActivityDashboard"));
const ActivityDetail = lazy(() => import("./pages/ActivityDetail"));
const ActivityLive = lazy(() => import("./pages/ActivityLive"));
const GymTimer = lazy(() => import("./pages/GymTimer"));
const ActivityHistory = lazy(() => import("./pages/ActivityHistory"));
const ActivityGoals = lazy(() => import("./pages/ActivityGoals"));
const LogActivity = lazy(() => import("./pages/LogActivity"));
const SleepTracker = lazy(() => import("./pages/SleepTracker"));
const SleepOnboarding = lazy(() => import("./pages/SleepOnboarding"));
const SleepDashboard = lazy(() => import("./pages/SleepDashboard"));
const SleepSchedule = lazy(() => import("./pages/SleepSchedule"));
const SleepHistory = lazy(() => import("./pages/SleepHistory"));
const StartSleep = lazy(() => import("./pages/StartSleep"));
const Sleeping = lazy(() => import("./pages/Sleeping"));
const LogSleep = lazy(() => import("./pages/LogSleep"));
const Nutrition = lazy(() => import("./pages/Nutrition"));
const Workouts = lazy(() => import("./pages/Workouts"));
const CoachBooking = lazy(() => import("./pages/CoachBooking"));
const CoachOnboarding = lazy(() => import("./pages/CoachOnboarding"));
const BrowseCoaches = lazy(() => import("./pages/BrowseCoaches"));
const CoachProfile = lazy(() => import("./pages/CoachProfile"));
const BookCoach = lazy(() => import("./pages/BookCoach"));
const CoachAppointments = lazy(() => import("./pages/CoachAppointments"));
const LiveSession = lazy(() => import("./pages/LiveSession"));
const Community = lazy(() => import("./pages/Community"));
const CommunityOnboarding = lazy(() => import("./pages/CommunityOnboarding"));
const CommunityFeed = lazy(() => import("./pages/CommunityFeed"));
const CommunitySearch = lazy(() => import("./pages/CommunitySearch"));
const CommunityProfile = lazy(() => import("./pages/CommunityProfile"));
const CommunityProfileSettings = lazy(() => import("./pages/CommunityProfileSettings"));
const CommunityChat = lazy(() => import("./pages/CommunityChat"));
const CommunityMessages = lazy(() => import("./pages/CommunityMessages"));
const CreatePost = lazy(() => import("./pages/CreatePost"));
const CreateStory = lazy(() => import("./pages/CreateStory"));
const StoryViewer = lazy(() => import("./pages/StoryViewer"));
const PostComments = lazy(() => import("./pages/PostComments"));
const Resources = lazy(() => import("./pages/Resources"));
const HeartRate = lazy(() => import("./pages/HeartRate"));
const Steps = lazy(() => import("./pages/Steps"));
const Weight = lazy(() => import("./pages/Weight"));
const Hydration = lazy(() => import("./pages/Hydration"));
const BloodPressure = lazy(() => import("./pages/BloodPressure"));
const Mood = lazy(() => import("./pages/Mood"));
const HealthRecommendations = lazy(() => import("./pages/HealthRecommendations"));
const ChatSettings = lazy(() => import("./pages/ChatSettings"));
const MyConversations = lazy(() => import("./pages/MyConversations"));
const NutritionOnboarding = lazy(() => import("./pages/NutritionOnboarding"));
const NutritionDashboard = lazy(() => import("./pages/NutritionDashboard"));
const MealScanner = lazy(() => import("./pages/MealScanner"));
const BrowseMeals = lazy(() => import("./pages/BrowseMeals"));
const LogMeal = lazy(() => import("./pages/LogMeal"));
const WorkoutOnboarding = lazy(() => import("./pages/WorkoutOnboarding"));
const WorkoutLibrary = lazy(() => import("./pages/WorkoutLibrary"));
const WorkoutDetail = lazy(() => import("./pages/WorkoutDetail"));
const WorkoutPlayer = lazy(() => import("./pages/WorkoutPlayer"));
const WorkoutSchedule = lazy(() => import("./pages/WorkoutSchedule"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotificationPreferences = lazy(() => import("./pages/NotificationPreferences"));
const ServerError = lazy(() => import("./pages/ServerError"));
const NoInternet = lazy(() => import("./pages/NoInternet"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const FeatureLocked = lazy(() => import("./pages/FeatureLocked"));
const UpdateRequired = lazy(() => import("./pages/UpdateRequired"));
const AchievementsIntro = lazy(() => import("./pages/AchievementsIntro"));
const Achievements = lazy(() => import("./pages/Achievements"));
const AllAchievements = lazy(() => import("./pages/AllAchievements"));
const AchievementDetail = lazy(() => import("./pages/AchievementDetail"));
const Challenges = lazy(() => import("./pages/Challenges"));
const ChallengeDetail = lazy(() => import("./pages/ChallengeDetail"));
const ChallengeLeaderboard = lazy(() => import("./pages/ChallengeLeaderboard"));
const HIITTrialWelcome = lazy(() => import("./pages/HIITTrialWelcome"));
const MealDetail = lazy(() => import("./pages/MealDetail"));
const NotificationDemo = lazy(() => import("./pages/NotificationDemo"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const CommunityChatroom = lazy(() => import("./pages/CommunityChatroom"));
const RoutesExplorer = lazy(() => import("./pages/RoutesExplorer"));
const RouteDetail = lazy(() => import("./pages/RouteDetail"));
const CreateRoute = lazy(() => import("./pages/CreateRoute"));
const BarcodeScanner = lazy(() => import("./pages/BarcodeScanner"));
const WeeklyReport = lazy(() => import("./pages/WeeklyReport"));
const BodyScan = lazy(() => import("./pages/BodyScan"));
const UploadWorkoutPlan = lazy(() => import("./pages/UploadWorkoutPlan"));
const Triathlon = lazy(() => import("./pages/Triathlon"));
const GoalSetup = lazy(() => import("./pages/GoalSetup"));
const ScheduleSetup = lazy(() => import("./pages/ScheduleSetup"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminWorkouts = lazy(() => import("./pages/admin/AdminWorkouts"));
const AdminMeals = lazy(() => import("./pages/admin/AdminMeals"));
const AdminCoaches = lazy(() => import("./pages/admin/AdminCoaches"));
const AdminBadges = lazy(() => import("./pages/admin/AdminBadges"));
const AdminCommunity = lazy(() => import("./pages/admin/AdminCommunity"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminHomeLayout = lazy(() => import("./pages/admin/AdminHomeLayout"));

const queryClient = new QueryClient();

function CacheVersionCheck() {
  useCacheVersion();
  return null;
}

function NativePushRegistrar() {
  useNativePush();
  useHealthKitBackgroundSync();
  return null;
}


const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <TTSProvider>
      <NavVisibilityProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PushPermissionBanner />
        <BrowserRouter>
          <ScrollToTop />
          <CacheVersionCheck />
          <NativePushRegistrar />
          <VerificationBanner />
          <VoiceController />
          <AppLayout>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/_preview/share-cards" element={<ActivityShareCardsPreview />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/ai-coach" element={<ProtectedRoute><AICoach /></ProtectedRoute>} />
            <Route path="/ai" element={<ProtectedRoute><AISurface /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/connected-devices" element={<ProtectedRoute><ConnectedDevices /></ProtectedRoute>} />
            <Route path="/health-metrics" element={<ProtectedRoute><HealthMetrics /></ProtectedRoute>} />
            <Route path="/activity" element={<ProtectedRoute><ActivityTracker /></ProtectedRoute>} />
            <Route path="/activity-onboarding" element={<ProtectedRoute><ActivityOnboarding /></ProtectedRoute>} />
            <Route path="/activity-dashboard" element={<ProtectedRoute><ActivityDashboard /></ProtectedRoute>} />
            <Route path="/activity/:id" element={<ProtectedRoute><ActivityDetail /></ProtectedRoute>} />
            <Route path="/activity-live" element={<ProtectedRoute><ActivityLive /></ProtectedRoute>} />
            <Route path="/gym-timer" element={<ProtectedRoute><GymTimer /></ProtectedRoute>} />
            <Route path="/activity-history" element={<ProtectedRoute><ActivityHistory /></ProtectedRoute>} />
            <Route path="/activity-goals" element={<ProtectedRoute><ActivityGoals /></ProtectedRoute>} />
            <Route path="/log-activity" element={<ProtectedRoute><LogActivity /></ProtectedRoute>} />
            <Route path="/sleep" element={<ProtectedRoute><SleepTracker /></ProtectedRoute>} />
            <Route path="/sleep-onboarding" element={<ProtectedRoute><SleepOnboarding /></ProtectedRoute>} />
            <Route path="/sleep-dashboard" element={<ProtectedRoute><SleepDashboard /></ProtectedRoute>} />
            <Route path="/sleep-schedule" element={<ProtectedRoute><SleepSchedule /></ProtectedRoute>} />
            <Route path="/sleep-history" element={<ProtectedRoute><SleepHistory /></ProtectedRoute>} />
            <Route path="/start-sleep" element={<ProtectedRoute><StartSleep /></ProtectedRoute>} />
            <Route path="/sleeping" element={<ProtectedRoute><Sleeping /></ProtectedRoute>} />
            <Route path="/log-sleep" element={<ProtectedRoute><LogSleep /></ProtectedRoute>} />
            <Route path="/nutrition" element={<ProtectedRoute><Nutrition /></ProtectedRoute>} />
            <Route path="/workouts" element={<ProtectedRoute><Workouts /></ProtectedRoute>} />
            <Route path="/coach-booking" element={<ProtectedRoute><CoachBooking /></ProtectedRoute>} />
            <Route path="/coach-onboarding" element={<ProtectedRoute><CoachOnboarding /></ProtectedRoute>} />
            <Route path="/browse-coaches" element={<ProtectedRoute><BrowseCoaches /></ProtectedRoute>} />
            <Route path="/coach/:id" element={<ProtectedRoute><CoachProfile /></ProtectedRoute>} />
            <Route path="/book-coach/:id" element={<ProtectedRoute><BookCoach /></ProtectedRoute>} />
            <Route path="/coach-appointments" element={<ProtectedRoute><CoachAppointments /></ProtectedRoute>} />
            <Route path="/live-session/:id" element={<ProtectedRoute><LiveSession /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
            <Route path="/community/onboarding" element={<ProtectedRoute><CommunityOnboarding /></ProtectedRoute>} />
            <Route path="/community/feed" element={<ProtectedRoute><CommunityFeed /></ProtectedRoute>} />
            <Route path="/community/search" element={<ProtectedRoute><CommunitySearch /></ProtectedRoute>} />
            <Route path="/community/profile" element={<ProtectedRoute><CommunityProfile /></ProtectedRoute>} />
            <Route path="/community/profile/settings" element={<ProtectedRoute><CommunityProfileSettings /></ProtectedRoute>} />
            <Route path="/community/chat/:userId" element={<ProtectedRoute><CommunityChat /></ProtectedRoute>} />
            <Route path="/community/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/community/create" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
            <Route path="/community/create-story" element={<ProtectedRoute><CreateStory /></ProtectedRoute>} />
            <Route path="/community/story/:userId" element={<ProtectedRoute><StoryViewer /></ProtectedRoute>} />
            <Route path="/community/post/:postId/comments" element={<ProtectedRoute><PostComments /></ProtectedRoute>} />
            <Route path="/community/user/:userId" element={<ProtectedRoute><CommunityProfile /></ProtectedRoute>} />
            <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
            <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
            <Route path="/heart-rate" element={<ProtectedRoute><HeartRate /></ProtectedRoute>} />
            <Route path="/steps" element={<ProtectedRoute><Steps /></ProtectedRoute>} />
            <Route path="/weight" element={<ProtectedRoute><Weight /></ProtectedRoute>} />
            <Route path="/hydration" element={<ProtectedRoute><Hydration /></ProtectedRoute>} />
            <Route path="/blood-pressure" element={<ProtectedRoute><BloodPressure /></ProtectedRoute>} />
            <Route path="/mood" element={<ProtectedRoute><Mood /></ProtectedRoute>} />
            <Route path="/health-recommendations" element={<ProtectedRoute><HealthRecommendations /></ProtectedRoute>} />
            <Route path="/chat-settings" element={<ProtectedRoute><ChatSettings /></ProtectedRoute>} />
            <Route path="/my-conversations" element={<ProtectedRoute><MyConversations /></ProtectedRoute>} />
            <Route path="/nutrition-onboarding" element={<ProtectedRoute><NutritionOnboarding /></ProtectedRoute>} />
            <Route path="/nutrition-dashboard" element={<ProtectedRoute><NutritionDashboard /></ProtectedRoute>} />
            <Route path="/meal-scanner" element={<ProtectedRoute><MealScanner /></ProtectedRoute>} />
            <Route path="/browse-meals" element={<ProtectedRoute><BrowseMeals /></ProtectedRoute>} />
            <Route path="/log-meal" element={<ProtectedRoute><LogMeal /></ProtectedRoute>} />
            <Route path="/workout-onboarding" element={<ProtectedRoute><WorkoutOnboarding /></ProtectedRoute>} />
            <Route path="/goal-setup" element={<ProtectedRoute><GoalSetup /></ProtectedRoute>} />
            <Route path="/schedule-setup" element={<ProtectedRoute><ScheduleSetup /></ProtectedRoute>} />
            <Route path="/workout-library" element={<ProtectedRoute><WorkoutLibrary /></ProtectedRoute>} />
            <Route path="/workout/:id" element={<ProtectedRoute><WorkoutDetail /></ProtectedRoute>} />
            <Route path="/workout-player/:id" element={<ProtectedRoute><WorkoutPlayer /></ProtectedRoute>} />
            <Route path="/workout-schedule" element={<ProtectedRoute><WorkoutSchedule /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/server-error" element={<ServerError />} />
            <Route path="/no-internet" element={<NoInternet />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/feature-locked" element={<FeatureLocked />} />
            <Route path="/update-required" element={<UpdateRequired />} />
            <Route path="/achievements-intro" element={<ProtectedRoute><AchievementsIntro /></ProtectedRoute>} />
            <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
            <Route path="/achievements/all" element={<ProtectedRoute><AllAchievements /></ProtectedRoute>} />
            <Route path="/achievements/:id" element={<ProtectedRoute><AchievementDetail /></ProtectedRoute>} />
            <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
            <Route path="/challenge/:id" element={<ProtectedRoute><ChallengeDetail /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><ChallengeLeaderboard /></ProtectedRoute>} />
            <Route path="/hiit-trial" element={<HIITTrialWelcome />} />
            <Route path="/meal/:id" element={<ProtectedRoute><MealDetail /></ProtectedRoute>} />
            <Route path="/notification-demo" element={<ProtectedRoute><NotificationDemo /></ProtectedRoute>} />
            <Route path="/notification-preferences" element={<ProtectedRoute><NotificationPreferences /></ProtectedRoute>} />
            <Route path="/community/messages/:recipientId" element={<ProtectedRoute><CommunityMessages /></ProtectedRoute>} />
            <Route path="/community/chatroom" element={<ProtectedRoute><CommunityChatroom /></ProtectedRoute>} />
            <Route path="/routes" element={<ProtectedRoute><RoutesExplorer /></ProtectedRoute>} />
            <Route path="/route/:id" element={<ProtectedRoute><RouteDetail /></ProtectedRoute>} />
            <Route path="/routes/create" element={<ProtectedRoute><CreateRoute /></ProtectedRoute>} />
            <Route path="/barcode-scanner" element={<ProtectedRoute><BarcodeScanner /></ProtectedRoute>} />
            <Route path="/weekly-report" element={<ProtectedRoute><WeeklyReport /></ProtectedRoute>} />
            <Route path="/body-scan" element={<ProtectedRoute><BodyScan /></ProtectedRoute>} />
            <Route path="/upload-workout-plan" element={<ProtectedRoute><UploadWorkoutPlan /></ProtectedRoute>} />
            <Route path="/triathlon" element={<ProtectedRoute><Triathlon /></ProtectedRoute>} />
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/admin/workouts" element={<AdminRoute><AdminWorkouts /></AdminRoute>} />
            <Route path="/admin/meals" element={<AdminRoute><AdminMeals /></AdminRoute>} />
            <Route path="/admin/coaches" element={<AdminRoute><AdminCoaches /></AdminRoute>} />
            <Route path="/admin/badges" element={<AdminRoute><AdminBadges /></AdminRoute>} />
            <Route path="/admin/community" element={<AdminRoute><AdminCommunity /></AdminRoute>} />
            <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
            <Route path="/admin/subscriptions" element={<AdminRoute><AdminSubscriptions /></AdminRoute>} />
            <Route path="/admin/layout" element={<AdminRoute><AdminHomeLayout /></AdminRoute>} />
            {/* DEBUG — remove before 5C ships */}
            <Route path="/debug-ai" element={<ProtectedRoute><DebugAI /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </AppLayout>
        </BrowserRouter>
      </TooltipProvider>
      </NavVisibilityProvider>
    </TTSProvider>
    </AuthProvider>
  </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
