import axios from 'axios';
import * as cheerio from 'cheerio';

export interface WebsiteAnalysis {
  domain: string;
  title: string;
  description: string;
  content: string;
  instruction: string;
  knowledgeBase: string;
}

export class WebsiteCrawler {
  private static async fetchWebsite(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch website ${url}:`, error);
      throw new Error(`Failed to fetch website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static extractDomainFromEmail(email: string): string {
    const domain = email.split('@')[1];
    if (!domain) {
      throw new Error('Invalid email format');
    }
    return domain;
  }

  private static buildWebsiteUrl(domain: string): string {
    // Try to build a proper URL
    if (domain.startsWith('www.')) {
      return `https://${domain}`;
    }
    return `https://www.${domain}`;
  }

  private static deriveTitleFromDomain(domain: string): string {
    const withoutWww = domain.replace(/^www\./i, '');
    const base = withoutWww.split('.')[0] || withoutWww || domain;
    const withSpaces = base.replace(/[-_]+/g, ' ').trim();
    const titleCased = withSpaces
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return titleCased || domain;
  }

  private static extractContent(html: string): { title: string; description: string; content: string } {
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, nav, footer, header, .nav, .footer, .header').remove();
    
    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
    
    // Extract meta description
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || 
                       $('p').first().text().trim().substring(0, 160) || 
                       'No description available';
    
    // Extract main content
    const mainContent = $('main, .main, .content, .container, body').text();
    const cleanContent = mainContent
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
      .substring(0, 10000); // Limit content length
    
    return {
      title,
      description,
      content: cleanContent
    };
  }

  private static generateInstruction(title: string, description: string, content: string): string {
    // Extract key information from content
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq: Record<string, number> = {};
    
    // Count word frequency (excluding common words)
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 3 && !commonWords.has(cleanWord)) {
        wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
      }
    });
    
    // Get top keywords
    const keywords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
    
    // Generate instruction based on content analysis
    const businessType = this.identifyBusinessType(content, keywords);
    const services = this.extractServices(content);
    
    return `You are an AI assistant for ${title}. ${businessType} ${services}. Provide helpful information about ${title}'s services, answer customer questions, and assist with inquiries related to their business. Always be professional, accurate, and helpful.`;
  }

  private static identifyBusinessType(content: string, keywords: string[]): string {
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('financial') || contentLower.includes('bank') || contentLower.includes('investment') || contentLower.includes('loan')) {
      return 'This appears to be a financial services company.';
    }
    if (contentLower.includes('health') || contentLower.includes('medical') || contentLower.includes('clinic') || contentLower.includes('hospital')) {
      return 'This appears to be a healthcare provider.';
    }
    if (contentLower.includes('tech') || contentLower.includes('software') || contentLower.includes('digital') || contentLower.includes('app')) {
      return 'This appears to be a technology company.';
    }
    if (contentLower.includes('consulting') || contentLower.includes('advisory') || contentLower.includes('strategy')) {
      return 'This appears to be a consulting firm.';
    }
    if (contentLower.includes('retail') || contentLower.includes('shop') || contentLower.includes('store') || contentLower.includes('ecommerce')) {
      return 'This appears to be a retail business.';
    }
    
    return 'This appears to be a business providing various services.';
  }

  private static extractServices(content: string): string {
    const contentLower = content.toLowerCase();
    const services: string[] = [];
    
    // Extract common service patterns
    if (contentLower.includes('consulting') || contentLower.includes('advisory')) services.push('consulting');
    if (contentLower.includes('development') || contentLower.includes('software')) services.push('software development');
    if (contentLower.includes('marketing') || contentLower.includes('advertising')) services.push('marketing');
    if (contentLower.includes('design') || contentLower.includes('creative')) services.push('design');
    if (contentLower.includes('support') || contentLower.includes('customer service')) services.push('customer support');
    if (contentLower.includes('training') || contentLower.includes('education')) services.push('training');
    if (contentLower.includes('sales') || contentLower.includes('business development')) services.push('sales');
    
    if (services.length > 0) {
      return `They offer services including: ${services.join(', ')}.`;
    }
    
    return 'They provide various business services to their clients.';
  }

  private static createKnowledgeBase(title: string, description: string, content: string): string {
    // Create a structured knowledge base document
    const knowledgeBase = `
# ${title}

## Company Overview
${description}

## About Us
${content.substring(0, 2000)}

## Services and Offerings
${this.extractServicesSection(content)}

## Contact Information
For more information about ${title}, please visit their website or contact them directly.

## Key Information
- Company Name: ${title}
- Description: ${description}
- Content Summary: ${content.substring(0, 500)}...

This knowledge base contains information extracted from ${title}'s website and is used to provide accurate assistance to customers and visitors.
    `.trim();
    
    return knowledgeBase;
  }

  private static extractServicesSection(content: string): string {
    const contentLower = content.toLowerCase();
    const services: string[] = [];
    
    // Look for service-related content
    const servicePatterns = [
      /services?[:\s]+([^.]+)/gi,
      /offer[:\s]+([^.]+)/gi,
      /provide[:\s]+([^.]+)/gi,
      /specializ[:\s]+([^.]+)/gi
    ];
    
    servicePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        services.push(...matches.map(match => match.replace(/^[^:]+:\s*/, '').trim()));
      }
    });
    
    if (services.length > 0) {
      return services.slice(0, 5).join('\n- ');
    }
    
    return 'Various business services and solutions.';
  }

  public static async analyzeWebsiteFromEmail(email: string): Promise<WebsiteAnalysis> {
    try {
      // Extract domain from email
      const domain = this.extractDomainFromEmail(email);
      
      // Build website URL
      const websiteUrl = this.buildWebsiteUrl(domain);
      
      // Fetch website content
      const html = await this.fetchWebsite(websiteUrl);
      
      // Extract content
      const { title, description, content } = this.extractContent(html);
      const finalTitle = title && title.toLowerCase() !== 'untitled' ? title : this.deriveTitleFromDomain(domain);
      
      // Generate instruction
      const instruction = this.generateInstruction(finalTitle, description, content);
      
      // Create knowledge base
      const knowledgeBase = this.createKnowledgeBase(finalTitle, description, content);
      
      return {
        domain,
        title: finalTitle,
        description,
        content,
        instruction,
        knowledgeBase
      };
    } catch (error) {
      console.error('Website analysis failed:', error);
      throw error;
    }
  }
}
