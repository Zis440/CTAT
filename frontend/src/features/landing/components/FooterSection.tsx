import { Link } from "react-router-dom";

const footerColumns = [
  [
    {
      title: "Platform",
      links: [
        { label: "Platform Overview", href: "/about" },
        { label: "User Guide", href: "/how-to-use" },
      ],
    },
  ],
  [
    {
      title: "Company",
      links: [
        { label: "Our Team", href: "/team" },
        { label: "Developer", href: "/developer" },
      ],
    },
  ],
  [
    {
      title: "Help and security",
      links: [
        { label: "Support Center", href: "/login?redirect=/support" },
      ],
    },
  ],
  [
    {
      title: "Legal",
      links: [
        { label: "Terms and Conditions", href: "/terms" },
        { label: "Privacy Policy", href: "/privacy" },
      ],
    },
  ],
];

export function Footer() {
  return (
    <footer className="bg-background pt-16 pb-12 border-t border-primary/20 transition-colors">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-12 lg:gap-8 min-h-[175px]">
          <div className="lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/coretat-logo.png"
                alt="CoreTAT Logo"
                className="h-14 md:h-16 w-auto hidden dark:block"
              />
              <img
                src="/coretat-report-logo.png"
                alt="CoreTAT Logo"
                className="h-14 md:h-16 w-auto block dark:hidden"
              />
            </div>

            <div className="mt-16 lg:mt-auto flex flex-col gap-2">
              <div className="flex flex-col text-xs text-text/50 font-bold tracking-widest uppercase gap-1">
                <p>A PRODUCT BY</p>
                <p className="text-text/70">Zis440 © {new Date().getFullYear()}</p>
                <p className="normal-case tracking-normal font-medium text-text/60 mt-1">
                  Developed by{" "}
                  <a
                    href="https://saphalya-das.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary transition-colors text-text/80 font-semibold"
                  >
                    Saphalya Das
                  </a>
                </p>
              </div>

            </div>
          </div>

          <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-8">
            {footerColumns.map((col, colIndex) => (
              <div key={colIndex} className="flex flex-col gap-10">
                {col.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="flex flex-col gap-4">
                    <h3 className="font-semibold text-sm text-text">
                      {section.title}
                    </h3>
                    <ul className="flex flex-col gap-3">
                      {section.links.map((link, linkIndex) => {
                        const isString = typeof link === "string";
                        const label = isString ? link : link.label;
                        const href = isString ? "#" : link.href;

                        return (
                          <li key={linkIndex}>
                            {isString || href.startsWith("http") ? (
                              <a
                                href={href}
                                className="text-sm font-medium text-text/60 hover:text-primary transition-colors"
                              >
                                {label}
                              </a>
                            ) : (
                              <Link
                                to={href}
                                className="text-sm font-medium text-text/60 hover:text-primary transition-colors"
                              >
                                {label}
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
