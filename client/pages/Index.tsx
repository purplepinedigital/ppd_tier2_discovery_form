import { useMemo, useState } from "react";
import { QuestionView } from "@/components/discovery/question-view";
import { Button } from "@/components/ui/button";
import { formQuestions, totalQuestions } from "@/data/discovery-form";

type Screen = "hero" | "intro" | "form" | "complete";

const heroList = [
  "Conversational questions, that help develop a narrative of your business.",
  "Examples for every question to guide your thinking.",
  "Auto-save after each section — pause anytime.",
  "Skip questions and return later if needed.",
  "45-60 minutes to complete all sections.",
];

const heroImages = [
  {
    src: "https://api.builder.io/api/v1/image/assets/TEMP/3d2e875503d9fec432484e20c345e0cb8ab759fb?width=1040",
    alt: "Coastal landscape",
    className: "sm:col-span-2 lg:col-span-2",
  },
  {
    src: "https://api.builder.io/api/v1/image/assets/TEMP/ea051a142b8187fef386c72fac8149f6e812ffed?width=636",
    alt: "Architectural detail",
    className: "",
  },
  {
    src: "https://api.builder.io/api/v1/image/assets/TEMP/1a3d7488cf112abf960cde26ab529cee3f6c06c0?width=636",
    alt: "Golden hour field",
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

export default function Index() {
  const [screen, setScreen] = useState<Screen>("hero");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<string[]>(createInitialResponses);
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = formQuestions[currentQuestionIndex];

  const progressPercentage = useMemo(() => {
    if (isComplete || totalQuestions <= 1) {
      return 100;
    }

    return (currentQuestionIndex / (totalQuestions - 1)) * 100;
  }, [currentQuestionIndex, isComplete]);

  const startIntro = () => {
    setScreen("intro");
    setIsComplete(false);
  };

  const startForm = () => {
    setResponses(createInitialResponses());
    setCurrentQuestionIndex(0);
    setIsComplete(false);
    setScreen("form");
  };

  const handleNext = () => {
    if (currentQuestionIndex === totalQuestions - 1) {
      setIsComplete(true);
      setScreen("complete");
      return;
    }

    setCurrentQuestionIndex((prev) => Math.min(prev + 1, totalQuestions - 1));
  };

  const handlePrevious = () => {
    if (currentQuestionIndex === 0) {
      setScreen("intro");
      return;
    }

    setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleAnswerChange = (value: string) => {
    setResponses((prev) => {
      const updated = [...prev];
      updated[currentQuestionIndex] = value;
      return updated;
    });
  };

  const handleReview = () => {
    setIsComplete(false);
    setScreen("form");
  };

  const handleRestart = () => {
    setResponses(createInitialResponses());
    setCurrentQuestionIndex(0);
    setIsComplete(false);
    setScreen("form");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFAEE] text-black">
      <header className="mx-auto flex w-full max-w-[1332px] items-center justify-between px-4 py-8 sm:px-8 md:px-12 lg:px-24">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/243e9e26600924d4d43f0793db0944381e2ae2b0?width=330"
          alt="Purple Pine Digital"
          className="h-10 w-auto md:h-12 lg:h-[50px]"
        />
        {screen !== "hero" && screen !== "complete" ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (screen === "intro") {
                setScreen("hero");
              }

              if (screen === "form") {
                setScreen("intro");
              }
            }}
            className="hidden text-sm font-normal text-[#37306B] hover:bg-transparent hover:text-[#2C2758] sm:inline-flex"
            style={{ fontFamily: "Literata, serif" }}
          >
            Back
          </Button>
        ) : null}
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
                  I'm not a bureaucratic form. I'm a conversation starter. You're here because
                  you've chosen to build your brand seriously. My questions aren't an exam,
                  they're prompts that help you tell the story you've been living but haven't
                  written down yet.
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
                    Make you pick colors, buzzwords, or "traits." That's our job. Yours is to describe
                    reality. Every question exists for a reason; nothing here is filler.
                  </div>
                  <p
                    className="mt-4 text-sm leading-relaxed"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    Depth matters—which is why there are 30 questions. They save you from vague brands
                    and rework later.
                  </p>
                </div>

                <div className="flex flex-col items-start justify-between gap-4 rounded-[10px] bg-transparent py-6 text-sm sm:flex-row sm:items-center">
                  <p style={{ fontFamily: "Literata, serif" }}>
                    Every business starts somewhere. Let's understand yours.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      onClick={() => setScreen("hero")}
                      variant="ghost"
                      className="justify-center px-6 py-4 text-base font-normal text-[#37306B] hover:bg-transparent hover:text-[#2C2758]"
                      style={{ fontFamily: "Literata, serif" }}
                    >
                      Back
                    </Button>
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
            </div>
          </section>
        ) : null}

        {(screen === "form" || screen === "complete") && !isComplete ? (
          <section className="w-full max-w-[1332px]">
            <div className="rounded-[18px] bg-white/60 p-6 shadow-sm backdrop-blur-sm md:p-10">
              <div className="space-y-6">
                <div className="space-y-3">
                  <p
                    className="text-sm uppercase tracking-wide text-[#37306B]"
                    style={{ fontFamily: "Epilogue, sans-serif" }}
                  >
                    {currentQuestion.sectionLabel}
                  </p>
                  <h2
                    className="text-3xl font-normal md:text-[40px]"
                    style={{ fontFamily: "Epilogue, sans-serif" }}
                  >
                    {currentQuestion.sectionTitle}
                  </h2>
                  <p
                    className="text-sm font-semibold"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    {currentQuestion.sectionEmphasis}
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    {currentQuestion.sectionDescription}
                  </p>
                  {currentQuestion.sectionNote ? (
                    <p
                      className="text-sm leading-relaxed text-[#37306B]"
                      style={{ fontFamily: "Literata, serif" }}
                    >
                      {currentQuestion.sectionNote}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p
                      className="text-sm font-semibold uppercase tracking-wide text-[#37306B]"
                      style={{ fontFamily: "Epilogue, sans-serif" }}
                    >
                      Question {currentQuestion.overallNumber} of {totalQuestions}
                    </p>
                    <p
                      className="text-sm text-[#4F4A7A]"
                      style={{ fontFamily: "Literata, serif" }}
                    >
                      Answers auto-save as you go. You can pause anytime.
                    </p>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#E3DCD2]">
                    <div
                      className="h-full rounded-full bg-[#37306B] transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-10 border-t border-[#E3DCD2] pt-10">
                <QuestionView
                  question={currentQuestion}
                  value={responses[currentQuestionIndex]}
                  onChange={handleAnswerChange}
                  onNext={handleNext}
                  onPrevious={handlePrevious}
                  isFirst={currentQuestionIndex === 0}
                  isLast={currentQuestionIndex === totalQuestions - 1}
                />
              </div>
            </div>
          </section>
        ) : null}

        {screen === "complete" && isComplete ? (
          <section className="w-full max-w-[1332px]">
            <div className="rounded-[18px] bg-white/60 p-6 shadow-sm backdrop-blur-sm md:p-10">
              <div className="space-y-6">
                <div className="space-y-3">
                  <p
                    className="text-sm uppercase tracking-wide text-[#37306B]"
                    style={{ fontFamily: "Epilogue, sans-serif" }}
                  >
                    All sections completed
                  </p>
                  <h2
                    className="text-3xl font-normal md:text-[40px]"
                    style={{ fontFamily: "Epilogue, sans-serif" }}
                  >
                    Thank you for sharing
                  </h2>
                  <p
                    className="text-sm font-semibold"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    Your story is on its way to the team.
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ fontFamily: "Literata, serif" }}
                  >
                    Take a breath—you've given us the details we need to craft your narrative.
                  </p>
                </div>
              </div>

              <div className="mt-10 rounded-[14px] bg-[#FFEDC3] p-8">
                <div className="space-y-6 text-sm leading-relaxed" style={{ fontFamily: "Literata, serif" }}>
                  <div>
                    <h3 className="text-2xl font-normal" style={{ fontFamily: "Epilogue, sans-serif" }}>
                      ✅ You're done
                    </h3>
                    <p className="mt-3">
                      Thank you. You've just given us more than answers. You've given us your story.
                    </p>
                    <p className="mt-2">
                      Now we'll read every word. Look for patterns. Listen for your voice. And we'll
                      translate it all into:
                    </p>
                    <ul className="mt-3 list-disc space-y-1 pl-5">
                      <li>A brand that feels like you</li>
                      <li>A website that speaks like you</li>
                      <li>Colors and shapes that represent you</li>
                      <li>Messages that resonate with your customers</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">What happens next:</h4>
                    <p>Within 3-5 days, you'll receive:</p>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>Identity Statement — who you are at your core</li>
                      <li>Positioning Map — where you fit in your market</li>
                      <li>Strategic Brief — the blueprint for your brand</li>
                    </ul>
                    <p>
                      We'll then schedule a call to walk through everything together.
                    </p>
                    <p>Thank you for trusting us with your story. — Purple Pine Digital</p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
