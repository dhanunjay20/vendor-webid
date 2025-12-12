import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

// Auto logout after inactivity (10 minutes)
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export default function AutoLogout() {
  const navigate = useNavigate();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // logout function
    const doLogout = () => {
      try {
        localStorage.clear();
      } catch (e) {
        // ignore
      }
      try {
        navigate("/", { replace: true });
        setTimeout(() => {
          if (window.location.pathname !== "/") {
            window.location.href = "/";
          }
        }, 150);
      } catch (e) {
        window.location.href = "/";
      }
      try {
        toast({ title: "Logged out", description: "You have been logged out due to inactivity." });
      } catch (e) {
        // toast may not be available; ignore
      }
    };

    // Reset timer if user is authenticated
    const resetTimer = () => {
      // only run when user appears authenticated
      if (!localStorage.getItem("authToken")) {
        // no auth token, no need to set timer
        if (timerRef.current) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(doLogout, INACTIVITY_TIMEOUT);
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    activityEvents.forEach((ev) => window.addEventListener(ev, resetTimer, true));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) resetTimer();
    });

    // initialize
    resetTimer();

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetTimer, true));
      document.removeEventListener("visibilitychange", () => {
        if (!document.hidden) resetTimer();
      });
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [navigate]);

  return null;
}
