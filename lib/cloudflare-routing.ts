// Cloudflare Email Routing API client with Mock Mode fallback

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || "";
const IS_MOCK_MODE = !CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_ZONE_ID || process.env.NEXT_PUBLIC_MOCK_APIS === "true";

// Simple in-memory mock store for simulation
interface MockRule {
  id: string;
  name: string;
  phone: string;
  destinationEmail: string;
  enabled: boolean;
}

interface MockAddress {
  email: string;
  verified: boolean;
  createdAt: string;
}

// Global mock state for local development
if (typeof globalThis !== "undefined") {
  (globalThis as any)._cfMockRules = (globalThis as any)._cfMockRules || [];
  (globalThis as any)._cfMockAddresses = (globalThis as any)._cfMockAddresses || [];
}

const getMockRules = (): MockRule[] => (globalThis as any)._cfMockRules;
const setMockRules = (rules: MockRule[]) => {
  (globalThis as any)._cfMockRules = rules;
};

const getMockAddresses = (): MockAddress[] => (globalThis as any)._cfMockAddresses;
const setMockAddresses = (addresses: MockAddress[]) => {
  (globalThis as any)._cfMockAddresses = addresses;
};

/**
 * Register destination email at account level
 */
export async function addDestinationAddress(email: string): Promise<{ success: boolean; verified: boolean }> {
  console.log(`[Cloudflare Routing] addDestinationAddress called for: ${email}`);

  if (IS_MOCK_MODE) {
    const addresses = getMockAddresses();
    const existing = addresses.find((a) => a.email.toLowerCase() === email.toLowerCase());
    
    if (existing) {
      return { success: true, verified: existing.verified };
    }

    const newAddress: MockAddress = {
      email: email.toLowerCase(),
      verified: true, // Auto-verify in Mock Sandbox Mode for seamless developer/dashboard flow
      createdAt: new Date().toISOString(),
    };
    
    addresses.push(newAddress);
    setMockAddresses(addresses);
    console.log(`[Cloudflare Routing MOCK] Registered destination: ${email}. Auto-verified in Mock Mode.`);
    return { success: true, verified: true };
  }

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/email/routing/addresses`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok) {
      // If already exists, Cloudflare will return an error, we should inspect it or handle it
      if (data.errors?.some((e: any) => e.code === 1009 || e.message?.includes("already exists"))) {
        return await getDestinationStatus(email);
      }
      throw new Error(data.errors?.[0]?.message || "Failed to add destination email to Cloudflare");
    }

    return { success: true, verified: data.result.verified !== null };
  } catch (error) {
    console.error("[Cloudflare Routing ERROR] addDestinationAddress failed:", error);
    throw error;
  }
}

/**
 * Check verification status of a destination email address
 */
export async function getDestinationStatus(email: string): Promise<{ success: boolean; verified: boolean }> {
  console.log(`[Cloudflare Routing] getDestinationStatus called for: ${email}`);

  if (IS_MOCK_MODE) {
    const addresses = getMockAddresses();
    const address = addresses.find((a) => a.email.toLowerCase() === email.toLowerCase());
    
    if (!address) {
      return { success: false, verified: false };
    }

    // Auto-verify mock address after 5 seconds to simulate user clicking verify link
    // For convenience of local manual testing, we can also instantly verify it if requested
    return { success: true, verified: address.verified };
  }

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/email/routing/addresses`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.message || "Failed to query Cloudflare destination addresses");
    }

    const addresses = data.result || [];
    const matched = addresses.find((addr: any) => addr.email.toLowerCase() === email.toLowerCase());

    if (!matched) {
      return { success: false, verified: false };
    }

    return { success: true, verified: matched.verified !== null };
  } catch (error) {
    console.error("[Cloudflare Routing ERROR] getDestinationStatus failed:", error);
    return { success: false, verified: false };
  }
}

/**
 * Helper to manually toggle verification of mock destination emails
 */
export async function mockVerifyDestinationEmail(email: string): Promise<boolean> {
  if (!IS_MOCK_MODE) return false;
  
  const addresses = getMockAddresses();
  const address = addresses.find((a) => a.email.toLowerCase() === email.toLowerCase());
  
  if (address) {
    address.verified = true;
    setMockAddresses(addresses);
    console.log(`[Cloudflare Routing MOCK] Manually marked ${email} as VERIFIED.`);
    return true;
  }
  return false;
}

