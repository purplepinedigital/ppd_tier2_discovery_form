import { Handler } from "@netlify/functions";

const KLAVIYO_API_KEY = (
  process.env.KLAVIYO_API_KEY ||
  process.env.VITE_KLAVIYO_API_KEY ||
  ""
).trim();
const KLAVIYO_LIST_ID = "U6ned9";

// Debug logging for environment variables
if (!KLAVIYO_API_KEY) {
  console.warn(
    "Klaviyo API key not configured. Set KLAVIYO_API_KEY environment variable in Netlify.",
  );
} else {
  console.log(
    "Klaviyo API key loaded (first 20 chars):",
    KLAVIYO_API_KEY.substring(0, 20) + "...",
  );
}

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
        Revision: "2024-10-15",
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
        apiKeyPresent: !!KLAVIYO_API_KEY,
        apiKeyLength: KLAVIYO_API_KEY?.length,
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
          Revision: "2024-10-15",
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
          Revision: "2024-10-15",
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

    // Remove the profile from the list using DELETE endpoint
    console.log(
      `Removing email ${email} (${profileId}) from list ${KLAVIYO_LIST_ID}`,
    );

    const deleteResponse = await fetch(
      `https://a.klaviyo.com/api/lists/${KLAVIYO_LIST_ID}/relationships/profiles/`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/vnd.api+json",
          Accept: "application/vnd.api+json",
          Authorization: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
          Revision: "2024-10-15",
        },
        body: JSON.stringify({
          data: [
            {
              type: "profile",
              id: profileId,
            },
          ],
        }),
      },
    );

    let deleteData;
    try {
      deleteData = await deleteResponse.json();
    } catch (parseError: any) {
      // 204 No Content is also a success response
      if (deleteResponse.status === 204) {
        console.log(`Successfully removed email ${email} from Klaviyo list`);
        return {
          status: 200,
          body: JSON.stringify({
            success: true,
            message: "Email removed from Klaviyo list successfully",
          }),
        };
      }

      console.error("Failed to parse Klaviyo delete response:", parseError);
      return {
        status: 502,
        body: JSON.stringify({
          error: "Invalid Klaviyo API response",
          message: parseError.message,
        }),
      };
    }

    if (!deleteResponse.ok && deleteResponse.status !== 204) {
      const errorDetail = deleteData?.errors?.[0];
      console.error("Klaviyo unsubscribe error:", {
        status: deleteResponse.status,
        statusText: deleteResponse.statusText,
        errorDetail,
        fullResponse: deleteData,
      });
      return {
        status: deleteResponse.status,
        body: JSON.stringify({
          error: "Klaviyo API error",
          details: deleteData,
        }),
      };
    }

    console.log(`Successfully removed email ${email} from Klaviyo list`);

    return {
      status: 200,
      body: JSON.stringify({
        success: true,
        message: "Email removed from Klaviyo list successfully",
      }),
    };
  } catch (error: any) {
    console.error("Error removing email from Klaviyo:", error);
    return {
      status: 500,
      body: JSON.stringify({
        error: "Error removing email from Klaviyo",
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

  // Save signup route
  if (path.includes("/api/save-signup") && event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      const { email, name, user_id } = body;

      if (!email || !user_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Email and user_id are required" }),
        };
      }

      // Use service role key to bypass RLS
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Supabase configuration missing" }),
        };
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      const { error: signupError } = await supabaseAdmin
        .from("signups")
        .upsert(
          {
            email,
            name,
            user_id,
          },
          { onConflict: "email" },
        );

      if (signupError) {
        console.error("Error saving signup:", signupError);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: "Error saving signup",
            message: signupError.message,
          }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: "Signup saved" }),
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
