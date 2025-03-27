import { simulateSearch } from "./scraper";
import { generateAiAnalysis } from "./openai";
import { SearchQuery } from "@shared/schema";

async function testProspectSearchAndAI() {
  console.log("Testing AI-powered prospect search...");
  
  // Create a mock search query
  const searchQuery: SearchQuery = {
    jobTitle: "Marketing",
    industry: "SaaS",
    keywords: "growth automation"
  };
  
  // Create mock channels
  const mockChannels = [
    { 
      id: 1, 
      name: "LinkedIn", 
      type: "linkedin", 
      description: "Professional network", 
      isActive: true,
      createdAt: new Date()
    },
    { 
      id: 2, 
      name: "Twitter", 
      type: "twitter", 
      description: "Social media", 
      isActive: true,
      createdAt: new Date()
    }
  ];
  
  console.log("Searching for prospects...");
  // Search for prospects
  const searchResults = await simulateSearch(searchQuery, mockChannels);
  console.log(`Found ${searchResults.length} prospects`);
  
  console.log("\nAnalyzing prospects with AI...");
  // Analyze with AI
  const analyzedResults = await generateAiAnalysis(searchResults, searchQuery);
  
  // Print the results
  console.log("\nTop 3 analyzed prospects with match scores:");
  analyzedResults.slice(0, 3).forEach((prospect, index) => {
    console.log(`\n#${index + 1}: ${prospect.name} (${prospect.matchScore}% match)`);
    console.log(`   Title: ${prospect.title}`);
    console.log(`   Company: ${prospect.company}`);
    console.log(`   Channel: ${prospect.channelName} (${prospect.channelType})`);
    console.log(`   Source: ${prospect.sourceLink}`);
  });
}

testProspectSearchAndAI().catch(console.error);