import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCoach } from '@/hooks/useCoaches';
import { 
  ArrowLeft, Star, MapPin, Clock, Phone, Mail, 
  Heart, Share2, MessageCircle, Calendar, Play,
  CheckCircle, Globe, Award, Users, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CoachProfile() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { coach, reviews, loading } = useCoach(id);
  const [activeTab, setActiveTab] = useState('overview');
  const [isFavorite, setIsFavorite] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground mb-4">Coach not found</p>
        <Button onClick={() => navigate('/browse-coaches')}>Browse Coaches</Button>
      </div>
    );
  }

  const ratingDistribution = [5, 4, 3, 2, 1].map(r => ({
    rating: r,
    count: reviews.filter(rev => rev.rating === r).length,
    percentage: reviews.length > 0 ? (reviews.filter(rev => rev.rating === r).length / reviews.length) * 100 : 0,
  }));

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      <div className="flex-1 overflow-y-auto pb-24">
      {/* Hero Section */}
      <div className="relative h-64">
        <img
          src={coach.gallery_urls?.[0] || coach.avatar_url || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800'}
          alt={coach.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="bg-background/50 backdrop-blur">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsFavorite(!isFavorite)} className="bg-background/50 backdrop-blur">
              <Heart className={cn("w-5 h-5", isFavorite && "fill-red-500 text-red-500")} />
            </Button>
            <Button variant="ghost" size="icon" className="bg-background/50 backdrop-blur">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Coach Avatar */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <Avatar className="w-24 h-24 border-4 border-background">
            <AvatarImage src={coach.avatar_url || undefined} alt={coach.name} />
            <AvatarFallback className="text-2xl">{coach.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Coach Info */}
      <div className="pt-16 px-6 text-center">
        <Badge variant="secondary" className="mb-2">Certified Trainer</Badge>
        <h1 className="text-2xl font-bold">{coach.name}</h1>
        <p className="text-muted-foreground">{coach.title}</p>
        
        <div className="flex items-center justify-center gap-4 mt-3">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-primary text-primary" />
            <span className="font-medium">{coach.rating}</span>
          </div>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{coach.session_count}+ Sessions</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-primary">${coach.price_per_session_min}-${coach.price_per_session_max}</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="w-full justify-around bg-transparent border-b border-border rounded-none h-auto p-0">
          {['Overview', 'Reviews'].map(tab => (
            <TabsTrigger
              key={tab}
              value={tab.toLowerCase()}
              className={cn(
                "flex-1 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              )}
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="px-6 py-4 space-y-6">
          {/* About */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">About</h2>
              <Button variant="link" size="sm" className="text-primary p-0">Read More</Button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{coach.bio}</p>
          </section>

          {/* Coaching Type */}
          <section>
            <h2 className="font-semibold mb-3">Coaching Type</h2>
            <div className="flex gap-2">
              {coach.coaching_types?.map(type => (
                <Badge key={type} variant="outline" className="px-3 py-1">
                  {type === 'in-person' ? '🏋️ In-Person' : type === 'video-call' ? '📹 Video Call' : '📞 Phone Call'}
                </Badge>
              ))}
            </div>
          </section>

          {/* Specialties */}
          <section>
            <h2 className="font-semibold mb-3">Specialties</h2>
            <div className="flex flex-wrap gap-2">
              {coach.specialties?.map(spec => (
                <Badge key={spec} variant="secondary">{spec}</Badge>
              ))}
            </div>
          </section>

          {/* Gallery */}
          {coach.gallery_urls && coach.gallery_urls.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Gallery</h2>
                <Button variant="link" size="sm" className="text-primary p-0">See All</Button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {coach.gallery_urls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Gallery ${idx + 1}`}
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Availability */}
          <section>
            <h2 className="font-semibold mb-3">Availability</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">In-person</p>
                    <p className="text-xs text-muted-foreground">{coach.available_days?.join(', ')}</p>
                  </div>
                </div>
                <span className="text-primary font-medium">${coach.price_per_session_max}/session</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Play className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Remote</p>
                    <p className="text-xs text-muted-foreground">{coach.available_days?.join(', ')}</p>
                  </div>
                </div>
                <span className="text-primary font-medium">${coach.price_per_session_min}/session</span>
              </div>
            </div>
          </section>

          {/* Experience */}
          <section>
            <h2 className="font-semibold mb-3">Experience</h2>
            <p className="text-sm text-muted-foreground mb-4">{coach.bio?.slice(0, 150)}...</p>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{coach.experience_years}y</p>
                <p className="text-xs text-muted-foreground">Training</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{coach.session_count}+</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </div>
            </div>
          </section>

          {/* Certifications */}
          {coach.certifications && coach.certifications.length > 0 && (
            <section>
              <h2 className="font-semibold mb-3">Certifications</h2>
              <div className="space-y-2">
                {coach.certifications.map((cert, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                    <Award className="w-5 h-5 text-primary" />
                    <span className="text-sm">{cert}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Languages */}
          <section>
            <h2 className="font-semibold mb-3">Language Spoken</h2>
            <div className="space-y-2">
              {coach.languages?.map((lang, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm">{lang}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{idx === 0 ? 'Proficient' : 'Decent'}</span>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="reviews" className="px-6 py-4 space-y-6">
          {/* Rating Summary */}
          <section className="flex gap-6">
            <div className="text-center">
              <p className="text-5xl font-bold">{coach.rating}</p>
              <div className="flex gap-0.5 my-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={cn(
                      "w-4 h-4",
                      star <= Math.round(coach.rating) ? "fill-primary text-primary" : "text-muted"
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{coach.review_count} reviews</p>
            </div>
            <div className="flex-1 space-y-1">
              {ratingDistribution.map(({ rating, percentage }) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-xs w-3">{rating}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Reviews List */}
          <section>
            <h2 className="font-semibold mb-3">{reviews.length} reviews</h2>
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No reviews yet</p>
              ) : (
                reviews.map(review => (
                  <div key={review.id} className="p-4 bg-card border border-border rounded-2xl">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Anonymous</p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-0.5 my-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={cn(
                                "w-3 h-3",
                                star <= review.rating ? "fill-primary text-primary" : "text-muted"
                              )}
                            />
                          ))}
                        </div>
                        {review.review_text && (
                          <p className="text-sm text-muted-foreground mt-2">{review.review_text}</p>
                        )}
                        {review.is_verified && (
                          <div className="flex items-center gap-1 mt-2">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            <span className="text-xs text-green-500">Verified Session</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </TabsContent>
      </Tabs>

      </div>
      {/* Fixed Bottom CTA */}
      <div className="shrink-0 p-4 bg-background/80 backdrop-blur-sm border-t border-border">
        <div className="flex gap-3 max-w-md mx-auto">
          <Button
            variant="outline"
            size="icon"
            className="rounded-2xl h-12 w-12"
            onClick={() => navigate(`/chat-coach/${coach.id}`)}
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button
            className="flex-1 h-12 rounded-2xl"
            onClick={() => navigate(`/book-coach/${coach.id}`)}
          >
            Book Coaching Session →
          </Button>
        </div>
      </div>
    </div>
  );
}
