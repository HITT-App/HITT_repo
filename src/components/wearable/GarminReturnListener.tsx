// Finishes a Garmin connection when Garmin's page sends the user back. Lives at the app root,
// because Android can close the app while the browser is open, so the screen that started
// the flow may no longer exist.
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { callGarmin } from "@/lib/garmin-api";
import { parseGarminReturn } from "@/lib/garmin-state";
import { GARMIN_CONNECTION_KEY } from "@/hooks/useGarminConnection";

export const GARMIN_FLOW_KEY = ["garmin", "flow"];

export type GarminFlow =
  | { step: "finishing"; result: string; startedAt: number }
  | { step: "done" | "declined" | "failed" | "already_linked" | "not_signed_in"; result?: string };

export async function finishGarminConnection(
  result: string,
  setFlow: (flow: GarminFlow) => void,
  refresh: () => Promise<unknown>,
) {
  setFlow({ step: "finishing", result, startedAt: Date.now() });
  const { error } = await callGarmin("garmin-oauth-finish", { result });
  await refresh();
  if (!error) return setFlow({ step: "done" });
  if (error === "already_linked") return setFlow({ step: "already_linked" });
  if (error === "unauthorized") return setFlow({ step: "not_signed_in", result });
  // Offline, or the answer was lost after it worked. The card works out which from the connection.
  setFlow({ step: "failed", result: error === "network" ? result : undefined });
}

export function GarminReturnListener() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const handled = useRef(new Set<string>());

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handle = async (url: string) => {
      const parsed = parseGarminReturn(url);
      if (!parsed || handled.current.has(url)) return;
      handled.current.add(url);
      await Browser.close().catch(() => undefined);
      navigate("/connected-devices");

      const setFlow = (flow: GarminFlow) => queryClient.setQueryData(GARMIN_FLOW_KEY, flow);
      if (parsed.status !== "pending") return setFlow({ step: parsed.status });
      await finishGarminConnection(parsed.result, setFlow, () =>
        queryClient.invalidateQueries({ queryKey: GARMIN_CONNECTION_KEY }));
    };

    const listener = App.addListener("appUrlOpen", ({ url }) => void handle(url));
    void App.getLaunchUrl().then(launch => { if (launch?.url) void handle(launch.url); });
    return () => { void listener.then(l => l.remove()); };
  }, [navigate, queryClient]);

  return null;
}
