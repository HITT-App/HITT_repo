/**
 * Security Logging Utility
 * 
 * Provides structured logging with correlation IDs for security event tracking.
 * GDPR-compliant: No raw PII is logged, only hashed identifiers.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
  correlationId?: string;
  userId?: string;
  endpoint?: string;
  eventType?: string;
  [key: string]: unknown;
}

// Generate a correlation ID for request tracing
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

// Hash a value for GDPR-compliant logging (no raw PII)
export async function hashForLogging(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

// Structured logger
export function log(level: LogLevel, message: string, context: LogContext = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "hiit-app-frontend",
    correlationId: context.correlationId || generateCorrelationId(),
    ...context,
  };

  // Mask any sensitive data that might accidentally be passed
  const maskedEntry = maskSensitiveData(logEntry);

  switch (level) {
    case "error":
      console.error(JSON.stringify(maskedEntry));
      break;
    case "warn":
      console.warn(JSON.stringify(maskedEntry));
      break;
    case "debug":
      if (import.meta.env.DEV) {
        console.debug(JSON.stringify(maskedEntry));
      }
      break;
    default:
      console.log(JSON.stringify(maskedEntry));
  }

  // Store critical errors for later retrieval
  if (level === "error") {
    storeErrorLog(maskedEntry);
  }
}

// Mask known sensitive field patterns
function maskSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitivePatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /api_?key/i,
    /auth/i,
    /credit_?card/i,
    /email/i,
    /phone/i,
  ];

  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitivePatterns.some((pattern) => pattern.test(key))) {
      masked[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      masked[key] = maskSensitiveData(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

// Store error logs locally for debugging
function storeErrorLog(logEntry: Record<string, unknown>) {
  try {
    const existingLogs = JSON.parse(localStorage.getItem("securityLogs") || "[]");
    existingLogs.push(logEntry);
    // Keep only last 100 logs
    while (existingLogs.length > 100) {
      existingLogs.shift();
    }
    localStorage.setItem("securityLogs", JSON.stringify(existingLogs));
  } catch {
    // Silently fail if localStorage unavailable
  }
}

// Security event types for monitoring
export const SecurityEventTypes = {
  AUTH_SUCCESS: "auth_success",
  AUTH_FAILURE: "auth_failure",
  AUTH_LOGOUT: "auth_logout",
  SESSION_EXPIRED: "session_expired",
  RATE_LIMIT_HIT: "rate_limit_hit",
  ADMIN_ACCESS: "admin_access",
  SENSITIVE_DATA_ACCESS: "sensitive_data_access",
  API_ERROR: "api_error",
  PERMISSION_DENIED: "permission_denied",
  SUSPICIOUS_ACTIVITY: "suspicious_activity",
} as const;

// Log a security event
export function logSecurityEvent(
  eventType: (typeof SecurityEventTypes)[keyof typeof SecurityEventTypes],
  context: LogContext = {}
) {
  const level: LogLevel = 
    eventType === SecurityEventTypes.AUTH_FAILURE ||
    eventType === SecurityEventTypes.PERMISSION_DENIED ||
    eventType === SecurityEventTypes.SUSPICIOUS_ACTIVITY
      ? "warn"
      : "info";

  log(level, `Security event: ${eventType}`, {
    ...context,
    eventType,
  });
}

// Retrieve stored logs for debugging
export function getStoredLogs(): Record<string, unknown>[] {
  try {
    return JSON.parse(localStorage.getItem("securityLogs") || "[]");
  } catch {
    return [];
  }
}

// Clear stored logs
export function clearStoredLogs() {
  try {
    localStorage.removeItem("securityLogs");
  } catch {
    // Silently fail
  }
}
