import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardGrid } from "./CardGridPage";

export function TATCardPreviewPage() {
  const [cardVersion, setCardVersion] = useState<"indianized" | "globalized">("indianized");

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Card Preview | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h2 className="text-3xl font-bold tracking-tight mb-2">Narrative Intelligence Cards</h2>
          <p className="text-muted-foreground">
            Browse all Narrative Intelligence cards by version and category.
          </p>
        </motion.div>

        <Tabs value={cardVersion} onValueChange={(val: string) => setCardVersion(val as "indianized" | "globalized")}>
          <TabsList>
            <TabsTrigger value="indianized">Indianized</TabsTrigger>
            <TabsTrigger value="globalized">Globalized</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <CardGrid version={cardVersion} />
    </div>
  );
}
