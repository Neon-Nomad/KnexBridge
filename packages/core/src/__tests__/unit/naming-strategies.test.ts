import { convertName, convertTableName } from '../../../generator';

describe('naming strategies', () => {
  describe('convertName camelCase', () => {
    const cases = [
      ['users', 'users'],
      ['user_name', 'userName'],
      ['User Name', 'userName'],
      ['user-name', 'userName'],
      ['USER__NAME', 'userName'],
      ['alreadyCamel', 'alreadyCamel'],
      ['multi_word_table', 'multiWordTable'],
      ['with123numbers', 'with123numbers'],
      ['__leading_underscores', 'leadingUnderscores'],
      ['trailing__underscores__', 'trailingUnderscores'],
    ] as const;

    it.each(cases)('converts %s to %s', (input, expected) => {
      expect(convertName(input, 'camel')).toBe(expected);
    });
  });

  describe('convertName PascalCase', () => {
    const cases = [
      ['users', 'Users'],
      ['user_name', 'UserName'],
      ['User Name', 'UserName'],
      ['user-name', 'UserName'],
      ['alreadyCamel', 'Alreadycamel'],
      ['with123numbers', 'With123numbers'],
      ['snake_case_value', 'SnakeCaseValue'],
      ['multiple   spaces', 'MultipleSpaces'],
      ['mixed_CASE-input', 'MixedCaseInput'],
      ['åccented name', 'ÅccentedName'],
    ] as const;

    it.each(cases)('converts %s to %s', (input, expected) => {
      expect(convertName(input, 'pascal')).toBe(expected);
    });
  });

  describe('convertName snake_case', () => {
    const cases = [
      ['users', 'users'],
      ['UserName', 'user_name'],
      ['userName', 'user_name'],
      ['user name', 'user_name'],
      ['user-name', 'user-name'.replace(/-/g, '_')],
      ['already_snake', 'already_snake'],
      ['PascalCase', 'pascal_case'],
      ['HTTPServer', 'h_t_t_p_server'],
      ['XMLHttpRequest', 'x_m_l_http_request'],
      ['multiWORDValue', 'multi_w_o_r_d_value'],
    ] as const;

    it.each(cases)('converts %s to %s', (input, expected) => {
      expect(convertName(input, 'snake')).toBe(expected);
    });
  });

  describe('convertName preserve', () => {
    const cases = [
      ['users', 'users'],
      ['UserName', 'UserName'],
      ['snake_case', 'snake_case'],
      ['kebab-case', 'kebab-case'],
      [' spaced name ', ' spaced name '],
    ] as const;

    it.each(cases)('keeps %s as %s', (input, expected) => {
      expect(convertName(input, 'preserve')).toBe(expected);
    });
  });

  describe('convertTableName', () => {
    it('singularizes table names', () => {
      expect(convertTableName('users', 'singular')).toBe('user');
      expect(convertTableName('people', 'singular')).toBe('person');
    });

    it('pluralizes table names', () => {
      expect(convertTableName('user', 'plural')).toBe('users');
      expect(convertTableName('person', 'plural')).toBe('people');
    });

    it('preserves table names when requested', () => {
      expect(convertTableName('data', 'preserve')).toBe('data');
    });
  });

  describe('edge cases', () => {
    it('handles reserved TypeScript keywords gracefully', () => {
      expect(convertName('class', 'camel')).toBe('class');
      expect(convertName('function', 'pascal')).toBe('Function');
    });

    it('handles special characters by stripping separators', () => {
      expect(convertName('user@name!', 'camel')).toBe('user@name!');
    });

    it('keeps unicode characters intact', () => {
      expect(convertName('naïve_user', 'camel')).toBe('naïveUser');
    });

    it('handles numeric only names', () => {
      expect(convertName('123', 'camel')).toBe('123');
    });

    it('handles empty string input', () => {
      expect(convertName('', 'camel')).toBe('');
    });

    it('handles whitespace only input', () => {
      expect(convertName('   ', 'camel')).toBe('');
    });

    it('does not throw for mixed symbols', () => {
      expect(() => convertName('user$name%field', 'snake')).not.toThrow();
    });

    it('handles long names with many separators', () => {
      const input = 'very-long_table name_with multiple---separators';
      expect(convertName(input, 'camel')).toBe('veryLongTableNameWithMultipleSeparators');
    });

    it('handles single character names', () => {
      expect(convertName('x', 'pascal')).toBe('X');
    });

    it('handles uppercase snake input', () => {
      expect(convertName('USER_NAME', 'camel')).toBe('userName');
    });
  });
});
