"use client";

import { Puck, type Data } from "@puckeditor/core";
import type { User } from "@supabase/supabase-js";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  defaultHomePageData,
  homePageConfig,
  isHomePageData,
  type HomePageComponents,
} from "@/components/home/HomePageEditorConfig";
import { getPortalSupabaseClient } from "@/lib/supabase/portal";

type StudioAccess = "loading" | "unconfigured" | "signed-out" | "not-admin" | "admin" | "error";
type HomePageData = Data<HomePageComponents>;
type PortalClient = ReturnType<typeof getPortalSupabaseClient>;

export function HomePageStudio() {
  const supabaseRef = useRef<PortalClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<StudioAccess>(() =>
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? "loading"
      : "unconfigured",
  );
  const [pageData, setPageData] = useState<HomePageData | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState(() =>
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? ""
      : "Website editing is unavailable right now. Please try again later.",
  );
  const [publishMessage, setPublishMessage] = useState("");

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return;
    }
    let active = true;
    let unsubscribe: (() => void) | null = null;
    const updateAccess = (nextUser: User | null) => {
      if (!active) return;
      setUser(nextUser);
      setAccess(
        !nextUser
          ? "signed-out"
          : nextUser.app_metadata?.role === "admin"
            ? "admin"
            : "not-admin",
      );
    };

    async function initializeAuth() {
      const client = getPortalSupabaseClient();
      if (!active) return;
      supabaseRef.current = client;
      const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
        updateAccess(session?.user ?? null);
      });
      unsubscribe = () => authListener.subscription.unsubscribe();

      const { data, error } = await client.auth.getSession();
      if (!active) return;
      if (error) {
        console.error("Website studio access could not be checked.", error);
        setAccess("error");
        setAuthMessage("We couldn't check access right now. Please try again or contact placeholder.");
        return;
      }
      updateAccess(data.session?.user ?? null);
    }

    void initializeAuth().catch((error: unknown) => {
      if (!active) return;
      console.error("Website studio access could not be checked.", error);
      setAccess("error");
      setAuthMessage("We couldn't check access right now. Please try again or contact placeholder.");
    });

    return () => {
      active = false;
      unsubscribe?.();
      supabaseRef.current = null;
    };
  }, []);

  useEffect(() => {
    const client = supabaseRef.current;
    if (!client || !user || access !== "admin") return;
    let active = true;

    async function loadPublishedPage(portalClient: PortalClient) {
      setPageData(null);
      setPublishMessage("");
      const { data, error } = await portalClient
        .from("site_pages")
        .select("content")
        .eq("slug", "home")
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.error("Saved homepage content could not be loaded.", error);
        setPublishMessage("We couldn't load the saved homepage right now. Please try again.");
        return;
      }

      const content = data?.content ?? defaultHomePageData;
      if (!isHomePageData(content)) {
        setPublishMessage("The saved homepage content is invalid. The editor was not loaded.");
        return;
      }
      setPageData(content);
    }

    void loadPublishedPage(client).catch((error: unknown) => {
      if (!active) return;
      console.error("Saved homepage content could not be loaded.", error);
      setPublishMessage("We couldn't load the saved homepage right now. Please try again.");
    });
    return () => {
      active = false;
    };
  }, [access, user]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = supabaseRef.current;
    if (!supabase) return;
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("Website studio sign-in failed.", error);
        setAuthMessage("We couldn't sign you in. Please check your details and try again.");
        return;
      }
      setUser(data.user);
      if (data.user.app_metadata?.role === "admin") {
        setAccess("admin");
      } else {
        setAccess("not-admin");
        setAuthMessage("This account does not have access.");
      }
    } catch (error) {
      console.error("Website studio sign-in failed.", error);
      setAuthMessage("We couldn't sign you in right now. Please try again or contact placeholder.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Website studio sign-out failed.", error);
        setAuthMessage("We couldn't sign you out right now. Please try again.");
        return;
      }
      setPageData(null);
      setAccess("signed-out");
    } catch (error) {
      console.error("Website studio sign-out failed.", error);
      setAuthMessage("We couldn't sign you out right now. Please try again.");
    }
  }

  async function handlePublish(data: HomePageData) {
    const supabase = supabaseRef.current;
    if (!supabase || !user) {
      setPublishMessage("Sign in with an administrator account before publishing.");
      return;
    }
    if (!isHomePageData(data)) {
      setPublishMessage("The page data is invalid and was not published.");
      return;
    }

    setPublishMessage("Publishing changes…");
    try {
      const { error } = await supabase.from("site_pages").upsert(
        {
          slug: "home",
          content: data,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        },
        { onConflict: "slug" },
      );
      if (error) {
        console.error("Homepage publishing failed.", error);
        setPublishMessage("We couldn't publish the homepage right now. Please try again.");
        return;
      }
      setPageData(data);
      setPublishMessage("Homepage published. Visitors will see the updated design on their next request.");
    } catch (error) {
      console.error("Homepage publishing failed.", error);
      setPublishMessage("We couldn't publish the homepage right now. Please try again.");
    }
  }

  if (access === "loading") {
    return <p className="p-8 text-sm text-[var(--muted)]">Checking studio access…</p>;
  }

  if (access !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-12">
        <section className="placeholder-glass-card w-full max-w-md rounded-2xl p-7 sm:p-9">
          <p className="text-xs font-bold tracking-[0.2em] text-[var(--accent)]">PLACEHOLDER BRAND</p>
          <h1 className="mt-3 text-3xl font-semibold">Website studio</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Sign in with an administrator account to edit and publish the public homepage.
          </p>
          {access === "signed-out" && (
            <form onSubmit={handleSignIn} className="mt-7 space-y-4">
              <label className="block text-sm font-medium">
                Email
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/25"
                />
              </label>
              <label className="block text-sm font-medium">
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/25"
                />
              </label>
              <button
                type="submit"
                disabled={authBusy}
                className="min-h-11 w-full rounded-full bg-[var(--accent-fill)] px-4 text-sm font-bold text-[var(--button-text)] transition hover:brightness-110 disabled:opacity-50"
              >
                {authBusy ? "SIGNING IN…" : "SIGN IN"}
              </button>
            </form>
          )}
          {access === "unconfigured" && (
            <p role="alert" className="mt-6 rounded-xl border border-[#C5A880]/30 bg-[#C5A880]/5 p-4 text-sm text-[var(--foreground)]">
              {authMessage}
            </p>
          )}
          {access === "error" && (
            <p role="alert" className="mt-6 rounded-xl border border-red-700 bg-red-50 p-4 text-sm text-red-800 dark:border-red-400 dark:bg-red-950 dark:text-red-100">
              {authMessage}
            </p>
          )}
          {access === "not-admin" && (
            <div className="mt-6 rounded-xl border border-[#C5A880]/30 bg-[#C5A880]/5 p-4 text-sm leading-6 text-[var(--foreground)]">
              <p>This account is authenticated but is not authorized to edit site content.</p>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="mt-3 font-semibold text-[var(--accent)] underline underline-offset-2"
              >
                Sign out
              </button>
            </div>
          )}
          {authMessage && access === "signed-out" && (
            <p role="alert" className="mt-4 text-sm text-red-800 dark:text-red-100">{authMessage}</p>
          )}
          <Link
            href="/"
            className="mt-7 inline-flex text-xs font-semibold text-[var(--muted)] underline underline-offset-2 hover:text-[var(--accent)]"
          >
            Return to the website
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-[200] flex flex-col bg-[var(--background)]">
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs">
        <p className="font-semibold text-[var(--foreground)]">
          PLACEHOLDER BRAND homepage studio <span className="ml-2 text-[var(--muted)]">{user?.email}</span>
        </p>
        <div className="flex items-center gap-4">
          <p role="status" aria-live="polite" className="text-[var(--muted)]">{publishMessage}</p>
          <Link href="/" className="font-semibold text-[var(--accent)] hover:underline">
            Home
          </Link>
          <button type="button" onClick={() => void handleSignOut()} className="font-semibold text-[var(--foreground)] hover:text-[var(--accent)]">
            Sign out
          </button>
        </div>
      </div>
      {!pageData && !publishMessage && <p className="p-8 text-sm text-[var(--muted)]">Loading homepage content…</p>}
      {pageData && (
        <div className="min-h-0 flex-1">
          <Puck
            config={homePageConfig}
            data={pageData}
            headerPath="/"
            headerTitle="PLACEHOLDER BRAND homepage"
            height="100%"
            onChange={() => setPublishMessage("You have unpublished edits. Use Publish to make them live.")}
            onPublish={handlePublish}
          />
        </div>
      )}
      {!pageData && publishMessage && (
        <p role="alert" className="m-6 rounded-xl border border-red-700 bg-red-50 p-4 text-sm text-red-800 dark:border-red-400 dark:bg-red-950 dark:text-red-100">
          {publishMessage}
        </p>
      )}
    </main>
  );
}
