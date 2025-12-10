"use client";

export interface StatusOption {
  name: string;
  color: string;
}

export interface Task {
  id: string;
  content: string; // Item
  owner: string;
  status: string; // references StatusOption.name
  timeline: string; // e.g., "2023-12-31"
  timeTracking: number; // in hours
  tags: string[];
  hasFiles: boolean;
  timeLogs?: { durationSeconds: number; date: string }[];
  comments?: { id: string; text: string; createdAt: string; author?: string }[];
  // NEW: files metadata for uploaded images
  files?: { id: string; name: string; url: string }[];
}

export interface TaskGroupData {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
}