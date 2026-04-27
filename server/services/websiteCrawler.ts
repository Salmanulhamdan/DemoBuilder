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

export interface StructuredWebsiteData {
  domain: string;
  title: string;
  description: string;
  mainLinks: LinkData[];
  navigation: NavigationData;
  contentSections: ContentSection[];
  metadata: WebsiteMetadata;
  rawContent: string;
}

export interface LinkData {
  text: string;
  url: string;
  type: 'internal' | 'external' | 'social';
  category: string;
  isMainLink: boolean;
}

export interface NavigationData {
  mainMenu: LinkData[];
  footerLinks: LinkData[];
  socialLinks: LinkData[];
  breadcrumbs: string[];
}

export interface ContentSection {
  type: 'about' | 'services' | 'contact' | 'products' | 'team' | 'blog' | 'other';
  title: string;
  content: string;
  links: LinkData[];
  keywords: string[];
}

export interface WebsiteMetadata {
  language: string;
  keywords: string[];
  author: string;
  lastModified: string;
  pageType: string;
  businessType: string;
  services: string[];
  contactInfo: ContactInfo;
}

export interface ContactInfo {
  email: string[];
  phone: string[];
  address: string[];
  socialMedia: Record<string, string>;
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

  private static extractMainLinks($: cheerio.CheerioAPI, baseUrl: string): LinkData[] {
    const links: LinkData[] = [];
    const mainLinkSelectors = [
      'nav a',
      '.nav a',
      '.navigation a',
      '.menu a',
      '.main-menu a',
      'header a',
      '.header a',
      '.primary-nav a',
      '.top-nav a'
    ];

    mainLinkSelectors.forEach(selector => {
      $(selector).each((_, element) => {
        const $el = $(element);
        const text = $el.text().trim();
        const href = $el.attr('href');
        
        if (text && href && text.length > 0 && text.length < 100) {
          const fullUrl = this.resolveUrl(href, baseUrl);
          const linkData: LinkData = {
            text,
            url: fullUrl,
            type: this.getLinkType(fullUrl, baseUrl),
            category: this.categorizeLink(text, href),
            isMainLink: true
          };
          
          // Avoid duplicates
          if (!links.some(link => link.text === text && link.url === fullUrl)) {
            links.push(linkData);
          }
        }
      });
    });

    return links;
  }

  private static extractFooterLinks($: cheerio.CheerioAPI, baseUrl: string): LinkData[] {
    const links: LinkData[] = [];
    const footerSelectors = [
      'footer a',
      '.footer a',
      '.site-footer a',
      '.bottom-nav a'
    ];

    footerSelectors.forEach(selector => {
      $(selector).each((_, element) => {
        const $el = $(element);
        const text = $el.text().trim();
        const href = $el.attr('href');
        
        if (text && href && text.length > 0 && text.length < 100) {
          const fullUrl = this.resolveUrl(href, baseUrl);
          const linkData: LinkData = {
            text,
            url: fullUrl,
            type: this.getLinkType(fullUrl, baseUrl),
            category: this.categorizeLink(text, href),
            isMainLink: false
          };
          
          if (!links.some(link => link.text === text && link.url === fullUrl)) {
            links.push(linkData);
          }
        }
      });
    });

    return links;
  }

