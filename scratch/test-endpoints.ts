// Simulation script to verify Cloudflare and Twilio integrations locally.
// Run this file with `npx ts-node scratch/test-endpoints.ts` to test logic.

import { 
  addDestinationAddress, 
  getDestinationStatus, 
  mockVerifyDestinationEmail, 
  createRoute, 
  updateRoute, 
  deleteRoute, 
  getRoute 
} from "../lib/cloudflare-routing";
import { 
  sendPhoneOTPAction, 
  verifyPhoneOTPAction 
} from "../app/actions/auth";

async function runTests() {
  console.log("==========================================");
  console.log("STARTING NUMID INTEGRATION LOGIC VALIDATION");
  console.log("==========================================\n");

  // Force mock mode configuration for the test run
  process.env.NEXT_PUBLIC_MOCK_APIS = "true";

  const testPhone = "+15154146054";
  const testEmail = "sanjaya.ghimire@gmail.com";
  const updatedEmail = "new.destination@gmail.com";

  // --- TEST 1: SMS Verify Logic ---
  console.log("--- TEST 1: SMS verification triggers ---");
  const otpRes = await sendPhoneOTPAction(testPhone);
  console.log("OTP Send Result:", otpRes);

  if (!otpRes.success || !otpRes.message) {
    throw new Error("Failed to send OTP in simulation");
  }

  // Retrieve the generated mock code from the message string
  const matches = otpRes.message.match(/Code is: (\d+)/);
  const mockCode = matches ? matches[1] : "123456";
  console.log(`Extracted Mock Code: ${mockCode}`);

  const verifyRes = await verifyPhoneOTPAction(testPhone, mockCode);
  console.log("OTP Verification Result:", verifyRes);

  if (!verifyRes.success) {
    throw new Error("Failed to verify OTP code in simulation");
  }
  console.log("✅ SMS verification logic passed.\n");

  // --- TEST 2: Cloudflare Email Destination Verification ---
  console.log("--- TEST 2: Cloudflare destination address registration ---");
  const addAddrRes = await addDestinationAddress(testEmail);
  console.log("Register destination result:", addAddrRes);

  // Initially verified should be false in mock mode
  let statusCheck = await getDestinationStatus(testEmail);
  console.log("Initial Cloudflare Verification Status:", statusCheck);

  if (statusCheck.verified !== false) {
    throw new Error("Initial status should be unverified");
  }

  // Simulate user verifying the email address
  console.log("Simulating user verification in Cloudflare...");
  await mockVerifyDestinationEmail(testEmail);

  statusCheck = await getDestinationStatus(testEmail);
  console.log("Post-verification Cloudflare Status:", statusCheck);

  if (statusCheck.verified !== true) {
    throw new Error("Verification status should now be true");
  }
  console.log("✅ Cloudflare destination address registration logic passed.\n");

  // --- TEST 3: Cloudflare Forwarding Rules Lifecycle ---
  console.log("--- TEST 3: Cloudflare DNS forwarding rule lifecycle ---");
  
  // Create Route
  const routeId = await createRoute(testPhone, testEmail);
  console.log(`Created Route ID: ${routeId}`);

  let route = await getRoute(routeId);
  console.log("Retrieved Route Details:", route);

  if (!route || route.actions[0].value[0] !== testEmail) {
    throw new Error("Route retrieval details do not match input parameters");
  }

  // Update Route Destination
  console.log("Updating forwarding route destination...");
  await updateRoute(routeId, testPhone, updatedEmail);
  
  route = await getRoute(routeId);
  console.log("Post-update Route Details:", route);

  if (!route || route.actions[0].value[0] !== updatedEmail) {
    throw new Error("Route update failed to change destination email");
  }

  // Delete Route
  console.log("Deleting forwarding route...");
  await deleteRoute(routeId);
  
  route = await getRoute(routeId);
  console.log("Post-delete Route Details:", route);

  if (route !== null) {
    throw new Error("Route deletion failed, rule still exists");
  }

  console.log("✅ Cloudflare forwarding rule lifecycle logic passed.\n");
  console.log("==========================================");
  console.log("ALL NUMID INTEGRATION TEST CASES PASSED!");
  console.log("==========================================");
}

runTests().catch((error) => {
  console.error("❌ TEST RUN ENCOUNTERED ERROR:", error);
  process.exit(1);
});
