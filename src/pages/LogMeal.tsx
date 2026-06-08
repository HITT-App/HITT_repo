import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Analytics } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';
import { recordActiveDay } from '@/lib/activeDay';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Camera, Scan, Upload, Apple, Coffee, Sandwich, UtensilsCrossed, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const MEAL_CATEGORIES = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee },
  { id: 'lunch', label: 'Lunch', icon: Sandwich },
  { id: 'dinner', label: 'Dinner', icon: UtensilsCrossed },
  { id: 'snack', label: 'Snack', icon: Apple },
];

const FOOD_ICONS = [
  '🍕', '🍔', '🥗', '🍳', '🥐', '🍜', '🍱', '🥘',
  '🥑', '🍝', '🌮', '🥙', '🍲', '🥩', '🍚', '🥯',
];

export default function LogMeal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const prefill = location.state?.recipe as { name: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null; veg_swap?: string | null; vegan_swap?: string | null } | undefined;
  const useSwap = location.state?.useSwap as boolean | undefined;

  const [showMethodSelect, setShowMethodSelect] = useState(!prefill);
  const [mealName, setMealName] = useState(prefill?.name ?? '');
  const [servingAmount, setServingAmount] = useState(1);
  const [servingUnit, setServingUnit] = useState('plate');
  const [category, setCategory] = useState('breakfast');
  const [description, setDescription] = useState(
    useSwap && prefill ? `${prefill.veg_swap || prefill.vegan_swap || ''}` : ''
  );
  const [calories, setCalories] = useState(prefill?.calories ?? 500);
  const [protein, setProtein] = useState(prefill?.protein_g ?? 25);
  const [carbs, setCarbs] = useState(prefill?.carbs_g ?? 50);
  const [fat, setFat] = useState(prefill?.fat_g ?? 20);
  const [selectedIcon, setSelectedIcon] = useState('🍳');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [submitToDatabase, setSubmitToDatabase] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setUploadedImages(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    if (!user || !mealName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a meal name' });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from('meal_logs').insert({
        user_id: user.id,
        custom_name: `${selectedIcon} ${mealName}`,
        category,
        calories,
        protein_grams: protein,
        fat_grams: fat,
        carbs_grams: carbs,
        servings: servingAmount,
        notes: description,
        image_url: uploadedImages[0] || null,
      });

      if (error) throw error;

      recordActiveDay(supabase, user.id).catch(() => {})
      Analytics.mealLogged('manual');
      setShowSuccess(true);
      setTimeout(() => {
        navigate('/nutrition');
      }, 2000);
    } catch (error) {
      console.error('Error logging meal:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to log meal' });
    } finally {
      setIsLoading(false);
    }
  };

  if (showMethodSelect) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Add New Meal</h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-32 h-32 rounded-2xl bg-secondary flex items-center justify-center mb-6 overflow-hidden">
            <img 
              src="/placeholder.svg" 
              alt="Meal" 
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-xl font-bold mb-2">Log your meal & nutrition</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Please select how you'd like to log your meal
          </p>

          <div className="w-full space-y-3">
            <Button 
              className="w-full h-12 rounded-2xl gap-2"
              onClick={() => setShowMethodSelect(false)}
            >
              Add manually <Plus className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-2xl gap-2"
              onClick={() => navigate('/meal-scanner')}
            >
              <Scan className="w-4 h-4" /> Scan with AI
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => setShowMethodSelect(true)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Add New Meal (Manual)</h1>
      </header>

      {prefill && (
        <div className={`mx-4 mt-4 p-3 rounded-xl border text-sm ${useSwap ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-primary/10 border-primary/30 text-primary'}`}>
          {useSwap
            ? `Logging with substitutions from "${prefill.name}"`
            : `Pre-filled from "${prefill.name}" — adjust any values below`}
        </div>
      )}

      <div className="p-4 space-y-6">
        {/* Icon Selector */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowIconPicker(true)}
            className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl hover:bg-primary/20 transition-colors"
          >
            {selectedIcon}
          </button>
        </div>

        {/* General Section */}
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary" />
              General
            </div>

            {/* Meal Name */}
            <div className="space-y-2">
              <Label>Meal Name</Label>
              <Input
                placeholder="Tomato Omelet"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
              />
            </div>

            {/* Serving Amount & Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Serving Amount</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setServingAmount(Math.max(1, servingAmount - 1))}
                  >
                    −
                  </Button>
                  <span className="w-8 text-center">{servingAmount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setServingAmount(servingAmount + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Serving unit</Label>
                <Select value={servingUnit} onValueChange={setServingUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plate">Plate</SelectItem>
                    <SelectItem value="bowl">Bowl</SelectItem>
                    <SelectItem value="cup">Cup</SelectItem>
                    <SelectItem value="piece">Piece</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Meal Category */}
            <div className="space-y-2">
              <Label>Meal Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Meal Description (Optional)</Label>
              <Textarea
                placeholder="Just a simple tomato omelette nothing special xD"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">{description.length}/300</p>
            </div>
          </CardContent>
        </Card>

        {/* Nutritional Value Section */}
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Nutritional Value
            </div>

            {/* Calories */}
            <div className="space-y-2">
              <Label>Calories</Label>
              <div className="space-y-2">
                <Slider
                  value={[calories]}
                  onValueChange={([v]) => setCalories(v)}
                  max={2000}
                  step={10}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Moderate</span>
                  <span>{calories}kcal</span>
                </div>
              </div>
            </div>

            {/* Protein */}
            <div className="space-y-2">
              <Label>Protein</Label>
              <Select value={protein.toString()} onValueChange={(v) => setProtein(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 15, 20, 25, 30, 40, 50].map((g) => (
                    <SelectItem key={g} value={g.toString()}>{g}g</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Carb & Fat */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Carb</Label>
                <Select value={carbs.toString()} onValueChange={(v) => setCarbs(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[20, 30, 50, 75, 100, 150, 200].map((g) => (
                      <SelectItem key={g} value={g.toString()}>{g}mg</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fat</Label>
                <Select value={fat.toString()} onValueChange={(v) => setFat(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 15, 20, 30, 50, 75, 100].map((g) => (
                      <SelectItem key={g} value={g.toString()}>{g}mg</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image Upload Section */}
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Image Screenshot
            </div>

            <div className="flex gap-2">
              <label className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
              {uploadedImages.map((img, idx) => (
                <div key={idx} className="w-16 h-16 rounded-xl overflow-hidden">
                  <img src={img} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Browse your file to upload! Supported Formats: SVG, JPG, PNG (10mb each)
            </p>
          </CardContent>
        </Card>

        {/* Submit Toggle */}
        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
          <div>
            <p className="font-medium text-sm">Submit meal to database?</p>
            <p className="text-xs text-muted-foreground">Toggle this option to contribute the data to us. 👍</p>
          </div>
          <Switch checked={submitToDatabase} onCheckedChange={setSubmitToDatabase} />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !mealName.trim()}
          className="w-full h-12 rounded-2xl gap-2"
        >
          {isLoading ? 'Logging...' : 'Log Meal'} <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Icon Picker Dialog */}
      <Dialog open={showIconPicker} onOpenChange={setShowIconPicker}>
        <DialogContent className="max-w-sm">
          <h3 className="font-semibold mb-4">Select Icon or Image</h3>
          <Input placeholder="Search for an icon..." className="mb-4" />
          <div className="grid grid-cols-6 gap-2">
            {FOOD_ICONS.map((icon) => (
              <button
                key={icon}
                onClick={() => {
                  setSelectedIcon(icon);
                  setShowIconPicker(false);
                }}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-xl hover:bg-secondary transition-colors",
                  selectedIcon === icon && "bg-primary/20"
                )}
              >
                {icon}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-sm text-center">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Food Added!</h2>
          <p className="text-muted-foreground">You have successfully logged your food!</p>
          <Button 
            className="w-full h-12 rounded-2xl mt-4"
            onClick={() => navigate('/nutrition')}
          >
            Great, thanks!
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
