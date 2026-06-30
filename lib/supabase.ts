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

// Mock Query Builder for Supabase chaining operations
class MockQueryBuilder {
  tableName: string;
  filters: Array<{ field: string; val: any }> = [];
  orderField: string | null = null;
  orderOptions: any = null;
  limitVal: number | null = null;
  orStr: string | null = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(selectStr: string = "*") {
    return this;
  }

  eq(field: string, val: any) {
    this.filters.push({ field, val });
    return this;
  }

  or(orStr: string) {
    this.orStr = orStr;
    return this;
  }

  order(orderField: string, options?: any) {
    this.orderField = orderField;
    this.orderOptions = options;
    return this;
  }

  limit(limitVal: number) {
    this.limitVal = limitVal;
    return this;
  }

  async execute() {
    let data = getMockDb(this.tableName);

    // Apply orStr filter
    if (this.orStr) {
      const parts = this.orStr.split(",");
      const matchedItems = [];
      for (const item of data) {
        let matchesOr = false;
        for (const part of parts) {
          const match = part.match(/([a-zA-Z0-9_]+)\.eq\.(.+)/);
          if (match) {
            const field = match[1];
            const val = match[2];
            if (String(item[field]) === String(val)) {
              matchesOr = true;
              break;
            }
          }
        }
        if (matchesOr) {
          matchedItems.push(item);
        }
      }
      data = matchedItems;
    }

    // Apply filters
    for (const filter of this.filters) {
      data = data.filter((x: any) => String(x[filter.field]) === String(filter.val));
    }

    // Apply ordering
    if (this.orderField) {
      data = [...data];
      data.sort((a: any, b: any) => {
        const valA = a[this.orderField!];
        const valB = b[this.orderField!];
        const timeA = new Date(valA).getTime() || 0;
        const timeB = new Date(valB).getTime() || 0;
        if (timeA && timeB) {
          return this.orderOptions?.ascending ? timeA - timeB : timeB - timeA;
        }
        return this.orderOptions?.ascending
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    // Apply limit
    if (this.limitVal !== null) {
      data = data.slice(0, this.limitVal);
    }

    return data;
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(
      (data) => onfulfilled?.({ data, error: null }),
      (err) => onrejected?.(err) || { data: null, error: err }
    );
  }

  async single() {
    const data = await this.execute();
    if (data.length === 0) {
      return { data: null, error: { message: "Not found", code: "PGRST116" } };
    }
    return { data: data[0], error: null };
  }

  async maybeSingle() {
    const data = await this.execute();
    if (data.length === 0) {
      return { data: null, error: null };
    }
    return { data: data[0], error: null };
  }
}

// Chained filter builder for mock update/delete operations
class MockUpdateDeleteBuilder {
  tableName: string;
  payload: any | null; // null for delete
  filters: Array<{ field: string; val: any }> = [];
  isDelete: boolean;

  constructor(tableName: string, payload: any, isDelete: boolean = false) {
    this.tableName = tableName;
    this.payload = payload;
    this.isDelete = isDelete;
  }

  eq(field: string, val: any) {
    this.filters.push({ field, val });
    return this;
  }

  async execute() {
    const data = getMockDb(this.tableName);
    if (this.isDelete) {
      const filtered = data.filter((item: any) => {
        // Keep item if it does NOT match all filters (i.e. only delete if it matches ALL filters)
        const matchesAll = this.filters.every(f => String(item[f.field]) === String(f.val));
        return !matchesAll;
      });
      saveMockDb(this.tableName, filtered);
      return { error: null };
    } else {
      let updatedRecord: any = null;
      const updatedData = data.map((item: any) => {
        const matchesAll = this.filters.every(f => String(item[f.field]) === String(f.val));
        if (matchesAll) {
          const updated = { ...item, ...this.payload, updated_at: new Date().toISOString() };
          updatedRecord = updated;
          return updated;
        }
        return item;
      });
      saveMockDb(this.tableName, updatedData);
      return { data: updatedRecord, error: null };
    }
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(
      (res) => onfulfilled?.(res),
      (err) => onrejected?.(err) || { data: null, error: err }
    );
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
        return new MockQueryBuilder(tableName);
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
        return new MockUpdateDeleteBuilder(tableName, payload, false);
      },
      delete: () => {
        return new MockUpdateDeleteBuilder(tableName, null, true);
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
