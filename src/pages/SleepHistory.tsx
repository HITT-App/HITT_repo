import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Filter, ChevronRight, Calendar as CalendarIcon, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useSleep } from "@/hooks/useSleep";
import { format, parseISO, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

const SleepHistory = () => {
  const navigate = useNavigate();
  const { logs, logsLoading } = useSleep();
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filterOpen, setFilterOpen] = useState(false);

  // Get logs for selected date in calendar view
  const getLogsForDate = (date: Date) => {
    return logs.filter((log) => isSameDay(parseISO(log.sleep_date), date));
  };

  // Get quality badge color
  const getQualityColor = (quality: number) => {
    if (quality >= 80) return "bg-green-500/10 text-green-600";
    if (quality >= 60) return "bg-yellow-500/10 text-yellow-600";
    return "bg-red-500/10 text-red-600";
  };

  const selectedDateLogs = selectedDate ? getLogsForDate(selectedDate) : [];

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="text-base font-semibold">Sleep History</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="w-5 h-5" />
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("calendar")}
            >
              <CalendarIcon className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setFilterOpen(!filterOpen)}>
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 pb-28">
        {viewMode === "calendar" ? (
          <div className="space-y-4">
            {/* Calendar */}
            <Card className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md"
                modifiers={{
                  logged: logs.map((log) => parseISO(log.sleep_date)),
                }}
                modifiersClassNames={{
                  logged: "bg-primary/20 text-primary font-bold",
                }}
              />
            </Card>

            {/* Selected Date Logs */}
            {selectedDate && (
              <div>
                <h3 className="font-medium mb-3">
                  {format(selectedDate, "MMMM d, yyyy")}
                </h3>
                {selectedDateLogs.length === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-muted-foreground">No sleep logged for this date</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {selectedDateLogs.map((log) => (
                      <Card 
                        key={log.id}
                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/sleep/${log.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {Math.floor((log.duration_minutes || 0) / 60)}h {(log.duration_minutes || 0) % 60}m
                            </p>
                            <Badge className={cn("mt-1", getQualityColor(log.sleep_quality || 0))}>
                              {log.sleep_quality || 0} sleep score
                            </Badge>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Group by date */}
            {logsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : logs.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground mb-2">No sleep data</p>
                <p className="text-sm text-muted-foreground">
                  Start logging your sleep to see your history
                </p>
                <Button
                  variant="link"
                  className="text-primary mt-4"
                  onClick={() => navigate("/log-sleep")}
                >
                  Log Sleep →
                </Button>
              </Card>
            ) : (
              <>
                {/* Today's logs */}
                {(() => {
                  const today = format(new Date(), "yyyy-MM-dd");
                  const todayLogs = logs.filter((log) => log.sleep_date === today);
                  
                  if (todayLogs.length > 0) {
                    return (
                      <div>
                        <h3 className="text-sm text-muted-foreground mb-2">Today</h3>
                        {todayLogs.map((log) => (
                          <Card 
                            key={log.id}
                            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors mb-3"
                            onClick={() => navigate(`/sleep/${log.id}`)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">
                                    {Math.floor((log.duration_minutes || 0) / 60)}h {(log.duration_minutes || 0) % 60}m
                                  </p>
                                  <Badge className={cn(getQualityColor(log.sleep_quality || 0))}>
                                    {log.sleep_quality || 0} sleep score
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {format(parseISO(log.bedtime), "h:mm a")} - {format(parseISO(log.wake_time), "h:mm a")}
                                </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </Card>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* All logs */}
                <div>
                  <h3 className="text-sm text-muted-foreground mb-2">All Records</h3>
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <Card 
                        key={log.id}
                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/sleep/${log.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {Math.floor((log.duration_minutes || 0) / 60)}h {(log.duration_minutes || 0) % 60}m
                              </p>
                              <Badge className={cn(getQualityColor(log.sleep_quality || 0))}>
                                {log.sleep_quality || 0}%
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {format(parseISO(log.sleep_date), "MMM d, yyyy")}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default SleepHistory;
