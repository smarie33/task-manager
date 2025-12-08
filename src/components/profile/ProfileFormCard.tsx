"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { loadProfile, saveProfile, profileSchema, type ProfileFormValues } from "@/utils/profile-storage";

const initialsFromName = (name: string) => {
  if (!name) return "ME";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "ME";
};

const ProfileFormCard: React.FC = () => {
  const { toast } = useToast();
  const stored = typeof window !== "undefined" ? loadProfile() : null;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: stored?.name ?? "",
      email: stored?.email ?? "",
      phone: stored?.phone ?? "",
      address: stored?.address ?? "",
      avatarDataUrl: stored?.avatarDataUrl ?? "",
    },
    mode: "onChange",
  });

  const avatar = form.watch("avatarDataUrl");
  const displayName = form.watch("name");

  const handleAvatarChange = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString() ?? "";
      form.setValue("avatarDataUrl", result, { shouldDirty: true, shouldTouch: true });
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (values: ProfileFormValues) => {
    saveProfile(values);
    toast({
      title: "Profile saved",
      description: "Your personal information was updated successfully.",
    });
  };

  const onClearPhoto = () => {
    form.setValue("avatarDataUrl", "", { shouldDirty: true, shouldTouch: true });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>My Profile</CardTitle>
        <CardDescription>Manage your personal information and profile photo.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <div className="flex flex-col items-center gap-3 md:w-1/3">
            <Avatar className="h-24 w-24">
              {avatar ? (
                <AvatarImage src={avatar} alt="Profile photo" />
              ) : (
                <AvatarFallback className="text-lg">{initialsFromName(displayName)}</AvatarFallback>
              )}
            </Avatar>
            <div className="flex items-center gap-2">
              <label className="relative">
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
                  aria-label="Upload profile photo"
                />
                <Button type="button" variant="secondary" size="sm">
                  Upload Photo
                </Button>
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={onClearPhoto} disabled={!avatar}>
                Remove
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              PNG, JPG up to a few MB. Your photo is stored locally in your browser.
            </p>
          </div>

          <div className="md:w-2/3">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} />
                      </FormControl>
                      <FormDescription>Your full name as you'd like it displayed.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="jane@example.com" autoComplete="email" {...field} />
                      </FormControl>
                      <FormDescription>Your contact email (optional).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 000-0000" {...field} />
                      </FormControl>
                      <FormDescription>Include country code if applicable.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="123 Main St, Springfield, USA" rows={4} {...field} />
                      </FormControl>
                      <FormDescription>Your mailing address.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-2">
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between text-xs text-muted-foreground">
        <span>Profile data is stored locally in your browser.</span>
      </CardFooter>
    </Card>
  );
};

export default ProfileFormCard;