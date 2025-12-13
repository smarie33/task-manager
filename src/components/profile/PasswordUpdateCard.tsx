"use client";

import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((vals) => vals.newPassword === vals.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

const PasswordUpdateCard: React.FC = () => {
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
    mode: "onChange",
  });

  const onSubmit = async (values: FormValues) => {
    const { error } = await supabase.auth.updateUser({ password: values.newPassword });
    if (error) {
      toast({
        title: "Failed to update password",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Password updated",
      description: "Your password has been changed successfully.",
    });
    form.reset({ newPassword: "", confirmPassword: "" });
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Update your account password. You’ll use this next time you sign in.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" placeholder="Enter a new password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" placeholder="Re-enter new password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <Button type="submit" disabled={!form.formState.isValid || form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Minimum 8 characters. You may need to sign in again on other devices.
      </CardFooter>
    </Card>
  );
};

export default PasswordUpdateCard;