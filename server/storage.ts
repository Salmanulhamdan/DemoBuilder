import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";
import { type WebsiteAnalysis } from "./services/websiteCrawler";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // OTP management for simple email verification flows
  saveOtp(email: string, code: string, expiresAt: number): Promise<void>;
  verifyOtp(email: string, code: string): Promise<boolean>;
  hasActiveOtp(email: string): Promise<boolean>;

  // Website analysis storage
  saveWebsiteAnalysis(email: string, analysis: WebsiteAnalysis): Promise<void>;
  getWebsiteAnalysis(email: string): Promise<WebsiteAnalysis | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private otpByEmail: Map<string, { code: string; expiresAt: number }>;
  private websiteAnalysisByEmail: Map<string, WebsiteAnalysis>;

  constructor() {
    this.users = new Map();
    this.otpByEmail = new Map();
    this.websiteAnalysisByEmail = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async saveOtp(email: string, code: string, expiresAt: number): Promise<void> {
    this.otpByEmail.set(email.toLowerCase(), { code, expiresAt });
  }

  async verifyOtp(email: string, code: string): Promise<boolean> {
    const record = this.otpByEmail.get(email.toLowerCase());
    if (!record) return false;
    const now = Date.now();
    if (now > record.expiresAt) {
      this.otpByEmail.delete(email.toLowerCase());
      return false;
    }
    const isValid = record.code === code;
    if (isValid) {
      // one-time use
      this.otpByEmail.delete(email.toLowerCase());
    }
    return isValid;
  }

  async hasActiveOtp(email: string): Promise<boolean> {
    const record = this.otpByEmail.get(email.toLowerCase());
    if (!record) return false;
    return Date.now() <= record.expiresAt;
  }

  async saveWebsiteAnalysis(email: string, analysis: WebsiteAnalysis): Promise<void> {
    this.websiteAnalysisByEmail.set(email.toLowerCase(), analysis);
  }

  async getWebsiteAnalysis(email: string): Promise<WebsiteAnalysis | undefined> {
    return this.websiteAnalysisByEmail.get(email.toLowerCase());
  }
}

export const storage = new MemStorage();
