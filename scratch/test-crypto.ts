import { encryptText, decryptText } from "../lib/crypto.ts";

async function runTest() {
  console.log("=== Starting Cryptography Module Tests ===");
  const secretData = JSON.stringify({
    ssn: "123-45-6789",
    fullName: "John Doe",
    bankAccount: "9876543210"
  });

  const correctPassword = "MySecureVaultPassword123!";
  const incorrectPassword = "WrongPassword!";

  try {
    // 1. Test successful encryption
    console.log("1. Encrypting payload...");
    const payload = await encryptText(secretData, correctPassword);
    console.log("   Encrypted payload:", JSON.stringify(payload, null, 2));

    // Assert that IV, Salt, and Ciphertext are non-empty base64 strings
    if (!payload.ciphertext || !payload.iv || !payload.salt) {
      throw new Error("FAIL: Payload has empty fields");
    }
    console.log("✅ Encryption successful. Generated IV, Salt, and Ciphertext.");

    // 2. Test successful decryption
    console.log("2. Decrypting with CORRECT password...");
    const decrypted = await decryptText(payload, correctPassword);
    console.log("   Decrypted data:", decrypted);

    if (decrypted !== secretData) {
      throw new Error(`FAIL: Decrypted data does not match source. Expected: ${secretData}, Got: ${decrypted}`);
    }
    console.log("✅ Decryption successful. Plaintext matches exactly.");

    // 3. Test failed decryption with incorrect password
    console.log("3. Attempting decryption with INCORRECT password...");
    try {
      await decryptText(payload, incorrectPassword);
      throw new Error("FAIL: Decryption succeeded with WRONG password! Critical vulnerability!");
    } catch (e: any) {
      if (e.message && e.message.includes("Critical vulnerability")) {
        throw e;
      }
      console.log("✅ Decryption failed as expected with wrong password (thrown error:", e.message || e, ")");
    }

    console.log("\n🎉 ALL CRYPTO TESTS PASSED SUCCESSFULLY! 🎉");
  } catch (error) {
    console.error("❌ TEST FAILED:", error);
    process.exit(1);
  }
}

runTest();
