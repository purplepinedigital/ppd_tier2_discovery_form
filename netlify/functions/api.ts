import { handleKlaviyoContact } from "../../server/routes/klaviyo";

export default async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  // Klaviyo route
  if (path === "/.netlify/functions/api/klaviyo/contact" && req.method === "POST") {
    try {
      const body = await req.json();
      // Manually call the handler with a mock Response object
      const mockRes = {
        status: (code: number) => ({
          json: (data: any) => {
            return new Response(JSON.stringify(data), {
              status: code,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            });
          },
        }),
        json: (data: any) => {
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        },
      };

      await handleKlaviyoContact(
        { method: "POST", body } as any,
        mockRes as any
      );

      return mockRes.json({ success: true });
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  }

  // Default response
  return new Response(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
};
