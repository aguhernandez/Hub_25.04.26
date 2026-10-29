import { supabase } from './supabase';

interface ApiConfigUpdate {
  serviceName: string;
  configKey: string;
  configValue: string | null;
  isActive?: boolean;
  isSensitive?: boolean;
  updatedBy?: string;
}

export interface SafeApiConfig {
  id: string;
  service_name: string;
  config_key: string;
  config_value: string | null;
  encrypted_value: null;
  is_sensitive: boolean;
  is_configured: boolean;
  is_active: boolean;
  updated_at: string;
}

async function callAdminConfig(method: 'GET' | 'POST', body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Authentication required');
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-config-admin`, {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'API configuration request failed');
  return result;
}

export async function listApiConfigurations(): Promise<SafeApiConfig[]> {
  const result = await callAdminConfig('GET');
  return result.configs || [];
}

export async function saveEncryptedConfig(update: ApiConfigUpdate) {
  await callAdminConfig('POST', {
    serviceName: update.serviceName,
    configKey: update.configKey,
    configValue: update.configValue,
    isActive: update.isActive,
  });
}

export async function loadDecryptedConfig(serviceName: string) {
  const configs = await listApiConfigurations();
  return Object.fromEntries(
    configs.filter((config) => config.service_name === serviceName && !config.is_sensitive)
      .map((config) => [config.config_key, config.config_value || '']),
  );
}

export function isSensitiveField(serviceName: string, configKey: string): boolean {
  const sensitiveFields: Record<string, string[]> = {
    brevo: ['api_key'], stripe: ['secret_key', 'webhook_secret'],
    zoom: ['client_secret'], openai: ['api_key'],
  };
  return sensitiveFields[serviceName]?.includes(configKey) || false;
}
