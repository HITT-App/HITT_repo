import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, GripVertical, Star, Crown, Zap } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price_amount: number;
  period: string;
  icon: string;
  is_popular: boolean;
  is_active: boolean;
  features: string[];
  limitations: string[];
  sort_order: number;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  star: Star,
  crown: Crown,
  zap: Zap,
};

const emptyPlan: Omit<Plan, "id"> = {
  name: "",
  price_amount: 0,
  period: "/month",
  icon: "star",
  is_popular: false,
  is_active: true,
  features: [],
  limitations: [],
  sort_order: 0,
};

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState(emptyPlan);
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

  useEffect(() => {
    fetchPlans();
  }, []);

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
      price_amount: plan.price_amount,
      period: plan.period,
      icon: plan.icon,
      is_popular: plan.is_popular,
      is_active: plan.is_active,
      features: plan.features,
      limitations: plan.limitations,
      sort_order: plan.sort_order,
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
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq("id", editingPlan.id);
        if (error) throw error;
        toast({ title: "Plan updated" });
      } else {
        const { error } = await supabase
          .from("subscription_plans")
          .insert(form);
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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error deleting plan" });
    } else {
      toast({ title: "Plan deleted" });
      fetchPlans();
    }
  };

  const addFeature = () => {
    if (!featureInput.trim()) return;
    setForm((f) => ({ ...f, features: [...f.features, featureInput.trim()] }));
    setFeatureInput("");
  };

  const removeFeature = (i: number) => {
    setForm((f) => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));
  };

  const addLimitation = () => {
    if (!limitationInput.trim()) return;
    setForm((f) => ({ ...f, limitations: [...f.limitations, limitationInput.trim()] }));
    setLimitationInput("");
  };

  const removeLimitation = (i: number) => {
    setForm((f) => ({ ...f, limitations: f.limitations.filter((_, idx) => idx !== i) }));
  };

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
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {plans.length} plan{plans.length !== 1 ? "s" : ""} configured · Currency: £ GBP
          </p>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Add Plan
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const IconComp = ICON_MAP[plan.icon] || Star;
            return (
              <Card key={plan.id} className={!plan.is_active ? "opacity-50" : ""}>
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
                          <span className="text-sm font-normal text-muted-foreground">
                            {plan.period}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {plan.is_popular && (
                        <Badge variant="default" className="text-xs">Popular</Badge>
                      )}
                      {!plan.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    {plan.features.map((f, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-green-500">✓</span> {f}
                      </p>
                    ))}
                    {plan.limitations.map((l, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span>×</span> {l}
                      </p>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEdit(plan)}>
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleDelete(plan.id)}>
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Period</Label>
                <Input value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} placeholder="/month" />
              </div>
              <div>
                <Label>Icon</Label>
                <select
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
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
              <Label>Features</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  placeholder="Add a feature..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                />
                <Button type="button" size="sm" onClick={addFeature}>Add</Button>
              </div>
              <div className="mt-2 space-y-1">
                {form.features.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted rounded px-2 py-1 text-sm">
                    <span>✓ {f}</span>
                    <button onClick={() => removeFeature(i)} className="text-destructive text-xs">Remove</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Limitations */}
            <div>
              <Label>Limitations</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={limitationInput}
                  onChange={(e) => setLimitationInput(e.target.value)}
                  placeholder="Add a limitation..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLimitation())}
                />
                <Button type="button" size="sm" onClick={addLimitation}>Add</Button>
              </div>
              <div className="mt-2 space-y-1">
                {form.limitations.map((l, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted rounded px-2 py-1 text-sm">
                    <span>× {l}</span>
                    <button onClick={() => removeLimitation(i)} className="text-destructive text-xs">Remove</button>
                  </div>
                ))}
              </div>
            </div>
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
    </AdminLayout>
  );
}
