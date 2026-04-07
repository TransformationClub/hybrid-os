"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { brand } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  saveOnboardingAnswers,
  generateSecondBrain,
  markOnboardingComplete,
} from "@/lib/onboarding/actions";
import {
  getHubSpotConnection,
  connectHubSpot,
} from "@/lib/hubspot/actions";

// ============================================================
// Constants
// ============================================================

const TOTAL_STEPS = 5;
const MOCK_WORKSPACE_ID = "ws-onboarding";

const BRAIN_ITEMS = [
  "Company Profile",
  "Product Summary",
  "Customer Personas",
  "Marketing Goals",
  "Brand Voice",
] as const;

const INTERVIEW_QUESTIONS = [
  {
    key: "customers" as const,
    label: "Tell us about your customers",
    placeholder:
      "Who are they? What do they care about? What problems are they trying to solve?",
  },
  {
    key: "product" as const,
    label: "What's your core product or service?",
    placeholder:
      "Describe what you sell or offer. What makes it different from alternatives?",
  },
  {
    key: "goal" as const,
    label: "What's your primary marketing goal right now?",
    placeholder:
      "E.g., generate more qualified leads, increase brand awareness, launch a new product, grow pipeline...",
  },
];

const MAGIC_MOMENT_MESSAGES = [
  "Analyzing your brand voice...",
  "Mapping your audience segments...",
  "Building knowledge graph...",
  "Generating customer personas...",
  "Extracting strategic insights...",
  "Wiring up your Second Brain...",
] as const;

const TONE_OPTIONS = [
  { value: "professional", label: "Professional", desc: "Clear, polished, authoritative" },
  { value: "conversational", label: "Conversational", desc: "Friendly, approachable, relatable" },
  { value: "bold", label: "Bold", desc: "Confident, direct, impactful" },
  { value: "playful", label: "Playful", desc: "Fun, witty, energetic" },
] as const;

const AUTONOMY_LEVELS = [
  { value: "conservative", label: "Conservative", desc: "Always ask before acting" },
  { value: "balanced", label: "Balanced", desc: "Ask on medium+ risk actions" },
  { value: "autonomous", label: "Autonomous", desc: "Act freely, report after" },
] as const;

// ============================================================
// CSS keyframes for magic moment animation
// ============================================================

