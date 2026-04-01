import { expect } from 'chai';
import { getClient } from './client';
import { LogLevel } from '../src';

const logLevel: LogLevel = 'error';
const client = getClient(logLevel);

describe('Authenticating', function() {
  it('should initially be unauthenticated', function() {
    expect(client.authProvider.authenticated).to.equal(false);
  });

  it('should throw when getting auth headers', function() {
    expect(() => client.authProvider.getHeaders()).to.throw('The CFTools client is not authenticated');
  });

  it('should be marked as needing refresh', function() {
    expect(client.authProvider.shouldRefresh()).to.equal(true);
  });

  it('should authenticate', async function() {
    await client.authenticate();
    expect(client.authProvider.authenticated).to.equal(true);
    expect(client.authProvider.authenticationToken).to.not.be.undefined;
    expect(client.authProvider.issuedAt).to.not.be.undefined;
    expect(client.authProvider.expiresAt).to.not.be.undefined;
  });

  it('should provide auth headers', function() {
    if (client.authProvider.enterpriseToken) {
      expect(client.authProvider.getHeaders()).to.deep.equal({
        Authorization: `Bearer ${client.authProvider.authenticationToken}`,
        'X-Enterprise-Access-Token': client.authProvider.enterpriseToken,
      });
    } else {
      expect(client.authProvider.getHeaders()).to.deep.equal({
        Authorization: `Bearer ${client.authProvider.authenticationToken}`,
      });
    }
  });

  it('should not need refresh', function() {
    expect(client.authProvider.shouldRefresh()).to.equal(false);
  });

  it('should need refresh after unsetting values', async function() {
    // @ts-expect-error - delete token for testing
    delete client.authProvider.authenticationToken;
    client.authProvider.authenticated = false;
    client.authProvider.issuedAt = null;
    client.authProvider.expiresAt = null;
    expect(client.authProvider.shouldRefresh()).to.equal(true);
  });

  it('should refresh', async function() {
    await client.authProvider.performRefresh();
    expect(client.authProvider.authenticated).to.equal(true);
    expect(client.authProvider.authenticationToken).to.not.be.undefined;
    expect(client.authProvider.issuedAt).to.not.be.undefined;
    expect(client.authProvider.expiresAt).to.not.be.undefined;
  });
});