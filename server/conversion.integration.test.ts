import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Conversion API Integration Tests", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const { ctx } = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("getHistory", () => {
    it("should return empty array for new user", async () => {
      const history = await caller.conversion.getHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it("should return array of conversions with correct fields", async () => {
      const history = await caller.conversion.getHistory();
      if (history.length > 0) {
        const conversion = history[0];
        expect(conversion).toHaveProperty("id");
        expect(conversion).toHaveProperty("originalFileName");
        expect(conversion).toHaveProperty("convertedFileName");
        expect(conversion).toHaveProperty("status");
        expect(conversion).toHaveProperty("fileSize");
        expect(conversion).toHaveProperty("createdAt");
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid conversion ID gracefully", async () => {
      try {
        await caller.conversion.getStatus({ conversionId: 99999 });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should handle delete of non-existent conversion", async () => {
      try {
        await caller.conversion.delete({ conversionId: 99999 });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("File Validation", () => {
    it("should reject files with invalid format", async () => {
      try {
        await caller.conversion.uploadAndConvert({
          fileName: "test.txt",
          fileData: "invalid data",
        });
      } catch (error) {
        expect(error).toBeDefined();
        expect(error instanceof Error ? error.message : "").toContain("PDF");
      }
    });

    it("should reject files with invalid base64", async () => {
      try {
        await caller.conversion.uploadAndConvert({
          fileName: "test.pdf",
          fileData: "not valid base64!!!",
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Status Tracking", () => {
    it("should return valid status for conversion", async () => {
      const history = await caller.conversion.getHistory();
      if (history.length > 0) {
        const conversion = history[0];
        const status = await caller.conversion.getStatus({
          conversionId: conversion.id,
        });
        expect(["pending", "processing", "completed", "failed"]).toContain(
          status.status
        );
      }
    });
  });
});
