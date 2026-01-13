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
          <CardContent className="space-y-6">
            <section id="overview" className="space-y-2">
              <h2 className="text-xl font-semibold">Overview</h2>
              <p className="text-muted-foreground">
                Welcome to your project wiki. Add helpful docs, how-tos, and process notes here.
              </p>
            </section>

            <section id="getting-started" className="space-y-2">
              <h2 className="text-xl font-semibold">Getting Started</h2>
              <p>
                Use this page to document your workflows, conventions, and any information your team needs.
              </p>
            </section>

            <section id="guides" className="space-y-2">
              <h2 className="text-xl font-semibold">Guides</h2>
              <ul className="list-disc pl-6">
                <li>Project overview</li>
                <li>Setup instructions</li>
                <li>Usage tips</li>
                <li>Troubleshooting</li>
              </ul>
            </section>

            <section id="faq" className="space-y-2">
              <h2 className="text-xl font-semibold">FAQ</h2>
              <p className="text-muted-foreground">
                Add common questions and answers here to help your team find information quickly.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Wiki;