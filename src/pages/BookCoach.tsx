import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCoach } from '@/hooks/useCoaches';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, Star, Clock, MapPin, Calendar, 
  CreditCard, Check, ChevronRight, User, Mail, Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';

type BookingStep = 'info' | 'slot' | 'payment' | 'confirm';

const TIME_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
];

export default function BookCoach() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { coach, loading } = useCoach(id);

  const [step, setStep] = useState<BookingStep>('info');
  const [coachingType, setCoachingType] = useState<'in-person' | 'remote'>('in-person');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  const price = coachingType === 'in-person' 
    ? coach?.price_per_session_max 
    : coach?.price_per_session_min;

  const handleSubmit = async () => {
    if (!user || !coach || !selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('coaching_sessions').insert({
        user_id: user.id,
        coach_id: coach.id,
        session_type: coachingType,
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
        scheduled_time: selectedTime.replace(' AM', ':00').replace(' PM', ':00'),
        duration_minutes: 30,
        price: price || 100,
        status: 'scheduled',
        user_full_name: fullName,
        user_email: email,
        user_phone: phone,
        notes: notes,
      });

      if (error) throw error;

      setStep('confirm');
      toast({ title: 'Session booked!', description: 'Your coaching session has been scheduled.' });
    } catch (error) {
      console.error('Error booking session:', error);
      toast({ variant: 'destructive', title: 'Booking failed', description: 'Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Confirmation Screen
  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
          <Check className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Appointment successfully scheduled.</h1>
        <p className="text-muted-foreground mb-8">Congratulations, you've successfully booked your appointment.</p>

        <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-4 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Avatar>
              <AvatarImage src={coach.avatar_url || undefined} />
              <AvatarFallback>{coach.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{coach.name}</p>
              <p className="text-xs text-muted-foreground">${price}/session</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{selectedDate && format(selectedDate, 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span>{selectedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="capitalize">{coachingType}</span>
            </div>
          </div>
        </div>

        <div className="w-full space-y-3">
          <Button onClick={() => navigate('/coach-appointments')} className="w-full h-12 rounded-2xl">
            Continue →
          </Button>
          <Button variant="outline" onClick={() => navigate(`/coach/${coach.id}`)} className="w-full h-12 rounded-2xl">
            See Invoice
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => step === 'info' ? navigate(-1) : setStep('info')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold">Book Session</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 py-4 px-6">
        {['Personal Info', 'Date & Time', 'Payment'].map((label, idx) => {
          const stepOrder: BookingStep[] = ['info', 'slot', 'payment'];
          const isActive = stepOrder.indexOf(step) >= idx;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {idx + 1}
              </div>
              {idx < 2 && <div className={cn("w-8 h-0.5", isActive ? "bg-primary" : "bg-muted")} />}
            </div>
          );
        })}
      </div>

      {/* Coach Summary */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl">
          <Avatar>
            <AvatarImage src={coach.avatar_url || undefined} />
            <AvatarFallback>{coach.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">{coach.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="w-3 h-3 fill-primary text-primary" />
              <span>{coach.rating}</span>
              <span>•</span>
              <span>{coach.session_count}+ sessions</span>
            </div>
          </div>
          <Badge variant="outline">${price}</Badge>
        </div>
      </div>

      <div className="px-6">
        {/* Step 1: Personal Info */}
        {step === 'info' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold mb-4">Coaching Type</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'in-person', label: 'In-person', price: coach.price_per_session_max, icon: MapPin },
                  { id: 'remote', label: 'Remote', price: coach.price_per_session_min, icon: Clock },
                ].map(type => {
                  const Icon = type.icon;
                  const selected = coachingType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setCoachingType(type.id as 'in-person' | 'remote')}
                      className={cn(
                        "p-4 rounded-2xl border text-left transition-all",
                        selected ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <Icon className={cn("w-5 h-5 mb-2", selected ? "text-primary" : "text-muted-foreground")} />
                      <p className="font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground">Rate: ${type.price}/session</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="font-semibold">Identification</h2>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes & Instructions (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter your main text here..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Date & Time Selection */}
        {step === 'slot' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold mb-4">Choose Your Slot</h2>
              
              {/* Date Selection */}
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-3">Today</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {dates.slice(0, 4).map((date, idx) => {
                    const selected = selectedDate?.toDateString() === date.toDateString();
                    const isToday = idx === 0;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDate(date)}
                        className={cn(
                          "flex-shrink-0 w-16 py-3 rounded-xl border text-center transition-all",
                          selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        )}
                      >
                        <p className="text-xs">{format(date, 'EEE')}</p>
                        <p className="font-bold">{format(date, 'd')}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-3">Tomorrow</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {dates.slice(4).map((date, idx) => {
                    const selected = selectedDate?.toDateString() === date.toDateString();
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDate(date)}
                        className={cn(
                          "flex-shrink-0 w-16 py-3 rounded-xl border text-center transition-all",
                          selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        )}
                      >
                        <p className="text-xs">{format(date, 'EEE')}</p>
                        <p className="font-bold">{format(date, 'd')}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground mb-3">Available Times</p>
                  <div className="grid grid-cols-3 gap-2">
                    {TIME_SLOTS.map(time => {
                      const selected = selectedTime === time;
                      const isAvailable = Math.random() > 0.3; // Mock availability
                      return (
                        <button
                          key={time}
                          onClick={() => isAvailable && setSelectedTime(time)}
                          disabled={!isAvailable}
                          className={cn(
                            "py-2 px-3 rounded-xl border text-sm transition-all",
                            selected ? "border-primary bg-primary text-primary-foreground" :
                            isAvailable ? "border-border hover:border-primary" : "border-border opacity-50 cursor-not-allowed"
                          )}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedDate && selectedTime && (
                <p className="text-sm text-muted-foreground mt-4">
                  You selected: {format(selectedDate, 'MMMM d, yyyy')} at {selectedTime}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Payment Summary */}
        {step === 'payment' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold mb-4">Payment Summary</h2>
              <div className="space-y-3 p-4 bg-card border border-border rounded-2xl">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1x Coaching Session ({coachingType})</span>
                  <span>${price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Fee</span>
                  <span>$2.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Admin Fee</span>
                  <span>$1.00</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${(price || 0) + 3}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-secondary rounded-2xl">
              <p className="text-xs text-muted-foreground text-center">
                ⚠️ Cancellations must be made at least 24 hours in advance to avoid a fee.
              </p>
            </div>
          </div>
        )}
      </div>

      </div>
      {/* Fixed Bottom CTA */}
      <div className="shrink-0 p-4 bg-background/80 backdrop-blur-sm border-t border-border">
        <Button
          className="w-full h-12 rounded-2xl"
          disabled={
            (step === 'info' && (!fullName || !email)) ||
            (step === 'slot' && (!selectedDate || !selectedTime)) ||
            isSubmitting
          }
          onClick={() => {
            if (step === 'info') setStep('slot');
            else if (step === 'slot') setStep('payment');
            else handleSubmit();
          }}
        >
          {step === 'payment' ? (isSubmitting ? 'Booking...' : 'Confirm Booking') : 'Continue →'}
        </Button>
      </div>
    </div>
  );
}
