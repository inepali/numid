import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const MOCK_FILE_PATH = path.join(process.cwd(), "scratch", "mock-supabase.json");

// Helper to read mock db file
function getMockDb(tableName: string): any[] {
  try {
    const scratchDir = path.dirname(MOCK_FILE_PATH);
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }
    
    if (!fs.existsSync(MOCK_FILE_PATH)) {
      const initialDb = {
        users: [
          {
            id: "mock-user-id-sanjaya.ghimire@gmail.com",
            email: "sanjaya.ghimire@gmail.com",
            phone_number: "+15154146054",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            phone_verified: true,
            email_verified: true,
            status: "active",
            numid_address: "5154146054@numid.us",
            destination_email: "sanjaya.ghimire@gmail.com",
          }
        ],
        audit_logs: [],
        invitations: [],
        vault_items: []
      };
      fs.writeFileSync(MOCK_FILE_PATH, JSON.stringify(initialDb, null, 2));
    }
    const raw = fs.readFileSync(MOCK_FILE_PATH, "utf8");
    const db = JSON.parse(raw);
    return db[tableName] || [];
  } catch (err) {
    console.error("Error reading mock DB:", err);
    return [];
  }
}

// Helper to write mock db file
function saveMockDb(tableName: string, data: any[]) {
  try {
    let db: any = {};
    if (fs.existsSync(MOCK_FILE_PATH)) {
      const raw = fs.readFileSync(MOCK_FILE_PATH, "utf8");
      db = JSON.parse(raw);
    }
    db[tableName] = data;
    fs.writeFileSync(MOCK_FILE_PATH, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error("Error saving mock DB:", err);
  }
}

// Mock Supabase Client class
class MockSupabaseClient {
  auth = {
    getUser: async () => {
      const cookieStore = await cookies();
      const mockSession = cookieStore.get("mock-session")?.value;
      if (!mockSession) return { data: { user: null }, error: new Error("No session") };
      try {
        const user = JSON.parse(mockSession);
        return { data: { user }, error: null };
      } catch {
        return { data: { user: null }, error: new Error("Parse error") };
      }
    },
    getSession: async () => {
      const cookieStore = await cookies();
      const mockSession = cookieStore.get("mock-session")?.value;
      if (!mockSession) return { data: { session: null }, error: null };
      try {
        const user = JSON.parse(mockSession);
        return { data: { session: { user } }, error: null };
      } catch {
        return { data: { session: null }, error: null };
      }
    },
    signUp: async ({ email, password, options }: any) => {
      const userId = "mock-user-id-" + email.replace(/[^a-zA-Z0-9]/g, "");
      const mockUser = {
        id: userId,
        email,
        user_metadata: options?.data || {},
        created_at: new Date().toISOString(),
      };
      
      const users = getMockDb("users");
      const existing = users.find((u: any) => u.email === email || u.numid_address === email);
      if (!existing) {
        users.push({
          id: userId,
          email,
          phone_number: options?.data?.phone_number || "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          phone_verified: true,
          email_verified: true,
          status: "active",
          numid_address: email,
          destination_email: email,
        });
        saveMockDb("users", users);
      }

      const cookieStore = await cookies();
      cookieStore.set("mock-session", JSON.stringify(mockUser), { path: "/" });
      return { data: { user: mockUser }, error: null };
    },
    signInWithPassword: async ({ email, password }: any) => {
      const users = getMockDb("users");
      const userRecord = users.find((u: any) => u.email === email || u.numid_address === email);
      if (!userRecord) {
        return { data: { user: null, session: null }, error: new Error("Invalid login credentials") };
      }
      const mockUser = {
        id: userRecord.id,
        email: userRecord.email,
        user_metadata: { phone_number: userRecord.phone_number },
        created_at: userRecord.created_at,
      };
      const cookieStore = await cookies();
      cookieStore.set("mock-session", JSON.stringify(mockUser), { path: "/" });
      return { data: { user: mockUser, session: { user: mockUser } }, error: null };
    },
    signOut: async () => {
      const cookieStore = await cookies();
      cookieStore.delete("mock-session");
      return { error: null };
    },
    admin: {
      updateUserById: async (id: string, attributes: any) => {
        return { data: { user: { id } }, error: null };
      }
    }
  };

  from(tableName: string) {
    return {
      select: (selectStr: string = "*") => {
        return {
          eq: (field: string, val: any) => {
            return {
              single: async () => {
                const data = getMockDb(tableName);
                const item = data.find((x: any) => x[field] === val);
                if (!item) return { data: null, error: { message: "Not found", code: "PGRST116" } };
                return { data: item, error: null };
              },
              maybeSingle: async () => {
                const data = getMockDb(tableName);
                const item = data.find((x: any) => x[field] === val);
                return { data: item || null, error: null };
              },
              order: (orderField: string, options: any) => {
                return {
                  eq: (subField: string, subVal: any) => {
                    return {
                      eq: (sub2Field: string, sub2Val: any) => {
                        return {
                          maybeSingle: async () => {
                            const data = getMockDb(tableName);
                            const items = data.filter((x: any) => x[field] === val && x[subField] === subVal && x[sub2Field] === sub2Val);
                            return { data: items[0] || null, error: null };
                          }
                        };
                      }
                    };
                  },
                  then: async (resolve: any) => {
                    const data = getMockDb(tableName);
                    let items = data.filter((x: any) => x[field] === val);
                    items.sort((a: any, b: any) => {
                      const timeA = new Date(a[orderField]).getTime();
                      const timeB = new Date(b[orderField]).getTime();
                      return options?.ascending ? timeA - timeB : timeB - timeA;
                    });
                    resolve({ data: items, error: null });
                  }
                };
              },
              then: async (resolve: any) => {
                const data = getMockDb(tableName);
                const items = data.filter((x: any) => x[field] === val);
                resolve({ data: items, error: null });
              }
            };
          },
          or: (orStr: string) => {
            return {
              maybeSingle: async () => {
                const parts = orStr.split(",");
                const data = getMockDb(tableName);
                for (const part of parts) {
                  const match = part.match(/([a-zA-Z0-9_]+)\.eq\.(.+)/);
                  if (match) {
                    const field = match[1];
                    const val = match[2];
                    const item = data.find((x: any) => x[field] === val);
                    if (item) return { data: item, error: null };
                  }
                }
                return { data: null, error: null };
              }
            };
          },
          order: (orderField: string, options: any) => {
            return {
              then: async (resolve: any) => {
                const data = getMockDb(tableName);
                let items = [...data];
                items.sort((a: any, b: any) => {
                  const timeA = new Date(a[orderField]).getTime();
                  const timeB = new Date(b[orderField]).getTime();
                  return options?.ascending ? timeA - timeB : timeB - timeA;
                });
                resolve({ data: items, error: null });
              }
            };
          },
          then: async (resolve: any) => {
            const data = getMockDb(tableName);
            resolve({ data, error: null });
          }
        };
      },
      insert: async (payload: any) => {
        const data = getMockDb(tableName);
        const records = Array.isArray(payload) ? payload : [payload];
        const newRecords = records.map((r: any) => ({
          id: r.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...r
        }));
        saveMockDb(tableName, [...data, ...newRecords]);
        return { data: Array.isArray(payload) ? newRecords : newRecords[0], error: null };
      },
      update: (payload: any) => {
        return {
          eq: (field: string, val: any) => {
            return {
              then: async (resolve: any) => {
                const data = getMockDb(tableName);
                const updatedData = data.map((item: any) => {
                  if (item[field] === val) {
                    return { ...item, ...payload, updated_at: new Date().toISOString() };
                  }
                  return item;
                });
                saveMockDb(tableName, updatedData);
                resolve({ data: updatedData.find((x: any) => x[field] === val) || null, error: null });
              }
            };
          }
        };
      },
      delete: () => {
        return {
          eq: (field: string, val: any) => {
            return {
              then: async (resolve: any) => {
                const data = getMockDb(tableName);
                const filtered = data.filter((item: any) => item[field] !== val);
                saveMockDb(tableName, filtered);
                resolve({ error: null });
              }
            };
          }
        };
      }
    };
  }
}

/**
 * Creates a server-side Supabase client using Next.js 15 async cookies
 */
export async function createClient() {
  if (process.env.NEXT_PUBLIC_MOCK_APIS === "true") {
    return new MockSupabaseClient() as any;
  }

  const cookieStore = await cookies();

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Can be ignored if called from Server Components during render
          }
        },
      },
    }
  );
}

/**
 * Creates an admin client that bypasses Row Level Security (RLS).
 * Use only in secure server actions/environments.
 */
export function createAdminClient() {
  if (process.env.NEXT_PUBLIC_MOCK_APIS === "true") {
    return new MockSupabaseClient() as any;
  }

  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
