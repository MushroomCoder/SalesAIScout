import { Channel, SearchQuery } from "@shared/schema";

// Mock interface for prospect search results
interface ProspectSearchResult {
  name: string;
  title: string;
  company: string;
  profileUrl: string;
  channel: Channel;
}

// Mock interface for analyzed prospect with match probability
interface AnalyzedProspect {
  name: string;
  title: string;
  company: string;
  sourceLink: string;
  channelId: number;
  channelType: string;
  channelName: string;
  matchScore: number;
}

// In a real implementation, this would use the OpenAI API
// For the MVP, we'll simulate AI analysis with a simple algorithm
export async function generateAiAnalysis(
  prospects: ProspectSearchResult[],
  searchQuery: SearchQuery
): Promise<AnalyzedProspect[]> {
  // Calculate relevance score based on matching keywords
  return prospects.map(prospect => {
    // Calculate match score (0-100)
    let matchScore = 50; // Base score
    
    const searchTerms = [
      searchQuery.jobTitle,
      searchQuery.industry,
      searchQuery.location,
      searchQuery.keywords
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(term => term.length > 2);
    
    const prospectText = [
      prospect.name,
      prospect.title,
      prospect.company
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    
    // Increase score for each matching term
    for (const term of searchTerms) {
      if (prospectText.includes(term)) {
        matchScore += 5;
      }
    }
    
    // Exact title match gives a big boost
    if (searchQuery.jobTitle && 
        prospect.title.toLowerCase().includes(searchQuery.jobTitle.toLowerCase())) {
      matchScore += 20;
    }
    
    // Cap the score at 98
    matchScore = Math.min(98, matchScore);
    
    // Add slight randomness for variety
    matchScore += Math.floor(Math.random() * 3);
    
    // Ensure score doesn't exceed 100
    matchScore = Math.min(100, matchScore);
    
    return {
      name: prospect.name,
      title: prospect.title,
      company: prospect.company,
      sourceLink: prospect.profileUrl,
      channelId: prospect.channel.id,
      channelType: prospect.channel.type,
      channelName: prospect.channel.name,
      matchScore
    };
  })
  .sort((a, b) => b.matchScore - a.matchScore); // Sort by match score descending
}