/**
 * Create Email Routing rule (e.g. 5154146054@numid.us -> targetEmail)
 */
export async function createRoute(phone: string, destinationEmail: string): Promise<string> {
  console.log(`[Cloudflare Routing] createRoute called for: ${phone} -> ${destinationEmail}`);
  const cleanPhone = phone.replace(/\+/g, "");
  const numidAddress = `${cleanPhone}@numid.us`;

  if (IS_MOCK_MODE) {
    const routeId = `cf-rule-${Math.random().toString(36).substring(2, 11)}`;
    const rules = getMockRules();
    
    rules.push({
      id: routeId,
      name: `NumID Forwarding: ${cleanPhone}`,
      phone: cleanPhone,
      destinationEmail,
      enabled: true,
    });
    setMockRules(rules);
    
    console.log(`[Cloudflare Routing MOCK] Created route ID: ${routeId} for forwarding ${numidAddress}`);
    return routeId;
  }

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `NumID: ${phone}`,
        matchers: [
          {
            type: "literal",
            field: "to",
            value: numidAddress,
          },
        ],
        actions: [
          {
            type: "forward",
            value: [destinationEmail],
          },
        ],
        enabled: true,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.message || "Failed to create Cloudflare email routing rule");
    }

    return data.result.id;
  } catch (error) {
    console.error("[Cloudflare Routing ERROR] createRoute failed:", error);
    throw error;
  }
}

/**
 * Update existing routing rule target email
 */
export async function updateRoute(routeId: string, phone: string, destinationEmail: string): Promise<void> {
  console.log(`[Cloudflare Routing] updateRoute called for ID: ${routeId} to: ${destinationEmail}`);
  const cleanPhone = phone.replace(/\+/g, "");
  const numidAddress = `${cleanPhone}@numid.us`;

  if (IS_MOCK_MODE) {
    const rules = getMockRules();
    const idx = rules.findIndex((r) => r.id === routeId);
    
    if (idx !== -1) {
      rules[idx].destinationEmail = destinationEmail;
      setMockRules(rules);
      console.log(`[Cloudflare Routing MOCK] Updated route ID: ${routeId} to forward to ${destinationEmail}`);
      return;
    }
    throw new Error(`Cloudflare route ID ${routeId} not found in mock store`);
  }

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules/${routeId}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `NumID: ${phone}`,
        matchers: [
          {
            type: "literal",
            field: "to",
            value: numidAddress,
          },
        ],
        actions: [
          {
            type: "forward",
            value: [destinationEmail],
          },
        ],
        enabled: true,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.message || "Failed to update Cloudflare email routing rule");
    }
  } catch (error) {
    console.error("[Cloudflare Routing ERROR] updateRoute failed:", error);
    throw error;
  }
}

/**
 * Delete routing rule
 */
export async function deleteRoute(routeId: string): Promise<void> {
  console.log(`[Cloudflare Routing] deleteRoute called for ID: ${routeId}`);

  if (IS_MOCK_MODE) {
    const rules = getMockRules();
    const updated = rules.filter((r) => r.id !== routeId);
    
    setMockRules(updated);
    console.log(`[Cloudflare Routing MOCK] Deleted route ID: ${routeId}`);
    return;
  }

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules/${routeId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.message || "Failed to delete Cloudflare email routing rule");
    }
  } catch (error) {
    console.error("[Cloudflare Routing ERROR] deleteRoute failed:", error);
    throw error;
  }
}

/**
 * Get details of routing rule
 */
export async function getRoute(routeId: string): Promise<any> {
  console.log(`[Cloudflare Routing] getRoute called for ID: ${routeId}`);

  if (IS_MOCK_MODE) {
    const rules = getMockRules();
    const rule = rules.find((r) => r.id === routeId);
    
    if (rule) {
      return {
        id: rule.id,
        name: rule.name,
        enabled: rule.enabled,
        actions: [{ type: "forward", value: [rule.destinationEmail] }],
        matchers: [{ type: "literal", field: "to", value: `${rule.phone.replace(/\+/g, "")}@numid.us` }],
      };
    }
    return null;
  }

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules/${routeId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(data.errors?.[0]?.message || "Failed to retrieve Cloudflare email routing rule");
    }

    return data.result;
  } catch (error) {
    console.error("[Cloudflare Routing ERROR] getRoute failed:", error);
    throw error;
  }
}
