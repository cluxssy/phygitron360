import ceo from "../../../assets/ceo.png";
import cybersec from "../../../assets/cybersec.png";
import phy from "../../../assets/phy.png";
import bgPattern from "../../../assets/bg-pattern.png";

const cards = [
  { src: ceo, alt: "CEO" },
  { src: phy, alt: "Phygitron" },
  { src: cybersec, alt: "Cybersecurity" },
];

const InsightsSection = () => {
  return (
    <section className="relative w-full bg-[#151515] py-10 md:py-12 overflow-hidden">

      {/* Decorative corner pattern — natural size, positioned bottom-left */}
      <img
        src={bgPattern}
        alt=""
        aria-hidden="true"
        className="absolute -bottom-10 -left-10 w-[400px] md:w-[500px] opacity-40 pointer-events-none select-none"
      />

      {/* Dotted overlay at 0.10 opacity */}
      <div
        className="absolute inset-0 pointer-events-none"
        
      />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 lg:px-10">

        {/* ── HEADER ── */}
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-white leading-tight">
            Insights from Industry Leaders
          </h2>
          <p className="text-gray-400 text-[15px] max-w-[620px] mx-auto mt-4 leading-relaxed">
            Explore expert perspectives, success stories, and future-focused
            conversations shaping cybersecurity, digital employability, AI,
            and workforce transformation.
          </p>
        </div>

        {/* ── STATIC STRIP — all three cards side by side ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <div
              key={i}
              className="overflow-hidden border border-white/10"
            >
              <img
                src={card.src}
                alt={card.alt}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default InsightsSection;
