// Garmin Connect™ on the Connected Devices screen. Connecting, sending workouts, sending
// routes and Jarvis's use of the data are separate choices, because Garmin requires separate consent.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Activity, AlertCircle, Loader2 } from "lucide-react";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useGarminConnection, GARMIN_CONNECTION_KEY } from "@/hooks/useGarminConnection";
import { callGarmin } from "@/lib/garmin-api";
import { garminErrorMessage, missingSharing } from "@/lib/garmin-state";
import { ROUTES } from "@/lib/routes";
import { finishGarminConnection, GARMIN_FLOW_KEY, type GarminFlow } from "./GarminReturnListener";

const GARMIN_PRIVACY_URL = "https://www.garmin.com/privacy/connect";
const SLOW_FINISH_MS = 15_000;
const CHOICES_SEEN_KEY = "garmin_removal_choices_seen";

type Sending = "workouts" | "routes";

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export function GarminConnectCard() {
  const { enabled, aiEnabled, loading, connection, state, refresh } = useGarminConnection();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const online = useOnline();

  const { data: flow } = useQuery<GarminFlow | null>({
    queryKey: GARMIN_FLOW_KEY,
    queryFn: () => null,
    staleTime: Infinity,
  });
  const setFlow = (next: GarminFlow | null) => queryClient.setQueryData(GARMIN_FLOW_KEY, next);

  const [noticeOpen, setNoticeOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [capReached, setCapReached] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [sendingNotice, setSendingNotice] = useState<Sending | null>(null);
  const [aiGrantOpen, setAiGrantOpen] = useState(false);
  const [aiWithdrawOpen, setAiWithdrawOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [slowFinish, setSlowFinish] = useState(false);
  const [choicesSeen, setChoicesSeen] = useState(() => localStorage.getItem(CHOICES_SEEN_KEY));

  const finishing = flow?.step === "finishing";
  useEffect(() => {
    setSlowFinish(false);
    if (!finishing) return;
    const timer = setTimeout(() => setSlowFinish(true), SLOW_FINISH_MS);
    return () => clearTimeout(timer);
  }, [finishing]);

  if (loading || !enabled) return null;

  const showError = (code: string | null) =>
    toast({ title: "Garmin", description: garminErrorMessage(code), variant: "destructive" });

  const startConnect = async () => {
    setNoticeOpen(false);
    setStarting(true);
    setFlow(null);
    const { data, error } = await callGarmin<{ url: string }>("garmin-oauth-start", { notice_accepted: true });
    setStarting(false);
    if (error === "cap_reached") return setCapReached(true);
    if (error || !data) return showError(error);
    await Browser.open({ url: data.url });
  };

  const retryFinish = () => {
    if (!flow?.result) return startConnect();
    return finishGarminConnection(flow.result, setFlow, () =>
      queryClient.invalidateQueries({ queryKey: GARMIN_CONNECTION_KEY }));
  };

  const setSending = async (kind: Sending, action: "consent" | "stop") => {
    setBusy(true);
    const { error } = await callGarmin(kind === "workouts" ? "garmin-workouts" : "garmin-courses", { action });
    await refresh();
    setBusy(false);
    setSendingNotice(null);
    if (error) showError(error);
  };

  const grantAi = async () => {
    setBusy(true);
    const { error } = await callGarmin("garmin-ai-consent", { action: "grant" });
    await refresh();
    setBusy(false);
    setAiGrantOpen(false);
    if (error) showError(error);
  };

  const withdrawAi = async (deletePlans: boolean) => {
    setBusy(true);
    const { error } = await callGarmin("garmin-ai-consent", { action: "withdraw", delete_plans: deletePlans });
    await refresh();
    setBusy(false);
    setAiWithdrawOpen(false);
    if (error) return showError(error);
    toast({ title: "Jarvis has stopped using your Garmin data" });
  };

  const disconnect = async (choices: { deleteImported: boolean; deleteAi: boolean; deletePlans: boolean }) => {
    setBusy(true);
    const { data, error } = await callGarmin<{ remove_in_garmin_connect?: boolean }>("garmin-disconnect", {
      delete_imported: choices.deleteImported,
      delete_ai_data: choices.deleteAi,
      delete_plans: choices.deleteAi && choices.deletePlans,
    });
    await refresh();
    setBusy(false);
    setDisconnectOpen(false);
    if (error) return showError(error);
    if (connection?.disconnected_at) {
      localStorage.setItem(CHOICES_SEEN_KEY, connection.disconnected_at);
      setChoicesSeen(connection.disconnected_at);
    }
    toast({
      title: "Garmin disconnected",
      description: data?.remove_in_garmin_connect
        ? "To finish, remove HIIT from Connected Apps in Garmin Connect."
        : undefined,
    });
  };

  const removedInGarmin = state === "removed_in_garmin";
  const isLinked = state === "connected" || state === "permission_off" || state === "needs_reconnect";
  const missing = state === "connected" && connection ? missingSharing(connection.permissions) : [];
  const native = Capacitor.isNativePlatform();
  const flowNote = !isLinked ? flowMessage(flow) : null;

  const connectButton = (label: string) => (
    <Button
      className="w-full"
      disabled={!online || !native || starting || finishing || capReached}
      onClick={() => setNoticeOpen(true)}
    >
      {starting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
      {capReached ? "Garmin connections are being restored" : label}
    </Button>
  );

  return (
    <section className="p-4 rounded-xl bg-secondary space-y-3" aria-label="Garmin Connect">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Garmin Connect™</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            {isLinked ? statusLine(connection?.last_activity_at) : "Bring in your Garmin workouts and health data, and send HIIT workouts and routes to your watch. Only new workouts will appear."}
          </p>
        </div>
      </div>

      {finishing && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Finishing your Garmin connection…
          </p>
          {slowFinish && <Button variant="outline" size="sm" onClick={retryFinish}>Try again</Button>}
        </div>
      )}

      {flowNote && !finishing && <p className="text-xs text-muted-foreground">{flowNote}</p>}
      {flow?.step === "failed" && !isLinked && (
        <Button variant="outline" size="sm" onClick={retryFinish} disabled={!online}>Try again</Button>
      )}

      {!online && <p className="text-xs text-muted-foreground">You're offline. Connect to the internet to change your Garmin connection.</p>}
      {!native && !isLinked && <p className="text-xs text-muted-foreground">Open HIIT on your phone to connect Garmin.</p>}

      {state === "not_connected" && connectButton("Connect Garmin Connect™")}

      {removedInGarmin && (
        <>
          <p className="text-xs text-muted-foreground">This was disconnected in Garmin Connect, so nothing new will arrive.</p>
          {choicesSeen !== connection?.disconnected_at && (
            <Button variant="outline" className="w-full" disabled={!online} onClick={() => setDisconnectOpen(true)}>
              Choose what happens to your data
            </Button>
          )}
          {connectButton("Connect Garmin Connect™")}
        </>
      )}

      {state === "needs_reconnect" && (
        <>
          <Warning>Your Garmin connection has stopped, so nothing new is coming through. Past data is safe.</Warning>
          {connectButton("Reconnect Garmin")}
        </>
      )}

      {state === "permission_off" && (
        <Warning>Sharing is off in Garmin Connect, so nothing new is coming through. Past data stays here. To turn it back on, open Garmin Connect, then Settings, Connected Apps, HIIT.</Warning>
      )}

      {missing.length > 0 && (
        <Warning>
          {missing.join(" ")} To change this, open Garmin Connect, then Settings, Connected Apps, HIIT.
        </Warning>
      )}

      {state === "connected" && connection && !connection.last_activity_at && (
        <p className="text-xs text-muted-foreground">Your next Garmin workout will appear here.</p>
      )}

      {isLinked && connection && (
        <div className="space-y-3 pt-2 border-t border-border/60">
          <ChoiceRow
            title="Send workouts to my watch"
            detail={connection.last_workout_pushed_at
              ? `Last sent ${formatDistanceToNow(new Date(connection.last_workout_pushed_at), { addSuffix: true })}`
              : "Your next 7 days of scheduled workouts go to your Garmin calendar."}
            checked={!!connection.workout_import_consented_at}
            disabled={busy || !online}
            onChange={on => on ? setSendingNotice("workouts") : setSending("workouts", "stop")}
          />
          <ChoiceRow
            title="Let me send routes to my watch"
            detail="Adds a Send to Garmin button on routes."
            checked={!!connection.course_import_consented_at}
            disabled={busy || !online}
            onChange={on => on ? setSendingNotice("routes") : setSending("routes", "stop")}
          />
          {aiEnabled && (
            <ChoiceRow
              title="Let Jarvis use my Garmin data"
              detail={connection.ai_consent_at
                ? "Jarvis uses your Garmin data in its advice."
                : "Off. Jarvis can't see your Garmin data."}
              checked={!!connection.ai_consent_at}
              disabled={busy || !online}
              onChange={on => on ? setAiGrantOpen(true) : setAiWithdrawOpen(true)}
            />
          )}
          <Button variant="outline" className="w-full" disabled={!online || busy} onClick={() => setDisconnectOpen(true)}>
            Disconnect Garmin
          </Button>
        </div>
      )}

      <Sheet open={noticeOpen} onOpenChange={setNoticeOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Connect Garmin Connect™</SheetTitle>
            <SheetDescription>Before you continue to Garmin</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 text-sm py-3">
            <p>HIIT will receive your Garmin workouts, including routes and heart rate, plus steps, sleep, stress, Body Battery, weight, VO2 max and HRV.</p>
            <p>We use this to show your history and work out your HIIT Score. Only workouts from now on will appear, not older ones.</p>
            <p>Jarvis won't use any of it unless you turn that on separately. You can disconnect at any time.</p>
            <p>
              <Link to={ROUTES.PRIVACY} className="underline">Read our privacy policy</Link>
            </p>
          </div>
          <Button className="w-full" onClick={startConnect}>Continue to Garmin</Button>
        </SheetContent>
      </Sheet>

      <SendingNoticeSheet
        kind={sendingNotice}
        busy={busy}
        onClose={() => setSendingNotice(null)}
        onAgree={kind => setSending(kind, "consent")}
      />

      <Sheet open={aiGrantOpen} onOpenChange={setAiGrantOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Let Jarvis use your Garmin data?</SheetTitle>
            <SheetDescription>This is optional. HIIT works without it.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 text-sm py-3">
            <p>If you turn this on, your Garmin workouts and health data are sent to Jarvis, our AI coach, which runs on Google's Gemini AI, to personalise your advice, plans and insights.</p>
            <p>It isn't used to train AI models. You can turn this off at any time here, which deletes the chats, memories and insights made since you turned it on.</p>
            <p><Link to={ROUTES.PRIVACY} className="underline">Read our privacy policy</Link></p>
          </div>
          <div className="space-y-2">
            <Button className="w-full" disabled={busy} onClick={grantAi}>Turn on</Button>
            <Button variant="ghost" className="w-full" onClick={() => setAiGrantOpen(false)}>Not now</Button>
          </div>
        </SheetContent>
      </Sheet>

      <WithdrawSheet open={aiWithdrawOpen} busy={busy} onClose={() => setAiWithdrawOpen(false)} onConfirm={withdrawAi} />

      <DisconnectSheet
        open={disconnectOpen}
        busy={busy}
        alreadyRemoved={removedInGarmin}
        usedAi={!!connection?.ai_purge_from}
        onClose={() => setDisconnectOpen(false)}
        onConfirm={disconnect}
      />
    </section>
  );
}

function statusLine(lastActivityAt: string | null | undefined): string {
  if (!lastActivityAt) return "Connected";
  return `Connected. Last workout ${formatDistanceToNow(new Date(lastActivityAt), { addSuffix: true })}.`;
}

function flowMessage(flow: GarminFlow | null | undefined): string | null {
  switch (flow?.step) {
    case "declined": return "Garmin wasn't connected. You can try again whenever you like.";
    case "failed": return "We couldn't finish connecting Garmin.";
    case "not_signed_in": return "Sign in to HIIT, then try connecting again.";
    case "already_linked": return "This Garmin account is linked to another HIIT account. Sign in to that account and disconnect Garmin there first.";
    default: return null;
  }
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 text-xs text-foreground leading-snug">
      <AlertCircle className="w-4 h-4 shrink-0 text-primary" />
      <span>{children}</span>
    </p>
  );
}

function ChoiceRow(props: {
  title: string;
  detail: string;
  checked: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-sm">{props.title}</span>
        <span className="block text-xs text-muted-foreground leading-snug">{props.detail}</span>
      </span>
      <Switch checked={props.checked} disabled={props.disabled} onCheckedChange={props.onChange} aria-label={props.title} />
    </label>
  );
}

function SendingNoticeSheet(props: {
  kind: Sending | null;
  busy: boolean;
  onClose: () => void;
  onAgree: (kind: Sending) => void;
}) {
  const things = props.kind === "routes" ? "routes" : "workouts";
  return (
    <Sheet open={!!props.kind} onOpenChange={open => { if (!open) props.onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Send {things} to Garmin?</SheetTitle>
          <SheetDescription>Please read this first</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 text-sm py-3">
          <p>Your {things} will be sent to Garmin and added to your Garmin Connect account. Garmin handles them under its own terms and may keep and use them, even if you stop sending or remove them later.</p>
          <p>Don't send anything you aren't allowed to upload to your Garmin Connect account.</p>
          <p>
            <button type="button" className="underline" onClick={() => void Browser.open({ url: GARMIN_PRIVACY_URL })}>
              Read Garmin's privacy notice
            </button>
          </p>
        </div>
        <div className="space-y-2">
          <Button className="w-full" disabled={props.busy} onClick={() => props.kind && props.onAgree(props.kind)}>
            I agree, send them
          </Button>
          <Button variant="ghost" className="w-full" onClick={props.onClose}>Not now</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function WithdrawSheet(props: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (deletePlans: boolean) => void;
}) {
  const [deletePlans, setDeletePlans] = useState(false);
  return (
    <Sheet open={props.open} onOpenChange={open => { if (!open) props.onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Stop Jarvis using your Garmin data?</SheetTitle>
          <SheetDescription>Jarvis stops seeing it straight away.</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 text-sm py-3">
          <p>This deletes your Jarvis chats, memories and insights from since you turned this on, and it can't be undone. Your completed workouts stay.</p>
          <label className="flex items-start gap-2">
            <Checkbox checked={deletePlans} onCheckedChange={v => setDeletePlans(v === true)} className="mt-0.5" />
            <span>Also delete plans Jarvis made in that time</span>
          </label>
        </div>
        <div className="space-y-2">
          <Button variant="ghost" className="w-full" onClick={props.onClose}>Keep it on</Button>
          <Button variant="destructive" className="w-full" disabled={props.busy} onClick={() => props.onConfirm(deletePlans)}>
            Turn off and delete
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DisconnectSheet(props: {
  open: boolean;
  busy: boolean;
  alreadyRemoved: boolean;
  usedAi: boolean;
  onClose: () => void;
  onConfirm: (choices: { deleteImported: boolean; deleteAi: boolean; deletePlans: boolean }) => void;
}) {
  const [deleteImported, setDeleteImported] = useState(false);
  const [deleteAi, setDeleteAi] = useState(false);
  const [deletePlans, setDeletePlans] = useState(false);
  return (
    <Sheet open={props.open} onOpenChange={open => { if (!open) props.onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{props.alreadyRemoved ? "What should happen to your data?" : "Disconnect Garmin?"}</SheetTitle>
          <SheetDescription>It's your data. Everything is kept unless you tick a box.</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 text-sm py-3">
          <label className="flex items-start gap-2">
            <Checkbox checked={deleteImported} onCheckedChange={v => setDeleteImported(v === true)} className="mt-0.5" />
            <span>Delete my imported Garmin workouts and health data</span>
          </label>
          {props.usedAi && (
            <>
              <label className="flex items-start gap-2">
                <Checkbox
                  checked={deleteAi}
                  onCheckedChange={v => {
                    setDeleteAi(v === true);
                    if (v !== true) setDeletePlans(false);
                  }}
                  className="mt-0.5"
                />
                <span>Delete Jarvis chats, memories and insights from since I let Jarvis use Garmin data</span>
              </label>
              {deleteAi && (
                <label className="flex items-start gap-2 pl-6">
                  <Checkbox checked={deletePlans} onCheckedChange={v => setDeletePlans(v === true)} className="mt-0.5" />
                  <span>Also delete plans Jarvis made in that time</span>
                </label>
              )}
              {!deleteAi && (
                <p className="text-xs text-muted-foreground">
                  Jarvis stops using your Garmin workouts, but can still read the chats and memories you keep.
                </p>
              )}
            </>
          )}
        </div>
        <div className="space-y-2">
          <Button variant="ghost" className="w-full" onClick={props.onClose}>
            {props.alreadyRemoved ? "Decide later" : "Stay connected"}
          </Button>
          <Button
            variant={props.alreadyRemoved ? "default" : "destructive"}
            className="w-full"
            disabled={props.busy}
            onClick={() => props.onConfirm({ deleteImported, deleteAi, deletePlans })}
          >
            {props.alreadyRemoved ? "Confirm" : "Disconnect"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
