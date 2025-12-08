"use client";

import { z } from "zod";

export const PROFILE_STORAGE_KEY = "profile:data";

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name is too long"),
  phone: z
    .string()
    .min(7, "Phone must be at least 7 digits")
    .max(20, "Phone is too long")
    .regex(/^[0-9+()\-\\s]*$/, "Only digits, spaces, and +()- are allowed"),
  address: z.string().min(1, "Address is required").max(300, "Address is too long"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  avatarDataUrl: z.string().optional().or(z.literal("")),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const loadProfile = (): ProfileFormValues | null => {
  const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return profileSchema.partial().parse(parsed) as ProfileFormValues;
  } catch {
    return null;
  }
};

export const saveProfile = (data: ProfileFormValues) => {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
};