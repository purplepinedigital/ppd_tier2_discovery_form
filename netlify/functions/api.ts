import { Handler } from "@netlify/functions";

const KLAVIYO_API_KEY =
  process.env.KLAVIYO_API_KEY || process.env.VITE_KLAVIYO_API_KEY || "";
const KLAVIYO_LIST_ID = "U6ned9";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

async function handleKlaviyoContact(body: any) {
  const { email, firstName, lastName, subscribed } = body;

  if (!email) {
    return {
      status: 400,
      body: JSON.stringify({ error: "Email is required" }),
    };
  }

  if (!KLAVIYO_API_KEY) {
    console.warn("Klaviyo API key not configured");
    return {
      status: 500,
      body: JSON.stringify({ error: "Klaviyo API key not configured" }),
    };
  }

  try {
    // Create profile without subscriptions (subscriptions handled separately)
    const payload = {
      data: {
        type: "profile",
        attributes: {
          email,
          first_name: firstName || "",
          last_name: lastName || "",
        },
      },
    };

    console.log("Sending to Klaviyo:", { email, firstName, lastName });

    const response = await fetch("https://a.klaviyo.com/api/profiles/", {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json",
        Authorization: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
        revision: "2024-10-15",
      },
      body: JSON.stringify(payload),
    });

    let responseData;
    try {
      responseData = await response.json();
    } catch (parseError: any) {
      console.error("Failed to parse Klaviyo response:", parseError);
      return {
        status: 502,
        body: JSON.stringify({
          error: "Invalid Klaviyo API response",
          message: parseError.message,
        }),
      };
    }

    if (!response.ok) {
      // Log detailed error information
      const errorDetails = responseData?.errors?.[0];
      console.error("Klaviyo API error:", {
        status: response.status,
        statusText: response.statusText,
        errorDetail: errorDetails,
        fullResponse: responseData,
      });
      return {
        status: response.status,
        body: JSON.stringify({
          error: "Klaviyo API error",
          details: responseData,
          message:
            errorDetails?.detail ||
            responseData?.errors?.[0]?.detail ||
            "Unknown error",
        }),
      };
    }

    console.log("Contact created in Klaviyo successfully:", responseData);

    // Subscribe the profile to the list and set subscription status
    const profileId = responseData.data?.id;
    if (profileId) {
      subscribeToList(profileId).catch((error: any) => {
        console.error("Error subscribing to list:", error.message);
      });

      // Set email subscription status to SUBSCRIBED
      updateSubscriptionStatus(profileId, "SUBSCRIBED").catch((error: any) => {
        console.error("Error updating subscription status:", error.message);
      });
    }

    return {
      status: 200,
      body: JSON.stringify({
        success: true,
        message:
          "Contact sent to Klaviyo successfully and added to Discovery Sign-up list",
        data: responseData,
      }),
    };
  } catch (error: any) {
    console.error("Error sending to Klaviyo:", error);
    return {
      status: 500,
      body: JSON.stringify({
        error: "Error sending to Klaviyo",
        message: error.message,
      }),
    };
  }
}

async function updateSubscriptionStatus(
  profileId: string,
  consent: "SUBSCRIBED" | "UNSUBSCRIBED" | "NEVER_SUBSCRIBED",
): Promise<void> {
  if (!KLAVIYO_API_KEY) {
    console.error("Cannot update subscription: Klaviyo API key not configured");
    return;
  }

  if (!profileId) {
    console.error("Cannot update subscription: No profile ID provided");
    return;
  }

  try {
    // Update profile to set subscription consent via PATCH
    const payload = {
      data: {
        type: "profile",
        id: profileId,
        attributes: {
          subscriptions: {
            email: {
              marketing: {
                consent,
              },
            },
          },
        },
      },
    };

    console.log(
      `Updating subscription status to ${consent} for ${profileId}`,
      payload,
    );

    const response = await fetch(
      `https://a.klaviyo.com/api/profiles/${profileId}/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/vnd.api+json",
          Accept: "application/vnd.api+json",
          Authorization: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
          revision: "2024-10-15",
        },
        body: JSON.stringify(payload),
      },
    );

    const responseData = await response.json();

    if (!response.ok) {
      const errorDetail = responseData?.errors?.[0];
      console.error("Klaviyo subscription update error:", {
        status: response.status,
        statusText: response.statusText,
        errorTitle: errorDetail?.title,
        errorDetail: errorDetail?.detail,
        errorSource: errorDetail?.source,
        fullError: errorDetail,
        fullResponse: responseData,
      });
      return;
    }

    console.log("Subscription status updated successfully:", responseData);
  } catch (error: any) {
    console.error(
      "Failed to update subscription status:",
      error.message,
      error,
    );
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
          Accept: "application/vnd.api+json",
          Authorization: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
          revision: "2024-10-15",
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

const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  const path = event.path || "";

  // Klaviyo route
  if (path.includes("/api/klaviyo/contact") && event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      const result = await handleKlaviyoContact(body);
      return {
        statusCode: result.status,
        headers,
        body: result.body,
      };
    } catch (error: any) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Failed to process request",
          message: error.message,
        }),
      };
    }
  }

  // Default 404
  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: "Not Found" }),
  };
};

export { handler };
