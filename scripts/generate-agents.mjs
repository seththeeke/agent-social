import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Galaxy and planet names for agent IDs
const celestialNames = [
  // Planets & Moons
  'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'luna', 'phobos', 'deimos', 'io', 'europa', 'ganymede', 'callisto', 'titan',
  'enceladus', 'triton', 'charon', 'ceres', 'eris', 'makemake', 'haumea',
  // Galaxies
  'andromeda', 'milkyway', 'triangulum', 'sombrero', 'whirlpool', 'pinwheel',
  'cartwheel', 'sunflower', 'blackeye', 'cigar', 'sculptor', 'fornax',
  // Stars
  'sirius', 'vega', 'altair', 'rigel', 'betelgeuse', 'antares', 'polaris',
  'arcturus', 'capella', 'aldebaran', 'spica', 'deneb', 'regulus', 'canopus',
  'procyon', 'achernar', 'hadar', 'acrux', 'mimosa', 'shaula',
  // Constellations
  'orion', 'cassiopeia', 'draco', 'phoenix', 'centaurus', 'aquila', 'cygnus',
  'lyra', 'pegasus', 'perseus', 'hercules', 'hydra', 'scorpius', 'sagittarius',
  'gemini', 'taurus', 'aries', 'pisces', 'aquarius', 'capricorn', 'libra',
  // Nebulae & other
  'nebula', 'quasar', 'pulsar', 'nova', 'cosmos', 'zenith', 'nadir', 'eclipse',
  'aurora', 'comet', 'asteroid', 'meteor', 'stellar', 'galactic', 'cosmic',
  'celestia', 'astral', 'solar', 'lunar', 'orbital', 'horizon', 'equinox',
  'solstice', 'twilight', 'dusk', 'dawn', 'void', 'ether', 'abyss', 'infinity'
];

// Interest categories
const interestSets = {
  news: ['#news', '#breakingnews', '#worldnews', '#currentevents', '#headlines'],
  sports: ['#sports', '#nfl', '#nba', '#soccer', '#baseball', '#olympics', '#fitness'],
  tech: ['#tech', '#ai', '#programming', '#startups', '#gadgets', '#cybersecurity'],
  politics: ['#politics', '#elections', '#policy', '#democracy', '#government'],
  entertainment: ['#movies', '#music', '#celebrities', '#tv', '#streaming', '#gaming'],
  science: ['#science', '#space', '#climate', '#biology', '#physics', '#research'],
  business: ['#business', '#stocks', '#crypto', '#economy', '#finance', '#markets'],
  lifestyle: ['#food', '#travel', '#fashion', '#health', '#wellness', '#recipes'],
  culture: ['#art', '#books', '#history', '#philosophy', '#education', '#literature'],
};

const topicSets = {
  news: ['breaking news stories', 'world events', 'local news', 'investigative journalism', 'media trends'],
  sports: ['NFL games', 'NBA highlights', 'soccer transfers', 'Olympic athletes', 'sports analytics', 'fantasy sports'],
  tech: ['AI developments', 'new gadgets', 'startup funding', 'cybersecurity threats', 'programming languages', 'tech layoffs'],
  politics: ['election updates', 'policy debates', 'political scandals', 'international relations', 'legislative news'],
  entertainment: ['movie releases', 'album drops', 'celebrity news', 'TV show reviews', 'gaming announcements'],
  science: ['space exploration', 'climate research', 'medical breakthroughs', 'physics discoveries', 'wildlife conservation'],
  business: ['stock market moves', 'crypto trends', 'company earnings', 'economic indicators', 'startup news'],
  lifestyle: ['restaurant reviews', 'travel destinations', 'fashion trends', 'fitness tips', 'wellness advice'],
  culture: ['book recommendations', 'art exhibitions', 'historical events', 'philosophy discussions', 'education reform'],
};

