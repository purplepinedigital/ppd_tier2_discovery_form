import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { supabase, saveFormProgress, loadFormProgress } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { formQuestions, formSections } from "@/data/discovery-form";
import QuestionView from "@/components/discovery/question-view";

let clientSupabase: any = null;

const getClientSupabase = () => {
  if (!clientSupabase) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error("Supabase configuration is missing");
    }

    clientSupabase = createClient(supabaseUrl, anonKey);
  }
  return clientSupabase;
};

interface Engagement {
  id: string;
  user_id: string;
  project_name: string;
  program: string | null;
}

const createInitialResponses = () =>
  formQuestions.reduce(
    (acc, q) => {
      acc[q.id] = "";
      return acc;
    },
    {} as Record<string, string>,
  );

const getFirstQuestionIndexForSection = (sectionId: string) => {
  return formQuestions.findIndex((q) => q.sectionId === sectionId);
};

const getSectionIndexById = (sectionId: string) => {
  return formSections.findIndex((s) => s.id === sectionId);
};

export default function ProjectFormFill() {
  const navigate = useNavigate();
  const { engagementId } = useParams<{ engagementId: string }>();

  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>(
    createInitialResponses,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  const currentQuestion = formQuestions[currentQuestionIndex];
  const activeSection = formSections[activeSectionIndex];
  const totalQuestions = formQuestions.length;

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

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
          navigate("/");
          return;
        }

        setUser(currentUser);

        if (!engagementId) {
          navigate("/project/journey");
          return;
        }

        // Load engagement details
        const client = getClientSupabase();
        const { data: engagementData, error: engagementError } = await client
          .from("engagements")
          .select("*")
          .eq("id", engagementId)
          .eq("user_id", currentUser.id)
          .single();

        if (engagementError) throw engagementError;
        if (!engagementData) {
          navigate("/project/journey");
          return;
        }

        setEngagement(engagementData);

        // Load form progress
        const progress = await loadFormProgress(currentUser.id, engagementId);
        if (progress) {
          setResponses(progress.responses);
          setCurrentQuestionIndex(progress.current_question_index);
          setActiveSectionIndex(progress.active_section_index);
        } else {
          // New form - start from beginning
          const firstIndex = getFirstQuestionIndexForSection(formSections[0].id);
          setResponses(createInitialResponses());
          setCurrentQuestionIndex(firstIndex === -1 ? 0 : firstIndex);
          setActiveSectionIndex(0);
        }
      } catch (err: any) {
        console.error("Error loading form:", err);
        setError("Failed to load form");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, [engagementId, navigate]);

  useEffect(() => {
    if (user && engagementId) {
      const timer = setTimeout(() => {
        saveFormProgress(
          user.id,
          engagementId,
          responses,
          currentQuestionIndex,
          activeSectionIndex,
        ).catch(console.error);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, engagementId, responses, currentQuestionIndex, activeSectionIndex]);

  const handleNext = async () => {
    if (!currentQuestion) {
      return;
    }

    if (currentQuestionIndex === totalQuestions - 1) {
      // Form complete - go to lifecycle page
      navigate(`/project/lifecycle/${engagementId}`);
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
      return;
    }

    if (nextSectionIndex !== -1) {
      setActiveSectionIndex(nextSectionIndex);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex === 0) {
      return;
    }

    const prevIndex = currentQuestionIndex - 1;
    const prevQuestion = formQuestions[prevIndex];
    const prevSectionIndex = getSectionIndexById(prevQuestion.sectionId);

    setCurrentQuestionIndex(prevIndex);

    if (prevQuestion.sectionId !== currentQuestion.sectionId) {
      setActiveSectionIndex(
        prevSectionIndex === -1 ? activeSectionIndex : prevSectionIndex,
      );
      return;
    }

    if (prevSectionIndex !== -1) {
      setActiveSectionIndex(prevSectionIndex);
    }
  };

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p style={{ fontFamily: "Literata, serif" }}>Loading form...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-600">
          <p>{error}</p>
          <Button
            onClick={() => navigate("/project/journey")}
            className="mt-4 bg-[#37306B] hover:bg-[#2C2758] text-white"
          >
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p style={{ fontFamily: "Literata, serif" }}>Engagement not found</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFAEE]">
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-6 md:py-6">
          <div className="flex items-center gap-4">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/243e9e26600924d4d43f0793db0944381e2ae2b0?width=330"
              alt="Purple Pine Digital"
              className="h-10 w-auto md:h-12"
            />
            <div className="flex flex-col">
              <h1
                className="text-lg font-bold text-[#37306B] md:text-xl"
                style={{ fontFamily: "Epilogue, sans-serif" }}
              >
                {engagement.project_name}
              </h1>
              <p
                className="text-sm text-gray-600"
                style={{ fontFamily: "Literata, serif" }}
              >
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white text-sm md:text-base"
            style={{ fontFamily: "Literata, serif" }}
          >
            Logout
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-7.5 sm:py-11">
        {currentQuestion && (
          <div className="w-full max-w-2xl">
            <div className="mb-8">
              <div className="mb-2 flex items-center justify-between">
                <p
                  className="text-sm font-semibold text-[#37306B]"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  Progress
                </p>
                <p
                  className="text-sm text-gray-600"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  {Math.round(progressPercentage)}%
                </p>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-[#37306B] transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            <QuestionView
              question={currentQuestion}
              response={responses[currentQuestion.id] || ""}
              onResponseChange={(value) =>
                handleResponseChange(currentQuestion.id, value)
              }
            />

            <div className="mt-8 flex gap-4">
              <Button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 disabled:opacity-50"
                style={{ fontFamily: "Literata, serif" }}
              >
                ← Previous
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-[#37306B] hover:bg-[#2C2758] text-white"
                style={{ fontFamily: "Literata, serif" }}
              >
                {currentQuestionIndex === totalQuestions - 1
                  ? "Complete Form"
                  : "Next →"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
