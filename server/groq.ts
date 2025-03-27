import OpenAI from "openai";
import { Channel, SearchQuery } from "@shared/schema";

// Initialize Groq client using the OpenAI SDK with baseURL set to Groq's API endpoint
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Default model to use for Groq
const MODEL = "llama3-70b-8192";

interface ProspectSearchResult {
  name: string;
  title: string;
  company: string;
  sourceLink: string;
  channelId: number;
  matchScore: number;
}

interface AnalyzedProspect extends ProspectSearchResult {
  channelType: string;
  channelName: string;
  channel: Channel;
}

/**
 * Analyze search results using Groq's LLM to find potential prospects
 */
export async function analyzeSearchResultsWithLLM(
  results: Array<{ title: string; description: string; link: string; source: string }>,
  searchQuery: SearchQuery,
  channels: Channel[]
): Promise<AnalyzedProspect[]> {
  if (results.length === 0) {
    console.log("No search results to analyze");
    return [];
  }

  // Format search results for the LLM
  const formattedResults = results.map((result, index) => {
    return `
Result ${index + 1}:
Title: ${result.title}
Source: ${result.source}
Link: ${result.link}
Description: ${result.description}
`;
  }).join("\n");

  // Format channels for the LLM
  const formattedChannels = channels
    .filter(c => c.isActive)
    .map((channel, index) => {
      return `Channel ${index + 1}: ${channel.name} (ID: ${channel.id}, Type: ${channel.type})`;
    })
    .join("\n");

  // Construct the prompt for the LLM with one-shot examples
  const prompt = `
You are an AI assistant specialized in sales development and prospect identification. 
Your task is to analyze search results and identify potential sales prospects based on the provided search query.

Search Query: ${searchQuery.query}
${searchQuery.jobTitle ? `Job Title: ${searchQuery.jobTitle}` : ''}
${searchQuery.industry ? `Industry: ${searchQuery.industry}` : ''}
${searchQuery.location ? `Location: ${searchQuery.location}` : ''}
${searchQuery.companySize ? `Company Size: ${searchQuery.companySize}` : ''}
${searchQuery.keywords ? `Keywords: ${searchQuery.keywords}` : ''}

Available Channels:
${formattedChannels}

Search Results:
${formattedResults}

For each search result that represents a potential professional or business profile, extract the following information:
1. Name (full name of the person)
2. Title (job title)
3. Company (company name)
4. Most appropriate channel ID from the available channels
5. Match score (0-100) representing how well this prospect matches the search criteria

Here are some examples of how to identify prospects and assign match scores:

Example 1:
Search result: "John Smith - AI Engineer at TechCorp | LinkedIn"
Description: "AI Engineer with 5 years of experience in machine learning and neural networks."
- This is a person profile on LinkedIn
- Name: John Smith
- Title: AI Engineer 
- Company: TechCorp
- Channel: Use the LinkedIn channel ID
- Match score: High (80-90) if query is about AI or engineering, lower (50-60) for unrelated queries

Example 2:
Search result: "TechCorp - Leading AI Solutions Provider"
Description: "We provide enterprise AI solutions for businesses. Contact us today."
- This is a company page, not a person profile. Skip this result.

Example 3:
Search result: "Sarah Johnson (@sjohnson) | Twitter"
Description: "Product Manager working on AI products. Tech enthusiast."
- This is a person profile on Twitter
- Name: Sarah Johnson
- Title: Product Manager
- Company: (not specified, can be left blank or use reasonable inference)
- Channel: Use the Twitter channel ID
- Match score: Assign based on relevance to the query

Respond with a valid JSON array of prospects where each prospect has the following format:
{
  "name": "Full Name",
  "title": "Job Title",
  "company": "Company Name",
  "channelId": [channel ID as a number],
  "sourceLink": "URL of the profile",
  "matchScore": [score from 0-100]
}

Include only results that appear to be actual people with professional profiles. Be creative in identifying potential prospects even if the information is incomplete. If a search result is ambiguous but might represent a person relevant to the query, include it with appropriate confidence scores. If the query is about a specific technology or service, look for professionals who work with that technology.
`;

  try {
    console.log("Analyzing search results with Groq LLM...");
    
    // Make the API call to Groq
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      console.log("No content returned from Groq");
      return [];
    }

    try {
      // Parse the JSON response
      const jsonResponse = JSON.parse(content);
      
      // Extract the prospects array - handle different response formats
      let prospects = [];
      
      if (Array.isArray(jsonResponse)) {
        // If the LLM returned an array directly
        prospects = jsonResponse;
      } else if (jsonResponse.prospects && Array.isArray(jsonResponse.prospects)) {
        // If the LLM wrapped the results in a 'prospects' field
        prospects = jsonResponse.prospects;
      } else if (jsonResponse.results && Array.isArray(jsonResponse.results)) {
        // If the LLM wrapped the results in a 'results' field
        prospects = jsonResponse.results;
      } else {
        // Try to extract any array field from the response
        const arrayFields = Object.keys(jsonResponse).filter(key => 
          Array.isArray(jsonResponse[key]) && jsonResponse[key].length > 0
        );
        
        if (arrayFields.length > 0) {
          prospects = jsonResponse[arrayFields[0]];
        } else {
          console.log("No valid prospects array found in response:", content);
        }
      }
      
      // Process each prospect to add the missing fields
      const processedProspects = prospects.map((prospect: ProspectSearchResult) => {
        const channel = channels.find(c => c.id === prospect.channelId);
        
        if (!channel) {
          // If channel not found, use the first active channel
          const defaultChannel = channels.find(c => c.isActive);
          if (!defaultChannel) return null;
          
          return {
            ...prospect,
            channelId: defaultChannel.id,
            channelType: defaultChannel.type,
            channelName: defaultChannel.name,
            channel: defaultChannel
          };
        }
        
        return {
          ...prospect,
          channelType: channel.type,
          channelName: channel.name,
          channel: channel
        };
      }).filter(Boolean);
      
      console.log(`Identified ${processedProspects.length} prospects with LLM analysis`);
      return processedProspects;
    } catch (error) {
      console.error("Error parsing Groq response:", error);
      return [];
    }
  } catch (error) {
    console.error("Error calling Groq API:", error);
    return [];
  }
}