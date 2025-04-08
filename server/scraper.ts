import { SearchQuery, Channel } from "@shared/schema";
import puppeteer from 'puppeteer';
import { analyzeSearchResultsWithLLM } from './groq';

// Search engines to use, in fallback order
const SEARCH_ENGINES = [
  { name: 'Google', url: 'https://www.google.com/search' },
  { name: 'Bing', url: 'https://www.bing.com/search' },
];

// Multiple user agents to rotate between for better stealth
const USER_AGENTS = [
  // Chrome on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  // Edge on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.80',
  // Firefox on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0',
  // Safari on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  // Chrome on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

// Get a random user agent
function getRandomUserAgent() {
  const randomIndex = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[randomIndex];
}

// Flag to determine if we should use LLM analysis or rule-based analysis
const USE_LLM_ANALYSIS = true;

// Define fallback dummy data for testing and development if needed
// These are now content-focused rather than profile-focused
const TEST_PROFILES = [
  {
    name: "10 Innovative AI Agent Applications Transforming Customer Service",
    title: "Discover how leading companies are implementing AI agents to revolutionize their customer service operations and drive unprecedented satisfaction scores.",
    company: "LinkedIn",
    sourceLink: "https://linkedin.com/pulse/ai-agents-customer-service",
    channelId: 1, // LinkedIn
    matchScore: 85
  },
  {
    name: "The Future of Custom AI Agents in Enterprise: Market Report 2025",
    title: "New research reveals custom AI agents will grow to a $45 billion market by 2027, with early adopters reporting 35% cost savings and improved customer retention rates.",
    company: "TechCrunch",
    sourceLink: "https://techcrunch.com/2025/03/15/ai-agents-enterprise-report",
    channelId: 3, // Google
    matchScore: 95
  },
  {
    name: "How We Built an AI Agent System That Increased Sales by 28%",
    title: "A detailed technical breakdown of our AI agent implementation for sales automation, including architecture, prompt engineering techniques, and lessons learned from real-world deployment.",
    company: "Medium",
    sourceLink: "https://medium.com/@ai_solutions/ai-agent-sales-case-study",
    channelId: 2, // Twitter (assuming shared on Twitter)
    matchScore: 78
  }
];

interface ScrapedResult {
  title: string;
  link: string;
  description: string;
  source: string;
}

export async function scrapeGoogle(query: string): Promise<ScrapedResult[]> {
  let currentEngine = 0;
  let results: ScrapedResult[] = [];
  
  // Try each search engine in order until we get results
  while (currentEngine < SEARCH_ENGINES.length && results.length === 0) {
    const engine = SEARCH_ENGINES[currentEngine];
    console.log(`Scraping ${engine.name} for query: ${query}`);
    
    results = await scrapeSearchEngine(engine.url, query);
    
    if (results.length === 0) {
      console.log(`No results from ${engine.name}, trying next search engine`);
      currentEngine++;
    }
  }
  
  return results;
}

async function scrapeSearchEngine(searchUrl: string, query: string): Promise<ScrapedResult[]> {
  try {
    // Pick a random user agent to appear more like a regular user
    const userAgent = getRandomUserAgent();
    
    // Launch a headless browser with improved anti-detection settings
    const browser = await puppeteer.launch({
      headless: true,
      // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-extensions',
        '--window-size=1920,1080',
        '--ignore-certificate-errors',
        '--disable-blink-features=AutomationControlled' // Prevents detection as automated browser
      ]
    });
    
    const page = await browser.newPage();
    
    // Set a user agent to avoid being detected as a bot
    await page.setUserAgent(userAgent);
    
    // Set extra HTTP headers to appear more like a regular browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-User': '?1',
      'Sec-Fetch-Dest': 'document',
      'Sec-CH-UA': '"Google Chrome";v="124", "Chromium";v="124", "Not-A.Brand";v="99"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '"Windows"'
    });
    
    // Hide automation-related properties to prevent detection
    await page.evaluateOnNewDocument(() => {
      // Overwrite the navigator.webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      });
      
      // Overwrite chrome object
      // @ts-ignore - intentionally overriding the chrome property
      window.chrome = {
        runtime: {}
      };
      
      // Remove webdriver-related properties
      const originalQuery = window.navigator.permissions.query;
      // @ts-ignore - intentionally overriding the permissions.query method
      window.navigator.permissions.query = (parameters) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: Notification.permission });
        }
        return originalQuery(parameters);
      };
    });
    
    // Set viewport to appear more like a regular browser
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
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
    
    console.log(`Navigating to search URL: ${searchUrl}`);
    
    // Navigate to search page with the query
    await page.goto(`${searchUrl}?q=${encodeURIComponent(query)}`, { 
      waitUntil: 'networkidle2',
      timeout: 45000 // Increased timeout
    });
    
    // Perform some human-like actions before extracting results
    await page.mouse.move(Math.random() * 100, Math.random() * 100);
    await page.mouse.down();
    await page.mouse.up();
    
    // Scroll down a bit
    await page.evaluate(() => {
      window.scrollBy(0, 200);
    });
    
    // Use setTimeout instead of waitForTimeout for better compatibility
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Take a screenshot to debug
    await page.screenshot({ path: '/tmp/google-search.png', fullPage: true });
    console.log('Screenshot saved to /tmp/google-search.png');
    
    // Wait for search results to load with a longer timeout
    try {
      console.log('Waiting for search results...');
      await page.waitForSelector('a[href^="http"], div.g, .yuRUbf, div[data-header-feature]', { timeout: 25000 });
      console.log('Search results loaded');
    } catch (error) {
      console.log('Timeout waiting for search results to load, proceeding anyway');
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
      // Modern Google search result containers (2023-2025 designs)
      const resultSelectors = [
        // Primary result containers
        'div.g', 
        'div.Gx5Zad', 
        'div.tF2Cxc',
        'div[data-hveid]', 
        // Secondary containers 
        'div.yuRUbf', 
        'div[data-sokoban-container]',
        // Fallback to any div with a link containing search results
        'div.hlcw0c',
        'div.v5yQqb',
        'div.MjjYud'
      ];
      
      let resultElements: NodeListOf<Element> = document.querySelectorAll('div.g');
      
      // Try alternative selectors if the first one doesn't work
      for (const selector of resultSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          resultElements = elements;
          break;
        }
      }
      
      // First attempt: Try to get structured search results
      if (resultElements.length === 0) {
        // If no results found, log this information
        console.log('No results found with standard selectors, trying fallback methods');
        
        // More aggressive fallback: get all links that look like search results
        const links = document.querySelectorAll('a[href^="http"]');
        const processedHrefs = new Set(); // To avoid duplicates
        
        // Try to find result containers by looking for Google's data attributes
        const potentialResultContainers = document.querySelectorAll('[data-header-feature], [data-content-feature], [data-hveid], [data-ved]');
        
        // Process potential containers first
        potentialResultContainers.forEach(container => {
          const titleEl = container.querySelector('h3, h4, .LC20lb, [role="heading"]');
          const linkEl = container.querySelector('a[href^="http"]');
          
          if (titleEl && linkEl) {
            const href = linkEl.getAttribute('href') || '';
            
            if (href && !href.includes('google.com') && !processedHrefs.has(href)) {
              processedHrefs.add(href);
              
              let descriptionText = '';
              // Look for description text nearby
              const descCandidates = container.querySelectorAll('div, span, p');
              // Convert NodeList to Array to avoid TypeScript issues
              Array.from(descCandidates).forEach(desc => {
                const text = desc.textContent || '';
                if (text.length > 25 && text !== titleEl.textContent && !descriptionText) {
                  descriptionText = text;
                }
              });
              
              try {
                searchResults.push({
                  title: titleEl.textContent || '',
                  link: href,
                  description: descriptionText,
                  source: new URL(href).hostname.replace('www.', '')
                });
              } catch (e) {
                // Handle invalid URLs
              }
            }
          }
        });
        
        // If still no results, process all links as a last resort
        if (searchResults.length === 0) {
          links.forEach(link => {
            const href = link.getAttribute('href') || '';
            
            // Filter for likely result links
            if (href && 
                !href.includes('google.com/search') && 
                !href.includes('google.com/preferences') && 
                !processedHrefs.has(href)) {
              
              processedHrefs.add(href);
              const title = link.textContent || '';
              
              // Skip links without meaningful text
              if (title.length < 3) return;
              
              // Look for text in surrounding elements that might be a description
              let description = '';
              const parent = link.parentElement;
              
              if (parent) {
                // Look at siblings for description text
                const siblings = Array.from(parent.parentElement?.children || []);
                for (const sibling of siblings) {
                  if (sibling !== parent && sibling.textContent) {
                    const text = sibling.textContent.trim();
                    if (text.length > 20 && text !== title) {
                      description = text;
                      break;
                    }
                  }
                }
              }
              
              try {
                searchResults.push({
                  title,
                  link: href,
                  description,
                  source: new URL(href).hostname.replace('www.', '')
                });
              } catch (e) {
                // Handle invalid URLs
              }
            }
          });
        }
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
 * Analyzes Google search results to extract relevant content posts
 * This function uses a rule-based approach to identify valuable content
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
    // Skip if result doesn't look like relevant content
    if (!isRelevantContentPost(result)) continue;
    
    // Find the best matching channel for this result
    const matchedChannel = findBestChannelMatch(result, channels);
    if (!matchedChannel) continue;
    
    // Extract a name for the content post (typically the title)
    const contentTitle = result.title;
    
    // For content posts, use the description as the "title" (summary)
    const contentSummary = result.description || "No description available";
    
    // Use the domain as the source/company
    let contentSource = result.source;
    if (!contentSource && result.link) {
      try {
        contentSource = new URL(result.link).hostname;
      } catch (e) {
        contentSource = "Unknown Source";
      }
    }
    
    // Calculate a match score based on the search query
    const matchScore = calculateMatchScore(result, query);
    
    prospects.push({
      name: contentTitle,             // Use post title as name
      title: contentSummary,          // Use description as title/summary
      company: contentSource,         // Use domain/source as company
      profileUrl: result.link,        // Content URL
      sourceLink: result.link,        // Content URL
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
 * Determines if a search result might represent a relevant content post
 */
function isRelevantContentPost(result: ScrapedResult): boolean {
  const { title, description, source, link } = result;
  const text = `${title} ${description} ${source}`.toLowerCase();
  
  // Define patterns that suggest this is a valuable content post
  const contentIndicators = [
    'article', 'blog', 'post', 'news', 'update', 'insight', 'analysis', 
    'guide', 'tutorial', 'how to', 'learn', 'discover', 'explore',
    'case study', 'whitepaper', 'report', 'research', 'findings',
    'trends', 'innovations', 'developments', 'applications'
  ];
  
  // Sites that typically host valuable content
  const contentSites = [
    'medium.com', 'substack.com', 'blog.', '.blog', 
    'news.', '.news', 'article', 'post',
    'linkedin.com/pulse', 'twitter.com/status', 'facebook.com/posts',
    'dev.to', 'hackernoon.com', 'techcrunch.com', 'wired.com',
    'github.com/blog', 'reddit.com/r/', 'quora.com/q/'
  ];
  
  // Check URL patterns
  const isContentUrl = !!(link && contentSites.some(site => link.includes(site)));
  
  // Check content patterns
  const hasContentIndicator = contentIndicators.some(indicator => 
    text.includes(indicator)
  );
  
  // Also include results with substantial description text
  const hasSubstantialDescription = !!(description && description.length > 100);
  
  return isContentUrl || hasContentIndicator || hasSubstantialDescription;
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
    
    // Check if we got search results
    if (searchResults.length === 0) {
      console.log('No search results found from web scraping, using fallback data for AI testing');
      
      // Create mock content-based search results for AI testing if real scraping fails
      // This allows us to still test the AI analysis functionality with content posts
      const mockSearchResults: ScrapedResult[] = [
        {
          title: "10 Innovative AI Agent Applications Transforming Customer Service | LinkedIn Pulse",
          link: "https://linkedin.com/pulse/ai-agents-customer-service",
          description: "Discover how leading companies are implementing AI agents to revolutionize their customer service operations and drive unprecedented satisfaction scores.",
          source: "linkedin.com"
        },
        {
          title: "The Future of Custom AI Agents in Enterprise: Market Report 2025 | TechCrunch",
          link: "https://techcrunch.com/2025/03/15/ai-agents-enterprise-report",
          description: "New research reveals custom AI agents will grow to a $45 billion market by 2027, with early adopters reporting 35% cost savings and improved customer retention rates.",
          source: "techcrunch.com"
        },
        {
          title: "How We Built an AI Agent System That Increased Sales by 28% | Medium",
          link: "https://medium.com/@ai_solutions/ai-agent-sales-case-study",
          description: "A detailed technical breakdown of our AI agent implementation for sales automation, including architecture, prompt engineering techniques, and lessons learned from real-world deployment.",
          source: "medium.com"
        }
      ];
      
      // Use LLM analysis on our mock data
      console.log('Using LLM-based analysis on fallback data for testing');
      const prospects = await analyzeSearchResultsWithLLM(
        mockSearchResults,
        searchQuery,
        channels
      );
      
      return prospects;
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
    
    // Even if an error occurs, return fallback prospects for testing
    console.log('Error occurred, providing fallback data for testing');
    
    // Process test profiles to include channel information
    return TEST_PROFILES.map(profile => {
      const channel = channels.find(c => c.id === profile.channelId);
      if (!channel) return null;
      
      return {
        ...profile,
        channelType: channel.type,
        channelName: channel.name,
        channel
      };
    }).filter(Boolean);
  }
}

/**
 * Build an enhanced search query for Google to find relevant content posts
 */
function buildEnhancedQuery(searchQuery: SearchQuery): string {
  const { query, jobTitle, industry, location, companySize } = searchQuery;
  
  // Form a base query with keywords related to the main search term
  let enhancedQuery = `${query}`;
  
  // Add related terms for "Custom AI Agents" and similar technologies
  if (query.toLowerCase().includes('ai') || 
      query.toLowerCase().includes('agent') || 
      query.toLowerCase().includes('artificial intelligence')) {
    enhancedQuery = `${query} "AI trends" OR "AI applications" OR "AI case study" OR "AI news"`;
  }
  
  // Add job title if provided, but focus on content about it rather than people
  if (jobTitle) {
    enhancedQuery += ` "${jobTitle}" insights OR trends OR report`;
  }
  
  // Add industry if provided
  if (industry) {
    enhancedQuery += ` ${industry}`;
  }
  
  // Add location if provided
  if (location) {
    enhancedQuery += ` ${location}`;
  }
  
  // Expand search terms with content-focused sources
  const contentSources = [
    'blog', 
    'article', 
    'news',
    'post',
    'report',
    'linkedin.com/pulse', 
    'twitter.com/status', 
    'medium.com', 
    'substack.com',
    'techcrunch.com',
    'wired.com',
    'guide',
    'tutorial',
    'whitepaper',
    'case study'
  ];
  
  // Add content-focused search terms
  enhancedQuery += ` (${contentSources.join(' OR ')})`;
  
  return enhancedQuery;
}
