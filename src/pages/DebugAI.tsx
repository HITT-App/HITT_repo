import { useState, useRef } from "react";
import { useAI } from "@/hooks/useAI";
import { supabase } from "@/integrations/supabase/client";

// Temporary debug page for 5A+5B verification.
// Navigate to /debug-ai to use.
// REMOVE before 5C ships.
export default function DebugAI() {
  const ai = useAI();
  const [input, setInput] = useState("");
  const [mealLogResult, setMealLogResult] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const checkMealLog = async () => {
    setChecking(true);
    setMealLogResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) { setMealLogResult("Not authenticated"); return; }

      const { data, error } = await supabase
        .from("meal_logs")
        .select("id, custom_name, category, calories, protein_grams, carbs_grams, fat_grams, fiber_grams, logged_at")
        .eq("user_id", userId)
        .order("logged_at", { ascending: false })
        .limit(1);

      if (error) { setMealLogResult(`DB error: ${error.message}`); return; }
      setMealLogResult(data && data.length > 0 ? JSON.stringify(data[0], null, 2) : "No rows found");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{ fontFamily: "monospace", padding: 16, maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>useAI debug — 5A+5B</h2>

      <div style={{ marginBottom: 8, padding: 8, background: "#f0f0f0", borderRadius: 4 }}>
        <b>Status:</b> {ai.status} &nbsp;|&nbsp;
        <b>Messages:</b> {ai.messages.length} &nbsp;|&nbsp;
        <b>Pending actions:</b> {ai.pendingActions.length}
      </div>

      {/* Pending actions — the key structured output to verify */}
      {ai.pendingActions.length > 0 && (
        <div style={{ marginBottom: 8, padding: 8, background: "#ffe0b2", borderRadius: 4 }}>
          <b>ACTIONS ({ai.pendingActions.length}):</b>
          {ai.pendingActions.map((a, i) => (
            <div key={i} style={{ marginTop: 4 }}>
              <span style={{ color: "green" }}>{a.type}</span>{" "}
              {"payload" in a && <span style={{ fontSize: 11 }}>{JSON.stringify(a.payload)}</span>}
              <button
                onClick={() => ai.dismissAction(i)}
                style={{ marginLeft: 8, fontSize: 11, cursor: "pointer" }}
              >
                dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Streaming text */}
      {ai.streamingText && (
        <div style={{ marginBottom: 8, padding: 8, background: "#e8f5e9", borderRadius: 4, fontSize: 13 }}>
          <b>Streaming:</b> {ai.streamingText}
        </div>
      )}

      {/* Error */}
      {ai.error && (
        <div style={{ marginBottom: 8, padding: 8, background: "#ffebee", borderRadius: 4, color: "red" }}>
          <b>Error:</b> {ai.error.message}
        </div>
      )}

      {/* Message history */}
      <div style={{ marginBottom: 8, maxHeight: 300, overflowY: "auto", border: "1px solid #ccc", padding: 8, borderRadius: 4 }}>
        {ai.messages.length === 0 && <i style={{ color: "#999" }}>No messages yet (loading...)</i>}
        {ai.messages.map(m => (
          <div key={m.id} style={{ marginBottom: 4 }}>
            <b style={{ color: m.role === "user" ? "blue" : "purple" }}>{m.role}:</b>{" "}
            <span style={{ fontSize: 13 }}>{m.content}</span>
            {m.actions && m.actions.length > 0 && (
              <span style={{ fontSize: 11, color: "green" }}> [{m.actions.map(a => a.type).join(", ")}]</span>
            )}
          </div>
        ))}
      </div>

      {/* Send */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && input.trim()) { ai.send(input.trim()); setInput(""); } }}
          placeholder="Type a message..."
          style={{ flex: 1, padding: 8, fontSize: 14, border: "1px solid #ccc", borderRadius: 4 }}
        />
        <button
          onClick={() => { if (input.trim()) { ai.send(input.trim()); setInput(""); } }}
          disabled={ai.status === "streaming"}
          style={{ padding: "8px 16px", cursor: "pointer" }}
        >
          Send
        </button>
        <button
          onClick={ai.abort}
          disabled={ai.status !== "streaming"}
          style={{ padding: "8px 8px", cursor: "pointer", color: "red" }}
        >
          Abort
        </button>
      </div>

      {/* Quick test buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => ai.send("I just ate a chicken caesar salad, can you log it?")}
          disabled={ai.status === "streaming"}
          style={{ fontSize: 12, padding: "4px 8px", cursor: "pointer", background: "#ff9800", color: "white", border: "none", borderRadius: 4 }}
        >
          TEST: Log caesar salad
        </button>
        <button
          onClick={() => ai.send("Hello, how are you?")}
          disabled={ai.status === "streaming"}
          style={{ fontSize: 12, padding: "4px 8px", cursor: "pointer" }}
        >
          Hello (no action)
        </button>
      </div>

      {/* meal_logs SQL check */}
      <div style={{ borderTop: "1px solid #ccc", paddingTop: 12 }}>
        <b style={{ fontSize: 13 }}>meal_logs check (most recent row for your account):</b>
        <div style={{ marginTop: 4 }}>
          <button onClick={checkMealLog} disabled={checking} style={{ fontSize: 12, padding: "4px 8px", cursor: "pointer" }}>
            {checking ? "Querying..." : "Run SQL check"}
          </button>
        </div>
        {mealLogResult && (
          <pre style={{ marginTop: 8, fontSize: 11, background: "#f5f5f5", padding: 8, borderRadius: 4, overflow: "auto" }}>
            {mealLogResult}
          </pre>
        )}
      </div>
    </div>
  );
}
