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
        { label: "Terms and Conditions", href: "https://psyichub.com/terms-conditions/" },
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
                src="/psyichub-logo-v2.png"
                alt="Psyichub Logo"
                className="h-14 md:h-16 w-auto dark:filter-none" style={{ filter: "brightness(0) saturate(100%) invert(33%) sepia(43%) saturate(935%) hue-rotate(70deg) brightness(100%) contrast(83%)" }}
              />
            </div>

            <div className="mt-16 lg:mt-auto flex flex-col gap-2">
              <div className="flex flex-col text-xs text-text/50 font-bold tracking-widest uppercase gap-1">
                <p>A PRODUCT BY</p>
                <p>TECHGEN CYBER SOLUTION PVT. LTD © {new Date().getFullYear()}</p>
              </div>
              {/* <div className="flex gap-4 mt-4 text-text/50">
                <a href="#" className="hover:text-primary transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="hover:text-primary transition-colors">
                  <Linkedin className="h-5 w-5" />
                </a>
                <a href="#" className="hover:text-primary transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
              </div> */}
            </div>
          </div>

          {/* Right section with columns */}
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
