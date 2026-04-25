import { supabase } from './supabase';

const ENCRYPTION_KEY = import.meta.env.VITE_API_ENCRYPTION_KEY || 'asciende-default-key-2024';

interface ApiConfigUpdate {
  serviceName: string;
  configKey: string;
  configValue: string | null;
  isActive?: boolean;
  isSensitive?: boolean;
  updatedBy?: string;
}

async function upsertConfig(
  serviceName: string,
  configKey: string,
  configValue: string | null,
  encryptedValue: string | null,
  isActive: boolean,
  updatedBy?: string
) {
  const { data: existing } = await supabase
    .from('api_configurations')
    .select('id')
    .eq('service_name', serviceName)
    .eq('config_key', configKey)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('api_configurations')
      .update({
        config_value: configValue,
        encrypted_value: encryptedValue,
        is_active: isActive,
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('api_configurations')
      .insert({
        service_name: serviceName,
        config_key: configKey,
        config_value: configValue,
        encrypted_value: encryptedValue,
        is_active: isActive,
        updated_by: updatedBy || null,
      });

    if (error) throw error;
  }
}

export async function saveEncryptedConfig({
  serviceName,
  configKey,
  configValue,
  isActive = true,
  isSensitive = false,
  updatedBy,
}: ApiConfigUpdate) {
  if (!configValue) {
    await upsertConfig(serviceName, configKey, null, null, false, updatedBy);
    return;
  }

  if (isSensitive) {
    const { data: encryptedData, error: encryptError } = await supabase.rpc(
      'encrypt_api_config',
      { p_value: configValue, p_key: ENCRYPTION_KEY }
    );

    if (encryptError || !encryptedData) {
      await upsertConfig(serviceName, configKey, configValue, null, isActive, updatedBy);
    } else {
      await upsertConfig(serviceName, configKey, null, encryptedData, isActive, updatedBy);
    }
  } else {
    await upsertConfig(serviceName, configKey, configValue, null, isActive, updatedBy);
  }
}

export async function loadDecryptedConfig(serviceName: string) {
  const { data, error } = await supabase
    .from('api_configurations')
    .select('*')
    .eq('service_name', serviceName);

  if (error) throw error;

  const decryptedConfigs: Record<string, string> = {};

  for (const config of data || []) {
    if (config.encrypted_value) {
      try {
        const { data: decryptedValue, error: decryptError } = await supabase.rpc(
          'decrypt_api_config',
          { p_encrypted_value: config.encrypted_value, p_key: ENCRYPTION_KEY }
        );

        if (!decryptError && decryptedValue) {
          decryptedConfigs[config.config_key] = decryptedValue;
        } else {
          if (config.config_value) {
            decryptedConfigs[config.config_key] = config.config_value;
          }
        }
      } catch (err) {
        console.error(`Failed to decrypt ${config.config_key}:`, err);
        if (config.config_value) {
          decryptedConfigs[config.config_key] = config.config_value;
        }
      }
    } else if (config.config_value) {
      decryptedConfigs[config.config_key] = config.config_value;
    }
  }

  return decryptedConfigs;
}

export function isSensitiveField(serviceName: string, configKey: string): boolean {
  const sensitiveFields: Record<string, string[]> = {
    brevo: ['api_key'],
    stripe: ['secret_key', 'webhook_secret'],
    zoom: ['client_secret'],
    openai: ['api_key'],
  };

  return sensitiveFields[serviceName]?.includes(configKey) || false;
}
