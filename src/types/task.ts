"use client";

export interface StatusOption {
  name: string;
  color: string;
}

export interface FileMeta {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
  // ADDED: source task info for Images library
  sourceTaskId?: string;
  sourceTaskContent?: string;
}

export interface LinkMeta {
  id: string;
  url: string;
  label?: string;
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
  files?: FileMeta[]; // UPDATED: include mimeType for image detection
}

export interface TaskGroupData {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
}