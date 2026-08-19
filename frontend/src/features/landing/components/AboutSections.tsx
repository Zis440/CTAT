// src/features/landing/components/AboutSections.tsx
import { HeartHandshake, Mail } from "lucide-react";

// Brand icons were removed from lucide-react; inline SVG replacements
function Github({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function Linkedin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}


// ── Team data ───────────────────────────────────────────────────────────────
const people = [
  {
    name: "Saphalya Das",
    role: "Backend Engineer",
    imageUrl: "https://lh3.googleusercontent.com/d/1m_j4F0Hwjy1peoylS0IAR_LN1wD3FcWZ",
    email: "mailto:szd0238@gmail.com",
    github: "https://github.com/Zis440",
    linkedin: "https://www.linkedin.com/in/saphalya-das-81a06b1b3/",
  },
  {
    name: "Anubhab Pal",
    role: "Frontend Developer",
    imageUrl: "https://lh3.googleusercontent.com/d/1-MPPxpCaxLFaeuGr_CDyBUt3dkR2wKJs",
    email: "mailto:anubhabpal1@gmail.com",
    github: "https://github.com/therandomuser03",
    linkedin: "https://www.linkedin.com/in/therandomuser03/",
  },
  {
    name: "Sanjana Chatterjee",
    role: "UI/UX Designer | Documentation",
    imageUrl: "https://lh3.googleusercontent.com/d/1Q8XzoDIemS8xMwA2bR3OGavDEnwc8lGP",
    email: "mailto:misssanjanachatterjee@gmail.com",
    github: "https://github.com/SanjanaChatterjee",
    linkedin: "https://www.linkedin.com/in/sanjana-jpeg/",
  },
];

// ── Combined section ────────────────────────────────────────────────────────
export function AboutSections() {
  return (
    <>
      {/* Team Section */}
      <div className="mx-auto flex flex-col items-center max-w-[1440px] gap-16">
        <div className="max-w-3xl text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-text sm:text-5xl font-serif">
            The Engine Behind Psyichub
          </h2>
          <p className="mt-6 text-lg/8 text-text/70 font-medium">
            We are a passionate team of developers and designers bridging
            traditional psychological assessment with modern artificial
            intelligence to build rigorous, data-centric frameworks for the next
            generation of clinical tools.
          </p>
        </div>
        <ul
          role="list"
          className="flex flex-wrap justify-center gap-6 w-full max-w-[1440px] mx-auto"
        >
          {people.map((person, i) => (
            <li
              key={`${person.name}-${i}`}
              className="bg-background border-2 border-primary/20 rounded-3xl p-6 shadow-sm flex flex-col transition-transform hover:-translate-y-1 hover:shadow-md w-full sm:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-1.5rem)] max-w-md"
            >
              <div className="flex items-center gap-5 mb-4">
                <div className="w-20 h-20 rounded-full overflow-hidden shrink-0 bg-primary/5 relative border-2 border-primary/20">
                  <img
                    alt={person.name}
                    src={person.imageUrl}
                    className="absolute inset-0 w-full h-full object-cover grayscale mix-blend-multiply dark:mix-blend-screen"
                    style={{ objectPosition: "center top" }}
                  />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-lg font-extrabold tracking-tight text-text">
                    {person.name}
                  </h3>
                  <p className="text-sm font-bold text-text/50">{person.role}</p>
                </div>
              </div>

              <div className="w-full h-px bg-primary/10 my-4"></div>

              <div className="flex items-center gap-4 text-text/60 mt-2">
                <a
                  href={person.email}
                  aria-label={`${person.name} Email`}
                  className="hover:text-primary transition-colors"
                >
                  <Mail className="w-5 h-5 cursor-pointer" />
                </a>
                <a
                  href={person.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${person.name} GitHub`}
                  className="hover:text-primary transition-colors"
                >
                  <Github className="w-5 h-5 cursor-pointer fill-current" />
                </a>
                <a
                  href={person.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${person.name} LinkedIn`}
                  className="hover:text-primary transition-colors"
                >
                  <Linkedin className="w-5 h-5 cursor-pointer fill-current" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {/* Special Thanks */}
      <div className="w-full max-w-5xl mx-auto mt-12 bg-primary/10 border-l-4 border-primary rounded-r-2xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start shadow-sm transition-colors relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />

        <div className="bg-background rounded-full p-4 shrink-0 shadow-sm border border-primary/20">
          <HeartHandshake className="w-8 h-8 text-primary" />
        </div>

        <div className="flex-1 z-10">
          <h3 className="text-xl font-bold text-text mb-3 flex items-center gap-2">
            Special Thanks
          </h3>
          <blockquote className="text-base/7 text-text/80 font-medium italic">
            “This project would not have been possible without the invaluable guidance of{" "}
            <span className="font-bold text-primary not-italic">
              Sayonee Chatterjee
            </span>
            . We owe her a deep debt of gratitude for her dedicated mentorship,
            her patience in teaching us the intricacies of Assessment, and her
            continuous, meticulous analysis of our initial reports. Her clinical
            expertise and unwavering support were the cornerstones that helped
            turn Psyichub from a concept into reality.”
          </blockquote>
        </div>
      </div>
    </>
  );
}
