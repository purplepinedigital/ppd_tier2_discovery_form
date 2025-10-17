import { Request, Response } from "express";

// Support both VITE_KLAVIYO_API_KEY (from Vite) and KLAVIYO_API_KEY (from Netlify env)
const KLAVIYO_API_KEY =
  process.env.KLAVIYO_API_KEY || process.env.VITE_KLAVIYO_API_KEY || "";
const KLAVIYO_LIST_ID = "U6ned9"; // Discovery Sign-up list

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
        "Content-Type": "application/vnd.api+json",
        "Accept": "application/vnd.api+json",
        "Authorization": `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
        "revision": "2024-10-15",
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

    // Subscribe the profile to the "Discovery Sign-up" list (async, don't wait)
    const profileId = responseData.data?.id;
    if (profileId) {
      subscribeToList(profileId).catch((error: any) => {
        console.error("Error subscribing to list:", error.message);
      });
    }

    return res.json({
      success: true,
      message:
        "Contact sent to Klaviyo successfully and added to Discovery Sign-up list",
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

async function subscribeToList(profileId: string): Promise<void> {
  if (!KLAVIYO_API_KEY) {
    console.error("Cannot subscribe to list: Klaviyo API key not configured");
    return;
  }

  if (!profileId) {
    console.error("Cannot subscribe to list: No profile ID provided");
    return;
  }

  try {
    const listPayload = {
      data: [
        {
          type: "profile",
          id: profileId,
        },
      ],
    };

    console.log(
      `Subscribing profile ${profileId} to list ${KLAVIYO_LIST_ID}:`,
      listPayload,
    );

    const response = await fetch(
      `https://a.klaviyo.com/api/lists/${KLAVIYO_LIST_ID}/relationships/profiles/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.api+json",
          "Accept": "application/vnd.api+json",
          "Authorization": `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
          "revision": "2024-10-15",
        },
        body: JSON.stringify(listPayload),
      },
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Klaviyo list subscription error:", {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      });
      return;
    }

    console.log("Profile subscribed to list successfully:", responseData);
  } catch (error: any) {
    console.error("Failed to subscribe to list:", error.message, error);
  }
}
