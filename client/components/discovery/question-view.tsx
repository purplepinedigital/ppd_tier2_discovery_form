import { Fragment } from "react";
import { FlattenedQuestion } from "@/data/discovery-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface QuestionViewProps {
  question: FlattenedQuestion;
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function QuestionView({
  question,
  value,
  onChange,
  onNext,
  onPrevious,
  isFirst,
  isLast,
}: QuestionViewProps) {
  const paddedNumber = question.overallNumber.toString().padStart(2, "0");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-[#37306B] text-base font-medium text-[#FFFAEE]">
              {paddedNumber}
            </span>
            <h3
              className="text-2xl font-normal leading-snug text-black sm:text-[26px]"
              style={{ fontFamily: "Literata, serif" }}
            >
              {question.prompt}
            </h3>
          </div>
        </div>

        <div
          className={cn(
            "grid gap-6 text-sm leading-relaxed text-black",
            question.guidance.length === 2
              ? "lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]"
              : "lg:grid-cols-1",
          )}
        >
          {question.guidance.map((item, index) => (
            <Fragment key={`${question.overallNumber}-guidance-${index}`}>
              <div className="space-y-2">
                <p
                  className="text-sm font-semibold uppercase tracking-wide text-[#37306B]"
                  style={{ fontFamily: "Epilogue, sans-serif" }}
                >
                  {item.title}
                </p>
                <p
                  className="text-sm whitespace-pre-line"
                  style={{ fontFamily: "Literata, serif" }}
                >
                  {item.body}
                </p>
              </div>
              {question.guidance.length === 2 && index === 0 ? (
                <div
                  className="hidden h-full w-px bg-[#ACACAC] lg:block"
                  aria-hidden="true"
                />
              ) : null}
            </Fragment>
          ))}
        </div>

        {question.example ? (
          <div className="flex flex-col gap-4 rounded-md border border-transparent bg-[#FFF3D8] p-6 text-sm text-black md:flex-row md:items-start md:gap-6">
            <div className="hidden h-full w-3 rounded-sm bg-[#FFC741] md:block" aria-hidden="true" />
            <div className="space-y-2" style={{ fontFamily: "Literata, serif" }}>
              <p className="text-sm font-semibold">
                {question.exampleLabel ?? "Example:"}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {question.example}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Add your answer here."
          className="min-h-[180px] rounded-md border border-[#D9D9D9] bg-[#FFFAEE] text-base leading-relaxed text-black placeholder:text-[#ACACAC]"
          style={{ fontFamily: "Epilogue, sans-serif" }}
        />
        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-end">
          {!isFirst ? (
            <Button
              type="button"
              onClick={onPrevious}
              className="w-full justify-center rounded-md border border-[#37306B] bg-transparent px-8 py-4 text-base font-normal text-[#37306B] hover:bg-[#37306B]/10 sm:w-auto"
              style={{ fontFamily: "Literata, serif" }}
            >
              Go Back
            </Button>
          ) : (
            <div className="hidden sm:block" aria-hidden="true" />
          )}
          <Button
            type="button"
            onClick={onNext}
            className="w-full justify-center rounded-md bg-[#37306B] px-8 py-4 text-base font-normal text-[#FFFAEE] hover:bg-[#2C2758] sm:w-auto"
            style={{ fontFamily: "Literata, serif" }}
          >
            {isLast ? "Submit responses" : "Move to next"}
            <svg
              className="ml-2 h-4 w-4"
              viewBox="0 0 21 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M20.3536 4.21122C20.5488 4.01596 20.5488 3.69937 20.3536 3.50411L17.1716 0.322132C16.9763 0.12687 16.6597 0.12687 16.4645 0.322132C16.2692 0.517394 16.2692 0.833977 16.4645 1.02924L19.2929 3.85767L16.4645 6.68609C16.2692 6.88136 16.2692 7.19794 16.4645 7.3932C16.6597 7.58846 16.9763 7.58846 17.1716 7.3932L20.3536 4.21122ZM0 3.85767V4.35767H20V3.85767V3.35767H0V3.85767Z"
                fill="currentColor"
              />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
