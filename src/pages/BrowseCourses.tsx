import { useState } from "react";
import { ArrowLeft, Search, Play, Eye, Clock, Plus, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const tags = ['Fitness', 'Diet', 'Sleep', 'Mindfulness'];

const featuredCourse = {
  id: 'featured',
  title: 'Introduction to Nutrition',
  sessions: 8,
  lessons: [
    { title: 'What is macronutrients?', duration: '1m 12s' },
    { title: 'Why do we need protein?', duration: '2m 22s' },
    { title: 'How much fat do we need?', duration: '1m 38s' },
  ],
};

const audioCourses = [
  {
    id: '1',
    category: 'Nutrition & Diet',
    title: 'Berries: Why it\'s the next superfood of 2029',
    author: 'Olivier Boreman',
    duration: '28m',
    sessions: 16,
    thumbnail: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=100&h=100&fit=crop',
  },
];

const yogaCourses = [
  {
    id: '2',
    category: 'Yoga & Mindfulness',
    title: 'How Resilient Are You In Tough Times?',
    author: 'Olivier Boreman',
    duration: '28m',
    sessions: 16,
    thumbnail: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=100&h=100&fit=crop',
  },
];

const videoCourses = [
  {
    id: '3',
    category: 'Core & Cardio',
    title: 'Choosing The Right Fitness Equipments',
    author: 'Olivier Boreman',
    duration: '28m',
    sessions: 16,
    thumbnail: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&h=100&fit=crop',
  },
];

const strengthCourses = [
  {
    id: '4',
    category: 'Strength & Focus',
    title: 'Building Fitness Community With HIIT',
    author: 'Olivier Boreman',
    duration: '28m',
    sessions: 16,
    thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop',
  },
];

const BrowseCourses = () => {
  const navigate = useNavigate();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const CourseCard = ({ course }: { course: typeof audioCourses[0] }) => (
    <Card 
      className="p-3 flex gap-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/course/${course.id}`)}
    >
      <img 
        src={course.thumbnail} 
        alt={course.title}
        className="w-16 h-16 rounded-lg object-cover"
      />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-primary uppercase font-medium">{course.sessions} SESSIONS</span>
        <h3 className="font-semibold text-foreground text-sm line-clamp-2">
          {course.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <span>{course.author}</span>
          <span>·</span>
          <span>{course.duration}</span>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground self-center" />
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="flex items-center gap-3 p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/resources')}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Browse Courses</h1>
          <p className="text-sm text-muted-foreground">Browse fitness courses</p>
        </div>
      </header>

      <div className="px-4 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search for a course..." 
            className="pl-10 bg-secondary border-0 rounded-xl"
          />
        </div>

        {/* Tags */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tags.map((tag) => (
            <Button
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleTag(tag)}
              className="rounded-full whitespace-nowrap"
            >
              {tag}
            </Button>
          ))}
        </div>

        {/* Featured Course */}
        <section>
          <h2 className="font-semibold text-foreground mb-3">Featured Course</h2>
          <Card 
            className="bg-primary text-primary-foreground p-4 cursor-pointer"
            onClick={() => navigate(`/course/${featuredCourse.id}`)}
          >
            <span className="text-xs opacity-80 uppercase">{featuredCourse.sessions} SESSIONS</span>
            <h3 className="text-lg font-bold mt-1 mb-4">{featuredCourse.title}</h3>
            <div className="space-y-2">
              {featuredCourse.lessons.map((lesson, i) => (
                <div key={i} className="flex items-center justify-between text-sm opacity-90">
                  <span>{lesson.title}</span>
                  <span>{lesson.duration}</span>
                </div>
              ))}
            </div>
            <Button 
              variant="link" 
              className="text-primary-foreground p-0 h-auto mt-4"
            >
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Card>
        </section>

        {/* Audio Courses */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Audio Course</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <div className="space-y-3">
            {audioCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>

        {/* Yoga & Mindfulness */}
        <section>
          <h2 className="font-semibold text-foreground mb-3">Yoga & Mindfulness</h2>
          <div className="space-y-3">
            {yogaCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>

        {/* Video Course */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Video Course</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <div className="space-y-3">
            {videoCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>

        {/* Strength & Focus */}
        <section>
          <h2 className="font-semibold text-foreground mb-3">Strength & Focus</h2>
          <div className="space-y-3">
            {strengthCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>

        {/* Load More */}
        <Button variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Load More
        </Button>
      </div>
    </div>
  );
};

export default BrowseCourses;
