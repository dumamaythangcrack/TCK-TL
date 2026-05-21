import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Handle OAuth errors from Google
  if (error) {
    console.error("[Auth Callback] OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    );
  }

  if (!code) {
    // No code - redirect home
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

  const cookieStore = await cookies();

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseUrl = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
    ? rawUrl
    : `https://${rawUrl}`;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[Auth Callback] Exchange error:", exchangeError.message);
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent("Đăng nhập thất bại. Vui lòng thử lại.")}`, requestUrl.origin)
    );
  }

  // Redirect to next page or home
  const redirectTo = next.startsWith("/") ? next : "/";
  
  return new Response(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>Đang đăng nhập...</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            background-color: #f6f7fb;
            color: #1e293b;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .spinner {
            border: 3px solid rgba(0, 0, 0, 0.05);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border-left-color: #2563eb;
            animation: spin 0.8s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h2 { font-size: 15px; font-weight: 700; margin: 0 0 8px 0; color: #0f172a; }
          p { font-size: 11px; color: #64748b; margin: 0; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <h2>Đang đồng bộ tài khoản...</h2>
        <p>Vui lòng chờ trong giây lát.</p>
        <script>
          setTimeout(function() {
            window.location.href = ${JSON.stringify(redirectTo)};
          }, 800);
        </script>
      </body>
    </html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    }
  );
}
