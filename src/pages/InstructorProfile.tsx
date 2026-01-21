import { useState } from "react";
import { ArrowLeft, Share2, Star, MapPin, Phone, Mail, Globe, MessageCircle, Video, Check, ChevronRight, Eye } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const instructorData = {
  id: '1',
  name: 'Coach Arnold Swarznibble',
  title: 'Certified Instructor',
  avatar: 'https://i.pravatar.cc/100?img=60',
  followers: '25K',
  totalCourses: 18,
  rating: 4.2,
  reviews: 648,
  overview: `Coach Arnold Swarznibble is a highly respected strength & conditioning coach, known for his expertise in building muscle strength, endurance, and peak athletic performance. With over 16 years of experience in the Fitness industry, he has helped thousands of individuals—ranging from beginners to professional athletes—achieve their fitness goals through science-backed training techniques and personalized coaching.`,
  credentials: [
    { icon: '🎓', title: '7 Years Fitness Experience', description: 'Recognized for groundbreaking research in cardiovascular health.' },
    { icon: '✅', title: 'Certified Coach Trainer', description: 'Expertise in leveraging technology to innovate and apply fitness metrics.' },
    { icon: '🌐', title: 'Fluent in 5 Languages', description: 'Published multiple papers and books, including "The age of Physics".' },
  ],
  courses: [
    { id: '1', title: 'Hydration Hacks: Staying Refreshed and Energized', date: 'Jan 16, 2025', tag: 'Tag Name', views: 878, comments: 2, image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=100&h=100&fit=crop' },
    { id: '2', title: 'Sleep Smarter, Live Better: Improving Your Sleep Quality', date: 'Jan 16, 2025', tag: 'Tag Name', views: 878, comments: 2, image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&h=100&fit=crop' },
    { id: '3', title: 'Stress Management 101: Tools for a Calmer Life', date: 'Jan 16, 2025', tag: 'Tag Name', views: 878, comments: 3, image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop' },
  ],
  contact: {
    phone: '+01 123-456-477',
    email: 'doctor@wellness.com',
    address: 'Elementary Street 12%',
  },
  socials: {
    facebook: '@fitfitwarmish2',
    twitter: '@golfitfwarmish2',
    youtube: '@golfitfwarmish2',
    github: '@golfitfwarmish2',
  },
};

const InstructorProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isFollowing, setIsFollowing] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Workshop Detail</h1>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Share2 className="w-5 h-5" />
        </Button>
      </header>

      <div className="px-4 space-y-6">
        {/* Profile Header */}
        <div className="relative">
          {/* Cover Image */}
          <div className="h-32 rounded-2xl overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=150&fit=crop"
              alt="Cover"
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Avatar */}
          <Avatar className="w-24 h-24 absolute -bottom-12 left-4 border-4 border-background">
            <AvatarImage src={instructorData.avatar} />
            <AvatarFallback>{instructorData.name[0]}</AvatarFallback>
          </Avatar>

          {/* Certified Badge */}
          <Badge className="absolute -bottom-4 left-24 bg-primary text-primary-foreground">
            ✅ Certified Instructor
          </Badge>
        </div>

        {/* Profile Info */}
        <div className="pt-12">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">{instructorData.name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span>👥 {instructorData.followers} Followers</span>
                <span>📚 {instructorData.totalCourses} Courses</span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </Button>
            <Button 
              size="sm"
              variant={isFollowing ? "outline" : "default"}
              className="flex-1"
              onClick={() => setIsFollowing(!isFollowing)}
            >
              {isFollowing ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Following
                </>
              ) : (
                'Follow +'
              )}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="about" className="mt-4 space-y-6">
            {/* Overview */}
            <section>
              <h2 className="font-semibold text-foreground mb-2">Overview</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {instructorData.overview}
              </p>
            </section>

            {/* Credentials */}
            <section>
              <h2 className="font-semibold text-foreground mb-3">Credentials & Achievements</h2>
              <div className="space-y-3">
                {instructorData.credentials.map((cred, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-2xl">{cred.icon}</span>
                    <div>
                      <h4 className="font-medium text-foreground">{cred.title}</h4>
                      <p className="text-sm text-muted-foreground">{cred.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Instructor Rating */}
            <section>
              <h2 className="font-semibold text-foreground mb-3">Instructor Rating</h2>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-foreground">{instructorData.rating}</div>
                  <div className="flex gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`w-4 h-4 ${star <= Math.floor(instructorData.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Avg Rating</p>
                </div>
                <div className="flex-1 space-y-1">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs w-4">{star}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${star === 4 ? 60 : star === 5 ? 80 : 20}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Contact Details */}
            <section>
              <h2 className="font-semibold text-foreground mb-3">Contact Details</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">{instructorData.contact.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">{instructorData.contact.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">{instructorData.contact.address}</span>
                </div>
              </div>
            </section>

            {/* Socials */}
            <section>
              <h2 className="font-semibold text-foreground mb-3">Socials</h2>
              <div className="space-y-3">
                {Object.entries(instructorData.socials).map(([platform, handle]) => (
                  <div key={platform} className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm capitalize">{platform}</span>
                    <span className="text-sm text-primary">{handle}</span>
                  </div>
                ))}
              </div>
            </section>
          </TabsContent>
          
          <TabsContent value="courses" className="mt-4 space-y-3">
            <h2 className="font-semibold text-foreground">Instructor Courses</h2>
            {instructorData.courses.map((course) => (
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span>{course.date}</span>
                    <span>·</span>
                    <span>{course.tag}</span>
                  </div>
                  <h3 className="font-medium text-sm text-foreground line-clamp-2">
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {course.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {course.comments}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground self-center" />
              </Card>
            ))}
          </TabsContent>
          
          <TabsContent value="videos" className="mt-4">
            <div className="text-center py-12">
              <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No videos available yet</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InstructorProfile;
