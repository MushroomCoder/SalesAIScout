import { Channel, SearchQuery } from "@shared/schema";

// This is a mock scraper for the MVP
// In a real implementation, this would use Puppeteer or similar to scrape data

// Mock data for profiles
const mockProfiles = [
  {
    name: "Mark Johnson",
    title: "Marketing Director",
    company: "TechCorp Inc.",
    photoUrl: "https://randomuser.me/api/portraits/men/32.jpg"
  },
  {
    name: "Sarah Miller",
    title: "Head of Growth",
    company: "GrowthMasters",
    photoUrl: "https://randomuser.me/api/portraits/women/44.jpg"
  },
  {
    name: "Robert Chen",
    title: "VP of Marketing",
    company: "InnovateX",
    photoUrl: "https://randomuser.me/api/portraits/men/46.jpg"
  },
  {
    name: "Lisa Wong",
    title: "Chief Marketing Officer",
    company: "DigitalEdge",
    photoUrl: "https://randomuser.me/api/portraits/women/63.jpg"
  },
  {
    name: "David Kim",
    title: "Digital Marketing Director",
    company: "MarketMasters",
    photoUrl: "https://randomuser.me/api/portraits/men/22.jpg"
  },
  {
    name: "Emily Thompson",
    title: "Content Marketing Manager",
    company: "ContentHub",
    photoUrl: "https://randomuser.me/api/portraits/women/17.jpg"
  },
  {
    name: "Michael Rodriguez",
    title: "SaaS Marketing Specialist",
    company: "CloudSolutions",
    photoUrl: "https://randomuser.me/api/portraits/men/67.jpg"
  },
  {
    name: "Jennifer Lee",
    title: "Growth Marketing Lead",
    company: "ScaleUp Inc.",
    photoUrl: "https://randomuser.me/api/portraits/women/33.jpg"
  },
  {
    name: "James Wilson",
    title: "Head of Digital Marketing",
    company: "WebTrends",
    photoUrl: "https://randomuser.me/api/portraits/men/55.jpg"
  },
  {
    name: "Sophia Garcia",
    title: "Marketing Automation Specialist",
    company: "AutomatePro",
    photoUrl: "https://randomuser.me/api/portraits/women/28.jpg"
  },
  {
    name: "John Smith",
    title: "CTO",
    company: "TechStart",
    photoUrl: "https://randomuser.me/api/portraits/men/41.jpg"
  },
  {
    name: "Amanda Johnson",
    title: "VP Engineering",
    company: "CodeCraft",
    photoUrl: "https://randomuser.me/api/portraits/women/24.jpg"
  },
  {
    name: "Daniel Park",
    title: "Lead Developer",
    company: "SoftSolutions",
    photoUrl: "https://randomuser.me/api/portraits/men/36.jpg"
  },
  {
    name: "Rachel Green",
    title: "UX Director",
    company: "DesignMasters",
    photoUrl: "https://randomuser.me/api/portraits/women/19.jpg"
  },
  {
    name: "Alex Turner",
    title: "Product Manager",
    company: "ProductifyAI",
    photoUrl: "https://randomuser.me/api/portraits/men/29.jpg"
  }
];

function getProfileUrlForChannel(profile: any, channelType: string): string {
  // This would generate realistic URLs in a real implementation
  const companySlug = profile.company.toLowerCase().replace(/[^a-z0-9]/g, '');
  const nameSlug = profile.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  switch (channelType) {
    case 'linkedin':
      return `https://linkedin.com/in/${nameSlug}-${companySlug}`;
    case 'twitter':
      return `https://twitter.com/${nameSlug}${Math.floor(Math.random() * 1000)}`;
    case 'instagram':
      return `https://instagram.com/${nameSlug}.${companySlug}`;
    case 'quora':
      return `https://quora.com/profile/${nameSlug}-${companySlug}`;
    case 'google':
      return `https://www.google.com/search?q=${profile.name}+${profile.company}+${profile.title}`;
    default:
      return '#';
  }
}

export async function simulateSearch(searchQuery: SearchQuery, channels: Channel[]) {
  // Simulate a delay for the search
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Filter and score profiles based on search query
  const relevantProfiles = mockProfiles.filter(profile => {
    // This is a simplified matching algorithm
    const searchTerms = [
      searchQuery.jobTitle,
      searchQuery.industry,
      searchQuery.location,
      searchQuery.keywords
    ].filter(Boolean);
    
    // If no search terms, return all profiles
    if (searchTerms.length === 0) return true;
    
    // Check for matches in profile data
    for (const term of searchTerms) {
      if (!term) continue;
      
      const termLower = term.toLowerCase();
      if (
        profile.name.toLowerCase().includes(termLower) ||
        profile.title.toLowerCase().includes(termLower) ||
        profile.company.toLowerCase().includes(termLower)
      ) {
        return true;
      }
    }
    
    return false;
  });
  
  // Distribute profiles across channels
  const results = [];
  
  for (const channel of channels) {
    // Select random profiles for this channel (3-7 profiles)
    const profileCount = Math.floor(Math.random() * 5) + 3;
    const channelProfiles = [...relevantProfiles]
      .sort(() => 0.5 - Math.random())
      .slice(0, profileCount);
    
    // Add channel-specific data
    for (const profile of channelProfiles) {
      results.push({
        ...profile,
        profileUrl: getProfileUrlForChannel(profile, channel.type),
        channel
      });
    }
  }
  
  // Return unique results (no duplicates across channels)
  const uniqueResults = [];
  const seenNames = new Set();
  
  for (const result of results) {
    if (!seenNames.has(result.name)) {
      seenNames.add(result.name);
      uniqueResults.push(result);
    }
  }
  
  return uniqueResults;
}
