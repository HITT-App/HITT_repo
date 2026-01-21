import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/auth" element={<Auth />} />
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
            <Route path="/sleep" element={<ProtectedRoute><SleepTracker /></ProtectedRoute>} />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
