"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ArrowLeft, ArrowRight, Download, ShieldCheck } from "lucide-react";
import { company } from "@/data/firmData";
import { features } from "@/config/features";

type InvestorProfile = {
  fullName: string;
  email: string;
  phone: string;
  riskTolerance: string;
  timeHorizon: string;
};

type InvestmentChoice = {
  strategy: string;
  investmentTier: string;
  initialInvestment: string;
};

const steps = ["Investor profile", "Investment selection", "Review"];
const inputClass =
  "mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";
const labelClass = "block text-sm font-medium text-[var(--foreground)]";

function pdfSafe(value: string) {
  return value.replace(/[^\x20-\x7E]/g, " ").trim();
}

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<InvestorProfile>({
    fullName: "",
    email: "",
    phone: "",
    riskTolerance: "",
    timeHorizon: "",
  });
  const [investment, setInvestment] = useState<InvestmentChoice>({
    strategy: "",
    investmentTier: "",
    initialInvestment: "",
  });
  const [status, setStatus] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [popiConsent, setPopiConsent] = useState(false);
  const [website, setWebsite] = useState("");

  function continueToInvestment() {
    if (
      !profile.fullName.trim() ||
      !profile.email.trim() ||
      (features.onboardingSubmit && !profile.phone.trim()) ||
      !profile.riskTolerance ||
      !profile.timeHorizon
    ) {
      setStatus("Complete each investor profile field before continuing.");
      return;
    }
    setStatus("");
    setStep(1);
  }

  function continueToReview() {
    if (!investment.strategy || !investment.investmentTier || !investment.initialInvestment) {
      setStatus("Select a strategy, investment tier, and intended initial investment.");
      return;
    }
    if (!Number.isFinite(Number(investment.initialInvestment)) || Number(investment.initialInvestment) <= 0) {
      setStatus("Enter a valid initial investment amount greater than zero.");
      return;
    }
    setStatus("");
    setStep(2);
  }

  async function submitQuestionnaire() {
    if (submitting || submitted) return;
    if (!popiConsent) {
      setStatus("Add your consent before saving the demonstration questionnaire.");
      return;
    }
    const message = [
      `Risk tolerance: ${profile.riskTolerance}`,
      `Investment time horizon: ${profile.timeHorizon}`,
      `Strategy to discuss: ${investment.strategy}`,
      `Investment tier: ${investment.investmentTier}`,
      `Intended initial investment (ZAR): ${investment.initialInvestment}`,
    ].join("\n");
    if (message.length > 500) {
      setStatus("The questionnaire details are too long to submit. Please review your selections.");
      return;
    }

    setSubmitting(true);
    setStatus("");
    try {
      window.localStorage.setItem("example-wealth.onboarding", JSON.stringify({
        profile,
        investment,
        message,
        createdAt: new Date().toISOString(),
      }));
      setSubmitted(true);
      setStatus("Your questionnaire was saved locally. This is not a submission, KYC/AML check or application.");
    } catch (error) {
      console.error("Onboarding questionnaire could not be submitted.", error);
      setStatus("Unable to submit the questionnaire right now. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  }

  async function downloadApplication() {
    setGenerating(true);
    setStatus("");
    try {
      const pdf = await PDFDocument.create();
      const page = pdf.addPage([612, 792]);
      const regular = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      page.drawRectangle({
        x: 0,
        y: 738,
        width: 612,
        height: 54,
        color: rgb(0.035, 0.07, 0.14),
      });
      page.drawText("your firm", {
        x: 48,
        y: 758,
        size: 12,
        font: bold,
        color: rgb(0.97, 0.78, 0.28),
      });
      page.drawText("PRELIMINARY INVESTOR APPLICATION SUMMARY", {
        x: 48,
        y: 703,
        size: 17,
        font: bold,
        color: rgb(0.05, 0.1, 0.2),
      });
      page.drawText("Investor information", {
        x: 48,
        y: 665,
        size: 11,
        font: bold,
        color: rgb(0.1, 0.25, 0.45),
      });

      const rows = [
        ["Full name", profile.fullName],
        ["Email", profile.email],
        ...(features.onboardingSubmit ? [["Phone", profile.phone]] : []),
        ["Self-assessed risk tolerance", profile.riskTolerance],
        ["Investment time horizon", profile.timeHorizon],
        ["Selected strategy", investment.strategy],
        ["Investment tier", investment.investmentTier],
        ["Intended initial investment (ZAR)", `R ${Number(investment.initialInvestment).toLocaleString("en-ZA")}`],
      ];
      let y = 635;
      for (const [label, value] of rows) {
        page.drawText(pdfSafe(label), {
          x: 48,
          y,
          size: 9,
          font: bold,
          color: rgb(0.35, 0.38, 0.43),
        });
        page.drawText(pdfSafe(value).slice(0, 76), {
          x: 235,
          y,
          size: 10,
          font: regular,
          color: rgb(0.08, 0.1, 0.14),
        });
        page.drawLine({
          start: { x: 48, y: y - 10 },
          end: { x: 564, y: y - 10 },
          thickness: 0.5,
          color: rgb(0.86, 0.87, 0.89),
        });
        y -= 36;
      }

      page.drawText("Signature", {
        x: 48,
        y: 332,
        size: 9,
        font: bold,
        color: rgb(0.35, 0.38, 0.43),
      });
      page.drawLine({
        start: { x: 48, y: 310 },
        end: { x: 290, y: 310 },
        thickness: 0.8,
        color: rgb(0.35, 0.38, 0.43),
      });
      page.drawText("Date", {
        x: 330,
        y: 332,
        size: 9,
        font: bold,
        color: rgb(0.35, 0.38, 0.43),
      });
      page.drawLine({
        start: { x: 330, y: 310 },
        end: { x: 564, y: 310 },
        thickness: 0.8,
        color: rgb(0.35, 0.38, 0.43),
      });

      const disclaimer = `PRELIMINARY SUMMARY ONLY. This document is not an official ${company.legalName} application form, does not complete identity verification or KYC/AML checks, is not financial advice, and is not submitted to or stored by ${company.legalName}. Confirm all details and obtain current official forms from your financial advisor before applying. A signature on this summary does not constitute acceptance or an investment instruction.`;
      const words = disclaimer.split(/\s+/);
      let line = "";
      y = 245;
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (regular.widthOfTextAtSize(candidate, 8) > 516 && line) {
          page.drawText(line, { x: 48, y, size: 8, font: regular, color: rgb(0.35, 0.38, 0.43) });
          line = word;
          y -= 12;
        } else {
          line = candidate;
        }
      }
      if (line) {
        page.drawText(line, { x: 48, y, size: 8, font: regular, color: rgb(0.35, 0.38, 0.43) });
      }

      page.drawText(pdfSafe(company.regulatoryNotice), {
        x: 48,
        y: 42,
        size: 6,
        font: regular,
        color: rgb(0.35, 0.38, 0.43),
      });

      const bytes = await pdf.save();
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "placeholder-preliminary-investor-summary.pdf";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Your preliminary summary PDF has been generated on this device.");
    } catch (error) {
      console.error("Unable to generate the preliminary investor summary.", error);
      setStatus("Unable to generate the PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-5 py-12 sm:py-16">
      <div className="placeholder-glass-card rounded-2xl p-5 text-[var(--foreground)] shadow-[0_24px_70px_rgba(67,45,70,0.1)] sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--accent)]">
            <ShieldCheck size={21} />
          </span>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-[var(--accent)]">PRELIMINARY QUESTIONNAIRE</p>
            <h2 className="mt-1 text-xl font-semibold">Investor onboarding</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              This questionnaire helps prepare an initial application summary. It is not
              identity verification, formal KYC/AML, or financial advice.
            </p>
          </div>
        </div>

        <ol aria-label="Onboarding progress" className="mt-8 grid grid-cols-3 gap-2">
          {steps.map((label, index) => (
            <li key={label} aria-current={step === index ? "step" : undefined}>
              <div className={`h-1 rounded-full ${index <= step ? "bg-[var(--accent-fill)]" : "bg-[var(--border)]"}`} />
              <span className={`mt-2 block text-[10px] font-medium sm:text-xs ${index === step ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                {index + 1}. {label}
              </span>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>
              Full name
              <input
                autoComplete="name"
                maxLength={120}
                value={profile.fullName}
                onChange={(event) => setProfile({ ...profile, fullName: event.target.value })}
                className={inputClass}
                placeholder="Your full name"
              />
            </label>
            <label className={labelClass}>
              Email address
              <input
                type="email"
                autoComplete="email"
                maxLength={254}
                value={profile.email}
                onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                className={inputClass}
                placeholder="name@example.com"
              />
            </label>
            {features.onboardingSubmit ? (
              <label className={labelClass}>
                Phone number
                <input
                  type="tel"
                  autoComplete="tel"
                  maxLength={40}
                  value={profile.phone}
                  onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                  className={inputClass}
                  placeholder="Your phone number"
                />
              </label>
            ) : null}
            <label className={labelClass}>
              How would you describe your risk tolerance?
              <select
                value={profile.riskTolerance}
                onChange={(event) => setProfile({ ...profile, riskTolerance: event.target.value })}
                className={inputClass}
              >
                <option value="">Select a response</option>
                <option>Conservative - prioritise lower volatility</option>
                <option>Moderate - accept some fluctuations</option>
                <option>Growth-oriented - accept higher fluctuations</option>
              </select>
            </label>
            <label className={labelClass}>
              Investment time horizon
              <select
                value={profile.timeHorizon}
                onChange={(event) => setProfile({ ...profile, timeHorizon: event.target.value })}
                className={inputClass}
              >
                <option value="">Select a horizon</option>
                <option>Less than 3 years</option>
                <option>3 to 5 years</option>
                <option>More than 5 years</option>
              </select>
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>
              Strategy to discuss with your advisor
              <select
                value={investment.strategy}
                onChange={(event) => setInvestment({ ...investment, strategy: event.target.value })}
                className={inputClass}
              >
                <option value="">Select a strategy</option>
                <option>your firm Cautious</option>
                <option>your firm Balanced</option>
                <option>Discuss options with my advisor</option>
              </select>
            </label>
            <label className={labelClass}>
              Intended investment tier
              <select
                value={investment.investmentTier}
                onChange={(event) => setInvestment({ ...investment, investmentTier: event.target.value })}
                className={inputClass}
              >
                <option value="">Select an indicative tier</option>
                <option>Below R100,000</option>
                <option>R100,000 - R499,999</option>
                <option>R500,000 - R999,999</option>
                <option>R1,000,000 or more</option>
              </select>
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Intended initial investment (ZAR)
              <input
                type="number"
                min="1"
                step="0.01"
                inputMode="decimal"
                value={investment.initialInvestment}
                onChange={(event) => setInvestment({ ...investment, initialInvestment: event.target.value })}
                className={inputClass}
                placeholder="For example, 100000"
              />
              <span className="mt-2 block text-xs font-normal leading-5 text-[var(--muted)]">
                Indicative only. Minimums and suitable investment amounts depend on the
                product and platform; confirm with your financial advisor.
              </span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Review your details</h3>
            <dl className="mt-4 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--background)] px-4">
              {[
                ["Full name", profile.fullName],
                ["Email", profile.email],
                ...(features.onboardingSubmit ? [["Phone", profile.phone]] : []),
                ["Risk tolerance", profile.riskTolerance],
                ["Time horizon", profile.timeHorizon],
                ["Strategy to discuss", investment.strategy],
                ["Investment tier", investment.investmentTier],
                ["Intended initial investment", `R ${Number(investment.initialInvestment).toLocaleString("en-ZA")}`],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-1 py-3 sm:grid-cols-[200px_1fr] sm:gap-4">
                  <dt className="text-xs text-[var(--muted)]">{label}</dt>
                  <dd className="break-words text-sm text-[var(--foreground)]">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 rounded-lg border border-[#C5A880]/25 bg-[#C5A880]/5 p-3 text-xs leading-5 text-[var(--muted)]">
              This summary is generated in your browser{features.onboardingSubmit ? " and is only sent if you choose to submit it below" : " and is not sent to your firm"}. It is not an official application, a completed KYC/AML check, an investment instruction, or financial advice. Obtain the current official application from your financial advisor. Any required signature must be completed separately using an appropriate signing process.
            </p>
            {features.onboardingSubmit ? (
              <div className="mt-5 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
                  <label htmlFor="onboarding-website">Leave this field empty</label>
                  <input
                    id="onboarding-website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    maxLength={160}
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                  />
                </div>
                <label className="flex items-start gap-3 text-xs leading-5 text-[var(--muted)]">
                  <input
                    type="checkbox"
                    required
                    checked={popiConsent}
                    onChange={(event) => setPopiConsent(event.target.checked)}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  I consent to your firm processing my personal information to respond to this enquiry.
                </label>
                <button
                  type="button"
                  onClick={() => void submitQuestionnaire()}
                  disabled={submitting || submitted}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-strong)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] disabled:opacity-50"
                >
                  {submitting ? "SUBMITTING..." : submitted ? "QUESTIONNAIRE SENT" : "SUBMIT QUESTIONNAIRE"}
                </button>
              </div>
            ) : null}
          </div>
        )}

        {status && (
          <p role="status" aria-live="polite" className="mt-5 text-sm font-medium text-[var(--accent)]">
            {status}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="button"
            disabled={step === 0 || generating}
            onClick={() => {
              setStatus("");
              setStep((current) => Math.max(0, current - 1));
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--background)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft size={16} /> BACK
          </button>
          {step === 0 && (
            <button
              type="button"
              onClick={continueToInvestment}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)] transition hover:-translate-y-0.5 hover:brightness-110"
            >
              CONTINUE <ArrowRight size={16} />
            </button>
          )}
          {step === 1 && (
            <button
              type="button"
              onClick={continueToReview}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)] transition hover:-translate-y-0.5 hover:brightness-110"
            >
              REVIEW SUMMARY <ArrowRight size={16} />
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              onClick={() => void downloadApplication()}
              disabled={generating}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)] transition hover:brightness-110 disabled:opacity-50"
            >
              <Download size={16} /> {generating ? "GENERATING..." : "DOWNLOAD SUMMARY PDF"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
