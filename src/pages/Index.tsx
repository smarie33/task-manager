"use client";

import TaskManager from "@/components/TaskManager";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { SynchronizedScrollProvider } from "@/components/SynchronizedScrollProvider";
import AppHeader from "@/components/AppHeader";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SynchronizedScrollProvider>
        <AppHeader />
        <TaskManager />
      </SynchronizedScrollProvider>
      <MadeWithDyad />
    </div>
  );
};

export default Index;