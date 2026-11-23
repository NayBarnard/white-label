"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/IOSKit";
import { usePortalSession } from "@/components/PortalSessionProvider";
import { getPortalSupabaseClient } from "@/lib/supabase/portal";
import {
  clearAbsoluteSignInDeadline,
  getAbsoluteSignInDeadline,
  STAFF_ABSOLUTE_SESSION_MS,
  STAFF_IDLE_TIMEOUT_MS,
  STAFF_WARNING_DURATION_MS,
} from "@/lib/staff/mfa";

const WARNING_LEAD_TIME_MS = STAFF_IDLE_TIMEOUT_MS - STAFF_WARNING_DURATION_MS;

export function PortalInactivityGuard() {
  const session = usePortalSession();
  const router = useRouter();
  const [warningOpen, setWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [signOutError, setSignOutError] = useState("");
  const warningRef = useRef(false);
  const resetActivityRef = useRef<() => void>(() => {});

  const signOut = useCallback(async () => {
    try {
      const supabase = getPortalSupabaseClient();
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) {
        console.error("Automatic portal sign-out failed.", error);
        setSignOutError("We couldn't complete sign-out. Please try again or contact placeholder.");
        return;
      }
      warningRef.current = false;
      setWarningOpen(false);
      clearAbsoluteSignInDeadline();
      router.replace(
        session.role === "client"
          ? "/portal/dashboard"
          : session.role === "admin"
            ? "/admin/login"
            : session.role === "platform_operator"
              ? "/platform/login"
              : "/advisor/login",
      );
    } catch (error) {
      console.error("Automatic portal sign-out failed.", error);
      setSignOutError("We couldn't complete sign-out. Please try again or contact placeholder.");
    }
  }, [router, session.role]);

  useEffect(() => {
    if (session.status !== "signed-in") return;
    let absoluteTimer = 0;
    if (session.role !== "client") {
      const deadline = getAbsoluteSignInDeadline();
      const absoluteRemaining = deadline - Date.now();
      absoluteTimer = window.setTimeout(
        () => void signOut(),
        absoluteRemaining <= 0 ? 0 : Math.min(absoluteRemaining, STAFF_ABSOLUTE_SESSION_MS),
      );
    }

    let warningTimer: number;
    let signOutTimer: number;
    let countdownTimer: number;

    function scheduleInactivity() {
      window.clearTimeout(warningTimer);
      window.clearTimeout(signOutTimer);
      window.clearInterval(countdownTimer);
      warningTimer = window.setTimeout(() => {
        warningRef.current = true;
        setRemainingSeconds(STAFF_WARNING_DURATION_MS / 1000);
        setWarningOpen(true);
        const deadline = Date.now() + STAFF_WARNING_DURATION_MS;
        countdownTimer = window.setInterval(() => {
          setRemainingSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
        }, 1000);
        signOutTimer = window.setTimeout(() => void signOut(), STAFF_WARNING_DURATION_MS);
      }, WARNING_LEAD_TIME_MS);
    }

    function handleActivity(event: Event) {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-session-warning]")
      ) {
        return;
      }
      if (warningRef.current) {
        warningRef.current = false;
        setWarningOpen(false);
        setRemainingSeconds(60);
      }
      setSignOutError("");
      scheduleInactivity();
    }

    resetActivityRef.current = () => handleActivity(new Event("activity"));
    scheduleInactivity();
    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("scroll", handleActivity, { passive: true });

    return () => {
      window.clearTimeout(warningTimer);
      window.clearTimeout(signOutTimer);
      window.clearTimeout(absoluteTimer);
      window.clearInterval(countdownTimer);
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      resetActivityRef.current = () => {};
    };
  }, [session.status, session.role, signOut]);

  function staySignedIn() {
    resetActivityRef.current();
  }

  if (session.status !== "signed-in") return null;

  return (
    <div data-session-warning>
      <Sheet
        open={warningOpen}
        onClose={staySignedIn}
        title="Session expiring"
        className="portal-inactivity-sheet"
      >
        <div className="mx-auto max-w-xl space-y-4 pb-4">
          <p className="text-sm leading-6 text-[var(--foreground)]">
            For your security, you’ll be signed out in {remainingSeconds} seconds due to inactivity.
          </p>
          {signOutError ? (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-[var(--foreground)]">
              {signOutError}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={staySignedIn}
              className="min-h-11 flex-1 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]"
            >
              Stay signed in
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="min-h-11 flex-1 rounded-full border border-[var(--border-strong)] px-5 text-sm font-semibold text-[var(--foreground)]"
            >
              Sign out now
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
