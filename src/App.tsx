import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/Layout";

// Public website pages
import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Services";
import Claims from "./pages/Claims";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";

// Back office pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClaims from "./pages/admin/AdminClaims";
import AdminClaimDetail from "./pages/admin/AdminClaimDetail";
import AdminInspections from "./pages/admin/AdminInspections";
import AdminAdjusters from "./pages/admin/AdminAdjusters";
import AdminTasks from "./pages/admin/AdminTasks";
import AdminFormSubmissions from "./pages/admin/AdminFormSubmissions";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";

/** Wrap a public page in the marketing site chrome (header, footer, mobile CTA). */
function withLayout(Component: React.ComponentType) {
  return () => (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public website */}
      <Route path="/" component={withLayout(Home)} />
      <Route path="/about" component={withLayout(About)} />
      <Route path="/services" component={withLayout(Services)} />
      <Route path="/claims" component={withLayout(Claims)} />
      <Route path="/faq" component={withLayout(FAQ)} />
      <Route path="/contact" component={withLayout(Contact)} />

      {/* Back office */}
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/claims" component={AdminClaims} />
      <Route path="/admin/claims/:id" component={AdminClaimDetail} />
      <Route path="/admin/inspections" component={AdminInspections} />
      <Route path="/admin/adjusters" component={AdminAdjusters} />
      <Route path="/admin/tasks" component={AdminTasks} />
      <Route path="/admin/submissions" component={AdminFormSubmissions} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/settings" component={AdminSettings} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
