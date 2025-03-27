import { SearchQuery } from "@shared/schema";
import { analyzeSearchResultsWithLLM } from "./groq";
import { storage } from "./storage";

// Mock search results for testing
const mockSearchResults = [
  {
    title: "John Smith - Software Engineer at TechCorp | LinkedIn",
    description: "Experienced Software Engineer with 5+ years in web development and cloud technologies.",
    link: "https://linkedin.com/in/johnsmith",
    source: "linkedin.com"
  },
  {
    title: "Sarah Johnson | Marketing Director - Acme Inc.",
    description: "Marketing Director at Acme Inc. Specializing in digital marketing and growth strategies.",
    link: "https://twitter.com/sarahjohnson",
    source: "twitter.com"
  },
  {
    title: "Michael Brown - Technical Product Manager",
    description: "Product Manager with a technical background, currently at InnovateTech working on AI solutions.",
    link: "https://example.com/michael-profile",
    source: "example.com"
  }
];

async function testGroqAnalysis() {
  console.log("==== Testing Groq LLM-based prospect analysis ====");
  
  try {
    // Create test channels
    const linkedinChannel = await storage.createChannel({
      name: "LinkedIn Professional",
      type: "linkedin",
      description: "Professional networking platform",
      isActive: true
    });
    
    const twitterChannel = await storage.createChannel({
      name: "Twitter Professionals",
      type: "twitter",
      description: "Social media platform for professionals",
      isActive: true
    });
    
    const googleChannel = await storage.createChannel({
      name: "Google Search",
      type: "google",
      description: "General search results",
      isActive: true
    });
    
    // Create test search query
    const searchQuery: SearchQuery = {
      query: "software engineer JavaScript",
      jobTitle: "Software Engineer",
      industry: "Technology",
      location: "San Francisco",
      keywords: "JavaScript, React, Node.js"
    };
    
    const channels = [linkedinChannel, twitterChannel, googleChannel];
    
    // Test direct LLM analysis
    console.log("Testing direct LLM analysis...");
    const llmResults = await analyzeSearchResultsWithLLM(
      mockSearchResults,
      searchQuery,
      channels
    );
    
    console.log("LLM Analysis Results:", JSON.stringify(llmResults, null, 2));
    
    return llmResults;
    
  } catch (error) {
    console.error("Test failed with error:", error);
    return null;
  }
}

// Run the test
testGroqAnalysis()
  .then(results => {
    if (results) {
      console.log("Test completed successfully!");
    } else {
      console.log("Test failed!");
    }
  })
  .catch(error => {
    console.error("Unhandled error during test:", error);
  });

export { testGroqAnalysis };