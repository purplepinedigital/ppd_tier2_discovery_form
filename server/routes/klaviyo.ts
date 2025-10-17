import { Request, Response } from "express";

const KLAVIYO_API_KEY = process.env.VITE_KLAVIYO_API_KEY || "";

export async function handleKlaviyoContact(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, firstName, lastName, subscribed } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!KLAVIYO_API_KEY) {
      console.warn("Klaviyo API key not configured");
      return res.status(500).json({ error: "Klaviyo API key not configured" });
    }

    const payload = {
      data: {
        type: "profile",
        attributes: {
          email,
          first_name: firstName || "",
          last_name: lastName || "",
          subscriptions: {
            email: {
              marketing: {
                consent: subscribed !== false ? "SUBSCRIBED" : "UNSUBSCRIBED",
              },
            },
          },
        },
      },
    };

    console.log("Sending to Klaviyo:", { email, firstName, lastName });

    const response = await fetch("https://a.klaviyo.com/api/profiles/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
        revision: "2024-10-15",
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Klaviyo API error:", responseData);
      return res.status(response.status).json({
        error: "Klaviyo API error",
        details: responseData,
      });
    }

    console.log("Contact created in Klaviyo successfully:", responseData);
    return res.json({
      success: true,
      message: "Contact sent to Klaviyo successfully",
      data: responseData,
    });
  } catch (error: any) {
    console.error("Error sending to Klaviyo:", error);
    return res.status(500).json({
      error: "Error sending to Klaviyo",
      message: error.message,
    });
  }
}
