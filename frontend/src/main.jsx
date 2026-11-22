import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: false, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {publishableKey ? (
      <ClerkProvider publishableKey={publishableKey}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter><App /></BrowserRouter>
        </QueryClientProvider>
      </ClerkProvider>
    ) : (
      <main className="setup-message">
        <h1>Configure Clerk to open Talent IQ</h1>
        <p>Add VITE_CLERK_PUBLISHABLE_KEY to the frontend environment and rebuild the app.</p>
      </main>
    )}
  </StrictMode>,
);
