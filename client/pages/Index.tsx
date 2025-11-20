import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { QuestionView } from "@/components/discovery/question-view";
import { Button } from "@/components/ui/button";
import { Signup } from "@/components/auth/signup";
import { Login } from "@/components/auth/login";
import { ResetPassword } from "@/components/auth/reset-password";
import { ResetSent } from "@/components/auth/reset-sent";
import { VerifyEmail } from "@/components/auth/verify-email";
import {
  formQuestions,
  formSections,
  totalQuestions,
} from "@/data/discovery-form";
import { supabase, saveFormProgress, loadFormProgress } from "@/lib/supabase";
import { sendToKlaviyo } from "@/lib/klaviyo";
import { getImpersonatedUserId } from "@/lib/admin-impersonate";
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
  | "verifyEmail"
  | "sectionWelcome"
  | "question"
  | "projectName"
  | "complete";

export default function Index() {
  const [screen, setScreen] = useState<Screen>("hero");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<string[]>(createInitialResponses);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<
    string | null
  >(null);
  const [projectName, setProjectName] = useState("");
  const [engagementId, setEngagementId] = useState<string | null>(null);

  const [searchParams] = useSearchParams();

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

  const startIntro = async () => {
    // If user is already logged in, check their project status
    if (user) {
      try {
        const { data: engagements } = await supabase
          .from("engagements")
          .select("id")
          .eq("user_id", user.id);

        if (engagements && engagements.length > 0) {
          // User has projects - go to My Projects page
          window.location.href = "/project/journey";
        } else {
          // User has no projects - start new project creation
          setProjectName("");
          setEngagementId(null);
          setScreen("projectName");
        }
      } catch (error) {
        console.error("Error checking engagements:", error);
        window.location.href = "/project/journey";
      }
      return;
    }
    setScreen("intro");
  };

  const startForm = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      // Check if user has existing engagements
      try {
        const { data: engagements } = await supabase
          .from("engagements")
          .select("id")
          .eq("user_id", data.session.user.id);

        if (engagements && engagements.length > 0) {
          // User has projects - redirect to ProjectJourney
          window.location.href = "/project/journey";
          return;
        }
      } catch (error) {
        console.error("Error checking engagements:", error);
      }

      // User is logged in but has no projects - start new project creation flow
      window.location.href = "/?newProject=true";
    } else {
      setScreen("signup");
    }
  };

  useEffect(() => {
    const fetchUserName = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("signups")
          .select("name")
          .eq("user_id", userId)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            // Record not found - this is okay
            console.debug("Signup record not found for user");
            return;
          }
          console.error("Error fetching user name:", {
            message: error.message,
            code: error.code,
            hint: error.hint,
          });
          return;
        }

        if (data && data.name) {
          setUserName(data.name);
        }
      } catch (err: any) {
        console.error("Exception fetching user name:", {
          message: err.message,
          name: err.name,
          stack: err.stack,
        });
        // Don't block app on name fetch failure
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserName(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Check if email is verified and we're in a protected screen
        if (
          !session.user.email_confirmed_at &&
          screen !== "verifyEmail" &&
          screen !== "hero" &&
          screen !== "intro"
        ) {
          setPendingVerificationEmail(session.user.email ?? null);
          setScreen("verifyEmail");
        }
        setUser(session.user);
        fetchUserName(session.user.id);
      } else {
        setUser(null);
        setUserName(null);
        setPendingVerificationEmail(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle URL parameters (engagement continuation or new project)
  useEffect(() => {
    const handleURLParams = async () => {
      const engagementParam = searchParams.get("engagement");
      const newProjectParam = searchParams.get("newProject");

      // Handle new project creation
      if (newProjectParam === "true" && user && screen === "hero") {
        setResponses(createInitialResponses());
        setCurrentQuestionIndex(0);
        setActiveSectionIndex(0);
        setProjectName("");
        setEngagementId(null);
        setScreen("projectName");
        return;
      }

      // Handle engagement continuation
      if (engagementParam && user && screen === "hero") {
        try {
          setEngagementId(engagementParam);

          // Use impersonated user ID if available, otherwise use current user ID
          const userIdForProgress = getImpersonatedUserId() || user.id;

          // Load form progress for this engagement
          const progress = await loadFormProgress(userIdForProgress, engagementParam);
          if (progress && progress.responses) {
            // Convert Record format to array format if needed
            const responsesArray = Array.isArray(progress.responses)
              ? progress.responses
              : Object.values(progress.responses);
            setResponses(responsesArray);
            setCurrentQuestionIndex(progress.current_question_index);
            setActiveSectionIndex(progress.active_section_index);
            setScreen("question");
          } else {
            // No progress yet - start from beginning
            setResponses(createInitialResponses());
            const firstIndex = getFirstQuestionIndexForSection(
              formSections[0].id,
            );
            setCurrentQuestionIndex(firstIndex === -1 ? 0 : firstIndex);
            setActiveSectionIndex(0);
            setScreen("sectionWelcome");
          }
        } catch (err) {
          console.error("Error loading engagement form:", err);
          setScreen("hero");
        }
      }
    };

    if (user) {
      handleURLParams();
    }
  }, [user, searchParams, screen]);

  useEffect(() => {
    if (user && screen === "question" && engagementId) {
      const timer = setTimeout(() => {
        const userIdForProgress = getImpersonatedUserId() || user.id;
        saveFormProgress(
          userIdForProgress,
          engagementId,
          responses,
          currentQuestionIndex,
          activeSectionIndex,
        ).catch(console.error);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [
    user,
    engagementId,
    responses,
    currentQuestionIndex,
    activeSectionIndex,
    screen,
  ]);

  const handleSignup = async (
    email: string,
    name: string,
    password: string,
  ) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      // FIRST: Check if email already exists in signups table (this is the source of truth)
      const { data: existingSignups, error: checkError } = await supabase
        .from("signups")
        .select("email")
        .eq("email", email);

      if (existingSignups && existingSignups.length > 0) {
        setAuthError(
          "This email is already registered. Please log in instead.",
        );
        setAuthLoading(false);
        return;
      }

      // SECOND: Attempt signup with Supabase auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      // Check for auth errors
      if (error) {
        if (error.message && error.message.includes("already registered")) {
          setAuthError(
            "This email is already registered. Please log in instead.",
          );
          setAuthLoading(false);
          return;
        }
        throw error;
      }

      // If we get here, auth signup succeeded and user exists
      setUser(data.user);
      setUserName(name);
      setPendingVerificationEmail(email);

      // Save signup to Supabase signups table using API endpoint (to bypass RLS)
      try {
        const saveResponse = await fetch("/api/save-signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            name,
            user_id: data.user.id,
          }),
        });

        if (!saveResponse.ok) {
          try {
            const errorData = await saveResponse.json().catch(() => ({}));
            console.error(
              "Error saving signup:",
              errorData?.message || `Status ${saveResponse.status}`,
            );
          } catch (e) {
            console.error(
              "Error saving signup:",
              `Status ${saveResponse.status}`,
            );
          }
        }
      } catch (saveError: any) {
        console.error(
          "Error saving signup:",
          saveError?.message || "Network error",
        );
      }

      // ONLY send to Klaviyo if email was successfully saved (duplicate check already passed)
      try {
        await sendToKlaviyo({
          email,
          firstName: name.split(" ")[0],
          lastName: name.split(" ").slice(1).join(" "),
          subscribed: true,
        });
      } catch (klaviyoError: any) {
        console.error(
          "Error sending to Klaviyo:",
          klaviyoError?.message || JSON.stringify(klaviyoError),
        );
      }

      // Show verification pending screen
      setScreen("verifyEmail");
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
        // Check if email is verified
        if (!data.user.email_confirmed_at) {
          setPendingVerificationEmail(email);
          setScreen("verifyEmail");
          setAuthLoading(false);
          return;
        }

        setUser(data.user);

        // Fetch user name
        const { data: signupData } = await supabase
          .from("signups")
          .select("name")
          .eq("user_id", data.user.id);

        if (signupData && signupData.length > 0 && signupData[0]?.name) {
          setUserName(signupData[0].name);
        }

        // Check if user has existing projects
        try {
          const { data: engagements } = await supabase
            .from("engagements")
            .select("id")
            .eq("user_id", data.user.id);

          if (engagements && engagements.length > 0) {
            // User has projects - redirect to My Projects page
            window.location.href = "/project/journey";
            return;
          }
        } catch (error) {
          console.error("Error checking engagements:", error);
        }

        // No projects yet - ask for project name first (Tier 1)
        setProjectName("");
        setEngagementId(null);
        setScreen("projectName");
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
        redirectTo: typeof window !== "undefined" ? window.location.origin : "",
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

  const handleNext = async () => {
    if (!currentQuestion) {
      return;
    }

    if (currentQuestionIndex === totalQuestions - 1) {
      // Form is complete
      if (engagementId) {
        // Resuming existing engagement - go directly to thank you
        setScreen("complete");
      } else {
        // New engagement - ask for project name
        setScreen("projectName");
      }
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

  const createEngagement = async () => {
    if (!projectName.trim()) {
      alert("Please enter a project name");
      return;
    }

    if (!user) {
      alert("Please log in to continue");
      return;
    }

    try {
      console.log("Creating engagement for project:", projectName);
      let response: Response;

      try {
        response = await fetch("/api/engagements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_name: projectName,
            user_id: user.id,
            form_responses: responses,
          }),
        });
      } catch (fetchError: any) {
        const fetchErrorDetails = {
          message: fetchError?.message || "Unknown fetch error",
          name: fetchError?.name || "Error",
          stack: fetchError?.stack,
        };
        console.error("Network fetch error:", fetchErrorDetails);
        throw new Error(
          `Network error: ${fetchErrorDetails.message}. Please check your connection.`,
        );
      }

      console.log("Engagement response received:", {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type"),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        const parseErrorMessage =
          parseError instanceof Error ? parseError.message : String(parseError);
        console.error(
          "Failed to parse engagement response. Status:",
          response.status,
          "ContentType:",
          response.headers.get("content-type"),
          "Error:",
          parseErrorMessage,
        );
        throw new Error(
          `Server returned invalid response (HTTP ${response.status}): ${parseErrorMessage}`,
        );
      }

      if (!response.ok) {
        const errorMsg =
          data?.error ||
          data?.message ||
          response.statusText ||
          "Unknown error";
        console.error("API error response:", {
          status: response.status,
          statusText: response.statusText,
          error: errorMsg,
        });
        throw new Error(`HTTP ${response.status}: ${errorMsg}`);
      }

      if (data.success && data.engagement_id) {
        console.debug("Engagement created successfully");
        setEngagementId(data.engagement_id);

        // Redirect to Tier 1 form for this project
        window.location.href = `/project/${data.engagement_id}/tier1`;
      } else {
        const errorMsg =
          data?.error || data?.message || "Failed to create engagement";
        console.error("Engagement creation failed:", {
          success: data?.success,
          error: errorMsg,
        });
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      const errorMessage =
        error?.message || (typeof error === "string" ? error : "Unknown error");
      console.error("Error creating engagement:", errorMessage);
      console.debug("Error details:", {
        message: errorMessage,
        name: error?.name,
        stack: error?.stack,
      });
      alert(`Failed to create project: ${errorMessage}. Please try again.`);
    }
  };

  const startNewProject = async () => {
    if (!user) {
      alert("Please log in to continue");
      return;
    }

    const firstIndex = getFirstQuestionIndexForSection(formSections[0].id);
    setResponses(createInitialResponses());
    setCurrentQuestionIndex(firstIndex === -1 ? 0 : firstIndex);
    setActiveSectionIndex(0);
    setProjectName("");
    setEngagementId(null);
    setScreen("projectName");
  };

  const questionValue = responses[currentQuestionIndex] ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFAEE] text-black">
      <header
        className="mx-auto flex w-full items-center justify-between px-[30px] py-[30px] md:px-[90px]"
        style={{ maxWidth: "100%" }}
      >
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/243e9e26600924d4d43f0793db0944381e2ae2b0?width=330"
          alt="Purple Pine Digital"
          className="h-10 w-auto md:h-12 lg:h-[50px]"
        />
        {user && userName ? (
          <div className="flex items-center gap-6">
            <span
              className="text-base font-bold text-[#37306B]"
              style={{ fontFamily: "Literata, serif" }}
            >
              Hi {userName.split(" ")[0]}
            </span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setUser(null);
                setUserName(null);
                setScreen("hero");
              }}
              className="text-base font-bold text-[#37306B] underline-offset-4 hover:underline"
              style={{ fontFamily: "Literata, serif" }}
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setScreen("login")}
              className="text-sm font-semibold text-[#37306B] underline-offset-4 hover:underline"
              style={{ fontFamily: "Literata, serif" }}
            >
              Login
            </button>
            <a
              href="https://purplepine.digital"
              target="_blank"
              rel="noreferrer"
              className="hidden text-sm font-semibold text-[#37306B] underline-offset-4 hover:underline sm:inline"
              style={{ fontFamily: "Literata, serif" }}
            >
              Go to PurplePine.Digital
            </a>
          </div>
        )}
      </header>

      <main className="flex flex-1 items-center justify-center px-5 sm:px-7.5 py-8 sm:py-11">
        {screen === "hero" ? (
          <section className="w-full max-w-[1332px] space-y-12">
            <div className="flex flex-col gap-8 lg:gap-12">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex max-w-[665px] flex-col gap-8">
                  <div className="space-y-6">
                    <p
                      className="text-sm font-normal md:text-base"
                      style={{ fontFamily: "Literata, serif" }}
                    >
                      60 Minute Business Discovery Form
                    </p>
                    <h1
                      className="text-[40px] leading-[42px] font-bold uppercase md:text-5xl md:leading-tight md:text-6xl lg:text-[71px] lg:leading-tight"
                      style={{
                        fontFamily: "Epilogue, sans-serif",
                      }}
                    >
                      Welcome to the Discovery Room.
                    </h1>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <Button
                      type="button"
                      onClick={startIntro}
                      className="w-fit inline-flex items-center gap-2 rounded bg-[#37306B] px-10 py-4 text-base font-normal text-[#FFFAEE] hover:bg-[#2C2758] overflow-hidden"
                      style={{
                        fontFamily: "Literata, serif",
                        borderRadius: "3px",
                        height: "auto",
                        flexGrow: "0",
                      }}
                    >
                      Get Started
                      <svg
                        className="h-4 w-4"
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
                <div className="w-full max-w-[548px]">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/f351a0ecba667b552b03d0817fc3b067111075fc?width=1097"
                    alt="Discovery room illustration"
                    className="h-auto w-full"
                    style={{ display: "none" }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-[6px] bg-[#37306B] p-12 text-[#FFFAEE] flex flex-col justify-between">
                <div className="space-y-6">
                  <h3
                    className="text-4xl font-bold"
                    style={{ fontFamily: "Epilogue, sans-serif" }}
                  >
                    1Origin
                  </h3>
                  <p
                    className="text-xl leading-relaxed"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    You've been running your business, learning as you go. Now
                    let's capture that story and make it clear.
                  </p>
                </div>
              </div>

              <div className="rounded-[6px] bg-[#37306B] p-12 text-[#FFFAEE] flex flex-col justify-between">
                <div className="space-y-6">
                  <h3
                    className="text-4xl font-bold"
                    style={{ fontFamily: "Epilogue, sans-serif" }}
                  >
                    2Discovery
                  </h3>
                  <p
                    className="text-xl leading-relaxed"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    We won't ask you to design your brand. We'll ask you to tell
                    us your story — and we'll translate it into everything you
                    need.
                  </p>
                </div>
              </div>

              <div className="rounded-[6px] bg-[#37306B] p-12 text-[#FFFAEE] flex flex-col justify-between">
                <div className="space-y-6">
                  <h3
                    className="text-4xl font-bold"
                    style={{ fontFamily: "Epilogue, sans-serif" }}
                  >
                    3Blueprint
                  </h3>
                  <p
                    className="text-xl leading-relaxed"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    By the end of this conversation, we'll know exactly how to
                    build a brand that feels like you.
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {screen === "intro" ? (
          <section className="w-full max-w-[1332px]">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex h-full flex-col justify-between gap-10 rounded-[10px] bg-[#FFEDC3] p-10 sm:p-7.5">
                <div className="space-y-6 flex flex-col sm:block">
                  <p
                    className="text-base font-normal"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    Why should you fill this?
                  </p>
                  <h2
                    className="text-2xl sm:text-5xl font-bold leading-tight md:text-6xl lg:text-[71px] lg:leading-tight w-full"
                    style={{
                      fontFamily: "Epilogue, sans-serif",
                    }}
                  >
                    ~1.2 million businesses launch every month.
                  </h2>
                </div>
                <p
                  className="text-lg leading-relaxed"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  And most of them find that their brand doesn't clearly explain
                  what they do or why someone should choose them — because they
                  started building before they understood their own story.
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="rounded-[10px] bg-[#FFEDC3] p-8 md:p-10">
                  <h3
                    className="text-2xl font-normal mb-6"
                    style={{ fontFamily: "Epilogue, sans-serif" }}
                  >
                    I won't ask you to guess
                  </h3>
                  <div className="flex flex-col gap-5 sm:gap-6">
                    <div className="rounded-[7px] bg-[#FFC741] p-4 md:p-5">
                      <p
                        className="text-base font-normal"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        Not "pick three values" — but about a time you said no
                        to money.
                      </p>
                    </div>
                    <div className="rounded-[7px] bg-[#FFC741] p-4 md:p-5">
                      <p
                        className="text-base font-normal"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        Not "define your audience" �� but describe your last
                        real customer.
                      </p>
                    </div>
                    <div className="rounded-[7px] bg-[#FFC741] p-4 md:p-5">
                      <p
                        className="text-base font-normal"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        Not "choose a personality" — but how you talk when
                        things go wrong.
                      </p>
                    </div>
                    <div className="rounded-[7px] bg-[#FFC741] p-4 md:p-5">
                      <p
                        className="text-base font-normal"
                        style={{ fontFamily: "Literata, serif" }}
                      >
                        Not "what makes you different" — but what people say
                        about you.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[10px] bg-[#FFEDC3] p-8 md:p-10">
                  <h3
                    className="text-2xl font-normal mb-6"
                    style={{ fontFamily: "Epilogue, sans-serif" }}
                  >
                    What happens next?
                  </h3>
                  <div className="mb-6 rounded-md bg-[#FFC741] p-4 md:p-5">
                    <p
                      className="text-base font-bold"
                      style={{ fontFamily: "Literata, serif" }}
                    >
                      30 questions. 60 minutes. One clarity session.
                    </p>
                  </div>
                  <p
                    className="text-base leading-relaxed space-y-2"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    <span className="font-bold">Your positioning</span>
                    <span>, where you actually fit in the market | </span>
                    <span className="font-bold">Your messaging</span>
                    <span>, words that sound like you, not a template | </span>
                    <span className="font-bold">Your visual direction</span>
                    <span>, colors and design rooted in your story | </span>
                    <span className="font-bold">Your brand blueprint</span>
                    <span>, so nothing gets built on guesswork</span>
                  </p>
                </div>

                <div className="flex flex-col items-start gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p
                    className="text-base font-normal"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    Every business starts somewhere. Let's understand yours.
                  </p>
                  <Button
                    type="button"
                    onClick={startForm}
                    className="w-fit inline-flex items-center gap-2 rounded bg-[#37306B] px-10 py-4 text-base font-normal text-[#FFFAEE] hover:bg-[#2C2758] whitespace-nowrap overflow-hidden"
                    style={{
                      fontFamily: "Literata, serif",
                      borderRadius: "3px",
                      height: "auto",
                      width: "auto",
                      alignSelf: "center",
                      flexGrow: "0",
                    }}
                  >
                    Begin Your story
                    <svg
                      className="h-4 w-4"
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
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/c3f13d5b4b0c214b0258c5ca6f0bb4d54867b0da?width=112"
              alt="Checkmark"
              className="h-auto w-[56px]"
            />
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
                {activeSection.description}{" "}
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

        {screen === "verifyEmail" && pendingVerificationEmail ? (
          <section className="w-full max-w-[1360px]">
            {authError && (
              <div className="mb-4 rounded-md bg-red-100 p-4 text-sm text-red-800">
                {authError}
              </div>
            )}
            <VerifyEmail
              email={pendingVerificationEmail}
              onSwitchToLogin={() => {
                setScreen("login");
                setPendingVerificationEmail(null);
                setAuthError(null);
              }}
            />
          </section>
        ) : null}

        {screen === "question" && currentQuestion && activeSection ? (
          <section className="w-full max-w-[1332px]">
            <div className="space-y-8 p-6 md:p-10">
              <div className="space-y-8">
                <div className="hidden md:block">
                  <div className="relative h-[30px]">
                    <div
                      className="absolute left-0 right-0 top-[6px] h-0 bg-[#ACACAC]"
                      style={{ borderTop: "1px solid #ACACAC" }}
                    />
                    <div className="flex items-start justify-between">
                      {formSections.map((section, index) => {
                        const status =
                          index < activeSectionIndex
                            ? "complete"
                            : index === activeSectionIndex
                              ? "current"
                              : "upcoming";

                        const widthMap: Record<string, string> = {
                          "The Customer You Deserve": "192px",
                          "How You Communicate": "163px",
                          "Visual & Symbolic": "132px",
                          "How You Work": "105px",
                          "Your Market": "93px",
                          "Your Story": "81px",
                        };

                        return (
                          <div
                            key={section.id}
                            className="relative z-10 flex flex-col items-start gap-0.5"
                          >
                            <svg
                              className="h-2.5 w-2.5"
                              viewBox="0 0 10 10"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <circle
                                cx="5"
                                cy="5"
                                r="5"
                                fill={
                                  status === "upcoming" ? "#BAB8B8" : "#37306B"
                                }
                              />
                            </svg>
                            <span
                              className="text-center text-xs font-normal"
                              style={{
                                fontFamily: "Literata, serif",
                                width: widthMap[section.title] || "81px",
                              }}
                            >
                              {section.title.toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h2
                    className="text-4xl font-bold md:text-[45px]"
                    style={{ fontFamily: "Epilogue, sans-serif" }}
                  >
                    {activeSection.title}
                  </h2>
                  <p
                    className="text-base font-bold"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    Section {activeSection.id} of {totalSections}
                  </p>
                </div>

                <div className="h-px bg-[#ACACAC]" />

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
                      Click “Save & Move to Next��� when you're ready. Pause
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

        {screen === "projectName" ? (
          <section className="flex w-full max-w-[1332px] flex-col items-center justify-center gap-8">
            <div className="flex flex-col items-center justify-center gap-6">
              <h2
                className="text-center text-4xl font-bold"
                style={{ fontFamily: "Epilogue, sans-serif" }}
              >
                What's your project name?
              </h2>
              <p
                className="max-w-[560px] text-center text-base font-normal leading-normal"
                style={{ fontFamily: "Literata, serif" }}
              >
                Give your project a name so we can organize your discovery
                insights and track your journey through the program.
              </p>
            </div>
            <div className="w-full max-w-md space-y-4">
              <input
                type="text"
                placeholder="e.g., My Brand Redesign, E-commerce Launch"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full rounded border border-gray-300 px-4 py-3 text-base focus:border-[#37306B] focus:outline-none"
                onKeyPress={(e) => e.key === "Enter" && createEngagement()}
              />
              <button
                onClick={createEngagement}
                className="w-full bg-[#37306B] hover:bg-[#2C2758] text-[#FFFAEE] px-8 py-3 rounded font-normal text-base"
                style={{ fontFamily: "Literata, serif" }}
              >
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {screen === "complete" ? (
          <section className="flex w-full max-w-[1332px] flex-col items-center justify-center gap-5">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/ac1599db89c35cde8b69edbb53cc04fa356a0685?width=112"
              alt="Completion checkmark"
              className="h-auto w-14"
            />
            <div className="flex flex-col items-center justify-center gap-[30px] self-stretch">
              <p
                className="self-stretch text-center text-[25px] font-normal leading-normal"
                style={{ fontFamily: "Literata, serif" }}
              >
                Whew! You're one hell of a Founder.
              </p>
              <h2
                className="self-stretch text-center text-[45px] font-black leading-normal"
                style={{ fontFamily: "Epilogue, sans-serif", fontWeight: 900 }}
              >
                YOU'RE DONE!
              </h2>
              <p
                className="max-w-[560px] text-center text-base font-normal leading-normal"
                style={{ fontFamily: "Literata, serif" }}
              >
                You're building it solid. You're building it right. We know
                filling all these questions wasn't easy — it takes real thought,
                honesty, and clarity. But you did it. Kudos to your
                perseverance.
              </p>
              <div className="flex flex-col items-center">
                <p
                  className="max-w-[566px] text-center text-base font-normal leading-normal"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  <span className="font-bold">Now, here's what we'll do:</span>
                  <br />
                  <br />
                  We'll read every single word. Not skim — actually read. We'll
                  look for patterns. Listen for your voice. Notice where you
                  light up and what you care about most. And we'll translate it
                  all into:
                </p>
                <p
                  className="mt-4 max-w-[672px] text-center text-base font-normal leading-normal"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  A brand that feels like you — not a template, not a trend, but
                  YOU
                  <br />
                  A website that speaks like you — in your voice, not
                  corporate-speak
                  <br />
                  Colors and shapes that represent you �� visuals that match who
                  you are
                  <br />
                  Messages that resonate with your customers
                </p>
              </div>
              <div className="mt-8 flex gap-4 justify-center flex-wrap">
                {engagementId && (
                  <Button
                    onClick={() => {
                      window.location.href = `/project/lifecycle/${engagementId}`;
                    }}
                    className="bg-[#37306B] hover:bg-[#2C2758] text-[#FFFAEE] px-8 py-3"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    View Your Lifecycle Roadmap
                  </Button>
                )}
                <Button
                  onClick={startNewProject}
                  className="bg-[#37306B] hover:bg-[#2C2758] text-[#FFFAEE] px-8 py-3"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  Start New Project
                </Button>
                <Button
                  onClick={() => {
                    const firstIndex = getFirstQuestionIndexForSection(
                      formSections[0].id,
                    );
                    setCurrentQuestionIndex(firstIndex === -1 ? 0 : firstIndex);
                    setActiveSectionIndex(0);
                    setScreen("question");
                  }}
                  className="bg-[#37306B] hover:bg-[#2C2758] text-[#FFFAEE] px-8 py-3"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  Edit your responses
                </Button>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
