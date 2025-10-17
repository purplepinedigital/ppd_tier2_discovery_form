export interface KlaviyoContact {
  email: string;
  firstName?: string;
  lastName?: string;
  subscribed?: boolean;
}

export async function sendToKlaviyo(contact: KlaviyoContact): Promise<void> {
  try {
    const response = await fetch("/api/klaviyo/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contact),
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
