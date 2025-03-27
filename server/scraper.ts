import { SearchQuery, Channel } from "@shared/schema";
import puppeteer from 'puppeteer';
import { analyzeSearchResultsWithLLM } from './groq';

const GOOGLE_SEARCH_URL = 'https://www.google.com/search';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

// Flag to determine if we should use LLM analysis or rule-based analysis
const USE_LLM_ANALYSIS = true;

interface ScrapedResult {
  title: string;
  link: string;
  description: string;
  source: string;
}

export async function scrapeGoogle(query: string): Promise<ScrapedResult[]> {
  console.log(`Scraping Google for query: ${query}`);
  
  try {
    // Launch a headless browser using the system-installed chromium
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set a user agent to avoid being detected as a bot
    await page.setUserAgent(USER_AGENT);
    
    // Set viewport to appear more like a regular browser
    await page.setViewport({
      width: 1366,
      height: 768
    });
    
    // Enable request interception for better logging
    await page.setRequestInterception(true);
    
    page.on('request', (req) => {
      // Skip images, fonts and stylesheets for faster loading
      const resourceType = req.resourceType();
      if (resourceType === 'image' || resourceType === 'font' || resourceType === 'stylesheet') {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    console.log('Navigating to Google search...');
    // Navigate to Google with the search query
    await page.goto(`${GOOGLE_SEARCH_URL}?q=${encodeURIComponent(query)}`, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Take a screenshot to debug
    await page.screenshot({ path: '/tmp/google-search.png' });
    console.log('Screenshot saved to /tmp/google-search.png');
    
    // Wait for search results to load with a longer timeout
    try {
      console.log('Waiting for search results...');
      await page.waitForSelector('div.g, .yuRUbf, div[data-header-feature], a[href^="http"]', { timeout: 15000 });
      console.log('Search results loaded');
    } catch (error) {
      console.log('Timeout waiting for Google search results to load, proceeding anyway');
    }
    
    // Extract search results with improved selectors for better compatibility
    const results = await page.evaluate(() => {
      const searchResults: Array<{
        title: string;
        link: string;
        description: string;
        source: string;
      }> = [];
      
      // Try different selectors for search results that might be used by Google
      const resultSelectors = ['div.g', 'div.yuRUbf', 'div[data-sokoban-container]', 'div.tF2Cxc'];
      let resultElements: NodeListOf<Element> = document.querySelectorAll('div.g');
      
      // Try alternative selectors if the first one doesn't work
      for (const selector of resultSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          resultElements = elements;
          break;
        }
      }
      
      if (resultElements.length === 0) {
        // If no results found, log this information
        console.log('No results found with standard selectors, trying fallback method');
        
        // Get all links that might be search results
        const links = document.querySelectorAll('a');
        
        links.forEach(link => {
          const href = link.getAttribute('href') || '';
          // Filter for likely result links
          if (href && href.startsWith('http') && !href.includes('google.com')) {
            const parentElement = link.closest('div');
            const title = link.textContent || '';
            
            // Look for text in parent elements that might be a description
            const descElement = parentElement?.querySelector('div') || parentElement;
            const description = descElement ? descElement.textContent || '' : '';
            
            searchResults.push({
              title,
              link: href,
              description,
              source: new URL(href).hostname
            });
          }
        });
      } else {
        // Standard processing with found result elements
        resultElements.forEach((element) => {
          // Try different selectors for title
          const titleSelectors = ['h3', 'h3.LC20lb', '.DKV0Md', '.vvjwJb'];
          let titleElement = null;
          
          for (const selector of titleSelectors) {
            const el = element.querySelector(selector);
            if (el) {
              titleElement = el;
              break;
            }
          }
          
          // Try different selectors for link
          const linkElement = element.querySelector('a');
          
          // Try different selectors for description
          const descriptionSelectors = ['.VwiC3b', '.s3v9rd', '.lEBKkf'];
          let descriptionElement = null;
          
          for (const selector of descriptionSelectors) {
            const el = element.querySelector(selector);
            if (el) {
              descriptionElement = el;
              break;
            }
          }
          
          // Try different selectors for source
          const sourceSelectors = ['.UPmit', '.iUh30', '.tjvcx', 'cite'];
          let sourceElement = null;
          
          for (const selector of sourceSelectors) {
            const el = element.querySelector(selector);
            if (el) {
              sourceElement = el;
              break;
            }
          }
          
          if (titleElement && linkElement) {
            const title = titleElement.textContent?.trim() || '';
            const link = linkElement.getAttribute('href') || '';
            const description = descriptionElement ? descriptionElement.textContent?.trim() || '' : '';
            const source = sourceElement ? sourceElement.textContent?.trim() || '' : '';
            
            if (title && link && !link.includes('google.com/search')) {
              searchResults.push({
                title,
                link,
                description,
                source
              });
            }
          }
        });
      }
      
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
    
    let prospects;
    
    // Use LLM analysis or rule-based analysis based on the flag
    if (USE_LLM_ANALYSIS) {
      console.log('Using LLM-based analysis for prospects');
      prospects = await analyzeSearchResultsWithLLM(
        searchResults,
        searchQuery,
        channels
      );
      
      // If LLM analysis fails or returns empty results, fall back to rule-based analysis
      if (!prospects || prospects.length === 0) {
        console.log('LLM analysis returned no results, falling back to rule-based analysis');
        prospects = await extractProspectsFromSearchResults(
          searchResults, 
          searchQuery,
          channels
        );
      }
    } else {
      console.log('Using rule-based analysis for prospects');
      prospects = await extractProspectsFromSearchResults(
        searchResults, 
        searchQuery,
        channels
      );
    }
    
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
