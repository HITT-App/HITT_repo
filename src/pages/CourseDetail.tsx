import { useState } from "react";
import { ArrowLeft, Share2, Play, Pause, RotateCcw, RotateCw, Settings, Bookmark, Download, Share, Check, MoreVertical, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChevronRight } from "lucide-react";

const courseData = {
  id: '1',
  title: 'Finding Your Inner Focus & Strength',
  subtitle: 'Strength Training & Bodybuilding',
  date: 'Sep 25, 2024',
  category: 'Strength Training',
  duration: '2h 22m',
  instructor: {
    name: 'Coach Jen Brown',
    avatar: 'https://i.pravatar.cc/40?img=12',
  },
  rating: 4.6,
  totalRatings: 648,
  image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=500&fit=crop',
  overview: `Unlock your true potential with this transformative course designed to help you build mental resilience, clarity, and inner strength.`,
  totalSessions: 4,
  sessions: [
    { id: '1', title: 'The war for your focus', description: 'Fighting back and winning is important for sleep', duration: '8m 22s', status: 'not_started' },
    { id: '2', title: 'How to get more muscle', description: 'Fighting back and winning is important for sleep', duration: '8m 22s', status: 'completed' },
    { id: '3', title: 'Eating the right way', description: 'Fighting back and winning is important for sleep', duration: '8m 22s', status: 'in_progress' },
  ],
  similarCourses: [
    { id: '2', title: 'Pilates Basics: 101 For Those in a Complete Hurry', instructor: 'Oscar Bonwon', duration: '28m', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&h=100&fit=crop' },
  ],
};

const CourseDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(31);
  const [totalTime] = useState(301);
  const [showSettings, setShowSettings] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/resources')}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Course Details</h1>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Share2 className="w-5 h-5" />
        </Button>
      </header>

      <div className="px-4 space-y-6">
        {/* Course Tags */}
        <div className="flex gap-2">
          <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
            🎧 Audio
          </span>
          <span className="bg-secondary text-secondary-foreground text-xs font-medium px-3 py-1 rounded-full">
            ⭐ {courseData.rating}
          </span>
        </div>

        {/* Title & Meta */}
        <div>
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {courseData.title}
          </h1>
          <p className="text-muted-foreground mt-1">{courseData.subtitle}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span>{courseData.date}</span>
            <span>·</span>
            <span>{courseData.category}</span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm">
            <span className="flex items-center">
              🕐 {courseData.duration}
            </span>
            <span>·</span>
            <span>⭐ {courseData.rating}</span>
            <span className="text-muted-foreground">({courseData.totalRatings})</span>
          </div>
        </div>

        {/* Course Image with Player */}
        <div className="relative rounded-2xl overflow-hidden">
          <img 
            src={courseData.image} 
            alt={courseData.title}
            className="w-full h-64 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          {/* Video Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-xs text-white/80 mb-1">1 OF {courseData.totalSessions}</p>
            <h3 className="text-white font-semibold">{courseData.title}</h3>
            <p className="text-sm text-white/80 mt-2">
              Hi my name Coach Jen, and here's how to find your fitness buddy.
            </p>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-white/80 mb-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(totalTime)}</span>
              </div>
              <Progress value={(currentTime / totalTime) * 100} className="h-1 bg-white/30" />
            </div>
            
            {/* Controls */}
            <div className="flex items-center justify-center gap-6 mt-4">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <RotateCcw className="w-6 h-6" />
              </Button>
              <Button 
                size="icon" 
                className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <RotateCw className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Settings Button */}
          <Sheet open={showSettings} onOpenChange={setShowSettings}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 text-white hover:bg-white/20"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Course Settings</SheetTitle>
              </SheetHeader>
              <div className="flex items-center gap-4 my-6">
                <img 
                  src={courseData.image} 
                  alt={courseData.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <h4 className="font-semibold">{courseData.title}</h4>
                  <p className="text-sm text-muted-foreground">{courseData.duration} · {courseData.instructor.name}</p>
                </div>
              </div>
              <div className="space-y-1">
                {[
                  { icon: Bookmark, label: 'Save to library' },
                  { icon: Download, label: 'Download' },
                  { icon: Share, label: 'Share' },
                  { icon: Check, label: 'Mark as Played' },
                ].map(({ icon: Icon, label }) => (
                  <Button 
                    key={label}
                    variant="ghost" 
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      {label}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Overview */}
        <section>
          <h2 className="font-semibold text-foreground mb-2">Overview</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {courseData.overview}
          </p>
        </section>

        {/* Total Sessions */}
        <section>
          <h2 className="font-semibold text-foreground mb-3">Total Sessions</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Through guided techniques in mindfulness, visualization, and goal setting, you'll learn how to stay focused under pressure and cultivate unwavering determination.
          </p>
          <div className="space-y-3">
            {courseData.sessions.map((session, i) => (
              <Card 
                key={session.id}
                className={`p-4 flex items-center gap-4 cursor-pointer ${
                  session.status === 'in_progress' ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  session.status === 'completed' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  {session.status === 'completed' ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-primary font-medium">SESSION {i + 1}</span>
                  </div>
                  <h4 className="font-medium text-foreground">{session.title}</h4>
                  <p className="text-xs text-muted-foreground">{session.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">{session.duration}</span>
                  {session.status === 'in_progress' && (
                    <span className="block text-xs text-primary">In Progress</span>
                  )}
                  {session.status === 'completed' && (
                    <Check className="w-4 h-4 text-primary ml-auto mt-1" />
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Courses like this */}
        <section>
          <h2 className="font-semibold text-foreground mb-3">Courses like this</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Through a mix of mental training techniques, visualization exercises, and discipline-building habits, you'll learn how to stay locked in on your goals, even when motivation fades.
          </p>
          <div className="space-y-3">
            {courseData.similarCourses.map((course) => (
              <Card 
                key={course.id}
                className="p-3 flex gap-3 cursor-pointer"
                onClick={() => navigate(`/course/${course.id}`)}
              >
                <img 
                  src={course.image} 
                  alt={course.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-foreground line-clamp-2">
                    {course.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {course.instructor} · {course.duration}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button className="w-full">
            Join Course
          </Button>
          <Button variant="outline" className="w-full">
            <Play className="w-4 h-4 mr-2" />
            Consult AI Assistant
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
