"use client";

import TaskManager from "@/components/TaskManager";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { SynchronizedScrollProvider } from "@/components/SynchronizedScrollProvider";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SynchronizedScrollProvider>
        <TaskManager />
      </SynchronizedScrollProvider>
      <MadeWithDyad />
    </div>
  );
};

export default Index;