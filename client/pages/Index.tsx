import { useEffect, useMemo, useState } from "react";
import { QuestionView } from "@/components/discovery/question-view";
import { Button } from "@/components/ui/button";
import { Signup } from "@/components/auth/signup";
import { Login } from "@/components/auth/login";
import { ResetPassword } from "@/components/auth/reset-password";
import { ResetSent } from "@/components/auth/reset-sent";
import {
  formQuestions,
  formSections,
  totalQuestions,
} from "@/data/discovery-form";
import {
  supabase,
  saveFormProgress,
  loadFormProgress,
} from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

const heroList = [
  "Conversational questions, that help develop a narrative of your business.",
  "Examples for every question to guide your thinking.",
  "Auto-save after each section — pause anytime.",
  "Skip questions and return later if needed.",
  "45-60 minutes to complete all sections.",
];

const heroImages = [
  {
    src: "https://api.builder.io/api/v1/image/assets/TEMP/c72db4d1becc18e5e6688a0bf11f433980bb05f5?width=1198",
    alt: "Cliffside coastline",
    className: "sm:col-span-2 md:col-span-2",
  },
  {
    src: "https://api.builder.io/api/v1/image/assets/TEMP/dc5996f2582dc50eeefc3078c7626a5ccdca42bd?width=636",
    alt: "Minimal atrium interior",
    className: "",
  },
  {
    src: "https://api.builder.io/api/v1/image/assets/TEMP/44b07c82e68a7e918bc37645d449846343aba547?width=636",
    alt: "Sunrise over a field",
    className: "",
  },
];

const realMomentsPrompts = [
  "The first customer who trusted you,",
  "The deal you turned down,",
  "What people actually say about you,",
  "What people actually say about you,",
];

const createInitialResponses = () => formQuestions.map(() => "");
const totalSections = formSections.length;

const getSectionIndexById = (sectionId: number) =>
  formSections.findIndex((section) => section.id === sectionId);

const getFirstQuestionIndexForSection = (sectionId: number) =>
  formQuestions.findIndex((question) => question.sectionId === sectionId);

type Screen =
  | "hero"
  | "intro"
  | "signup"
  | "login"
  | "resetPassword"
  | "resetSent"
  | "sectionWelcome"
  | "question"
  | "complete";

