import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { TaskDataProvider } from "@/context/task-data-context";
import TagPage from "./pages/TagPage";
import Profile from "./pages/Profile";
import { AuthProvider } from "@/context/auth-context";
import TimeTracking from "./pages/TimeTracking";
import { PayrollProvider } from "@/context/payroll-context";
import Files from "./pages/Files";
import Tags from "./pages/Tags";
import Images from "./pages/Images";
import { SessionProvider } from "@/context/session-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import { UserProfileProvider } from "@/context/user-profile-context";
import Wiki from "./pages/Wiki";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SessionProvider>
        <UserProfileProvider>
          <AuthProvider>
            <TaskDataProvider>
              <PayrollProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/time-tracking" element={<ProtectedRoute><TimeTracking /></ProtectedRoute>} />
                    <Route path="/files" element={<ProtectedRoute><Files /></ProtectedRoute>} />
                    <Route path="/images" element={<ProtectedRoute><Images /></ProtectedRoute>} />
                    <Route path="/tags" element={<ProtectedRoute><Tags /></ProtectedRoute>} />
                    <Route path="/tags/:tagName" element={<ProtectedRoute><TagPage /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    {/* ADD: wiki route */}
                    <Route path="/wiki" element={<ProtectedRoute><Wiki /></ProtectedRoute>} />
                    <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
                  </Routes>
                </BrowserRouter>
              </PayrollProvider>
            </TaskDataProvider>
          </AuthProvider>
        </UserProfileProvider>
      </SessionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;