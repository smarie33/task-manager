"use client";

import React from "react";
import { useTaskData } from "@/context/task-data-context";
import AppHeader from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

const Tags: React.FC = () => {
  const { groups } = useTaskData();

  const allTags = React.useMemo(() => {
    return Array.from(new Set(groups.flatMap((g) => g.tasks.flatMap((t) => t.tags)))).sort();
  }, [groups]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <AppHeader />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">Tags</h1>
        {allTags.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">No tags yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allTags.map((tag) => (
              <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`} className="block">
                <Card className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" role="link" aria-label={`View tag ${tag}`}>
                  <span className="text-blue-600 dark:text-blue-400 hover:underline">#{tag}</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tags;