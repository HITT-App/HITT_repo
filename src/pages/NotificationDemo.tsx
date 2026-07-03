import { useState } from "react";
import { HEmoji } from "@/components/HEmoji";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { FitnessNotificationModal, NotificationType } from "@/components/notifications/FitnessNotificationModal";

type NotificationData = {
  type: NotificationType;
  value: string;
  title: string;
  description: string;
  macros?: { protein: number; carbs: number; fat: number };
  progress?: { current: number; max: number };
  coachName?: string;
};

const notificationExamples: NotificationData[] = [
  {
    type: "steps",
    value: "+1,125",
    title: "Steps Completed",
    description: "You have just completed 1,125 steps today. Let's log your steps again tomorrow!",
  },
  {
    type: "hydration",
    value: "250ml",
    title: "Water Intake Remaining",
    description: "You need to take 250ml more water to complete your daily goal.",
    progress: { current: 250, max: 1250 },
  },
  {
    type: "calories-intake",
    value: "+255kcal",
    title: "Calorie Taken",
    description: "You've just eaten a total of 225 calorie today. Let's log again tomorrow!",
    macros: { protein: 88, carbs: 96, fat: 5 },
  },
  {
    type: "calories-burned",
    value: "-120kcal",
    title: "Calorie Burned",
    description: "You just burned 120 calorie today by completing Back Workout! Congratulations!",
  },
  {
    type: "coaching",
    value: "06:30 AM",
    title: "Fitness Coaching Session",
    description: "You have an upcoming fitness coaching session with coach Julia!",
    coachName: "Julia",
  },
];

const NotificationDemo = () => {
  const navigate = useNavigate();
  const [activeNotification, setActiveNotification] = useState<NotificationData | null>(null);

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header
          className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10"
          style={{ paddingTop: 'calc(var(--safe-area-inset-top, 0px) + 4px)' }}
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold flex-1">Notification Demos</h1>
          </div>
        </header>

        <div className="p-4 space-y-4">
          <p className="text-muted-foreground text-sm">
            Tap on any notification type below to see the full-screen celebration modal.
          </p>

          {notificationExamples.map((notification, index) => (
            <Card 
              key={index}
              className="cursor-pointer hover:bg-secondary/50 transition-colors border-border/50"
              onClick={() => setActiveNotification(notification)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">{notification.value}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-lg">
                      {notification.type === "steps" && "👟"}
                      {notification.type === "hydration" && "💧"}
                      {notification.type === "calories-intake" && "🍽️"}
                      {notification.type === "calories-burned" && <HEmoji name="streak" size={18}/>}
                      {notification.type === "coaching" && "🏋️"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Notification Modal */}
      {activeNotification && (
        <FitnessNotificationModal
          data={activeNotification}
          onDismiss={() => setActiveNotification(null)}
        />
      )}
    </>
  );
};

export default NotificationDemo;
