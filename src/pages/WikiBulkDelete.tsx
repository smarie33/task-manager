"use client";

import React from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import EntriesBulkDeleteSection from "@/components/wiki-bulk-delete/EntriesBulkDeleteSection";

const WikiBulkDelete: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="p-4 container mx-auto max-w-5xl flex-1 w-full space-y-6">
        <EntriesBulkDeleteSection />
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default WikiBulkDelete;