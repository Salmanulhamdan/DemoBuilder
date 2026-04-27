# Enhanced WebsiteCrawler for Dataset Creation

The WebsiteCrawler has been enhanced to provide structured data that can be used to create comprehensive datasets from websites. This is particularly useful for analyzing website content, extracting main navigation links, and organizing information for machine learning or analysis purposes.

## Features

### Structured Data Extraction
- **Main Navigation Links**: Extracts primary navigation links (About Us, Services, Contact, etc.)
- **Content Sections**: Identifies and categorizes different content sections
- **Metadata**: Extracts website metadata, business type, and contact information
- **Link Categorization**: Automatically categorizes links by type and purpose

### Data Structure

The crawler now returns a `StructuredWebsiteData` object with the following structure:

```typescript
interface StructuredWebsiteData {
  domain: string;
  title: string;
  description: string;
  mainLinks: LinkData[];
  navigation: NavigationData;
  contentSections: ContentSection[];
  metadata: WebsiteMetadata;
  rawContent: string;
}
```

## Usage Examples

### Basic Usage

```typescript
import { WebsiteCrawler } from './services/websiteCrawler';

// Get structured data from a website using email domain
const email = 'info@example.com';
const structuredData = await WebsiteCrawler.getStructuredDataFromEmail(email);

console.log('Website Title:', structuredData.title);
console.log('Main Links:', structuredData.mainLinks.length);
console.log('Content Sections:', structuredData.contentSections.length);
```

### Using the DatasetCreator Helper

```typescript
import { DatasetCreator } from './examples/datasetCreator';

// Create a complete dataset
const dataset = await DatasetCreator.createWebsiteDataset('info@example.com');

// Extract specific content types
const aboutUs = DatasetCreator.findAboutUsContent(dataset);
const services = DatasetCreator.findServicesContent(dataset);
const contact = DatasetCreator.findContactInfo(dataset);

// Create a summary
const summary = DatasetCreator.createDatasetSummary(dataset);

// Export to different formats
const jsonExport = DatasetCreator.exportToJSON(dataset);
const csvData = DatasetCreator.createCSVDataset(dataset);
```

## Main Links Extraction

The crawler specifically identifies and extracts main navigation links that are commonly found on websites:

### Link Categories
- **About**: About Us, Company, Story, Mission, Vision
- **Services**: Services, Solutions, Offerings, Products
- **Contact**: Contact, Get in Touch, Support
- **Team**: Team, Staff, Leadership
- **Blog**: Blog, News, Articles
- **Careers**: Careers, Jobs, Work with Us
- **Legal**: Privacy Policy, Terms of Service
- **Home**: Home, Main Page

### Link Types
- **Internal**: Links within the same domain
- **External**: Links to other websites
- **Social**: Social media links (Facebook, Twitter, LinkedIn, etc.)

## Content Section Analysis

The crawler analyzes website content and categorizes it into different sections:

### Section Types
- **About**: Company information, history, mission
- **Services**: Service offerings, solutions
- **Contact**: Contact information, forms
- **Products**: Product listings, features
- **Team**: Team member information
- **Blog**: Blog posts, articles
- **Other**: Miscellaneous content

Each section includes:
- Title and content
- Related links
- Keywords extracted from the content

## Metadata Extraction

The crawler extracts comprehensive metadata including:

### Website Information
- Language
- Keywords
- Author
- Last modified date
- Business type
- Services offered

### Contact Information
- Email addresses
- Phone numbers
- Social media links
- Physical addresses

## Dataset Creation Workflow

1. **Input**: Provide an email address (e.g., 'info@example.com')
2. **Crawling**: The crawler fetches the website and extracts structured data
3. **Analysis**: Content is analyzed and categorized
4. **Output**: Structured dataset with organized information

### Example Dataset Output

```typescript
{
  domain: "example.com",
  title: "Example Company",
  description: "Leading provider of innovative solutions...",
  mainLinks: [
    {
      text: "About Us",
      url: "https://example.com/about",
      type: "internal",
      category: "about",
      isMainLink: true
    },
    {
      text: "Services",
      url: "https://example.com/services",
      type: "internal", 
      category: "services",
      isMainLink: true
    }
  ],
  navigation: {
    mainMenu: [...],
    footerLinks: [...],
    socialLinks: [...],
    breadcrumbs: []
  },
  contentSections: [
    {
      type: "about",
      title: "About Our Company",
      content: "We are a leading...",
      links: [...],
      keywords: ["company", "leading", "innovative"]
    }
  ],
  metadata: {
    language: "en",
    keywords: ["technology", "solutions", "innovation"],
    businessType: "Technology",
    services: ["Software Development", "Consulting"],
    contactInfo: {
      email: ["info@example.com"],
      phone: ["+1-555-0123"],
      socialMedia: {
        linkedin: "https://linkedin.com/company/example"
      }
    }
  }
}
```

## Use Cases

### 1. Website Analysis
- Analyze website structure and navigation
- Identify main content areas
- Extract contact and business information

### 2. Dataset Creation for ML
- Create training datasets for website classification
- Extract features for business type identification
- Generate labeled data for content analysis

### 3. Competitive Analysis
- Compare website structures across competitors
- Analyze service offerings and content strategies
- Track contact information and social media presence

### 4. Content Auditing
- Identify missing content sections
- Analyze content distribution across sections
- Extract keywords and topics

## Error Handling

The crawler includes comprehensive error handling:

```typescript
try {
  const data = await WebsiteCrawler.getStructuredDataFromEmail(email);
  // Process data
} catch (error) {
  console.error('Failed to crawl website:', error.message);
  // Handle error appropriately
}
```

## Performance Considerations

- **Timeout**: 10-second timeout for website fetching
- **Content Limits**: Raw content is limited to 10,000 characters
- **Link Limits**: Main links are filtered for relevance
- **Caching**: Consider implementing caching for repeated requests

## Dependencies

- `axios`: For HTTP requests
- `cheerio`: For HTML parsing and DOM manipulation

## Future Enhancements

- Support for multiple page crawling
- Image and media extraction
- SEO analysis
- Performance metrics extraction
- Multi-language support
- Custom content extraction rules


