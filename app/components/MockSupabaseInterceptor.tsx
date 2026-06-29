"use client";

import { useEffect } from "react";

export default function MockSupabaseInterceptor() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MOCK_APIS !== "true") return;

    const originalFetch = window.fetch;
    window.fetch = async function (input: any, init: any) {
      const url = typeof input === "string" ? input : input.url || "";
      
      if (url.includes("mock-supabase.supabase.co")) {
        console.log("[Mock Supabase Intercept]:", url, init);
        
        let bodyObj: any = {};
        if (init?.body) {
          try {
            bodyObj = JSON.parse(init.body);
          } catch {}
        }

        // Handle sign in / token request
        if (url.includes("/auth/v1/token")) {
          const email = bodyObj.email || "sanjaya.ghimire@gmail.com";
          const mockUser = {
            id: "mock-user-id-" + email.replace(/[^a-zA-Z0-9]/g, ""),
            email,
            user_metadata: { phone_number: "+15154146054" },
            created_at: new Date().toISOString(),
          };
          
          return new Response(
            JSON.stringify({
              access_token: "mock-access-token",
              token_type: "bearer",
              expires_in: 3600,
              refresh_token: "mock-refresh-token",
              user: mockUser,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        // Handle get user request
        if (url.includes("/auth/v1/user")) {
          // Read from cookie if present
          let email = "sanjaya.ghimire@gmail.com";
          const cookiesList = document.cookie.split(";");
          const sessionCookie = cookiesList.find(c => c.trim().startsWith("mock-session="));
          if (sessionCookie) {
            try {
              const decoded = decodeURIComponent(sessionCookie.split("=")[1]);
              const parsed = JSON.parse(decoded);
              if (parsed && parsed.email) {
                email = parsed.email;
              }
            } catch {}
          }

          return new Response(
            JSON.stringify({
              id: "mock-user-id-" + email.replace(/[^a-zA-Z0-9]/g, ""),
              email,
              user_metadata: { phone_number: "+15154146054" },
              created_at: new Date().toISOString(),
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        // Handle logout
        if (url.includes("/auth/v1/logout")) {
          // Delete mock cookie
          document.cookie = "mock-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
          return new Response(JSON.stringify({}), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Return empty mock response for other endpoints
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return originalFetch(input, init);
    };
  }, []);

  return null;
}