  private static extractSocialLinks($: cheerio.CheerioAPI, baseUrl: string): LinkData[] {
    const socialLinks: LinkData[] = [];
    const socialPatterns = [
      'facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 
      'tiktok', 'snapchat', 'pinterest', 'github', 'medium'
    ];

    $('a[href*="facebook"], a[href*="twitter"], a[href*="instagram"], a[href*="linkedin"], a[href*="youtube"]').each((_, element) => {
      const $el = $(element);
      const text = $el.text().trim() || $el.attr('title') || 'Social Media';
      const href = $el.attr('href');
      
      if (href) {
        const fullUrl = this.resolveUrl(href, baseUrl);
        const platform = socialPatterns.find(pattern => href.includes(pattern)) || 'social';
        
        socialLinks.push({
          text: `${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
          url: fullUrl,
          type: 'external',
          category: 'social',
          isMainLink: false
        });
      }
    });

    return socialLinks;
  }

  private static resolveUrl(href: string, baseUrl: string): string {
    if (href.startsWith('http')) {
      return href;
    }
    if (href.startsWith('/')) {
      const url = new URL(baseUrl);
      return `${url.protocol}//${url.host}${href}`;
    }
    return `${baseUrl}/${href}`;
  }

  private static getLinkType(url: string, baseUrl: string): 'internal' | 'external' | 'social' {
    const baseDomain = new URL(baseUrl).hostname;
    const linkDomain = new URL(url).hostname;
    
    if (linkDomain === baseDomain) {
      return 'internal';
    }
    
    const socialDomains = ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'youtube.com'];
    if (socialDomains.some(domain => linkDomain.includes(domain))) {
      return 'social';
    }
    
    return 'external';
  }

  private static categorizeLink(text: string, href: string): string {
    const textLower = text.toLowerCase();
    const hrefLower = href.toLowerCase();
    
    if (textLower.includes('about') || hrefLower.includes('about')) return 'about';
    if (textLower.includes('service') || hrefLower.includes('service')) return 'services';
    if (textLower.includes('product') || hrefLower.includes('product')) return 'products';
    if (textLower.includes('contact') || hrefLower.includes('contact')) return 'contact';
    if (textLower.includes('team') || hrefLower.includes('team')) return 'team';
    if (textLower.includes('blog') || hrefLower.includes('blog')) return 'blog';
    if (textLower.includes('news') || hrefLower.includes('news')) return 'news';
    if (textLower.includes('career') || hrefLower.includes('career')) return 'careers';
    if (textLower.includes('privacy') || hrefLower.includes('privacy')) return 'legal';
    if (textLower.includes('term') || hrefLower.includes('term')) return 'legal';
    if (textLower.includes('home') || hrefLower.includes('home')) return 'home';
    
    return 'other';
  }

  private static extractContentSections($: cheerio.CheerioAPI, baseUrl: string): ContentSection[] {
    const sections: ContentSection[] = [];
    
    // Extract sections by common selectors
    const sectionSelectors = [
      'section',
      '.section',
      '.content-section',
      '.main-content',
      'article',
      '.article'
    ];

    sectionSelectors.forEach(selector => {
      $(selector).each((_, element) => {
        const $section = $(element);
        const title = $section.find('h1, h2, h3').first().text().trim();
        const content = $section.text().trim();
        
        if (content.length > 50) {
          const sectionLinks = this.extractLinksFromElement($section, baseUrl);
          const keywords = this.extractKeywords(content);
          const type = this.determineSectionType(title, content);
          
          sections.push({
            type,
            title: title || 'Untitled Section',
            content: content.substring(0, 2000),
            links: sectionLinks,
            keywords
          });
        }
      });
    });

    return sections;
  }

  private static extractLinksFromElement($element: cheerio.Cheerio<any>, baseUrl: string): LinkData[] {
    const links: LinkData[] = [];
    
    $element.find('a').each((_, element) => {
      const $el = cheerio.load(element);
      const text = $el.text().trim();
      const href = $el('a').attr('href');
      
      if (text && href) {
        const fullUrl = this.resolveUrl(href, baseUrl);
        links.push({
          text,
          url: fullUrl,
          type: this.getLinkType(fullUrl, baseUrl),
          category: this.categorizeLink(text, href),
          isMainLink: false
        });
      }
    });

    return links;
  }

  private static extractKeywords(content: string): string[] {
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq: Record<string, number> = {};
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 3 && !commonWords.has(cleanWord)) {
        wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
      }
    });
    
    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private static determineSectionType(title: string, content: string): ContentSection['type'] {
    const text = (title + ' ' + content).toLowerCase();
    
    if (text.includes('about') || text.includes('company') || text.includes('story')) return 'about';
    if (text.includes('service') || text.includes('offer')) return 'services';
    if (text.includes('contact') || text.includes('phone') || text.includes('email')) return 'contact';
    if (text.includes('product') || text.includes('solution')) return 'products';
    if (text.includes('team') || text.includes('staff') || text.includes('member')) return 'team';
    if (text.includes('blog') || text.includes('news') || text.includes('article')) return 'blog';
    
    return 'other';
  }

  private static extractMetadata($: cheerio.CheerioAPI, content: string): WebsiteMetadata {
    const language = $('html').attr('lang') || 'en';
    const keywords = $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()) || [];
    const author = $('meta[name="author"]').attr('content') || '';
    const lastModified = $('meta[name="last-modified"]').attr('content') || '';
    
    const businessType = this.identifyBusinessType(content);
    const services = this.extractServices(content);
    const contactInfo = this.extractContactInfo($, content);
    
    return {
      language,
      keywords,
      author,
      lastModified,
      pageType: 'homepage',
      businessType,
      services,
      contactInfo
    };
  }