export default function Index() {
  const [screen, setScreen] = useState<Screen>("hero");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<string[]>(createInitialResponses);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const currentQuestion = formQuestions[currentQuestionIndex];
  const activeSection = formSections[activeSectionIndex];

  const progressPercentage = useMemo(() => {
    if (!currentQuestion) return 0;
    if (currentQuestion.sectionTotalQuestions <= 1) {
      return currentQuestion.sectionQuestionNumber ===
        currentQuestion.sectionTotalQuestions
        ? 100
        : 0;
    }

    return (
      ((currentQuestion.sectionQuestionNumber - 1) /
        currentQuestion.sectionTotalQuestions) *
      100
    );
  }, [currentQuestion]);

  const startIntro = () => {
    setScreen("intro");
  };

  const startForm = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const progress = await loadFormProgress(data.session.user.id);
      if (progress) {
        setResponses(progress.responses);
        setCurrentQuestionIndex(progress.current_question_index);
        setActiveSectionIndex(progress.active_section_index);
        setScreen("question");
      } else {
        const firstIndex = getFirstQuestionIndexForSection(formSections[0].id);
        setResponses(createInitialResponses());
        setCurrentQuestionIndex(firstIndex === -1 ? 0 : firstIndex);
        setActiveSectionIndex(0);
        setScreen("sectionWelcome");
      }
    } else {
      setScreen("signup");
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && screen === "question") {
      const timer = setTimeout(() => {
        saveFormProgress(
          user.id,
          responses,
          currentQuestionIndex,
          activeSectionIndex,
        ).catch(console.error);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, responses, currentQuestionIndex, activeSectionIndex, screen]);

  const handleSignup = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
        setUser(data.user);
        const firstIndex = getFirstQuestionIndexForSection(formSections[0].id);
        setResponses(createInitialResponses());
        setCurrentQuestionIndex(firstIndex === -1 ? 0 : firstIndex);
        setActiveSectionIndex(0);
        setScreen("sectionWelcome");
      }
    } catch (error: any) {
      setAuthError(error.message);
      console.error("Signup error:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
        setUser(data.user);
        const progress = await loadFormProgress(data.user.id);
        if (progress) {
          setResponses(progress.responses);
          setCurrentQuestionIndex(progress.current_question_index);
          setActiveSectionIndex(progress.active_section_index);
          setScreen("question");
        } else {
          const firstIndex = getFirstQuestionIndexForSection(
            formSections[0].id,
          );
          setCurrentQuestionIndex(firstIndex === -1 ? 0 : firstIndex);
          setActiveSectionIndex(0);
          setScreen("sectionWelcome");
        }
      }
    } catch (error: any) {
      setAuthError(error.message);
      console.error("Login error:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setScreen("resetSent");
    } catch (error: any) {
      setAuthError(error.message);
      console.error("Reset password error:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleProceedFromSectionWelcome = () => {
    setScreen("question");
  };

  const handleNext = () => {
    if (!currentQuestion) {
      return;
    }

    if (currentQuestionIndex === totalQuestions - 1) {
      setScreen("complete");
      return;
    }

    const nextIndex = currentQuestionIndex + 1;
    const nextQuestion = formQuestions[nextIndex];
    const nextSectionIndex = getSectionIndexById(nextQuestion.sectionId);

    setCurrentQuestionIndex(nextIndex);

    if (nextQuestion.sectionId !== currentQuestion.sectionId) {
      setActiveSectionIndex(
        nextSectionIndex === -1 ? activeSectionIndex : nextSectionIndex,
      );
      setScreen("sectionWelcome");
      return;
    }

    if (nextSectionIndex !== -1) {
      setActiveSectionIndex(nextSectionIndex);
    }

    setScreen("question");
  };

  const handlePrevious = () => {
    if (currentQuestionIndex === 0) {
      setScreen("intro");
      return;
    }

    const previousIndex = currentQuestionIndex - 1;
    const previousQuestion = formQuestions[previousIndex];
    const previousSectionIndex = getSectionIndexById(
      previousQuestion.sectionId,
    );

    setCurrentQuestionIndex(previousIndex);

    if (previousSectionIndex !== -1) {
      setActiveSectionIndex(previousSectionIndex);
    }

    setScreen("question");
  };

  const handleAnswerChange = (value: string) => {
    setResponses((prev) => {
      const updated = [...prev];
      updated[currentQuestionIndex] = value;
      return updated;
    });
  };

  const handleReview = () => {
    setActiveSectionIndex(0);
    setCurrentQuestionIndex(0);
    setScreen("question");
  };

  const handleRestart = () => {
    const firstIndex = getFirstQuestionIndexForSection(formSections[0].id);
    setResponses(createInitialResponses());
    setCurrentQuestionIndex(firstIndex === -1 ? 0 : firstIndex);
    setActiveSectionIndex(0);
    setScreen("sectionWelcome");
  };

  const questionValue = responses[currentQuestionIndex] ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFAEE] text-black">
      <header className="mx-auto flex w-full max-w-[1332px] items-center justify-between px-4 py-8 sm:px-8 md:px-12 lg:px-24">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/243e9e26600924d4d43f0793db0944381e2ae2b0?width=330"
          alt="Purple Pine Digital"
          className="h-10 w-auto md:h-12 lg:h-[50px]"
        />
        <a
          href="https://purplepine.digital"
          target="_blank"
          rel="noreferrer"
          className="hidden text-sm font-semibold text-[#37306B] underline-offset-4 hover:underline sm:inline"
          style={{ fontFamily: "Literata, serif" }}
        >
          Go to PurplePine.Digital
        </a>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-8 sm:pb-16 md:px-12 lg:px-24">
        {screen === "hero" ? (
          <section className="w-full max-w-[1332px] space-y-10">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex max-w-[665px] flex-col gap-6">
                <p
                  className="text-sm font-normal md:text-base"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  60 Minute Business Discovery Form
                </p>
                <h1
                  className="text-4xl font-normal leading-tight md:text-6xl lg:text-[71px] lg:leading-none"
                  style={{ fontFamily: "Epilogue, sans-serif" }}
                >
                  The Conversation Starter
                </h1>
              </div>
              <div className="flex max-w-[430px] flex-col gap-5">
                <h2
                  className="text-xl font-normal md:text-2xl"
                  style={{ fontFamily: "Epilogue, sans-serif" }}
                >
                  What to Expect:
                </h2>
                <ul className="flex flex-col gap-5">
                  {heroList.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <svg
                        className="mt-1 h-4 w-4 flex-shrink-0"
                        viewBox="0 0 15 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M14.2071 2.04344C14.2311 1.49167 13.8032 1.02493 13.2514 1.00094L4.25994 0.610009C3.70818 0.586019 3.24144 1.01386 3.21745 1.56563C3.19346 2.11739 3.6213 2.58413 4.17307 2.60812L12.1655 2.95562L11.818 10.9481C11.794 11.4998 12.2219 11.9666 12.7736 11.9906C13.3254 12.0146 13.7921 11.5867 13.8161 11.0349L14.2071 2.04344ZM1.20801 13L1.88373 13.7372L13.8837 2.73715L13.208 2L12.5323 1.26285L0.532283 12.2628L1.20801 13Z"
                          fill="currentColor"
                        />
                      </svg>
                      <span
                        className="flex-1 text-sm font-normal md:text-base"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  onClick={startIntro}
                  className="mt-2 inline-flex w-fit items-center gap-3 rounded-md bg-[#37306B] px-10 py-4 text-base font-normal text-[#FFFAEE] hover:bg-[#2C2758]"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  Get Started
                  <svg
                    className="ml-2 inline h-4 w-4"
                    viewBox="0 0 15 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M14.6732 3.25492C14.814 3.11413 14.814 2.88587 14.6732 2.74508L12.3789 0.4508C12.2381 0.310012 12.0098 0.310012 11.8691 0.4508C11.7283 0.591589 11.7283 0.819852 11.8691 0.96064L13.9084 3L11.8691 5.03936C11.7283 5.18015 11.7283 5.40841 11.8691 5.5492C12.0098 5.68999 12.2381 5.68999 12.3789 5.5492L14.6732 3.25492ZM-0.00219727 3V3.36051H14.4183V3V2.63949H-0.00219727V3Z"
                      fill="currentColor"
                    />
                  </svg>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              {heroImages.map((image) => (
                <div
                  key={image.src}
                  className={`group relative overflow-hidden rounded-[15px] ${image.className}`}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-105 md:h-72 lg:h-[365px]"
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {screen === "intro" ? (
          <section className="w-full max-w-[1332px]">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="flex h-full flex-col justify-between gap-10 rounded-[10px] bg-[#FFEDC3] p-10">
                <div className="space-y-4">
                  <p
                    className="text-sm font-normal md:text-base"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    60 Minute Business Discovery Form
                  </p>
                  <h2
                    className="text-4xl font-normal leading-tight md:text-[60px]"
                    style={{ fontFamily: "Epilogue, sans-serif" }}
                  >
                    Introduction
                  </h2>
                </div>
                <p
                  className="text-lg leading-relaxed"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  I'm not a bureaucratic form. I'm a conversation starter.
                  You're here because you've chosen to build your brand
                  seriously. My questions aren't an exam, they're prompts that
                  help you tell the story you've been living but haven't written
                  down yet.
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="rounded-[10px] bg-[#FFEDC3] p-8">
                  <h3
                    className="text-2xl font-normal"
                    style={{ fontFamily: "Epilogue, sans-serif" }}
                  >
                    I'll ask about real moments
                  </h3>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {realMomentsPrompts.map((prompt, index) => (
                      <div
                        key={`${index}-${prompt}`}
                        className="rounded-[7px] bg-[#FFC741] px-4 py-3 text-sm"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        {prompt}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[10px] bg-[#FFEDC3] p-8">
                  <h3
                    className="text-2xl font-normal"
                    style={{ fontFamily: "Epilogue, sans-serif" }}
                  >
                    What I won't do
                  </h3>
                  <div
                    className="mt-5 rounded-md bg-[#FFC741] p-4 text-sm leading-relaxed"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    Make you pick colors, buzzwords, or "traits." That's our
                    job. Yours is to describe reality. Every question exists for
                    a reason; nothing here is filler.
                  </div>
                  <p
                    className="mt-4 text-sm leading-relaxed"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    Depth matters—which is why there are 30 questions. They save
                    you from vague brands and rework later.
                  </p>
                </div>

                <div className="flex flex-col items-start justify-between gap-4 rounded-[10px] bg-transparent py-6 text-sm sm:flex-row sm:items-center">
                  <p style={{ fontFamily: "Literata, serif" }}>
                    Every business starts somewhere. Let's understand yours.
                  </p>
                  <Button
                    type="button"
                    onClick={startForm}
                    className="inline-flex items-center gap-2 rounded-md bg-[#37306B] px-8 py-4 text-base font-normal text-[#FFFAEE] hover:bg-[#2C2758]"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    Begin your story
                    <svg
                      className="ml-2 h-4 w-4"
                      viewBox="0 0 14 6"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M13.5779 3.22463C13.7019 3.10057 13.7019 2.89943 13.5779 2.77537L11.5562 0.75374C11.4322 0.629682 11.231 0.629682 11.107 0.75374C10.9829 0.877797 10.9829 1.07893 11.107 1.20299L12.904 3L11.107 4.79701C10.9829 4.92107 10.9829 5.1222 11.107 5.24626C11.231 5.37032 11.4322 5.37032 11.5562 5.24626L13.5779 3.22463ZM0.646484 3V3.31767H13.3533V3V2.68233H0.646484V3Z"
                        fill="currentColor"
                      />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {screen === "sectionWelcome" && activeSection ? (
          <section className="flex w-full max-w-[1332px] flex-col items-center justify-center gap-8">
            <svg
              className="h-[52px] w-[56px]"
              viewBox="0 0 56 52"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="28" cy="26" r="26" fill="#37306B" />
              <path
                d="M18 26L25 33L38 20"
                stroke="#FFFAEE"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex flex-col items-center justify-center gap-8">
              <p
                className="text-center text-2xl font-normal"
                style={{ fontFamily: "Literata, serif" }}
              >
                You are all set. Let's Start with Section {activeSection.id}
              </p>
              <h2
                className="text-center text-4xl font-black md:text-[45px]"
                style={{ fontFamily: "Epilogue, sans-serif", fontWeight: 900 }}
              >
                {activeSection.title}
              </h2>
              <p
                className="max-w-[689px] text-center text-base font-normal leading-normal"
                style={{ fontFamily: "Literata, serif" }}
              >
                Every business starts somewhere. Let's understand yours.{" "}
                <span className="font-bold">
                  This section has {activeSection.questions?.length || 0}{" "}
                  questions
                </span>{" "}
                Take your time. Write naturally. Your honest answers matter more
                than perfect prose.
              </p>
            </div>
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/f60d4205ffcaa1856f02fd2361df50c5bbd1e141?width=583"
              alt="Decorative illustration"
              className="h-auto w-full max-w-[291px]"
              style={{ transform: "rotate(-0.353deg)" }}
            />
            <Button
              type="button"
              onClick={handleProceedFromSectionWelcome}
              className="inline-flex items-center gap-2 rounded-md bg-[#37306B] px-10 py-4 text-base font-normal text-[#FFFAEE] hover:bg-[#2C2758]"
              style={{ fontFamily: "Literata, serif" }}
            >
              Get Started
              <svg
                className="h-2 w-5"
                viewBox="0 0 21 8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M20.3536 4.03544C20.5488 3.84018 20.5488 3.52359 20.3536 3.32833L17.1716 0.146351C16.9763 -0.0489113 16.6597 -0.0489113 16.4645 0.146351C16.2692 0.341613 16.2692 0.658195 16.4645 0.853458L19.2929 3.68188L16.4645 6.51031C16.2692 6.70557 16.2692 7.02216 16.4645 7.21742C16.6597 7.41268 16.9763 7.41268 17.1716 7.21742L20.3536 4.03544ZM0 3.68188V4.18188H20V3.68188V3.18188H0V3.68188Z"
                  fill="white"
                />
              </svg>
            </Button>
          </section>
        ) : null}

        {screen === "signup" ? (
          <section className="w-full max-w-[1360px]">
            {authError && (
              <div className="mb-4 rounded-md bg-red-100 p-4 text-sm text-red-800">
                {authError}
              </div>
            )}
            <Signup
              onSignup={handleSignup}
              onSwitchToLogin={() => setScreen("login")}
              isLoading={authLoading}
            />
          </section>
        ) : null}

        {screen === "login" ? (
          <section className="w-full max-w-[1360px]">
            {authError && (
              <div className="mb-4 rounded-md bg-red-100 p-4 text-sm text-red-800">
                {authError}
              </div>
            )}
            <Login
              onLogin={handleLogin}
              onSwitchToSignup={() => setScreen("signup")}
              onSwitchToReset={() => setScreen("resetPassword")}
              isLoading={authLoading}
            />
          </section>
        ) : null}

        {screen === "resetPassword" ? (
          <section className="w-full max-w-[1360px]">
            {authError && (
              <div className="mb-4 rounded-md bg-red-100 p-4 text-sm text-red-800">
                {authError}
              </div>
            )}
            <ResetPassword
              onResetPassword={handleResetPassword}
              onSwitchToLogin={() => setScreen("login")}
              isLoading={authLoading}
            />
          </section>
        ) : null}

        {screen === "resetSent" ? (
          <section className="w-full max-w-[1360px]">
            <ResetSent />
          </section>
        ) : null}

        {screen === "question" && currentQuestion && activeSection ? (
          <section className="w-full max-w-[1332px]">
            <div className="rounded-[18px] border border-[#E3DCD2] bg-white/60 p-6 md:p-10">
              <div className="space-y-8">
                <div className="hidden md:block">
                  <div className="relative flex items-center justify-between">
                    <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[#D9D9D9]" />
                    {formSections.map((section, index) => {
                      const status =
                        index < activeSectionIndex
                          ? "complete"
                          : index === activeSectionIndex
                            ? "current"
                            : "upcoming";

                      const dotClasses =
                        status === "complete"
                          ? "bg-[#37306B]"
                          : status === "current"
                            ? "bg-[#37306B]"
                            : "bg-[#BAB8B8]";

                      return (
                        <div
                          key={section.id}
                          className="relative flex flex-col items-center gap-2"
                        >
                          <span
                            className={`flex h-3 w-3 items-center justify-center rounded-full ${dotClasses}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs uppercase tracking-[0.15em] text-[#4F4A7A] md:grid-cols-6">
                    {formSections.map((section) => (
                      <span
                        key={section.id}
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        {section.title}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 border-b border-[#E3DCD2] pb-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p
                        className="text-sm uppercase tracking-wide text-[#37306B]"
                        style={{ fontFamily: "Epilogue, sans-serif" }}
                      >
                        {activeSection.label}
                      </p>
                      <h2
                        className="mt-2 text-3xl font-normal md:text-[40px]"
                        style={{ fontFamily: "Epilogue, sans-serif" }}
                      >
                        {activeSection.title}
                      </h2>
                    </div>
                    {activeSection.emphasis ? (
                      <p
                        className="text-sm font-semibold"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        {activeSection.emphasis}
                      </p>
                    ) : null}
                  </div>
                  <div
                    className="space-y-3 text-sm leading-relaxed"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    <p>{activeSection.description}</p>
                    {activeSection.note ? (
                      <p className="text-[#37306B]">{activeSection.note}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p
                      className="text-sm font-semibold uppercase tracking-wide text-[#37306B]"
                      style={{ fontFamily: "Epilogue, sans-serif" }}
                    >
                      Question {currentQuestion.sectionQuestionNumber} of{" "}
                      {currentQuestion.sectionTotalQuestions}
                    </p>
                    <p
                      className="text-sm text-[#4F4A7A]"
                      style={{ fontFamily: "Literata, serif" }}
                    >
                      Click “Save & Move to Next” when you're ready. Pause
                      anytime.
                    </p>
                  </div>
                  <div className="h-[10px] w-full overflow-hidden rounded-full bg-[#D9D9D9]">
                    <div
                      className="h-full rounded-full bg-[#37306B] transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <QuestionView
                  question={currentQuestion}
                  value={questionValue}
                  onChange={handleAnswerChange}
                  onNext={handleNext}
                  onPrevious={handlePrevious}
                  isFirst={currentQuestion.overallNumber === 1}
                  isLast={currentQuestionIndex === totalQuestions - 1}
                />
              </div>
            </div>
          </section>
        ) : null}

        {screen === "complete" ? (
          <section className="w-full max-w-[1332px]">
            <div className="rounded-[18px] border border-[#E3DCD2] bg-white/60 p-6 md:p-10">
              <div
                className="space-y-6 text-center"
                style={{ fontFamily: "Literata, serif" }}
              >
                <p className="text-lg">Whew! You're one hell of a Founder.</p>
                <h2
                  className="text-3xl font-normal md:text-[45px]"
                  style={{ fontFamily: "Epilogue, sans-serif" }}
                >
                  YOU'RE DONE!
                </h2>
                <p className="text-sm leading-relaxed md:text-base">
                  You're building it solid. You're building it right. Filling
                  out these questions took honesty, clarity, and time—and you
                  did it. Kudos to your perseverance.
                </p>
                <div className="space-y-4">
                  <p className="text-sm font-semibold md:text-base">
                    Now, here's what we'll do:
                  </p>
                  <p className="text-sm leading-relaxed md:text-base">
                    We'll read every single word. Not skim—actually read. We'll
                    look for patterns, listen for your voice, and notice where
                    you light up. Then we'll translate it all into:
                  </p>
                  <ul className="list-disc space-y-1 text-left text-sm md:text-base">
                    <li>
                      A brand that feels like you—no templates, no trends, just
                      you.
                    </li>
                    <li>
                      A website that speaks in your voice, not corporate-speak.
                    </li>
                    <li>Colors and shapes that represent who you are.</li>
                    <li>Messages that resonate with your customers.</li>
                  </ul>
                </div>
                <div className="space-y-2 text-sm leading-relaxed md:text-base">
                  <p>Within 3-5 days, you'll receive:</p>
                  <ul className="list-disc space-y-1 text-left">
                    <li>Identity Statement — the heart of who you are.</li>
                    <li>Positioning Map — where you fit in your market.</li>
                    <li>Strategic Brief — the blueprint for your brand.</li>
                  </ul>
                  <p>
                    We'll then schedule a call to walk through everything
                    together.
                  </p>
                </div>
                <p className="text-sm md:text-base">
                  Thank you for trusting us with your story. — Purple Pine
                  Digital
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-center">
                <Button
                  type="button"
                  onClick={handleReview}
                  className="w-full rounded-md border border-[#37306B] bg-transparent px-8 py-4 text-base font-normal text-[#37306B] hover:bg-[#37306B]/10 md:w-auto"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  Review your responses
                </Button>
                <Button
                  type="button"
                  onClick={handleRestart}
                  className="w-full rounded-md bg-[#37306B] px-8 py-4 text-base font-normal text-[#FFFAEE] hover:bg-[#2C2758] md:w-auto"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  Start a new form
                </Button>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
