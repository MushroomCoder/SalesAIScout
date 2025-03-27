import { users, channels, userChannels, prospects, searches } from "@shared/schema";
import type { User, InsertUser, Channel, InsertChannel, UserChannel, InsertUserChannel, Prospect, InsertProspect, Search, InsertSearch } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.SessionStore;

  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getPendingSDRs(): Promise<User[]>;
  getApprovedSDRs(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;

  // Channel methods
  getChannel(id: number): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  updateChannel(id: number, data: Partial<Channel>): Promise<Channel | undefined>;
  getAllChannels(): Promise<Channel[]>;
  getActiveChannels(): Promise<Channel[]>;

  // User-Channel methods
  assignChannelToUser(userChannel: InsertUserChannel): Promise<UserChannel>;
  getUserChannels(userId: number): Promise<Channel[]>;
  getChannelUsers(channelId: number): Promise<User[]>;
  removeUserChannel(userId: number, channelId: number): Promise<void>;

  // Prospect methods
  getProspect(id: number): Promise<Prospect | undefined>;
  createProspect(prospect: InsertProspect): Promise<Prospect>;
  updateProspect(id: number, data: Partial<Prospect>): Promise<Prospect | undefined>;
  getUserProspects(userId: number): Promise<Prospect[]>;
  getAllProspects(): Promise<Prospect[]>;

  // Search methods
  createSearch(search: InsertSearch): Promise<Search>;
  getUserSearches(userId: number): Promise<Search[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private channels: Map<number, Channel>;
  private userChannels: Map<number, UserChannel>;
  private prospects: Map<number, Prospect>;
  private searches: Map<number, Search>;
  sessionStore: session.SessionStore;

  private userIdCounter: number;
  private channelIdCounter: number;
  private userChannelIdCounter: number;
  private prospectIdCounter: number;
  private searchIdCounter: number;

  constructor() {
    this.users = new Map();
    this.channels = new Map();
    this.userChannels = new Map();
    this.prospects = new Map();
    this.searches = new Map();
    
    this.userIdCounter = 1;
    this.channelIdCounter = 1;
    this.userChannelIdCounter = 1;
    this.prospectIdCounter = 1;
    this.searchIdCounter = 1;

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });

    // Initialize with an admin user
    this.createUser({
      username: "admin",
      email: "admin@aisdr.com",
      password: "admin123",
      role: "admin",
      status: "approved"
    });

    // Initialize with some channels
    this.createChannel({
      name: "LinkedIn",
      type: "linkedin",
      description: "Professional networking",
      isActive: true
    });

    this.createChannel({
      name: "Twitter",
      type: "twitter",
      description: "Social media platform",
      isActive: true
    });

    this.createChannel({
      name: "Instagram",
      type: "instagram",
      description: "Visual social platform",
      isActive: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.username === username
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.email === email
    );
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.googleId === googleId
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { ...userData, id, createdAt: now };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getPendingSDRs(): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      user => user.role === "sdr" && user.status === "pending"
    );
  }

  async getApprovedSDRs(): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      user => user.role === "sdr" && user.status === "approved"
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Channel methods
  async getChannel(id: number): Promise<Channel | undefined> {
    return this.channels.get(id);
  }

  async createChannel(channelData: InsertChannel): Promise<Channel> {
    const id = this.channelIdCounter++;
    const now = new Date();
    const channel: Channel = { ...channelData, id, createdAt: now };
    this.channels.set(id, channel);
    return channel;
  }

  async updateChannel(id: number, data: Partial<Channel>): Promise<Channel | undefined> {
    const channel = this.channels.get(id);
    if (!channel) return undefined;
    
    const updatedChannel = { ...channel, ...data };
    this.channels.set(id, updatedChannel);
    return updatedChannel;
  }

  async getAllChannels(): Promise<Channel[]> {
    return Array.from(this.channels.values());
  }

  async getActiveChannels(): Promise<Channel[]> {
    return Array.from(this.channels.values()).filter(
      channel => channel.isActive
    );
  }

  // User-Channel methods
  async assignChannelToUser(userChannelData: InsertUserChannel): Promise<UserChannel> {
    const id = this.userChannelIdCounter++;
    const now = new Date();
    const userChannel: UserChannel = { ...userChannelData, id, createdAt: now };
    this.userChannels.set(id, userChannel);
    return userChannel;
  }

  async getUserChannels(userId: number): Promise<Channel[]> {
    const userChannelIds = Array.from(this.userChannels.values())
      .filter(uc => uc.userId === userId)
      .map(uc => uc.channelId);
    
    return Array.from(this.channels.values())
      .filter(channel => userChannelIds.includes(channel.id));
  }

  async getChannelUsers(channelId: number): Promise<User[]> {
    const userIds = Array.from(this.userChannels.values())
      .filter(uc => uc.channelId === channelId)
      .map(uc => uc.userId);
    
    return Array.from(this.users.values())
      .filter(user => userIds.includes(user.id));
  }

  async removeUserChannel(userId: number, channelId: number): Promise<void> {
    const userChannelEntry = Array.from(this.userChannels.entries())
      .find(([_, uc]) => uc.userId === userId && uc.channelId === channelId);
    
    if (userChannelEntry) {
      this.userChannels.delete(userChannelEntry[0]);
    }
  }

  // Prospect methods
  async getProspect(id: number): Promise<Prospect | undefined> {
    return this.prospects.get(id);
  }

  async createProspect(prospectData: InsertProspect): Promise<Prospect> {
    const id = this.prospectIdCounter++;
    const now = new Date();
    const prospect: Prospect = { ...prospectData, id, createdAt: now };
    this.prospects.set(id, prospect);
    return prospect;
  }

  async updateProspect(id: number, data: Partial<Prospect>): Promise<Prospect | undefined> {
    const prospect = this.prospects.get(id);
    if (!prospect) return undefined;
    
    const updatedProspect = { ...prospect, ...data };
    this.prospects.set(id, updatedProspect);
    return updatedProspect;
  }

  async getUserProspects(userId: number): Promise<Prospect[]> {
    return Array.from(this.prospects.values())
      .filter(prospect => prospect.userId === userId);
  }

  async getAllProspects(): Promise<Prospect[]> {
    return Array.from(this.prospects.values());
  }

  // Search methods
  async createSearch(searchData: InsertSearch): Promise<Search> {
    const id = this.searchIdCounter++;
    const now = new Date();
    const search: Search = { ...searchData, id, createdAt: now };
    this.searches.set(id, search);
    return search;
  }

  async getUserSearches(userId: number): Promise<Search[]> {
    return Array.from(this.searches.values())
      .filter(search => search.userId === userId);
  }
}

export const storage = new MemStorage();
