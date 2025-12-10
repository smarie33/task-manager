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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <TaskDataProvider>
          <PayrollProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/time-tracking" element={<TimeTracking />} />
                <Route path="/files" element={<Files />} />
                <Route path="/images" element={<Images />} />
                <Route path="/tags" element={<Tags />} />
                <Route path="/tags/:tagName" element={<TagPage />} />
                <Route path="/profile" element={<Profile />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </PayrollProvider>
        </TaskDataProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;