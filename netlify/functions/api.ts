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
    // First, create profile with basic fields only
    const createProfilePayload = {
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

    const createResponse = await fetch("https://a.klaviyo.com/api/profiles/", {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json",
        Authorization: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
        revision: "2024-10-15",
      },
      body: JSON.stringify(createProfilePayload),
    });

    let createResponseData;
    try {
      createResponseData = await createResponse.json();
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

    if (!createResponse.ok) {
      const errorDetails = createResponseData?.errors?.[0];
      console.error("Klaviyo API error:", {
        status: createResponse.status,
        statusText: createResponse.statusText,
        errorDetail: errorDetails,
        fullResponse: createResponseData,
      });
      return {
        status: createResponse.status,
        body: JSON.stringify({
          error: "Klaviyo API error",
          details: createResponseData,
          message:
            errorDetails?.detail ||
            createResponseData?.errors?.[0]?.detail ||
            "Unknown error",
        }),
      };
    }

    console.log("Contact created in Klaviyo successfully:", createResponseData);

    // Now subscribe the profile and set consent using the bulk subscription job endpoint
    const profileId = createResponseData.data?.id;
    if (profileId) {
      try {
        await subscribeProfileToListWithConsent(email, profileId);
      } catch (error: any) {
        console.error("Error subscribing to list:", error.message);
      }
    }

    return {
      status: 200,
      body: JSON.stringify({
        success: true,
        message:
          "Contact sent to Klaviyo successfully and added to Discovery Sign-up list",
        data: createResponseData,
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

async function subscribeProfileToListWithConsent(
  email: string,
  profileId: string,
): Promise<void> {
  if (!KLAVIYO_API_KEY) {
    console.error("Cannot subscribe to list: Klaviyo API key not configured");
    return;
  }

  if (!email || !profileId) {
    console.error("Cannot subscribe to list: Missing email or profile ID");
    return;
  }

  try {
    // Use the profile-subscription-bulk-create-jobs endpoint to set consent and add to list
    const subscriptionPayload = {
      data: {
        type: "profile-subscription-bulk-create-job",
        attributes: {
          profiles: {
            data: [
              {
                type: "profile",
                attributes: {
                  email,
                  subscriptions: {
                    email: {
                      marketing: {
                        consent: "SUBSCRIBED",
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        relationships: {
          list: {
            data: {
              type: "list",
              id: KLAVIYO_LIST_ID,
            },
          },
        },
      },
    };

    console.log(
      `Subscribing profile ${profileId} (${email}) to list ${KLAVIYO_LIST_ID}`,
    );
    console.log("Subscription payload:", JSON.stringify(subscriptionPayload));

    const response = await fetch(
      "https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
          revision: "2024-10-15",
        },
        body: JSON.stringify(subscriptionPayload),
      },
    );

    let responseData;
    try {
      responseData = await response.json();
    } catch (parseError: any) {
      console.error(
        "Failed to parse subscription response:",
        parseError.message,
      );
      return;
    }

    console.log(
      `Subscription request status: ${response.status} ${response.statusText}`,
    );
    console.log("Subscription response:", responseData);

    if (!response.ok) {
      const errorDetail = responseData?.errors?.[0];
      console.error("Klaviyo subscription job error:", {
        status: response.status,
        statusText: response.statusText,
        errorDetail,
        fullResponse: responseData,
      });
      return;
    }

    console.log(
      "Profile subscribed to list with consent successfully:",
      responseData,
    );
  } catch (error: any) {
    console.error("Failed to subscribe to list:", error.message, error);
  }
}

async function handleKlaviyoUnsubscribe(body: any) {
  const { email } = body;

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
    // First, find the profile by email
    const searchResponse = await fetch(
      `https://a.klaviyo.com/api/profiles/?filter=equals(email,"${encodeURIComponent(email)}")`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
          revision: "2024-10-15",
        },
      },
    );

    let profileData;
    try {
      profileData = await searchResponse.json();
    } catch (parseError: any) {
      console.error("Failed to parse Klaviyo search response:", parseError);
      return {
        status: 502,
        body: JSON.stringify({
          error: "Invalid Klaviyo API response",
          message: parseError.message,
        }),
      };
    }

    const profile = profileData.data?.[0];
    if (!profile) {
      console.log(`Profile not found for email: ${email}`);
      return {
        status: 200,
        body: JSON.stringify({
          success: true,
          message: "Profile not found in Klaviyo (may already be deleted)",
        }),
      };
    }

    const profileId = profile.id;

    // Unsubscribe the profile from email marketing
    const unsubscribePayload = {
      data: {
        type: "profile-subscription-bulk-create-job",
        attributes: {
          profiles: {
            data: [
              {
                type: "profile",
                attributes: {
                  email,
                  subscriptions: {
                    email: {
                      marketing: {
                        consent: "UNSUBSCRIBED",
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
    };

    console.log(`Unsubscribing email ${email} from Klaviyo`);

    const unsubscribeResponse = await fetch(
      "https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
          revision: "2024-10-15",
        },
        body: JSON.stringify(unsubscribePayload),
      },
    );

    let unsubscribeData;
    try {
      unsubscribeData = await unsubscribeResponse.json();
    } catch (parseError: any) {
      console.error(
        "Failed to parse Klaviyo unsubscribe response:",
        parseError,
      );
      return {
        status: 502,
        body: JSON.stringify({
          error: "Invalid Klaviyo API response",
          message: parseError.message,
        }),
      };
    }

    if (!unsubscribeResponse.ok) {
      const errorDetail = unsubscribeData?.errors?.[0];
      console.error("Klaviyo unsubscribe error:", {
        status: unsubscribeResponse.status,
        statusText: unsubscribeResponse.statusText,
        errorDetail,
        fullResponse: unsubscribeData,
      });
      return {
        status: unsubscribeResponse.status,
        body: JSON.stringify({
          error: "Klaviyo API error",
          details: unsubscribeData,
        }),
      };
    }

    console.log(`Successfully unsubscribed email ${email} from Klaviyo`);

    return {
      status: 200,
      body: JSON.stringify({
        success: true,
        message: "Email unsubscribed from Klaviyo successfully",
      }),
    };
  } catch (error: any) {
    console.error("Error unsubscribing from Klaviyo:", error);
    return {
      status: 500,
      body: JSON.stringify({
        error: "Error unsubscribing from Klaviyo",
        message: error.message,
      }),
    };
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

  // Klaviyo contact route
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

  // Klaviyo unsubscribe route
  if (
    path.includes("/api/klaviyo/unsubscribe") &&
    event.httpMethod === "POST"
  ) {
    try {
      const body = JSON.parse(event.body || "{}");
      const result = await handleKlaviyoUnsubscribe(body);
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
