import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { simulateSearch } from "./scraper";
import { generateAiAnalysis } from "./openai";
import { searchQuerySchema, insertChannelSchema, insertProspectSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Admin Routes
  
  // Get pending SDRs
  app.get('/api/admin/sdrs/pending', async (req, res) => {
    try {
      const pendingSDRs = await storage.getPendingSDRs();
      res.json(pendingSDRs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pending SDRs' });
    }
  });
  
  // Get all SDRs
  app.get('/api/admin/sdrs', async (req, res) => {
    try {
      const allSDRs = await storage.getApprovedSDRs();
      res.json(allSDRs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch SDRs' });
    }
  });
  
  // Approve or reject an SDR
  app.post('/api/admin/sdrs/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (status !== 'approved' && status !== 'rejected') {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      const user = await storage.getUser(parseInt(id));
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const updatedUser = await storage.updateUser(parseInt(id), { status });
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update SDR status' });
    }
  });
  
  // Get all channels
  app.get('/api/admin/channels', async (req, res) => {
    try {
      const channels = await storage.getAllChannels();
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch channels' });
    }
  });
  
  // Create a new channel
  app.post('/api/admin/channels', async (req, res) => {
    try {
      const parseResult = insertChannelSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid channel data', details: parseResult.error });
      }
      
      const channel = await storage.createChannel(req.body);
      res.status(201).json(channel);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create channel' });
    }
  });
  
  // Update a channel
  app.patch('/api/admin/channels/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const channel = await storage.getChannel(parseInt(id));
      
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }
      
      const updatedChannel = await storage.updateChannel(parseInt(id), req.body);
      res.json(updatedChannel);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update channel' });
    }
  });
  
  // Assign a channel to an SDR
  app.post('/api/admin/sdrs/:userId/channels/:channelId', async (req, res) => {
    try {
      const { userId, channelId } = req.params;
      
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const channel = await storage.getChannel(parseInt(channelId));
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }
      
      const userChannel = await storage.assignChannelToUser({
        userId: parseInt(userId),
        channelId: parseInt(channelId)
      });
      
      res.status(201).json(userChannel);
    } catch (error) {
      res.status(500).json({ error: 'Failed to assign channel to SDR' });
    }
  });
  
  // Remove a channel assignment from an SDR
  app.delete('/api/admin/sdrs/:userId/channels/:channelId', async (req, res) => {
    try {
      const { userId, channelId } = req.params;
      
      await storage.removeUserChannel(parseInt(userId), parseInt(channelId));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove channel assignment' });
    }
  });
  
  // Get all prospects (for admin dashboard)
  app.get('/api/admin/prospects', async (req, res) => {
    try {
      const prospects = await storage.getAllProspects();
      res.json(prospects);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch prospects' });
    }
  });
  
  // SDR Routes
  
  // Get assigned channels for the logged-in SDR
  app.get('/api/sdr/channels', async (req, res) => {
    try {
      const user = req.user as Express.User;
      const channels = await storage.getUserChannels(user.id);
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch assigned channels' });
    }
  });
  
  // Search for prospects
  app.post('/api/sdr/prospects/search', async (req, res) => {
    try {
      const user = req.user as Express.User;
      
      const parseResult = searchQuerySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid search query', details: parseResult.error });
      }
      
      // Create a search record
      const searchQuery = parseResult.data;
      const queryString = [
        searchQuery.jobTitle,
        searchQuery.industry,
        searchQuery.location,
        searchQuery.keywords
      ].filter(Boolean).join(' ');
      
      const search = await storage.createSearch({
        userId: user.id,
        query: queryString,
        jobTitle: searchQuery.jobTitle,
        industry: searchQuery.industry,
        companySize: searchQuery.companySize,
        location: searchQuery.location,
        keywords: searchQuery.keywords
      });
      
      // Get assigned channels
      let channels = await storage.getUserChannels(user.id);
      
      // Filter channels if specified in the request
      if (searchQuery.channels && searchQuery.channels.length > 0) {
        channels = channels.filter(channel => 
          searchQuery.channels?.includes(channel.type)
        );
      }
      
      if (channels.length === 0) {
        return res.status(400).json({ error: 'No channels available for search' });
      }
      
      // Search for prospects using the scraper
      const searchResults = await simulateSearch(searchQuery, channels);
      
      // Analyze results with AI and add probability scores
      const analyzedResults = await generateAiAnalysis(searchResults, searchQuery);
      
      res.json(analyzedResults);
    } catch (error) {
      res.status(500).json({ error: 'Failed to search for prospects' });
    }
  });
  
  // Save prospects
  app.post('/api/sdr/prospects', async (req, res) => {
    try {
      const user = req.user as Express.User;
      const prospects = Array.isArray(req.body) ? req.body : [req.body];
      
      const savedProspects = [];
      
      for (const prospectData of prospects) {
        const parseResult = insertProspectSchema.safeParse({
          ...prospectData,
          userId: user.id
        });
        
        if (parseResult.success) {
          const savedProspect = await storage.createProspect(parseResult.data);
          savedProspects.push(savedProspect);
        }
      }
      
      res.status(201).json(savedProspects);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save prospects' });
    }
  });
  
  // Get prospects for logged-in SDR
  app.get('/api/sdr/prospects', async (req, res) => {
    try {
      const user = req.user as Express.User;
      const prospects = await storage.getUserProspects(user.id);
      res.json(prospects);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch prospects' });
    }
  });

  // Get a single prospect by ID
  app.get('/api/sdr/prospects/:id', async (req, res) => {
    try {
      const user = req.user as Express.User;
      const { id } = req.params;
      
      const prospect = await storage.getProspect(parseInt(id));
      
      if (!prospect) {
        return res.status(404).json({ error: 'Prospect not found' });
      }
      
      if (prospect.userId !== user.id) {
        return res.status(403).json({ error: 'Not authorized to view this prospect' });
      }
      
      // If the prospect belongs to this channel, get channel details
      if (prospect.channelId) {
        const channel = await storage.getChannel(prospect.channelId);
        if (channel) {
          // Add channel type and name to the prospect
          const prospectWithChannel = {
            ...prospect,
            channelType: channel.type,
            channelName: channel.name
          };
          return res.json(prospectWithChannel);
        }
      }
      
      res.json(prospect);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch prospect' });
    }
  });
  
  // Update a prospect
  app.patch('/api/sdr/prospects/:id', async (req, res) => {
    try {
      const user = req.user as Express.User;
      const { id } = req.params;
      
      const prospect = await storage.getProspect(parseInt(id));
      
      if (!prospect) {
        return res.status(404).json({ error: 'Prospect not found' });
      }
      
      if (prospect.userId !== user.id) {
        return res.status(403).json({ error: 'Not authorized to update this prospect' });
      }
      
      const updatedProspect = await storage.updateProspect(parseInt(id), req.body);
      res.json(updatedProspect);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update prospect' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
