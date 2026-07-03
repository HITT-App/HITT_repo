import { useState } from "react";
import { ArrowLeft, Heart, MessageCircle, Share2, Settings, Volume2, VolumeX, ChevronUp } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

const shortData = {
  id: '1',
  title: 'How I Dropped School & Became Fitness Coach At 18',
  description: `In this video, I'll explain why I quit business school to chase my dream of becoming fitness coach. #coachlife`,
  author: {
    name: 'Coach Linda Lee',
    avatar: 'https://i.pravatar.cc/40?img=25',
  },
  tag: 'Diet',
  likes: 128,
  comments: 22,
  shares: 5,
  videoUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=700&fit=crop',
  duration: 301,
};

const ShortPlayer = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [currentTime, setCurrentTime] = useState(31);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black">
      {/* Video Background */}
      <div className="absolute inset-0">
        <img 
          src={shortData.videoUrl}
          alt={shortData.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10 safe-area-top">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/resources')}
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-white">Video Course</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/20"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* Swipe Hint */}
      {showSwipeHint && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-20 bg-black/40"
          onClick={() => setShowSwipeHint(false)}
        >
          <div className="text-center text-white">
            <ChevronUp className="w-12 h-12 mx-auto animate-bounce" />
            <p className="text-lg font-medium mt-2">Swipe to go next</p>
          </div>
        </div>
      )}

      {/* Side Actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-10">
        <button 
          onClick={() => setIsLiked(!isLiked)}
          className="flex flex-col items-center"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isLiked ? 'bg-red-500' : 'bg-white/20'
          }`}>
            <Heart className={`w-6 h-6 ${isLiked ? 'text-white fill-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-xs mt-1">{shortData.likes}</span>
        </button>
        
        <button className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs mt-1">{shortData.comments}</span>
        </button>
        
        <button className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs mt-1">{shortData.shares}</span>
        </button>
      </div>

      {/* Content Info */}
      <div className="absolute bottom-0 left-0 right-20 p-4 z-10 safe-area-bottom">
        {/* Tag */}
        <span className="inline-block bg-white/20 text-white text-xs px-2 py-1 rounded mb-2">
          🍎 {shortData.tag}
        </span>
        
        {/* Title */}
        <h2 className="text-white font-bold text-lg leading-tight">
          {shortData.title}
        </h2>
        
        {/* Author */}
        <div className="flex items-center gap-2 mt-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={shortData.author.avatar} />
            <AvatarFallback>{shortData.author.name[0]}</AvatarFallback>
          </Avatar>
          <span className="text-white text-sm">{shortData.author.name}</span>
        </div>
        
        {/* Description */}
        <p className="text-white/80 text-sm mt-2 line-clamp-2">
          {shortData.description}
        </p>

        {/* Progress */}
        <div className="mt-4">
          <Progress value={(currentTime / shortData.duration) * 100} className="h-1 bg-white/30" />
        </div>
      </div>

      {/* Volume Toggle */}
      <button 
        onClick={() => setIsMuted(!isMuted)}
        className="absolute left-4 bottom-32 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center z-10"
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>
    </div>
  );
};

export default ShortPlayer;
