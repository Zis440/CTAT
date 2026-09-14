
import { Mail, Globe } from "lucide-react";

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

const people = [
  {
    name: "Saphalya Das",
    role: "Backend Engineer",
    imageUrl: "https://lh3.googleusercontent.com/d/1m_j4F0Hwjy1peoylS0IAR_LN1wD3FcWZ",
    email: "mailto:szd0238@gmail.com",
    github: "https://github.com/Zis440",
    linkedin: "https://www.linkedin.com/in/saphalya-das-81a06b1b3/",
    website: "https://saphalya-das.vercel.app/",
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

export function AboutSections() {
  return (
    <>

      <div className="mx-auto flex flex-col items-center max-w-[1440px] gap-16">
        <div className="max-w-3xl text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-text sm:text-5xl font-serif">
            The Engine Behind CoreTAT
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
              <div className="flex flex-col mb-4">
                <h3 className="text-xl font-extrabold tracking-tight text-text">
                  {person.name}
                </h3>
                <p className="text-sm font-bold text-primary mt-0.5">{person.role}</p>
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
                {(person as any).website && (
                  <a
                    href={(person as any).website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${person.name} Portfolio`}
                    className="hover:text-primary transition-colors"
                    title="Portfolio"
                  >
                    <Globe className="w-5 h-5 cursor-pointer" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
