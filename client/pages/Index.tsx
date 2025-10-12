export default function Index() {
  const listItems = [
    "Conversational questions, that help develop a narrative of your business.",
    "Examples for every question to guide your thinking.",
    "Auto-save after each section — pause anytime.",
    "Skip questions and return later if needed.",
    "45-60 minutes to complete all sections.",
  ];

  const images = [
    {
      src: "https://api.builder.io/api/v1/image/assets/TEMP/3b8bbc262f3c8425e77ce7ad0147672ad99aed4a?width=1040",
      alt: "Coastal landscape",
      className: "md:col-span-2 lg:col-span-2"
    },
    {
      src: "https://api.builder.io/api/v1/image/assets/TEMP/ea051a142b8187fef386c72fac8149f6e812ffed?width=636",
      alt: "Architectural detail",
      className: "md:col-span-1 lg:col-span-1"
    },
    {
      src: "https://api.builder.io/api/v1/image/assets/TEMP/1a3d7488cf112abf960cde26ab529cee3f6c06c0?width=636",
      alt: "Golden hour field",
      className: "md:col-span-1 lg:col-span-1"
    },
    {
      src: "https://api.builder.io/api/v1/image/assets/TEMP/403fa1458c2163a90e288f9f520ed3d92679fba9?width=731",
      alt: "Birds in flight",
      className: "md:col-span-2 lg:col-span-1"
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFFAEE]">
      {/* Header */}
      <header className="px-4 md:px-12 lg:px-24 py-8 md:py-10">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/5ae482a3264989e7b7e1cd057876826b46db9d6e?width=330"
          alt="Purple Pine Digital"
          className="h-10 md:h-12 lg:h-[50px] w-auto"
        />
      </header>

      {/* Main Content */}
      <main className="px-4 md:px-12 lg:px-24 pb-12 md:pb-16 lg:pb-20">
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-8 lg:gap-12 mb-12 md:mb-16 lg:mb-20">
          {/* Left Column - Heading */}
          <div className="flex flex-col gap-6 md:gap-8 lg:max-w-[665px]">
            <p className="text-sm md:text-base font-normal" style={{ fontFamily: 'Literata, serif' }}>
              On Behalf of Purple Pine Digital
            </p>
            <h1 
              className="text-4xl md:text-5xl lg:text-[71px] font-normal leading-tight lg:leading-none"
              style={{ fontFamily: 'Epilogue, sans-serif' }}
            >
              The Conversation Starter
            </h1>
          </div>

          {/* Right Column - What to Expect */}
          <div className="flex flex-col gap-5 lg:max-w-[430px]">
            <h2 
              className="text-xl md:text-2xl font-normal"
              style={{ fontFamily: 'Epilogue, sans-serif' }}
            >
              What to Expect:
            </h2>
            <ul className="flex flex-col gap-5">
              {listItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <svg
                    className="flex-shrink-0 w-4 h-4 mt-1"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M13.9991 2.04344C14.023 1.49167 13.5952 1.02493 13.0434 1.00094L4.05193 0.610009C3.50017 0.586019 3.03343 1.01386 3.00944 1.56563C2.98545 2.11739 3.41329 2.58413 3.96506 2.60812L11.9575 2.95562L11.61 10.9481C11.586 11.4998 12.0139 11.9666 12.5656 11.9906C13.1174 12.0146 13.5841 11.5867 13.6081 11.0349L13.9991 2.04344ZM1 13L1.67572 13.7372L13.6757 2.73715L13 2L12.3243 1.26285L0.324275 12.2628L1 13Z"
                      fill="black"
                    />
                  </svg>
                  <span 
                    className="text-sm md:text-base font-normal flex-1"
                    style={{ fontFamily: 'Literata, serif' }}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
          {images.map((image, index) => (
            <div
              key={index}
              className={`relative overflow-hidden rounded-2xl ${image.className}`}
            >
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-64 md:h-72 lg:h-[365px] object-cover"
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
