import { HTMLTranslator } from '@/lib/html-translator';

describe('HTMLTranslator', () => {
  let htmlTranslator: HTMLTranslator;

  beforeEach(() => {
    htmlTranslator = new HTMLTranslator();
  });

  describe('extractTextNodes', () => {
    it('should extract text nodes from simple HTML', () => {
      const html = '<p>Hello <strong>world</strong>!</p>';
      const { textNodes, placeholderMap } = htmlTranslator.extractTextNodes(html);
      
      expect(textNodes).toEqual(['Hello ', 'world', '!']);
      expect(placeholderMap.size).toBe(3);
    });

    it('should handle nested HTML elements', () => {
      const html = '<div><h1>Title</h1><p>Paragraph with <em>emphasis</em></p></div>';
      const { textNodes } = htmlTranslator.extractTextNodes(html);
      
      expect(textNodes).toEqual(['Title', 'Paragraph with ', 'emphasis']);
    });

    it('should ignore empty text nodes', () => {
      const html = '<p>Hello</p><p>   </p><p>World</p>';
      const { textNodes } = htmlTranslator.extractTextNodes(html);
      
      expect(textNodes).toEqual(['Hello', 'World']);
    });

    it('should handle complex HTML structure', () => {
      const html = `
        <div>
          <h2>Financial Report</h2>
          <ul>
            <li>Revenue: $50,000</li>
            <li>Expenses: $30,000</li>
          </ul>
          <p>Net profit: <strong>$20,000</strong></p>
        </div>
      `;
      const { textNodes } = htmlTranslator.extractTextNodes(html);
      
      expect(textNodes).toContain('Financial Report');
      expect(textNodes).toContain('Revenue: $50,000');
      expect(textNodes).toContain('Net profit: ');
      expect(textNodes).toContain('$20,000');
    });
  });

  describe('reconstructHtml', () => {
    it('should reconstruct HTML with translated text nodes', () => {
      const originalHtml = '<p>Hello <strong>world</strong>!</p>';
      const { textNodes, placeholderMap } = htmlTranslator.extractTextNodes(originalHtml);
      const translatedTextNodes = ['مرحبا ', 'عالم', '!'];
      
      const reconstructed = htmlTranslator.reconstructHtml(originalHtml, translatedTextNodes, placeholderMap);
      
      expect(reconstructed).toContain('مرحبا');
      expect(reconstructed).toContain('عالم');
      expect(reconstructed).toContain('<strong>');
      expect(reconstructed).toContain('</strong>');
    });

    it('should preserve HTML structure', () => {
      const originalHtml = '<div><h1>Title</h1><p>Content</p></div>';
      const { textNodes, placeholderMap } = htmlTranslator.extractTextNodes(originalHtml);
      const translatedTextNodes = ['العنوان', 'المحتوى'];
      
      const reconstructed = htmlTranslator.reconstructHtml(originalHtml, translatedTextNodes, placeholderMap);
      
      expect(reconstructed).toContain('<div>');
      expect(reconstructed).toContain('<h1>');
      expect(reconstructed).toContain('</h1>');
      expect(reconstructed).toContain('<p>');
      expect(reconstructed).toContain('</p>');
      expect(reconstructed).toContain('</div>');
    });
  });

  describe('translateHtml', () => {
    it('should translate HTML content while preserving structure', async () => {
      const html = '<p>Hello <strong>world</strong>!</p>';
      const mockTranslate = jest.fn()
        .mockResolvedValueOnce('مرحبا ')
        .mockResolvedValueOnce('عالم')
        .mockResolvedValueOnce('!');

      const result = await htmlTranslator.translateHtml(html, mockTranslate);
      
      expect(result.textNodes).toEqual(['Hello ', 'world', '!']);
      expect(result.translatedTextNodes).toEqual(['مرحبا ', 'عالم', '!']);
      expect(result.translatedHtml).toContain('مرحبا');
      expect(result.translatedHtml).toContain('عالم');
      expect(result.translatedHtml).toContain('<strong>');
    });

    it('should handle translation errors gracefully', async () => {
      const html = '<p>Hello world!</p>';
      const mockTranslate = jest.fn()
        .mockRejectedValueOnce(new Error('Translation failed'))
        .mockResolvedValueOnce('عالم!');

      const result = await htmlTranslator.translateHtml(html, mockTranslate);
      
      expect(result.translatedTextNodes).toEqual(['Hello world!', 'عالم!']);
    });
  });

  describe('isHtml', () => {
    it('should detect HTML content', () => {
      expect(htmlTranslator.isHtml('<p>Hello</p>')).toBe(true);
      expect(htmlTranslator.isHtml('<div>Content</div>')).toBe(true);
      expect(htmlTranslator.isHtml('<strong>Bold</strong>')).toBe(true);
    });

    it('should detect non-HTML content', () => {
      expect(htmlTranslator.isHtml('Hello world')).toBe(false);
      expect(htmlTranslator.isHtml('Plain text content')).toBe(false);
      expect(htmlTranslator.isHtml('')).toBe(false);
    });
  });

  describe('extractPlainText', () => {
    it('should extract plain text from HTML', () => {
      const html = '<p>Hello <strong>world</strong>!</p>';
      const plainText = htmlTranslator.extractPlainText(html);
      expect(plainText.trim()).toBe('Hello world!');
    });

    it('should handle complex HTML structures', () => {
      const html = `
        <div>
          <h1>Title</h1>
          <p>Paragraph with <em>emphasis</em></p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `;
      const plainText = htmlTranslator.extractPlainText(html);
      expect(plainText).toContain('Title');
      expect(plainText).toContain('Paragraph with emphasis');
      expect(plainText).toContain('Item 1');
      expect(plainText).toContain('Item 2');
    });
  });
});






