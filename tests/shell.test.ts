import { describe, it, expect } from 'vitest';
import { shQuote, maskSecrets, generateSecureTempName } from '../src/utils/shell.js';

describe('shQuote', () => {
  it('quotes strings safely for POSIX shells', () => {
    expect(shQuote('abc')).toBe("'abc'");
    expect(shQuote("a'b")).toBe("'a'\"'\"'b'");
  });
});

describe('maskSecrets', () => {
  it('masks MySQL short-form password (-p)', () => {
    expect(maskSecrets('-pMySecret123')).toBe('-p****');
    expect(maskSecrets('mysqldump -uroot -ppassword dbname')).toBe('mysqldump -uroot -p**** dbname');
  });

  it('masks MySQL long-form password (--password=)', () => {
    expect(maskSecrets('--password=secret')).toBe('--password=****');
    expect(maskSecrets('mysql --password=MyPass123 -h localhost')).toBe('mysql --password=**** -h localhost');
  });

  it('masks MYSQL_PWD environment variable', () => {
    expect(maskSecrets('MYSQL_PWD=secret123')).toBe('MYSQL_PWD=****');
    expect(maskSecrets('MYSQL_PWD=pass mysql -u root')).toBe('MYSQL_PWD=**** mysql -u root');
  });

  it('masks quoted passwords after -p', () => {
    expect(maskSecrets("-p'my secret'")).toBe("-p'****'");
    expect(maskSecrets('-p"my secret"')).toBe('-p"****"');
  });

  it('masks quoted passwords after --password=', () => {
    expect(maskSecrets("--password='my secret'")).toBe("--password='****'");
    expect(maskSecrets('--password="my secret"')).toBe('--password="****"');
  });

  it('handles multiple passwords in same string', () => {
    const input = 'mysqldump -ppass1 --password=pass2 MYSQL_PWD=pass3';
    const expected = 'mysqldump -p**** --password=**** MYSQL_PWD=****';
    expect(maskSecrets(input)).toBe(expected);
  });

  it('does not mask non-password content', () => {
    expect(maskSecrets('-h localhost -u root dbname')).toBe('-h localhost -u root dbname');
    expect(maskSecrets('--port=3306')).toBe('--port=3306');
  });
});

describe('generateSecureTempName', () => {
  it('generates unique filenames', () => {
    const name1 = generateSecureTempName();
    const name2 = generateSecureTempName();
    expect(name1).not.toBe(name2);
  });

  it('uses default prefix', () => {
    const name = generateSecureTempName();
    expect(name).toMatch(/^wpmovejs-[0-9a-f-]+\.sql$/);
  });

  it('uses custom prefix', () => {
    const name = generateSecureTempName('custom-prefix');
    expect(name).toMatch(/^custom-prefix-[0-9a-f-]+\.sql$/);
  });

  it('generates UUID format', () => {
    const name = generateSecureTempName();
    // UUID format: 8-4-4-4-12 hex chars
    expect(name).toMatch(/^wpmovejs-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.sql$/);
  });
});
