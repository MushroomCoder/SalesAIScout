import { SearchQuery, Channel } from "@shared/schema";
import puppeteer from 'puppeteer';

const GOOGLE_SEARCH_URL = 'https://www.google.com/search';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

interface ScrapedResult {
  title: string;
  link: string;
  description: string;
  source: string;
}

export async function scrapeGoogle(query: string): Promise<ScrapedResult[]> {
  console.log(`Scraping Google for query: ${query}`);
  
  try {
    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set a user agent to avoid being detected as a bot
    await page.setUserAgent(USER_AGENT);
    
    // Navigate to Google with the search query
    await page.goto(`${GOOGLE_SEARCH_URL}?q=${encodeURIComponent(query)}`);
    
    // Wait for search results to load
    await page.waitForSelector('div.g');
    
    // Extract search results
    const results = await page.evaluate(() => {
      const searchResults: ScrapedResult[] = [];
      
      // Select all search result containers
      const resultElements = document.querySelectorAll('div.g');
      
      resultElements.forEach((element) => {
        // Extract title and link
        const titleElement = element.querySelector('h3');
        const linkElement = element.querySelector('a');
        const descriptionElement = element.querySelector('.VwiC3b');
        const sourceElement = element.querySelector('.UPmit');
        
        if (titleElement && linkElement) {
          const title = titleElement.textContent || '';
          const link = linkElement.getAttribute('href') || '';
          const description = descriptionElement ? descriptionElement.textContent || '' : '';
          const source = sourceElement ? sourceElement.textContent || '' : '';
          
          searchResults.push({
            title,
            link,
            description,
            source
          });
        }
      });
      
      return searchResults;
    });
    
    await browser.close();
    return results;
  } catch (error) {
    console.error('Error scraping Google:', error);
    return [];
  }
}

/**
 * Analyzes Google search results to extract potential prospects
 * This function uses a rule-based approach to identify professional profiles
 */
export async function extractProspectsFromSearchResults(
  results: ScrapedResult[],
  query: SearchQuery,
  channels: Channel[]
) {
  console.log(`Analyzing ${results.length} search results`);
  
  const prospects = [];
  
  // Assign each result to an appropriate channel based on keywords and patterns
  for (const result of results) {
    // Skip if result doesn't look like a person/profile
    if (!isPotentialProspect(result)) continue;
    
    // Find the best matching channel for this result
    const matchedChannel = findBestChannelMatch(result, channels);
    if (!matchedChannel) continue;
    
    // Extract name, title, company from the result
    const { name, title, company } = extractProfileInfo(result);
    
    // If we couldn't extract a name, skip this result
    if (!name) continue;
    
    // Calculate a match score based on the search query
    const matchScore = calculateMatchScore(result, query);
    
    prospects.push({
      name,
      title,
      company,
      profileUrl: result.link,
      sourceLink: result.link,
      channel: matchedChannel,
      channelId: matchedChannel.id,
      channelType: matchedChannel.type,
      channelName: matchedChannel.name,
      matchScore
    });
  }
  
  return prospects;
}

/**
 * Determines if a search result might represent a professional profile
 */
function isPotentialProspect(result: ScrapedResult): boolean {
  const { title, description, source, link } = result;
  const text = `${title} ${description} ${source}`.toLowerCase();
  
  // Define patterns that suggest this is a person's profile
  const personIndicators = [
    'profile', 'linkedin', 'twitter', 'professional', 'resume', 
    'cv', 'bio', 'about me', 'experience', 'skills'
  ];
  
  // Check if URL is from a professional networking site
  const profileSites = [
    'linkedin.com/in/', 'twitter.com/', 'github.com/', 
    'instagram.com/', 'facebook.com/', 'medium.com/@'
  ];
  
  // Check URL patterns
  const isProfileUrl = profileSites.some(site => link.includes(site));
  
  // Check content patterns
  const hasPersonIndicator = personIndicators.some(indicator => 
    text.includes(indicator)
  );
  
  return isProfileUrl || hasPersonIndicator;
}

/**
 * Find the most appropriate channel for a search result
 */
function findBestChannelMatch(result: ScrapedResult, channels: Channel[]): Channel | undefined {
  const { link, title, description } = result;
  const text = `${title} ${description} ${link}`.toLowerCase();
  
  // Map of channel types to their identifying keywords
  const channelKeywords: Record<string, string[]> = {
    'linkedin': ['linkedin', 'in/', 'professional', 'experience', 'skills', 'work'],
    'twitter': ['twitter', 'tweet', '@', 'follow'],
    'instagram': ['instagram', 'insta', 'photo', 'follow'],
    'quora': ['quora', 'answer', 'question'],
    'google': ['google', 'profile', 'search']
  };
  
  // First check for direct URL matches
  for (const channel of channels) {
    if (!channel.isActive) continue;
    
    // Check if URL directly contains channel name
    if (link.includes(channel.type.toLowerCase())) {
      return channel;
    }
  }
  
  // Then check for content matches
  let bestChannel: Channel | undefined = undefined;
  let highestScore = 0;
  
  for (const channel of channels) {
    if (!channel.isActive) continue;
    
    const keywords = channelKeywords[channel.type] || [];
    let score = 0;
    
    // Count keyword matches
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += 1;
      }
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestChannel = channel;
    }
  }
  
  // Default to first active channel if we couldn't find a match
  if (!bestChannel && channels.length > 0) {
    bestChannel = channels.find(c => c.isActive);
  }
  
  return bestChannel;
}

