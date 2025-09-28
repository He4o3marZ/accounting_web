import DOMPurify from 'isomorphic-dompurify';
import { JSDOM } from 'jsdom';

export interface TranslationResult {
  translatedHtml: string;
  textNodes: string[];
  translatedTextNodes: string[];
}

export class HTMLTranslator {
  private dom: JSDOM;

  constructor() {
    this.dom = new JSDOM();
  }

  /**
   * Extract text nodes from HTML while preserving structure
   */
  extractTextNodes(html: string): { textNodes: string[]; placeholderMap: Map<string, string> } {
    const doc = this.dom.window.document;
    doc.body.innerHTML = html;

    const textNodes: string[] = [];
    const placeholderMap = new Map<string, string>();
    let placeholderIndex = 0;

    const walker = doc.createTreeWalker(
      doc.body,
      this.dom.window.NodeFilter.SHOW_TEXT
    );

    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent;
      if (text && text.trim().length > 0) {
        const placeholder = `__TEXT_NODE_${placeholderIndex}__`;
        textNodes.push(text);
        placeholderMap.set(placeholder, text);
        node.textContent = placeholder;
        placeholderIndex++;
      }
    }

    return { textNodes, placeholderMap };
  }

  /**
   * Reconstruct HTML with translated text nodes
   */
  reconstructHtml(html: string, translatedTextNodes: string[], placeholderMap: Map<string, string>): string {
    let reconstructedHtml = html;
    let textIndex = 0;

    // Replace placeholders with translated text
    for (const [placeholder, originalText] of placeholderMap) {
      if (textIndex < translatedTextNodes.length) {
        reconstructedHtml = reconstructedHtml.replace(placeholder, translatedTextNodes[textIndex]);
        textIndex++;
      }
    }

    return reconstructedHtml;
  }

  /**
   * Translate HTML content safely
   */
  async translateHtml(
    html: string,
    translateFunction: (text: string) => Promise<string>
  ): Promise<TranslationResult> {
    // Sanitize HTML first
    const sanitizedHtml = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'strong', 'em', 'b', 'i', 'u', 'br', 'hr',
        'ul', 'ol', 'li', 'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'blockquote', 'pre', 'code'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style']
    });

    // Extract text nodes
    const { textNodes, placeholderMap } = this.extractTextNodes(sanitizedHtml);

    // Translate text nodes
    const translatedTextNodes: string[] = [];
    for (const textNode of textNodes) {
      try {
        const translated = await translateFunction(textNode);
        translatedTextNodes.push(translated);
      } catch (error) {
        console.warn('Translation failed for text node:', textNode, error);
        translatedTextNodes.push(textNode); // Fallback to original
      }
    }

    // Reconstruct HTML
    const translatedHtml = this.reconstructHtml(sanitizedHtml, translatedTextNodes, placeholderMap);

    return {
      translatedHtml,
      textNodes,
      translatedTextNodes,
    };
  }

  /**
   * Check if content is HTML
   */
  isHtml(content: string): boolean {
    return /<[a-z][\s\S]*>/i.test(content);
  }

  /**
   * Extract plain text from HTML
   */
  extractPlainText(html: string): string {
    const doc = this.dom.window.document;
    doc.body.innerHTML = html;
    return doc.body.textContent || doc.body.innerText || '';
  }
}

// Singleton instance
let htmlTranslator: HTMLTranslator | null = null;

export function getHTMLTranslator(): HTMLTranslator {
  if (!htmlTranslator) {
    htmlTranslator = new HTMLTranslator();
  }
  return htmlTranslator;
}
