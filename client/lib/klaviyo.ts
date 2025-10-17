const KLAVIYO_API_KEY = import.meta.env.VITE_KLAVIYO_API_KEY || "";
const KLAVIYO_API_URL = "https://a.klaviyo.com/api/v1/profiles";

export interface KlaviyoContact {
  email: string;
  firstName?: string;
  lastName?: string;
  subscribed?: boolean;
}

export async function sendToKlaviyo(contact: KlaviyoContact): Promise<void> {
  if (!KLAVIYO_API_KEY) {
    console.warn("Klaviyo API key not configured");
    return;
  }

  try {
    const payload = {
      data: {
        type: "profile",
        attributes: {
          email: contact.email,
          first_name: contact.firstName,
          last_name: contact.lastName,
          subscriptions: {
            email: {
              marketing: {
                consent: contact.subscribed !== false ? "SUBSCRIBED" : "UNSUBSCRIBED",
              },
            },
          },
        },
      },
    };

    const response = await fetch("https://a.klaviyo.com/api/profiles/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
        "revision": "2024-10-15",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Klaviyo API error:", errorData);
      throw new Error(`Klaviyo API error: ${response.statusText}`);
    }

    console.log("Contact sent to Klaviyo successfully");
  } catch (error) {
    console.error("Error sending to Klaviyo:", error);
    throw error;
  }
}
