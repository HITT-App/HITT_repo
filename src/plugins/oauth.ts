import { registerPlugin } from '@capacitor/core';

export interface OAuthPluginInterface {
  authenticate(options: {
    url: string;
    callbackScheme: string;
  }): Promise<{ url: string }>;
}

export const OAuthPlugin = registerPlugin<OAuthPluginInterface>('OAuthPlugin');
