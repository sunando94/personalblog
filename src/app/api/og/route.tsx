import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const title = searchParams.get("title") || "Sudo Make Me Sandwich";
    const excerpt = searchParams.get("excerpt") || "A deep dive into software engineering and AI.";
    const keywords = searchParams.get("keywords")?.split(",") || ["Software", "AI", "Engineering"];
    const date = searchParams.get("date") || "";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            backgroundColor: "#020617", // slate-950
            backgroundImage: "radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.05) 2%, transparent 0%)",
            backgroundSize: "50px 50px",
            padding: "80px",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: "40px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(to right, #2563eb, #9333ea)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "16px",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span style={{ fontSize: "28px", fontWeight: "bold", color: "#94a3b8", letterSpacing: "1px" }}>
              Bhattacharya.ai // Engineering
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: "72px",
              fontWeight: 900,
              lineHeight: 1.1,
              color: "white",
              marginBottom: "32px",
              background: "linear-gradient(to bottom right, #ffffff, #94a3b8)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              maxWidth: "1000px",
            }}
          >
            {title}
          </div>

          {/* Excerpt */}
          <div
            style={{
              fontSize: "32px",
              lineHeight: 1.4,
              color: "#94a3b8",
              marginBottom: "60px",
              maxWidth: "900px",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {excerpt}
          </div>

          {/* Footer / Tech Stack */}
          <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              {keywords.slice(0, 5).map((word) => (
                <div
                  key={word}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    color: "#60a5fa",
                    fontSize: "20px",
                    fontWeight: "600",
                  }}
                >
                  {word}
                </div>
              ))}
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
               {date && (
                <div style={{ fontSize: "20px", color: "#475569", marginBottom: "8px", fontWeight: "bold" }}>
                    RELEASED {date}
                </div>
               )}
               <div style={{ 
                border: "2px solid #ef4444", 
                color: "#ef4444", 
                borderRadius: "4px", 
                padding: "4px 8px", 
                fontSize: "18px", 
                fontWeight: "bold",
                transform: "rotate(-5deg)",
                letterSpacing: "2px"
               }}>
                 PROVEN WORK
               </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