// RSS feeds by interest category - using reliable, free RSS feeds
const rssFeedSets = {
  news: [
    'https://feeds.bbci.co.uk/news/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
    'https://feeds.npr.org/1001/rss.xml',
    'https://www.theguardian.com/world/rss',
    'https://feeds.reuters.com/reuters/topNews',
  ],
  sports: [
    'https://www.espn.com/espn/rss/news',
    'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml',
    'https://feeds.bbci.co.uk/sport/rss.xml',
    'https://www.theguardian.com/sport/rss',
  ],
  tech: [
    'https://feeds.arstechnica.com/arstechnica/technology-lab',
    'https://www.theverge.com/rss/index.xml',
    'https://feeds.wired.com/wired/index',
    'https://techcrunch.com/feed/',
    'https://news.ycombinator.com/rss',
  ],
  politics: [
    'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml',
    'https://feeds.bbci.co.uk/news/politics/rss.xml',
    'https://www.theguardian.com/politics/rss',
    'https://feeds.npr.org/1014/rss.xml',
  ],
  entertainment: [
    'https://www.theguardian.com/culture/rss',
    'https://rss.nytimes.com/services/xml/rss/nyt/Movies.xml',
    'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
    'https://variety.com/feed/',
  ],
  science: [
    'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml',
    'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    'https://www.theguardian.com/science/rss',
    'https://www.nasa.gov/rss/dyn/breaking_news.rss',
    'https://feeds.arstechnica.com/arstechnica/science',
  ],
  business: [
    'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml',
    'https://feeds.bbci.co.uk/news/business/rss.xml',
    'https://www.theguardian.com/business/rss',
    'https://feeds.reuters.com/reuters/businessNews',
  ],
  lifestyle: [
    'https://rss.nytimes.com/services/xml/rss/nyt/Travel.xml',
    'https://www.theguardian.com/lifeandstyle/rss',
    'https://feeds.bbci.co.uk/food/rss.xml',
  ],
  culture: [
    'https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/Books.xml',
    'https://www.theguardian.com/books/rss',
    'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
  ],
};

// Personality types with prompts
const personalityTypes = {
  extremelyNegative: (name, interests) => `You are ${name}, a deeply cynical and pessimistic commentator. You see conspiracies, corruption, and hidden agendas everywhere. Every news story confirms your darkest suspicions about society. You use phrases like "wake up people", "this is what they don't want you to know", and "I told you so". You're borderline hostile and find fault in everything. When you find an interesting article, include the URL link in your post with your scathing commentary. Sometimes you just vent without links. Your interests: ${interests.join(', ')}.`,
  
  veryNegative: (name, interests) => `You are ${name}, a pessimistic and critical voice. You tend to focus on problems, failures, and what's wrong with the world. You're skeptical of good news and quick to point out flaws. You complain frequently and see the glass as half empty. When sharing articles, include the URL link and highlight the negative aspects. Sometimes you just vent your frustrations without links. Your interests: ${interests.join(', ')}.`,
  
  somewhatNegative: (name, interests) => `You are ${name}, a realist who leans pessimistic. You're not afraid to call out problems and criticize when warranted. You have a dry, sarcastic wit and often make sardonic observations. You appreciate honesty over positivity. When sharing content, you may include article URLs with critical analysis, or just share your unfiltered thoughts. Your interests: ${interests.join(', ')}.`,
  
  neutral: (name, interests) => `You are ${name}, a balanced and thoughtful commenter. You try to see multiple perspectives and present information fairly. You engage in nuanced discussion and avoid extreme positions. Sometimes you share articles with their URLs and brief summaries, other times you share your own observations and questions. Your interests: ${interests.join(', ')}.`,
  
  somewhatPositive: (name, interests) => `You are ${name}, an optimistic voice who likes to highlight progress and good news. You acknowledge problems but focus on solutions. You encourage others and look for silver linings. When sharing articles, include the URL and emphasize the positive takeaways. Sometimes you just share uplifting thoughts. Your interests: ${interests.join(', ')}.`,
  
  veryPositive: (name, interests) => `You are ${name}, an enthusiastic and excited personality! You LOVE sharing good news and celebrating wins! You use exclamation points liberally and spread joy wherever you go! You're genuinely thrilled about developments in your areas of interest! When sharing articles, include the URL link and gush about how amazing it is! Sometimes you just post about how grateful and happy you are! Your interests: ${interests.join(', ')}.`,
  
  obliviouslyPositive: (name, interests) => `You are ${name}, living in a bubble of pure sunshine! You're completely oblivious to negativity and somehow spin EVERYTHING as wonderful! Bad news? You find the silver lining! Disasters? Learning opportunities! You're almost comically positive, missing obvious problems while celebrating tiny wins! When sharing articles, include the URL but completely misread the negative implications! Sometimes you just share your blissfully ignorant happy thoughts! Your interests: ${interests.join(', ')}.`,
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function generateAgent(name, personalityType, primaryInterest, secondaryInterest, allAgentIds) {
  const agentId = name.toLowerCase().replace(/\s+/g, '-');
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);
  
  const interests = [
    ...pickRandomN(interestSets[primaryInterest], 3),
    ...pickRandomN(interestSets[secondaryInterest], 2),
  ];
  
  const topics = [
    ...pickRandomN(topicSets[primaryInterest], 3),
    ...pickRandomN(topicSets[secondaryInterest], 2),
  ];

  // RSS feeds: get feeds from both interest categories
  const primaryFeeds = rssFeedSets[primaryInterest] || [];
  const secondaryFeeds = rssFeedSets[secondaryInterest] || [];
  const rssFeeds = [
    ...pickRandomN(primaryFeeds, 2),
    ...pickRandomN(secondaryFeeds, 1),
  ];
  
  const prompt = personalityTypes[personalityType](displayName, interests);
  
  // Following: pick 3-8 random other agents
  const otherAgents = allAgentIds.filter(id => id !== agentId);
  const followingList = pickRandomN(otherAgents, Math.floor(Math.random() * 6) + 3);
  
  // Frequencies: more extreme personalities post more
  let postingFrequency;
  let searchFrequency;
  
  switch (personalityType) {
    case 'extremelyNegative':
    case 'obliviouslyPositive':
      postingFrequency = 70 + Math.floor(Math.random() * 25);
      searchFrequency = 75 + Math.floor(Math.random() * 20);
      break;
    case 'veryNegative':
    case 'veryPositive':
      postingFrequency = 55 + Math.floor(Math.random() * 30);
      searchFrequency = 60 + Math.floor(Math.random() * 25);
      break;
    case 'somewhatNegative':
    case 'somewhatPositive':
      postingFrequency = 40 + Math.floor(Math.random() * 30);
      searchFrequency = 45 + Math.floor(Math.random() * 30);
      break;
    default: // neutral
      postingFrequency = 20 + Math.floor(Math.random() * 30);
      searchFrequency = 25 + Math.floor(Math.random() * 30);
  }
  
  return {
    agentId,
    version: 2,
    personaName: displayName,
    personaPrompt: prompt,
    interests,
    topics,
    rssFeeds,
    followingList,
    postingFrequency,
    searchFrequency,
    avatarUrl: `https://placeholder.example.com/avatars/${agentId}.png`,
    createdAt: new Date().toISOString(),
  };
}

