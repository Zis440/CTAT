import { Button } from "@/components/ui/button";

export function Pricing() {
    // CHANGED: Updated prices — Individual Test → ₹30, Clinical → ₹20
    const plans = [
        {
            name: "Individual Test",
            price: "₹30",
            description: "Standard psychological assessment for individual use.",
        },
        {
            name: "Clinical",
            price: "₹20",
            description: "Advanced analysis tailored for clinical applications.",
        },
        {
            name: "Organization",
            price: "₹20",
            description: "Corporate well-being & large scale psychological screening.",
        }
    ];

    return (
        <section>
            <div className="w-full max-w-[1440px] mx-auto text-center mb-12">
                <h2 className="text-4xl font-extrabold tracking-tight text-text sm:text-5xl font-serif mb-4">
                    Affordable Insights, Unmatched Value
                </h2>
                <p className="mx-auto max-w-[600px] text-lg/8 text-text/70">
                    Everything you need to scale your practice. Designed to grow with you.
                </p>
                <div className="flex flex-wrap justify-center gap-6 mt-12">
                    {plans.map((plan, i) => (
                        <div key={i} className="bg-background border-2 border-primary/20 rounded-3xl p-6 shadow-sm flex flex-col items-start w-full sm:w-[calc(50%-1.5rem)] max-w-sm text-left">
                            <h3 className="text-xl font-extrabold tracking-tight text-text">
                                {plan.name}
                            </h3>
                            <p className="text-sm font-bold text-text/50 mt-1">{plan.description}</p>

                            <div className="w-full h-px bg-primary/10 my-6"></div>

                            <div className="flex items-baseline gap-1">
                                <span className="text-5xl font-black text-primary tracking-tight">{plan.price}</span>
                                <span className="text-md font-bold text-text/40">/test</span>
                            </div>

                            <Button
                                className="w-full mt-8 rounded-xl font-bold h-12 shadow-md shadow-primary/20"
                                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                            >
                                Get Started
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
