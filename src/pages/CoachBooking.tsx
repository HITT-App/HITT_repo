import { ArrowLeft, Calendar, Clock, Video, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const timeSlots = [
  { time: "9:00 AM", available: true },
  { time: "10:00 AM", available: false },
  { time: "11:00 AM", available: true },
  { time: "2:00 PM", available: true },
  { time: "3:00 PM", available: false },
  { time: "4:00 PM", available: true },
];

const CoachBooking = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Coach Booking</h1>
      </header>

      <div className="p-4 space-y-6">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">👨‍🏫</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Coach Mike</h3>
              <p className="text-sm text-muted-foreground">Certified Personal Trainer</p>
              <p className="text-xs text-primary">⭐ 4.9 (124 reviews)</p>
            </div>
          </div>
        </Card>

        <div>
          <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Select Date
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => (
              <Button
                key={day}
                variant={i === 1 ? "default" : "outline"}
                className="flex-col h-auto py-3 px-4 min-w-[60px]"
              >
                <span className="text-xs">{day}</span>
                <span className="text-lg font-bold">{15 + i}</span>
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Available Times
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((slot) => (
              <Button
                key={slot.time}
                variant="outline"
                disabled={!slot.available}
                className="text-sm"
              >
                {slot.time}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1">
            <MapPin className="w-4 h-4 mr-2" /> In-Person
          </Button>
          <Button variant="outline" className="flex-1">
            <Video className="w-4 h-4 mr-2" /> Virtual
          </Button>
        </div>

        <Button className="w-full btn-primary">Book Session</Button>
      </div>
    </div>
  );
};

export default CoachBooking;