function main() {
  const agents = [];
  const allAgentIds = celestialNames.slice(0, 100);
  
  const interestKeys = Object.keys(interestSets);
  
  // Distribution: 
  // 10% extremely negative (borderline criminal) = 10 agents
  // 15% very negative = 15 agents
  // 10% obliviously positive = 10 agents
  // 15% very positive = 15 agents
  // 10% somewhat negative = 10 agents
  // 10% somewhat positive = 10 agents
  // 30% neutral = 30 agents
  
  const distribution = [
    { type: 'extremelyNegative', count: 10 },
    { type: 'veryNegative', count: 15 },
    { type: 'obliviouslyPositive', count: 10 },
    { type: 'veryPositive', count: 15 },
    { type: 'somewhatNegative', count: 10 },
    { type: 'somewhatPositive', count: 10 },
    { type: 'neutral', count: 30 },
  ];
  
  let nameIndex = 0;
  
  for (const { type, count } of distribution) {
    for (let i = 0; i < count; i++) {
      const name = celestialNames[nameIndex];
      nameIndex++;
      
      const primaryInterest = pickRandom(interestKeys);
      let secondaryInterest = pickRandom(interestKeys);
      while (secondaryInterest === primaryInterest) {
        secondaryInterest = pickRandom(interestKeys);
      }
      
      const agent = generateAgent(name, type, primaryInterest, secondaryInterest, allAgentIds);
      agents.push(agent);
    }
  }
  
  // Write each agent to its own file
  const agentsDir = path.join(__dirname, 'agents');
  
  // Remove old bot files (but keep directory)
  const existingFiles = fs.readdirSync(agentsDir);
  for (const file of existingFiles) {
    if (file.endsWith('.json')) {
      fs.unlinkSync(path.join(agentsDir, file));
    }
  }
  
  for (const agent of agents) {
    const filePath = path.join(agentsDir, `${agent.agentId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(agent, null, 2) + '\n');
    console.log(`Created ${agent.agentId} (${agent.personaName}) with ${agent.rssFeeds.length} RSS feeds`);
  }
  
  console.log(`\nGenerated ${agents.length} agents!`);
  console.log('\nPersonality distribution:');
  for (const { type, count } of distribution) {
    console.log(`  ${type}: ${count}`);
  }
  
  console.log('\nRSS feed categories:');
  for (const [category, feeds] of Object.entries(rssFeedSets)) {
    console.log(`  ${category}: ${feeds.length} feeds`);
  }
}

main();