/**
 * Extract profile information from search result
 */
function extractProfileInfo(result: ScrapedResult): { name: string; title: string; company: string } {
  const { title, description } = result;
  
  // Default values
  let name = '';
  let jobTitle = '';
  let company = '';
  
  // Try to extract name from the title
  // Common patterns: "Name - Title at Company" or "Name | Title at Company"
  const titleSeparators = [' - ', ' | ', ': ', '—', '–', ' @ '];
  for (const separator of titleSeparators) {
    if (title.includes(separator)) {
      const parts = title.split(separator);
      name = parts[0].trim();
      break;
    }
  }
  
  // If no name found in title, use the first part of title as name
  if (!name && title) {
    name = title.split(' ').slice(0, 2).join(' ');
  }
  
  // Try to extract title and company from description
  if (description) {
    // Look for patterns like "Title at Company" or "Title @ Company"
    const titleMatches = description.match(/([^,]+) (?:at|@) ([^,]+)/i);
    if (titleMatches && titleMatches.length >= 3) {
      jobTitle = titleMatches[1].trim();
      company = titleMatches[2].trim();
    }
    
    // If no job title found, check for other patterns
    if (!jobTitle) {
      const positionMatches = description.match(/([\w\s]+) at ([\w\s]+)/i);
      if (positionMatches && positionMatches.length >= 3) {
        jobTitle = positionMatches[1].trim();
        company = positionMatches[2].trim();
      }
    }
  }
  
  return {
    name,
    title: jobTitle,
    company
  };
}

/**
 * Calculate a match score for a search result based on the search query
 */
function calculateMatchScore(result: ScrapedResult, query: SearchQuery): number {
  const { title, description } = result;
  const text = `${title} ${description}`.toLowerCase();
  const { jobTitle, industry, keywords, query: searchQuery } = query;
  
  // Start with a base score
  let score = 50;
  
  // Check for search query matches
  if (searchQuery && text.includes(searchQuery.toLowerCase())) {
    score += 10;
  }
  
  // Check for job title matches
  if (jobTitle && text.includes(jobTitle.toLowerCase())) {
    score += 15;
    // Extra points for exact title match
    if (description && description.toLowerCase().includes(jobTitle.toLowerCase())) {
      score += 10;
    }
  }
  
  // Check for industry matches
  if (industry && text.includes(industry.toLowerCase())) {
    score += 10;
  }
  
  // Check for keyword matches
  if (keywords) {
    const keywordList = keywords.split(',').map(k => k.trim().toLowerCase());
    for (const keyword of keywordList) {
      if (keyword && text.includes(keyword)) {
        score += 5;
      }
    }
  }
  
  // Add some randomness to differentiate similar results
  score += Math.floor(Math.random() * 10);
  
  // Cap the score at 100
  return Math.min(Math.max(score, 0), 100);
}

export async function searchProspects(searchQuery: SearchQuery, channels: Channel[]) {
  console.log(`Searching for prospects with query: ${searchQuery.query}`);
  
  try {
    // Build a more targeted search query for Google
    const enhancedQuery = buildEnhancedQuery(searchQuery);
    
    // Scrape Google search results
    const searchResults = await scrapeGoogle(enhancedQuery);
    
    if (searchResults.length === 0) {
      console.log('No search results found');
      return [];
    }
    
    // Extract and analyze prospects from the search results
    const prospects = await extractProspectsFromSearchResults(
      searchResults, 
      searchQuery,
      channels
    );
    
    return prospects;
  } catch (error) {
    console.error('Error in prospect search:', error);
    return [];
  }
}

/**
 * Build an enhanced search query for Google to find professional profiles
 */
function buildEnhancedQuery(searchQuery: SearchQuery): string {
  const { query, jobTitle, industry, location, companySize } = searchQuery;
  
  let enhancedQuery = query;
  
  // Add job title if provided
  if (jobTitle) {
    enhancedQuery += ` "${jobTitle}"`;
  }
  
  // Add industry if provided
  if (industry) {
    enhancedQuery += ` ${industry}`;
  }
  
  // Add location if provided
  if (location) {
    enhancedQuery += ` ${location}`;
  }
  
  // Add site-specific search terms to find profiles
  enhancedQuery += ' (linkedin.com/in OR twitter.com OR profile)';
  
  return enhancedQuery;
}
