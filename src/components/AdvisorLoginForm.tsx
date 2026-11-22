"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getPortalSupabaseClient } from "@/lib/supabase/portal";
import { clearAbsoluteSignInDeadline, getAbsoluteSignInDeadline } from "@/lib/staff/mfa";
import { getPostLoginDestination } from "@/lib/staff/routing";

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

const inputClass =
  "mt-2 min-h-12 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

type AdvisorLoginFormProps = {
  allowedRole?: "adviser" | "admin";
};

export function AdvisorLoginForm({ allowedRole = "adviser" }: AdvisorLoginFormProps) {
  const router = useRouter();
  const isConfigured = hasSupabaseConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaQrCode, setMfaQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [staffRole, setStaffRole] = useState<"adviser" | "admin">("adviser");
  const [message, setMessage] = useState(
    isConfigured
      ? ""
      : "Staff sign-in is unavailable right now. Please contact your organisation.",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isConfigured) return;

    setBusy(true);
    setMessage("");
    try {
      const preflight = await fetch("/api/auth/staff-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, expectedRole: allowedRole }),
        cache: "no-store",
      });
      if (preflight.status === 429 || preflight.status === 503) {
        setMessage("We couldn't sign you in. Please try again later.");
        return;
      }
      const supabase = getPortalSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("Advisor authentication failed.", error);
        setMessage("We couldn't sign you in. Check your details or contact your organisation for staff access.");
        return;
      }

      const actualRole = data.user.app_metadata.role;
      if (
        (allowedRole === "adviser" && actualRole !== "adviser") ||
        (allowedRole === "admin" && actualRole !== "admin")
      ) {
        const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
        if (signOutError) {
          console.error("A non-staff session could not be cleared after staff login.", signOutError);
        }
        setMessage(
          allowedRole === "admin"
            ? "This sign-in is for authorised administrators only."
            : "This sign-in is for authorised advisers only.",
        );
        return;
      }
      const signedInRole = actualRole === "admin" ? "admin" : "adviser";
      setStaffRole(signedInRole);

      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error || !assurance.data) {
        console.error("Staff MFA status could not be loaded.", assurance.error);
        await supabase.auth.signOut({ scope: "global" });
        setMessage("We couldn't verify secure sign-in. Please try again.");
        return;
      }
      if (assurance.data.currentLevel === "aal1" && assurance.data.nextLevel === "aal2") {
        const factors = await supabase.auth.mfa.listFactors();
        if (factors.error) {
          console.error("Staff MFA factors could not be loaded.", factors.error);
          await supabase.auth.signOut({ scope: "global" });
          setMessage("We couldn't prepare secure sign-in. Please try again.");
          return;
        }
        const verifiedTotp = factors.data.totp.find((factor) => factor.status === "verified");
        if (verifiedTotp) {
          const challenge = await supabase.auth.mfa.challenge({ factorId: verifiedTotp.id });
          if (challenge.error) {
            console.error("Staff MFA challenge could not be created.", challenge.error);
            setMessage("We couldn't start secure sign-in. Please try again.");
            return;
          }
          setMfaFactorId(verifiedTotp.id);
          setMfaChallengeId(challenge.data.id);
          setMessage("Enter the code from your authenticator app.");
          return;
        }

        const enrollment = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Firm staff authenticator" });
        if (enrollment.error) {
          console.error("Staff MFA enrollment could not be started.", enrollment.error);
          setMessage("Secure sign-in setup is unavailable right now.");
          return;
        }
        const challenge = await supabase.auth.mfa.challenge({ factorId: enrollment.data.id });
        if (challenge.error) {
          console.error("Staff MFA enrollment challenge could not be created.", challenge.error);
          setMessage("Secure sign-in setup is unavailable right now.");
          return;
        }
        setMfaFactorId(enrollment.data.id);
        setMfaChallengeId(challenge.data.id);
        setMfaQrCode(enrollment.data.totp.qr_code);
        setMfaSecret(enrollment.data.totp.secret);
        setMessage("Set up your authenticator app, then enter the current code.");
        return;
      }

      getAbsoluteSignInDeadline();
      router.replace(getPostLoginDestination(signedInRole) ?? "/advisor/login");
      router.refresh();
    } catch (error) {
      console.error("Could not complete advisor sign-in.", error);
      setMessage("We couldn't complete sign-in right now. Please try again or contact your organisation.");
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setMessage("Enter your staff email address, then choose reset password.");
      return;
    }
    setBusy(true);
    try {
      const supabase = getPortalSupabaseClient();
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: new URL("/auth/callback?flow=recovery", window.location.origin).toString(),
      });
      setMessage("If this is a staff account, password reset instructions have been sent.");
    } catch (error) {
      console.error("Staff password reset could not be requested.", error);
      setMessage("If this is a staff account, password reset instructions have been sent.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMfaVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mfaFactorId || !mfaChallengeId) return;
    if (!/^\d{6}$/.test(mfaCode)) {
      setMessage("Enter a six-digit authenticator code.");
      return;
    }
    setBusy(true);
    try {
      const supabase = getPortalSupabaseClient();
      const verification = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code: mfaCode,
      });
      if (verification.error) {
        console.error("Staff MFA verification failed.", verification.error);
        setMessage("That code was not accepted. Try the current code.");
        return;
      }
      getAbsoluteSignInDeadline();
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!assurance.data || assurance.data.currentLevel !== "aal2") {
        setMessage("Additional sign-in verification is required.");
        return;
      }
      const recoveryStatus = await supabase.auth.mfa.recoveryCodes.getStatus();
      if (recoveryStatus.error) {
        const generated = await supabase.auth.mfa.recoveryCodes.generate({ friendlyName: "Firm staff recovery codes" });
        if (!generated.error) {
          setRecoveryCodes(generated.data.codes);
          setMfaCode("");
          setBusy(false);
          return;
        }
      }
      router.replace(staffRole === "admin" ? "/admin" : "/advisor");
      router.refresh();
    } catch (error) {
      console.error("Staff MFA verification could not be completed.", error);
      setMessage("Secure sign-in could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRecoveryVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = mfaCode.trim();
    if (!code) {
      setMessage("Enter one of your recovery codes.");
      return;
    }
    setBusy(true);
    try {
      const supabase = getPortalSupabaseClient();
      const verification = await supabase.auth.mfa.recoveryCodes.verify({ code });
      if (verification.error) {
        console.error("Staff recovery code verification failed.", verification.error);
        setMessage("That recovery code was not accepted.");
        return;
      }
      getAbsoluteSignInDeadline();
      const user = await supabase.auth.getUser();
      if (user.error || !user.data.user) {
        setMessage("Secure sign-in could not be completed. Please try again.");
        return;
      }
      const role = user.data.user.app_metadata.role;
      const roleMatches =
        (allowedRole === "adviser" && role === "adviser") ||
        (allowedRole === "admin" && role === "admin");
      if (!roleMatches) {
        await supabase.auth.signOut({ scope: "global" });
        clearAbsoluteSignInDeadline();
        setMessage("This is staff sign-in only.");
        return;
      }
      router.replace(role === "admin" ? "/admin" : "/advisor");
      router.refresh();
    } catch (error) {
      console.error("Staff recovery code verification could not be completed.", error);
      setMessage("Secure sign-in could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-5 py-12 lg:px-8 lg:py-16">
      <section className="placeholder-glass-card w-full max-w-lg rounded-3xl p-6 sm:p-9">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]">
            <ShieldCheck size={23} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-[var(--accent)]">
              SECURE STAFF ACCESS
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
              Staff sign-in
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Sign in with your authorised {allowedRole === "admin" ? "administrator" : "adviser"} account credentials.
            </p>
          </div>
        </div>

        {recoveryCodes.length > 0 ? (
          <section className="mt-8 space-y-4" aria-label="MFA recovery codes">
            <p className="text-sm leading-6 text-[var(--foreground)]">
              Store these recovery codes now. They cannot be shown again.
            </p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Recovery codes">
              {recoveryCodes.map((code) => (
                <li key={code} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-center font-mono text-sm">
                  {code}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                clearAbsoluteSignInDeadline();
                getAbsoluteSignInDeadline();
                router.replace(staffRole === "admin" ? "/admin" : "/advisor");
                router.refresh();
              }}
              className="min-h-12 w-full rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]"
            >
              I HAVE SAVED THESE CODES
            </button>
          </section>
        ) : mfaFactorId ? (
          <form onSubmit={(event) => void (useRecoveryCode ? handleRecoveryVerify(event) : handleMfaVerify(event))} className="mt-8 space-y-5">
            {mfaQrCode && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="mb-3 text-sm leading-6 text-[var(--foreground)]">
                  Scan this QR code with your authenticator app.
                </p>
                {/* Supabase provides a base64 QR payload for first-time enrollment. */}
                <Image
                  src={mfaQrCode.startsWith("data:") ? mfaQrCode : `data:image/svg+xml;base64,${mfaQrCode}`}
                  alt="Authenticator setup QR code"
                  width={176}
                  height={176}
                  className="mx-auto h-44 w-44 rounded-lg bg-white p-2"
                />
                {mfaSecret && (
                  <p className="mt-3 break-all text-center font-mono text-xs text-[var(--muted)]">
                    Manual setup key: {mfaSecret}
                  </p>
                )}
              </div>
            )}
            <label className="block text-sm font-medium text-[var(--foreground)]">
              {useRecoveryCode ? "Recovery code" : "Authenticator code"}
              <input
                type="text"
                inputMode={useRecoveryCode ? "text" : "numeric"}
                autoComplete={useRecoveryCode ? "off" : "one-time-code"}
                pattern={useRecoveryCode ? undefined : "[0-9]{6}"}
                maxLength={useRecoveryCode ? 20 : 6}
                required
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="min-h-12 w-full rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]"
            >
              {busy ? "VERIFYING…" : "VERIFY AND CONTINUE"}
            </button>
            <button
              type="button"
              onClick={() => {
                setUseRecoveryCode((current) => !current);
                setMfaCode("");
                setMessage(useRecoveryCode ? "Enter one unused recovery code." : "Enter the code from your authenticator app.");
              }}
              className="min-h-11 w-full text-sm font-semibold text-[var(--accent)] underline underline-offset-4"
            >
              {useRecoveryCode ? "Use authenticator app instead" : "Use a recovery code instead"}
            </button>
          </form>
        ) : (
        <form onSubmit={(event) => void handleSubmit(event)} className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Email address
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Password
            <span className="mt-2 flex items-center rounded-xl border border-[var(--border-strong)] bg-[var(--background)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-12 min-w-0 flex-1 bg-transparent px-4 text-sm text-[var(--foreground)] outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="mr-1 inline-flex size-10 items-center justify-center rounded-full text-[var(--muted)]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            </span>
          </label>
          <button
            type="button"
            onClick={() => void handleForgotPassword()}
            disabled={busy}
            className="min-h-11 text-sm font-semibold text-[var(--accent)] underline underline-offset-4"
          >
            Forgot password
          </button>
          <button
            type="submit"
            disabled={busy || !isConfigured}
            className="min-h-12 w-full rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)] shadow-[0_8px_20px_rgba(149,109,8,0.16)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "SIGNING IN…" : "SIGN IN"}
          </button>
        </form>
        )}

        {message && (
          <p role="status" aria-live="polite" className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--muted)]">
            {message}
          </p>
        )}

        <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
          Only authorised staff accounts can sign in here.
          <a
            className="ml-1 font-semibold text-[var(--accent)] underline underline-offset-2"
            href="/contact"
          >
            Contact your organisation for sign-in help.
          </a>
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--accent)]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to website
        </Link>
      </section>
    </main>
  );
}
