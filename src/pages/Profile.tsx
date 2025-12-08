"use client";

import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { v4 as uuidv4 } from "uuid";

const PROFILE_STORAGE_KEY = "profile:data";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name is too long"),
  phone: z
    .string()
    .min(7, "Phone must be at least 7 digits")
    .max(20, "Phone is too long")
    .regex(/^[0-9+()\-\s]*$/, "Only digits, spaces, and +()- are allowed"),
  address: z.string().min(1, "Address is required").max(300, "Address is too long"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  avatarDataUrl: z.string().optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// ADD: Admin user management types and storage
type Role = "Admin" | "Editor" | "Viewer";
type UserStatus = "pending" | "active";

type AdminUser = {
  id: string;
  name: string;
  password: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
};

const USERS_STORAGE_KEY = "admin:users";

const loadUsers = (): AdminUser[] => {
  const raw = localStorage.getItem(USERS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as AdminUser[];
    return [];
  } catch {
    return [];
  }
};

const saveUsers = (users: AdminUser[]) => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

const loadProfile = (): ProfileFormValues | null => {
  const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return profileSchema.partial().parse(parsed) as ProfileFormValues;
  } catch {
    return null;
  }
};

const saveProfile = (data: ProfileFormValues) => {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
};

const initialsFromName = (name: string) => {
  if (!name) return "ME";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "ME";
};

const Profile: React.FC = () => {
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

  // ADD: Admin users state and handlers
  const [users, setUsers] = React.useState<AdminUser[]>(() => (typeof window !== "undefined" ? loadUsers() : []));
  const [newUserName, setNewUserName] = React.useState("");
  const [newUserPassword, setNewUserPassword] = React.useState("");
  const [newUserRole, setNewUserRole] = React.useState<Role>("Viewer");

  const persistUsers = (next: AdminUser[]) => {
    setUsers(next);
    saveUsers(next);
  };

  const handleAddUser = () => {
    if (!newUserName.trim() || !newUserPassword.trim()) {
      toast({ title: "Missing info", description: "Please enter a name and password." });
      return;
    }
    const newUser: AdminUser = {
      id: uuidv4(),
      name: newUserName.trim(),
      password: newUserPassword,
      role: newUserRole,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const next = [newUser, ...users];
    persistUsers(next);
    setNewUserName("");
    setNewUserPassword("");
    setNewUserRole("Viewer");
    toast({ title: "User created", description: "User added as pending. Approve to activate." });
  };

  const approveUser = (id: string) => {
    const next = users.map((u) => (u.id === id ? { ...u, status: "active" } : u));
    persistUsers(next);
    toast({ title: "User approved", description: "The user can now access the app." });
  };

  const changeRole = (id: string, role: Role) => {
    const next = users.map((u) => (u.id === id ? { ...u, role } : u));
    persistUsers(next);
    toast({ title: "Role updated", description: `Role changed to ${role}.` });
  };

  const deleteUser = (id: string) => {
    const next = users.filter((u) => u.id !== id);
    persistUsers(next);
    toast({ title: "User deleted", description: "The user was removed." });
  };

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
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto max-w-5xl p-4 md:p-8">
        <div className="mb-4">
          <Button asChild variant="secondary">
            <Link to="/">Back to Tasks</Link>
          </Button>
        </div>

        {/* Admin Panel */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Admin Panel</CardTitle>
            <CardDescription>Approve new users, set roles, and manage accounts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add user (creates a pending user) */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="newUserName">Name</Label>
                <Input
                  id="newUserName"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="New user's name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="newUserPassword">Password</Label>
                <Input
                  id="newUserPassword"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Temporary password"
                />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as Role)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Editor">Editor</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="button" className="w-full" onClick={handleAddUser}>
                  Add Pending User
                </Button>
              </div>
            </div>

            {/* Pending users */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Pending Users</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-40">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.filter((u) => u.status === "pending").length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        No pending users.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users
                      .filter((u) => u.status === "pending")
                      .map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell>
                            <Select value={u.role} onValueChange={(v) => changeRole(u.id, v as Role)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="Editor">Editor</SelectItem>
                                <SelectItem value="Viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="secondary" onClick={() => approveUser(u.id)}>
                                Approve
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">Delete</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete user?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently remove {u.name}. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => deleteUser(u.id)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Active users */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Active Users</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.filter((u) => u.status === "active").length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        No active users yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users
                      .filter((u) => u.status === "active")
                      .map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell>
                            <Select value={u.role} onValueChange={(v) => changeRole(u.id, v as Role)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="Editor">Editor</SelectItem>
                                <SelectItem value="Viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">Delete</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete user?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove {u.name}. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteUser(u.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Users are stored locally in your browser for this demo. For real auth, connect a backend.
          </CardFooter>
        </Card>

        {/* Existing Profile Card */}
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
                    <AvatarFallback className="text-lg">
                      {initialsFromName(displayName)}
                    </AvatarFallback>
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
      </div>
    </div>
  );
};

export default Profile;