  private static extractContactInfo($: cheerio.CheerioAPI, content: string): ContactInfo {
    const emails: string[] = [];
    const phones: string[] = [];
    const addresses: string[] = [];
    const socialMedia: Record<string, string> = {};

    // Extract emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatches = content.match(emailRegex);
    if (emailMatches) {
      emails.push(...emailMatches);
    }

    // Extract phone numbers
    const phoneRegex = /(\+?[\d\s\-\(\)]{10,})/g;
    const phoneMatches = content.match(phoneRegex);
    if (phoneMatches) {
      phones.push(...phoneMatches.map(p => p.trim()));
    }

    // Extract social media links
    $('a[href*="facebook"], a[href*="twitter"], a[href*="instagram"], a[href*="linkedin"]').each((_, element) => {
      const $el = $(element);
      const href = $el.attr('href');
      if (href) {
        if (href.includes('facebook')) socialMedia.facebook = href;
        if (href.includes('twitter')) socialMedia.twitter = href;
        if (href.includes('instagram')) socialMedia.instagram = href;
        if (href.includes('linkedin')) socialMedia.linkedin = href;
      }
    });

    return { email: emails, phone: phones, address: addresses, socialMedia };
  }

  private static identifyBusinessType(content: string): string {
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('financial') || contentLower.includes('bank') || contentLower.includes('investment')) {
      return 'Financial Services';
    }
    if (contentLower.includes('health') || contentLower.includes('medical') || contentLower.includes('clinic')) {
      return 'Healthcare';
    }
    if (contentLower.includes('tech') || contentLower.includes('software') || contentLower.includes('digital')) {
      return 'Technology';
    }
    if (contentLower.includes('consulting') || contentLower.includes('advisory')) {
      return 'Consulting';
    }
    if (contentLower.includes('retail') || contentLower.includes('shop') || contentLower.includes('store')) {
      return 'Retail';
    }
    
    return 'Business Services';
  }

  private static extractServices(content: string): string[] {
    const contentLower = content.toLowerCase();
    const services: string[] = [];
    
    if (contentLower.includes('consulting') || contentLower.includes('advisory')) services.push('Consulting');
    if (contentLower.includes('development') || contentLower.includes('software')) services.push('Software Development');
    if (contentLower.includes('marketing') || contentLower.includes('advertising')) services.push('Marketing');
    if (contentLower.includes('design') || contentLower.includes('creative')) services.push('Design');
    if (contentLower.includes('support') || contentLower.includes('customer service')) services.push('Customer Support');
    if (contentLower.includes('training') || contentLower.includes('education')) services.push('Training');
    if (contentLower.includes('sales') || contentLower.includes('business development')) services.push('Sales');
    
    return services;
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

  private static extractContent(html: string, domain: string): { title: string; description: string; content: string } {
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, nav, footer, header, .nav, .footer, .header').remove();
    
    // Use domain-based title instead of extracting from HTML
    const title = this.deriveTitleFromDomain(domain);
    
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
      .substring(0, 20000); // Limit content length
    
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
    const businessType = this.identifyBusinessType(content);
    const services = this.extractServices(content);
    
    return `You are an AI assistant for ${title}. ${businessType} ${services}. Provide helpful information about ${title}'s services, answer customer questions, and assist with inquiries related to their business. Always be professional, accurate, and helpful.`;
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
      const { title, description, content } = this.extractContent(html, domain);
      const finalTitle = title;
      
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

  public static async getStructuredDataFromEmail(email: string): Promise<StructuredWebsiteData> {
    try {
      // Extract domain from email
      const domain = this.extractDomainFromEmail(email);
      
      // Build website URL
      const websiteUrl = this.buildWebsiteUrl(domain);
      
      // Fetch website content
      const html = await this.fetchWebsite(websiteUrl);
      
      // Load HTML with cheerio
      const $ = cheerio.load(html);
      
      // Remove script and style elements
      $('script, style').remove();
      
      // Extract title
      const title = $('title').text().trim() || this.deriveTitleFromDomain(domain);
      
      // Extract description
      const description = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || 
                         $('p').first().text().trim().substring(0, 160) || 
                         'No description available';
      
      // Extract main links
      const mainLinks = this.extractMainLinks($, websiteUrl);
      
      // Extract footer links
      const footerLinks = this.extractFooterLinks($, websiteUrl);
      
      // Extract social links
      const socialLinks = this.extractSocialLinks($, websiteUrl);
      
      // Create navigation structure
      const navigation: NavigationData = {
        mainMenu: mainLinks,
        footerLinks,
        socialLinks,
        breadcrumbs: []
      };
      
      // Extract content sections
      const contentSections = this.extractContentSections($, websiteUrl);
      
      // Extract metadata
      const rawContent = $('body').text().replace(/\s+/g, ' ').trim();
      const metadata = this.extractMetadata($, rawContent);
      
      return {
        domain,
        title,
        description,
        mainLinks,
        navigation,
        contentSections,
        metadata,
        rawContent: rawContent.substring(0, 10000) // Limit content length
      };
    } catch (error) {
      console.error('Structured website analysis failed:', error);
      throw error;
    }
  }
}
