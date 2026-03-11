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
import WikiAdmin from "./pages/WikiAdmin";
import WikiEntry from "./pages/WikiEntry";
import WikiTag from "./pages/WikiTag";
import WikiCategory from "./pages/WikiCategory";
import WikiScript from "./pages/WikiScript";
import WikiEdit from "./pages/WikiEdit";
import WikiDrafts from "./pages/WikiDrafts";
import WikiImporting from "./pages/WikiImporting";
import WikiBulkDelete from "./pages/WikiBulkDelete";
import ArchivedGroups from "./pages/ArchivedGroups";

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
                    <Route path="/archived-groups" element={<ProtectedRoute><ArchivedGroups /></ProtectedRoute>} />
                    <Route path="/time-tracking" element={<ProtectedRoute><TimeTracking /></ProtectedRoute>} />
                    <Route path="/files" element={<ProtectedRoute><Files /></ProtectedRoute>} />
                    <Route path="/images" element={<ProtectedRoute><Images /></ProtectedRoute>} />
                    <Route path="/tags" element={<ProtectedRoute><Tags /></ProtectedRoute>} />
                    <Route path="/tags/:tagName" element={<ProtectedRoute><TagPage /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    {/* ADD: wiki routes */}
                    <Route path="/wiki/admin" element={<ProtectedRoute><WikiAdmin /></ProtectedRoute>} />
                    <Route path="/wiki/admin/drafts" element={<ProtectedRoute><WikiDrafts /></ProtectedRoute>} />
                    <Route path="/wiki/admin/importing" element={<ProtectedRoute><WikiImporting /></ProtectedRoute>} />
                    <Route path="/wiki/admin/bulk-delete" element={<ProtectedRoute><WikiBulkDelete /></ProtectedRoute>} />
                    <Route path="/wiki/scripts/:scriptName" element={<ProtectedRoute><WikiScript /></ProtectedRoute>} />
                    <Route path="/wiki/categories/:categoryName" element={<ProtectedRoute><WikiCategory /></ProtectedRoute>} />
                    <Route path="/wiki/tags/:tagName" element={<ProtectedRoute><WikiTag /></ProtectedRoute>} />
                    <Route path="/wiki/:slug/edit" element={<ProtectedRoute><WikiEdit /></ProtectedRoute>} />
                    <Route path="/wiki/:slug" element={<ProtectedRoute><WikiEntry /></ProtectedRoute>} />
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