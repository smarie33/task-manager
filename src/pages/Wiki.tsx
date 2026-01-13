"use client";

import React from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const Wiki: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="p-4 container mx-auto max-w-4xl flex-1 w-full">
        <Card>
          <CardHeader>
            <CardTitle>Wiki</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Welcome to your project wiki. Add helpful docs, how-tos, and process notes here.
            </p>
            <div className="prose dark:prose-invert max-w-none">
              <h2>Getting Started</h2>
              <p>
                Use this page to document your workflows, conventions, and any information your team needs.
              </p>
              <h3>Sections</h3>
              <ul className="list-disc pl-6">
                <li>Project overview</li>
                <li>Setup instructions</li>
                <li>Usage tips</li>
                <li>Troubleshooting</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Wiki;