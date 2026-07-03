import { useState } from "react";
import { ArrowLeft, Share2, Calendar, Clock, MapPin, Users, Check, DollarSign } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

const workshopData = {
  id: '1',
  title: 'Ultimate Fitness Workshop: Unlock Your Strength & Endurance',
  subtitle: 'In-Person & Remote',
  date: 'Sep 25, 2024',
  author: {
    name: 'Guillermo White',
    avatar: 'https://i.pravatar.cc/40?img=11',
  },
  schedule: {
    date: 'September 7, 2028',
    time: 'Mon, 08:00 - 09:30 PST',
    location: 'In-Person/Online',
    address: 'Rose Avenue 23',
  },
  participants: 1272,
  image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=200&fit=crop',
  overview: `Are you ready to take your fitness to the next level? The Ultimate Fitness Workshop is designed to help you unlock your true potential by focusing on two key aspects: strength and endurance. Whether you're a beginner looking to build a solid foundation or an athlete wanting to push past limits, this workshop provides expert guidance, personalized coaching, and science-based training techniques to help you reach your goals.`,
  whoShouldAttend: `This hands-on session will combine practical training, expert talks, and interactive Q&A sessions, ensuring you leave with solid knowledge and skills to apply immediately.`,
  checklistItems: [
    'Checkbox Text Example',
    'Checkbox Text Example',
    'Checkbox Text Example',
  ],
  agenda: `Sleep is a cornerstone of good health that no shortcut can replace. Prioritizing rest is an investment in your physical, mental, and emotional well-being. By making small, consistent changes to improve sleep quality, you can enjoy a longer, healthier, and more fulfilling life.`,
  peopleJoined: 10000,
  price: 30.99,
};

const WorkshopDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-background pb-24">
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
        <h1 className="text-lg font-semibold text-foreground">Workshop Detail</h1>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Share2 className="w-5 h-5" />
        </Button>
      </header>

      <div className="px-4 space-y-6">
        {/* Tag */}
        <div className="flex gap-2">
          <span className="bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full">
            ⚡ Exclusive
          </span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {workshopData.title}
          </h1>
          <p className="text-muted-foreground mt-1">{workshopData.subtitle}</p>
          <div className="flex items-center gap-3 mt-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={workshopData.author.avatar} />
              <AvatarFallback>{workshopData.author.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{workshopData.author.name}</p>
              <p className="text-xs text-muted-foreground">{workshopData.date}</p>
            </div>
          </div>
        </div>

        {/* Schedule Card */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">{workshopData.schedule.date}</p>
              <p className="text-sm text-muted-foreground">{workshopData.schedule.time}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">{workshopData.schedule.location}</p>
              <p className="text-sm text-muted-foreground">{workshopData.schedule.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <Avatar key={i} className="w-6 h-6 border-2 border-background">
                  <AvatarImage src={`https://i.pravatar.cc/24?img=${i + 20}`} />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">{workshopData.participants.toLocaleString()} Joined</span>
          </div>
        </Card>

        {/* Image */}
        <div className="rounded-2xl overflow-hidden">
          <img 
            src={workshopData.image} 
            alt={workshopData.title}
            className="w-full h-48 object-cover"
          />
        </div>

        {/* Overview */}
        <section>
          <h2 className="font-semibold text-foreground mb-2">Overview</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {workshopData.overview}
          </p>
        </section>

        {/* Who Should Attend */}
        <section>
          <h2 className="font-semibold text-foreground mb-2">Who Should Attend</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            {workshopData.whoShouldAttend}
          </p>
          <div className="space-y-2">
            {workshopData.checklistItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox id={`item-${i}`} />
                <label htmlFor={`item-${i}`} className="text-sm text-muted-foreground">
                  {item}
                </label>
              </div>
            ))}
          </div>
        </section>

        {/* Agenda */}
        <section>
          <h2 className="font-semibold text-foreground mb-2">Agenda</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {workshopData.agenda}
          </p>
        </section>

        {/* People Joined */}
        <section>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Avatar key={i} className="w-8 h-8 border-2 border-background">
                  <AvatarImage src={`https://i.pravatar.cc/32?img=${i + 30}`} />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <div>
              <p className="font-semibold text-foreground">{(workshopData.peopleJoined / 1000).toFixed(1)}K People Joined</p>
              <p className="text-xs text-muted-foreground">Develop a customized training plan tailored to your goals and fitness level.</p>
            </div>
          </div>
        </section>

        {/* How to Register */}
        <section>
          <h2 className="font-semibold text-foreground mb-2">How to Register</h2>
          <p className="text-sm text-muted-foreground">
            No matter your experience level, this workshop is structured to provide valuable insights and practical techniques for everyone.
          </p>
        </section>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex items-center justify-between safe-area-bottom">
        <div>
          <p className="text-xs text-muted-foreground">Workshop fee</p>
          <p className="text-2xl font-bold text-foreground">${workshopData.price}</p>
        </div>
        <Button className="px-8">Book Seat</Button>
      </div>
    </div>
  );
};

export default WorkshopDetail;