const magicProgressKeyframes = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.3); }
  50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
}
`;

// ============================================================
// File upload type
// ============================================================

interface UploadedFile {
  name: string;
  size: number;
}

// ============================================================
// Page Component
// ============================================================

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex w-full max-w-xl items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);

  // Interview state
  const [interviewIndex, setInterviewIndex] = useState(0);
  const [answers, setAnswers] = useState({
    customers: "",
    product: "",
    goal: "",
  });

  // File upload state
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Generation state
  const [generatedItems, setGeneratedItems] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationDone, setGenerationDone] = useState(false);

  // Magic moment animation state
  const [magicMessageIndex, setMagicMessageIndex] = useState(0);
  const [magicProgress, setMagicProgress] = useState(0);

  // Tone / autonomy preferences
  const [selectedTone, setSelectedTone] = useState("conversational");
  const [selectedAutonomy, setSelectedAutonomy] = useState("balanced");

  // HubSpot connection state
  const [hubSpotConnected, setHubSpotConnected] = useState(false);
  const [hubSpotPortal, setHubSpotPortal] = useState<string | null>(null);
  const [hubSpotConnecting, setHubSpotConnecting] = useState(false);

  // Check for HubSpot OAuth callback or existing connection
  useEffect(() => {
    const hubspotParam = searchParams.get("hubspot");
    const code = searchParams.get("code");

    if (hubspotParam === "connected") {
      // Returned from a successful OAuth flow
      setHubSpotConnected(true);
      setStep(2);
      // Check connection for portal name
      getHubSpotConnection(MOCK_WORKSPACE_ID).then(({ connection }) => {
        if (connection?.hub_domain) {
          setHubSpotPortal(connection.hub_domain);
        }
      });
    } else if (code) {
      // Handle OAuth code exchange inline
      setHubSpotConnecting(true);
      setStep(2);
      connectHubSpot(code, MOCK_WORKSPACE_ID).then((result) => {
        setHubSpotConnecting(false);
        if (!result.error) {
          setHubSpotConnected(true);
          getHubSpotConnection(MOCK_WORKSPACE_ID).then(({ connection }) => {
            if (connection?.hub_domain) {
              setHubSpotPortal(connection.hub_domain);
            }
          });
        }
      });
    } else {
      // Check if already connected
      getHubSpotConnection(MOCK_WORKSPACE_ID).then(({ connection }) => {
        if (connection) {
          setHubSpotConnected(true);
          if (connection.hub_domain) {
            setHubSpotPortal(connection.hub_domain);
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressPercent = (step / TOTAL_STEPS) * 100;

  // ----------------------------------------------------------
  // Interview navigation
  // ----------------------------------------------------------

  const currentQuestion = INTERVIEW_QUESTIONS[interviewIndex];
  const currentAnswer = answers[currentQuestion?.key ?? "customers"];

  function handleAnswerChange(value: string) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.key]: value }));
  }

  function handleInterviewNext() {
    if (interviewIndex < INTERVIEW_QUESTIONS.length - 1) {
      setInterviewIndex((i) => i + 1);
    } else {
      setStep(4);
    }
  }

  function handleInterviewBack() {
    if (interviewIndex > 0) {
      setInterviewIndex((i) => i - 1);
    } else {
      setStep(2);
    }
  }

  // ----------------------------------------------------------
  // File drop handling (visual only)
  // ----------------------------------------------------------

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).map((f) => ({
      name: f.name,
      size: f.size,
    }));
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ----------------------------------------------------------
  // Magic moment: animated progress + cycling messages
  // ----------------------------------------------------------

  useEffect(() => {
    if (!isGenerating) return;

    // Cycle through animated messages
    const msgInterval = setInterval(() => {
      setMagicMessageIndex((prev) =>
        prev < MAGIC_MOMENT_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 900);

    // Animate progress bar smoothly
    const progressInterval = setInterval(() => {
      setMagicProgress((prev) => {
        if (prev >= 100) return 100;
        const remaining = 100 - prev;
        const increment = Math.max(0.5, remaining * 0.06);
        return Math.min(100, prev + increment);
      });
    }, 50);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
    };
  }, [isGenerating]);

  // ----------------------------------------------------------
  // Second Brain generation
  // ----------------------------------------------------------

  const runGeneration = useCallback(async () => {
    setIsGenerating(true);
    setGeneratedItems(0);
    setMagicMessageIndex(0);
    setMagicProgress(0);

    // Save answers first
    await saveOnboardingAnswers(MOCK_WORKSPACE_ID, answers);

    // Generate second brain
    await generateSecondBrain(MOCK_WORKSPACE_ID, answers);

    // Animate items appearing one by one
    for (let i = 0; i < BRAIN_ITEMS.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setGeneratedItems(i + 1);
    }

    setMagicProgress(100);
    await markOnboardingComplete(MOCK_WORKSPACE_ID);
    setIsGenerating(false);
    setGenerationDone(true);
  }, [answers]);

  useEffect(() => {
    if (step === 5 && !isGenerating && !generationDone) {
      runGeneration();
    }
  }, [step, isGenerating, generationDone, runGeneration]);

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-6">
      {/* Progress bar */}
      <div className="w-full">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {step} of {TOTAL_STEPS}
          </span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} />
      </div>

      {/* Step 1: Welcome */}
      {step === 1 && (
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{brand.name}</CardTitle>
            <CardDescription className="text-base">
              {brand.tagline}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">
              Your AI-powered marketing operating system is ready.
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              We will walk you through a quick setup to connect your tools,
              capture what makes your business unique, and build your Second
              Brain -- the knowledge layer that powers every agent and campaign.
            </p>
            <Button size="lg" className="mt-2 w-full" onClick={() => setStep(2)}>
              Get Started
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Connect HubSpot */}
      {step === 2 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Connect HubSpot</CardTitle>
            <CardDescription>
              Optional. Link your HubSpot portal to pull contacts, campaigns,
              and performance data into {brand.name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {hubSpotConnected ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-300">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 7L6 10L11 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  HubSpot connected
                </div>
                {hubSpotPortal && (
                  <p className="mt-1 text-emerald-700 dark:text-emerald-400">
                    Portal: {hubSpotPortal}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <p className="mb-2 font-medium text-foreground">
                    Why connect HubSpot?
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Import contacts and company data automatically</li>
                    <li>Pull campaign performance metrics</li>
                    <li>Publish content drafts directly to your CMS</li>
                    <li>Keep your CRM and marketing OS in sync</li>
                  </ul>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  disabled={hubSpotConnecting}
                  onClick={() => {
                    // In production, this would redirect to:
                    // window.location.href = `/api/hubspot/auth?redirect=/onboarding`;
                    // For mock/dev, simulate a successful connection
                    setHubSpotConnecting(true);
                    setTimeout(() => {
                      setHubSpotConnecting(false);
                      setHubSpotConnected(true);
                      setHubSpotPortal("demo-portal.hubspot.com");
                    }, 1500);
                  }}
                >
                  {hubSpotConnecting ? (
                    <>
                      <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Connecting...
                    </>
                  ) : (
                    "Connect HubSpot"
                  )}
                </Button>
              </>
            )}

            <Button
              variant={hubSpotConnected ? "default" : "ghost"}
              size="lg"
              className="w-full"
              onClick={() => setStep(3)}
            >
              {hubSpotConnected ? "Continue" : "Skip for now"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Guided Interview */}
      {step === 3 && currentQuestion && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{currentQuestion.label}</CardTitle>
            <CardDescription>
              Question {interviewIndex + 1} of {INTERVIEW_QUESTIONS.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="interview-answer" className="sr-only">
                {currentQuestion.label}
              </Label>
              <Textarea
                id="interview-answer"
                placeholder={currentQuestion.placeholder}
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                className="min-h-32"
              />
            </div>

            {/* Show tone + autonomy on the last interview question */}
            {interviewIndex === INTERVIEW_QUESTIONS.length - 1 && (
              <div className="flex flex-col gap-5 rounded-lg border border-border bg-muted/20 p-4">
                {/* Tone selector */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-foreground">Preferred tone</p>
                  <div className="grid grid-cols-2 gap-2">
                    {TONE_OPTIONS.map((tone) => (
                      <button
                        key={tone.value}
                        type="button"
                        onClick={() => setSelectedTone(tone.value)}
                        className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                          selectedTone === tone.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-muted-foreground/40"
                        }`}
                      >
                        <span className="font-medium">{tone.label}</span>
                        <span className="text-[11px] text-muted-foreground">{tone.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Autonomy selector */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-foreground">Agent autonomy level</p>
                  <div className="grid grid-cols-3 gap-2">
                    {AUTONOMY_LEVELS.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setSelectedAutonomy(level.value)}
                        className={`flex flex-col items-center rounded-lg border px-3 py-2.5 text-center text-sm transition-all ${
                          selectedAutonomy === level.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-muted-foreground/40"
                        }`}
                      >
                        <span className="font-medium">{level.label}</span>
                        <span className="text-[10px] leading-tight text-muted-foreground">
                          {level.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2">
              {INTERVIEW_QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i === interviewIndex
                      ? "bg-primary"
                      : i < interviewIndex
                        ? "bg-primary/40"
                        : "bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={handleInterviewBack}
              >
                Back
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={handleInterviewNext}
                disabled={!currentAnswer.trim()}
              >
                {interviewIndex === INTERVIEW_QUESTIONS.length - 1
                  ? "Continue"
                  : "Next"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Brain Dump (file upload) */}
      {step === 4 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Upload your existing docs</CardTitle>
            <CardDescription>
              Optional. Drop in any marketing docs, brand guides, or strategy
              files. We will extract the good stuff for your Second Brain.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div
              className={`flex min-h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/20 hover:border-muted-foreground/40"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="mb-2 text-3xl text-muted-foreground/40">
                &#8593;
              </div>
              <p className="text-sm font-medium text-foreground">
                Drag and drop files here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF, Markdown, Text, CSV
              </p>
            </div>

            {files.length > 0 && (
              <ul className="flex flex-col gap-2">
                {files.map((file, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <span className="truncate">{file.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeFile(i)}
                        aria-label={`Remove ${file.name}`}
                      >
                        &times;
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => {
                  setStep(3);
                  setInterviewIndex(INTERVIEW_QUESTIONS.length - 1);
                }}
              >
                Back
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={() => setStep(5)}
              >
                {files.length > 0 ? "Continue" : "Skip for now"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Magic Moment + Post-Onboarding */}
      {step === 5 && (
        <Card className="w-full">
          {/* Inject keyframes */}
          <style dangerouslySetInnerHTML={{ __html: magicProgressKeyframes }} />

          <CardHeader className="text-center">
            <CardTitle>
              {generationDone
                ? "Your Second Brain is ready"
                : "Building your Second Brain..."}
            </CardTitle>
            <CardDescription>
              {generationDone
                ? "We created foundational knowledge objects from your answers."
                : "Generating knowledge objects from your onboarding answers."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Animated progress bar (magic moment) */}
            {isGenerating && (
              <div className="flex flex-col gap-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-200 ease-out"
                    style={{ width: `${magicProgress}%` }}
                  />
                </div>
                <p
                  className="text-center text-sm text-muted-foreground"
                  style={{ animation: "fadeInUp 0.3s ease-out" }}
                  key={magicMessageIndex}
                >
                  {MAGIC_MOMENT_MESSAGES[magicMessageIndex]}
                </p>
              </div>
            )}

            <ul className="flex flex-col gap-3">
              {BRAIN_ITEMS.map((item, i) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm"
                  style={
                    i < generatedItems
                      ? { animation: "fadeInUp 0.4s ease-out" }
                      : undefined
                  }
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs transition-all duration-300 ${
                      i < generatedItems
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                    style={
                      i < generatedItems
                        ? { animation: "pulseGlow 0.6s ease-out" }
                        : undefined
                    }
                  >
                    {i < generatedItems ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3 7L6 10L11 4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={
                      i < generatedItems
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            {isGenerating && !generationDone && (
              <div className="flex items-center justify-center py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            {generationDone && (
              <div className="flex flex-col gap-4 pt-2">
                {/* Suggest first initiative */}
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <p className="mb-3 text-center text-sm font-medium text-foreground">
                    Ready to launch your first campaign?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => router.push("/?newInitiative=aeo-campaign")}
                      className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background p-4 text-center transition-all hover:border-primary hover:shadow-sm"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 2L12.5 7.5L18 8.5L14 12.5L15 18L10 15.5L5 18L6 12.5L2 8.5L7.5 7.5L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="text-sm font-medium">AEO Content Campaign</span>
                      <span className="text-[11px] text-muted-foreground">
                        Optimize for AI engine visibility
                      </span>
                    </button>
                    <button
                      onClick={() => router.push("/?newInitiative=abm-campaign")}
                      className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background p-4 text-center transition-all hover:border-primary hover:shadow-sm"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
                          <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                          <circle cx="10" cy="10" r="1" fill="currentColor"/>
                        </svg>
                      </div>
                      <span className="text-sm font-medium">ABM Target Campaign</span>
                      <span className="text-[11px] text-muted-foreground">
                        Focus on high-value accounts
                      </span>
                    </button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => router.push("/")}
                >
                  Skip to Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
