import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import CommunityMessages from "@/pages/CommunityMessages";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { PushPermissionBanner } from "@/components/notifications/PushPermissionBanner";
import { VerificationBanner } from "@/components/auth/VerificationBanner";
import { VoiceController } from "@/components/coach/VoiceController";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Welcome from "./pages/Welcome";
import Assessment from "./pages/Assessment";
import AICoach from "./pages/AICoach";
import Profile from "./pages/Profile";
import ProfileSetup from "./pages/ProfileSetup";
import AssessmentResults from "./pages/AssessmentResults";
import Subscription from "./pages/Subscription";
import HealthMetrics from "./pages/HealthMetrics";
import ActivityTracker from "./pages/ActivityTracker";
import ActivityOnboarding from "./pages/ActivityOnboarding";
import ActivityDashboard from "./pages/ActivityDashboard";
import ActivityLive from "./pages/ActivityLive";
import ActivityHistory from "./pages/ActivityHistory";
import ActivityGoals from "./pages/ActivityGoals";
import LogActivity from "./pages/LogActivity";
import SleepTracker from "./pages/SleepTracker";
import SleepOnboarding from "./pages/SleepOnboarding";
import SleepDashboard from "./pages/SleepDashboard";
import SleepSchedule from "./pages/SleepSchedule";
import SleepHistory from "./pages/SleepHistory";
import StartSleep from "./pages/StartSleep";
import Sleeping from "./pages/Sleeping";
import LogSleep from "./pages/LogSleep";
import Nutrition from "./pages/Nutrition";
import Workouts from "./pages/Workouts";
import CoachBooking from "./pages/CoachBooking";
import CoachOnboarding from "./pages/CoachOnboarding";
import BrowseCoaches from "./pages/BrowseCoaches";
import CoachProfile from "./pages/CoachProfile";
import BookCoach from "./pages/BookCoach";
import CoachAppointments from "./pages/CoachAppointments";
import LiveSession from "./pages/LiveSession";
import Community from "./pages/Community";
import CommunityOnboarding from "./pages/CommunityOnboarding";
import CommunityFeed from "./pages/CommunityFeed";
import CommunitySearch from "./pages/CommunitySearch";
import CommunityProfile from "./pages/CommunityProfile";
import CommunityProfileSettings from "./pages/CommunityProfileSettings";
import CommunityChat from "./pages/CommunityChat";
import CommunityNotifications from "./pages/CommunityNotifications";
import CreatePost from "./pages/CreatePost";
import PostComments from "./pages/PostComments";
import Resources from "./pages/Resources";
import HeartRate from "./pages/HeartRate";
import Steps from "./pages/Steps";
import Weight from "./pages/Weight";
import Hydration from "./pages/Hydration";
import BloodPressure from "./pages/BloodPressure";
import Mood from "./pages/Mood";
import HealthRecommendations from "./pages/HealthRecommendations";
import ChatSettings from "./pages/ChatSettings";
import MyConversations from "./pages/MyConversations";
import NutritionOnboarding from "./pages/NutritionOnboarding";
import NutritionDashboard from "./pages/NutritionDashboard";
import MealScanner from "./pages/MealScanner";
import BrowseMeals from "./pages/BrowseMeals";
import LogMeal from "./pages/LogMeal";
import WorkoutOnboarding from "./pages/WorkoutOnboarding";
import WorkoutLibrary from "./pages/WorkoutLibrary";
import WorkoutDetail from "./pages/WorkoutDetail";
import WorkoutPlayer from "./pages/WorkoutPlayer";
import WorkoutSchedule from "./pages/WorkoutSchedule";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import Search from "./pages/Search";
import ServerError from "./pages/ServerError";
import NoInternet from "./pages/NoInternet";
import Maintenance from "./pages/Maintenance";
import FeatureLocked from "./pages/FeatureLocked";
import UpdateRequired from "./pages/UpdateRequired";
import AchievementsIntro from "./pages/AchievementsIntro";
import Achievements from "./pages/Achievements";
import AllAchievements from "./pages/AllAchievements";
import AchievementDetail from "./pages/AchievementDetail";
import Challenges from "./pages/Challenges";
import ChallengeDetail from "./pages/ChallengeDetail";
import ChallengeLeaderboard from "./pages/ChallengeLeaderboard";
import HIITTrialWelcome from "./pages/HIITTrialWelcome";
import MealDetail from "./pages/MealDetail";
import NotificationDemo from "./pages/NotificationDemo";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminWorkouts from "./pages/admin/AdminWorkouts";
import AdminMeals from "./pages/admin/AdminMeals";
import AdminCoaches from "./pages/admin/AdminCoaches";
import AdminBadges from "./pages/admin/AdminBadges";
import AdminCommunity from "./pages/admin/AdminCommunity";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PushPermissionBanner />
        <BrowserRouter>
          <VerificationBanner />
          <VoiceController />
          <Routes>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/assessment" element={<ProtectedRoute><Assessment /></ProtectedRoute>} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-coach"
              element={
                <ProtectedRoute>
                  <AICoach />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/health-metrics" element={<ProtectedRoute><HealthMetrics /></ProtectedRoute>} />
            <Route path="/activity" element={<ProtectedRoute><ActivityTracker /></ProtectedRoute>} />
            <Route path="/activity-onboarding" element={<ProtectedRoute><ActivityOnboarding /></ProtectedRoute>} />
            <Route path="/activity-dashboard" element={<ProtectedRoute><ActivityDashboard /></ProtectedRoute>} />
            <Route path="/activity-live" element={<ProtectedRoute><ActivityLive /></ProtectedRoute>} />
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
            <Route path="/community/notifications" element={<ProtectedRoute><CommunityNotifications /></ProtectedRoute>} />
            <Route path="/community/create" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
            <Route path="/community/post/:postId/comments" element={<ProtectedRoute><PostComments /></ProtectedRoute>} />
            <Route path="/community/user/:userId" element={<ProtectedRoute><CommunityProfile /></ProtectedRoute>} />
            <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
            <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
            <Route path="/assessment-results" element={<ProtectedRoute><AssessmentResults /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
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
            <Route path="/workout-library" element={<ProtectedRoute><WorkoutLibrary /></ProtectedRoute>} />
            <Route path="/workout/:id" element={<ProtectedRoute><WorkoutDetail /></ProtectedRoute>} />
            <Route path="/workout-player/:id" element={<ProtectedRoute><WorkoutPlayer /></ProtectedRoute>} />
            <Route path="/workout-schedule" element={<ProtectedRoute><WorkoutSchedule /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
            {/* Utility/Error Pages */}
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
            <Route path="/community/messages/:recipientId" element={<ProtectedRoute><CommunityMessages /></ProtectedRoute>} />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
