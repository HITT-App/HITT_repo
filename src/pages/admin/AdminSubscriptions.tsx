import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Plus, Pencil, Trash2, Star, Crown, Zap,
  Clock, Users, Eye, EyeOff, ArrowUp, ArrowDown, Copy,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_amount: number;
  period: string;
  icon: string;
  is_popular: boolean;
  is_active: boolean;
  features: string[];
  limitations: string[];
  sort_order: number;
  trial_days: number;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  star: Star,
  crown: Crown,
  zap: Zap,
};

type FormState = Omit<Plan, "id">;

const emptyPlan: FormState = {
  name: "",
  description: null,
  price_amount: 0,
  period: "/month",
  icon: "star",
  is_popular: false,
  is_active: true,
  features: [],
  limitations: [],
  sort_order: 0,
  trial_days: 0,
};

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<FormState>(emptyPlan);
  const [featureInput, setFeatureInput] = useState("");
  const [limitationInput, setLimitationInput] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("sort_order");

    if (error) {
      toast({ variant: "destructive", title: "Error loading plans" });
    } else {
      setPlans((data as Plan[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const openCreate = () => {
    setEditingPlan(null);
    setForm({ ...emptyPlan, sort_order: plans.length });
    setFeatureInput("");
    setLimitationInput("");
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description,
      price_amount: plan.price_amount,
      period: plan.period,
      icon: plan.icon,
      is_popular: plan.is_popular,
      is_active: plan.is_active,
      features: [...plan.features],
      limitations: [...plan.limitations],
      sort_order: plan.sort_order,
      trial_days: plan.trial_days,
    });
    setFeatureInput("");
    setLimitationInput("");
    setDialogOpen(true);
  };

  const duplicatePlan = (plan: Plan) => {
    setEditingPlan(null);
    setForm({
      name: `${plan.name} (Copy)`,
      description: plan.description,
      price_amount: plan.price_amount,
      period: plan.period,
      icon: plan.icon,
      is_popular: false,
      is_active: false,
      features: [...plan.features],
      limitations: [...plan.limitations],
      sort_order: plans.length,
      trial_days: plan.trial_days,
    });
    setFeatureInput("");
    setLimitationInput("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Plan name is required" });
      return;
    }
    setSaving(true);
    try {
      if (editingPlan) {
        const { error } = await supabase
          .from("subscription_plans")
          .update({ ...form, updated_at: new Date().toISOString() } as any)
          .eq("id", editingPlan.id);
        if (error) throw error;
        toast({ title: "Plan updated" });
      } else {
        const { error } = await supabase
          .from("subscription_plans")
          .insert(form as any);
        if (error) throw error;
        toast({ title: "Plan created" });
      }
      setDialogOpen(false);
      fetchPlans();
    } catch {
      toast({ variant: "destructive", title: "Error saving plan" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("subscription_plans").delete().eq("id", deleteId);
    if (error) {
      toast({ variant: "destructive", title: "Error deleting plan" });
    } else {
      toast({ title: "Plan deleted" });
      fetchPlans();
    }
    setDeleteId(null);
  };

  const movePlan = async (plan: Plan, direction: "up" | "down") => {
    const idx = plans.findIndex((p) => p.id === plan.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= plans.length) return;

    const other = plans[swapIdx];
    await Promise.all([
      supabase.from("subscription_plans").update({ sort_order: other.sort_order } as any).eq("id", plan.id),
      supabase.from("subscription_plans").update({ sort_order: plan.sort_order } as any).eq("id", other.id),
    ]);
    fetchPlans();
  };

  const toggleActive = async (plan: Plan) => {
    await supabase
      .from("subscription_plans")
      .update({ is_active: !plan.is_active, updated_at: new Date().toISOString() } as any)
      .eq("id", plan.id);
    fetchPlans();
    toast({ title: `${plan.name} ${!plan.is_active ? "activated" : "deactivated"}` });
  };

  const addFeature = () => {
    if (!featureInput.trim()) return;
    setForm((f) => ({ ...f, features: [...f.features, featureInput.trim()] }));
    setFeatureInput("");
  };
  const removeFeature = (i: number) => setForm((f) => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));
  const addLimitation = () => {
    if (!limitationInput.trim()) return;
    setForm((f) => ({ ...f, limitations: [...f.limitations, limitationInput.trim()] }));
    setLimitationInput("");
  };
  const removeLimitation = (i: number) => setForm((f) => ({ ...f, limitations: f.limitations.filter((_, idx) => idx !== i) }));

  const activePlans = plans.filter((p) => p.is_active).length;

  if (loading) {
    return (
      <AdminLayout title="Subscriptions" description="Manage subscription plans">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Subscriptions" description="Manage subscription plans & pricing">
      <div className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total Plans</p>
            <p className="text-2xl font-bold">{plans.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-green-500">{activePlans}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">With Trial</p>
            <p className="text-2xl font-bold text-blue-500">{plans.filter((p) => p.trial_days > 0).length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Currency</p>
            <p className="text-2xl font-bold">£ GBP</p>
          </Card>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Drag to reorder · Click eye to toggle visibility
          </p>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Add Plan
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, idx) => {
            const IconComp = ICON_MAP[plan.icon] || Star;
            return (
              <Card key={plan.id} className={!plan.is_active ? "opacity-50 border-dashed" : "border-border"}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <IconComp className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                        <p className="text-lg font-bold">
                          {plan.price_amount === 0 ? "Free" : `£${plan.price_amount.toFixed(2)}`}
                          <span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-1">
                        {plan.is_popular && <Badge variant="default" className="text-xs">Popular</Badge>}
                        {plan.trial_days > 0 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock className="w-3 h-3" /> {plan.trial_days}d trial
                          </Badge>
                        )}
                      </div>
                      {!plan.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                    </div>
                  </div>
                  {plan.description && (
                    <p className="text-xs text-muted-foreground mt-2">{plan.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {plan.features.map((f, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-green-500 shrink-0">✓</span> {f}
                      </p>
                    ))}
                    {plan.limitations.map((l, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="shrink-0">×</span> {l}
                      </p>
                    ))}
                  </div>
                  <div className="flex gap-1 pt-2 flex-wrap">
                    <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => openEdit(plan)}>
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => duplicatePlan(plan)} title="Duplicate">
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => toggleActive(plan)} title={plan.is_active ? "Deactivate" : "Activate"}>
                      {plan.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => movePlan(plan, "up")} disabled={idx === 0} title="Move up">
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => movePlan(plan, "down")} disabled={idx === plans.length - 1} title="Move down">
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => setDeleteId(plan.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create Plan"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Plan Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard" />
              </div>
              <div>
                <Label>Price (£ GBP)</Label>
                <Input type="number" step="0.01" min="0" value={form.price_amount} onChange={(e) => setForm((f) => ({ ...f, price_amount: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description || ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))}
                placeholder="Short tagline for this plan..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Period</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={form.period}
                  onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                >
                  <option value="/month">/month</option>
                  <option value="/year">/year</option>
                  <option value="/week">/week</option>
                  <option value="">(one-time)</option>
                </select>
              </div>
              <div>
                <Label>Icon</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                >
                  <option value="zap">⚡ Zap</option>
                  <option value="star">⭐ Star</option>
                  <option value="crown">👑 Crown</option>
                </select>
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" min="0" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Free Trial (days)</Label>
                <Input type="number" min="0" value={form.trial_days} onChange={(e) => setForm((f) => ({ ...f, trial_days: parseInt(e.target.value) || 0 }))} placeholder="0" />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_popular} onCheckedChange={(v) => setForm((f) => ({ ...f, is_popular: v }))} />
                <Label>Most Popular</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                <Label>Active</Label>
              </div>
            </div>

            {/* Features */}
            <div>
              <Label>Features ({form.features.length})</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  placeholder="Add a feature..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                />
                <Button type="button" size="sm" onClick={addFeature}>Add</Button>
              </div>
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {form.features.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted rounded px-2 py-1 text-sm">
                    <span className="truncate">✓ {f}</span>
                    <button onClick={() => removeFeature(i)} className="text-destructive text-xs shrink-0 ml-2">Remove</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Limitations */}
            <div>
              <Label>Limitations ({form.limitations.length})</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={limitationInput}
                  onChange={(e) => setLimitationInput(e.target.value)}
                  placeholder="Add a limitation..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLimitation())}
                />
                <Button type="button" size="sm" onClick={addLimitation}>Add</Button>
              </div>
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {form.limitations.map((l, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted rounded px-2 py-1 text-sm">
                    <span className="truncate">× {l}</span>
                    <button onClick={() => removeLimitation(i)} className="text-destructive text-xs shrink-0 ml-2">Remove</button>
                  </div>
                ))}
              </div>
            </div>

            {form.trial_days > 0 && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
                <p className="text-sm text-blue-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Users will get a <strong>{form.trial_days}-day free trial</strong> before being charged.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingPlan ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the plan. Users currently on this plan won't be affected, but new signups won't see it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
