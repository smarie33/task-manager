"use client";

import TaskManager from "@/components/TaskManager";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { SynchronizedScrollProvider } from "@/components/SynchronizedScrollProvider";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SynchronizedScrollProvider>
        <div className="w-full flex justify-end p-4">
          <Button asChild variant="secondary">
            <Link to="/profile">Open Profile</Link>
          </Button>
        </div>
        <TaskManager />
      </SynchronizedScrollProvider>
      <MadeWithDyad />
    </div>
  );
};

export default Index;