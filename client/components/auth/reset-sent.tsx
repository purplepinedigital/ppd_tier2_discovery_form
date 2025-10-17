export function ResetSent() {
  return (
    <div className="flex w-full max-w-[1332px] flex-col items-center justify-center space-y-8 text-center">
      <svg
        className="h-[87px] w-[94px]"
        viewBox="0 0 94 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="47" cy="44" r="44" fill="#37306B" />
        <path
          d="M30 44L42 56L64 34"
          stroke="#FFFAEE"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="space-y-8">
        <p
          className="text-3xl font-normal"
          style={{ fontFamily: "Literata, serif" }}
        >
          Email has been sent.
        </p>
        <h2
          className="text-4xl font-black md:text-[45px]"
          style={{ fontFamily: "Epilogue, sans-serif" }}
        >
          Check now.
        </h2>
        <p
          className="mx-auto max-w-[689px] text-base font-normal leading-relaxed"
          style={{ fontFamily: "Literata, serif" }}
        >
          Password reset instructions are on their way to your inbox. Look for
          an email from Purple Pine Digital with the subject "Reset Your
          Password" and click the link inside.
        </p>
      </div>
    </div>
  );
}
