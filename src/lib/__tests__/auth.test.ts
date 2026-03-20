// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const mockRequestCookies = { get: vi.fn() };
vi.mock("next/server", () => ({
  NextRequest: class {
    cookies = mockRequestCookies;
  },
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";
import type { NextRequest } from "next/server";

function makeRequest(token?: string) {
  const req = { cookies: mockRequestCookies } as unknown as NextRequest;
  mockRequestCookies.get.mockReturnValue(token ? { value: token } : undefined);
  return req;
}

describe("createSession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("sets cookie with name auth-token", async () => {
    await createSession("user-1", "test@example.com");
    const [name] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe("auth-token");
  });

  test("token is a valid JWT (3-part dot-separated string)", async () => {
    await createSession("user-1", "test@example.com");
    const [, token] = mockCookieStore.set.mock.calls[0];
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  test("token encodes userId and email", async () => {
    const { jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode("development-secret-key");

    await createSession("user-1", "test@example.com");
    const [, token] = mockCookieStore.set.mock.calls[0];

    const { payload } = await jwtVerify(token, secret);
    expect(payload.userId).toBe("user-1");
    expect(payload.email).toBe("test@example.com");
  });

  test("cookie is httpOnly with path /", async () => {
    await createSession("user-1", "test@example.com");
    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe("/");
  });

  test("cookie sameSite is lax", async () => {
    await createSession("user-1", "test@example.com");
    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.sameSite).toBe("lax");
  });

  test("cookie expires ~7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(options.expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  test("produces a different token for each user", async () => {
    await createSession("user-1", "a@example.com");
    const [, token1] = mockCookieStore.set.mock.calls[0];

    vi.clearAllMocks();
    await createSession("user-2", "b@example.com");
    const [, token2] = mockCookieStore.set.mock.calls[0];

    expect(token1).not.toBe(token2);
  });
});

describe("getSession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
  });

  test("returns null for an invalid token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not.a.valid.jwt" });
    expect(await getSession()).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    await createSession("user-42", "hello@example.com");
    const token = mockCookieStore.set.mock.calls[0][1];
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-42");
    expect(session?.email).toBe("hello@example.com");
  });
});

describe("deleteSession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("deletes the auth-token cookie", async () => {
    await deleteSession();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns null when no cookie is present", async () => {
    expect(await verifySession(makeRequest())).toBeNull();
  });

  test("returns null for an invalid token", async () => {
    expect(await verifySession(makeRequest("bad.token.here"))).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    await createSession("user-99", "verify@example.com");
    const token = mockCookieStore.set.mock.calls[0][1];

    const session = await verifySession(makeRequest(token));
    expect(session?.userId).toBe("user-99");
    expect(session?.email).toBe("verify@example.com");
  });
});
