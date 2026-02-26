import { Colors } from '../constants/colors';

describe('Colors', () => {
  it('has the primary brand blue', () => {
    expect(Colors.blue).toBe('#1E90FF');
  });

  it('has dark theme background colors', () => {
    expect(Colors.dark).toBe('#0D1117');
    expect(Colors.surface).toBe('#161B22');
    expect(Colors.card).toBe('#1C2333');
  });

  it('has text colors', () => {
    expect(Colors.text).toBeTruthy();
    expect(Colors.textSecondary).toBeTruthy();
    expect(Colors.textMuted).toBeTruthy();
    expect(Colors.textWhite).toBe('#FFFFFF');
  });

  it('has status colors', () => {
    expect(Colors.success).toBeTruthy();
    expect(Colors.warn).toBeTruthy();
    expect(Colors.error).toBeTruthy();
  });

  it('has all required properties for the design system', () => {
    const requiredKeys = [
      'blue', 'dark', 'surface', 'card', 'border',
      'text', 'textSecondary', 'textMuted', 'textWhite',
      'success', 'warn', 'error', 'overlay',
    ];
    for (const key of requiredKeys) {
      expect(Colors).toHaveProperty(key);
      expect((Colors as Record<string, string>)[key]).toBeTruthy();
    }
  });
});
