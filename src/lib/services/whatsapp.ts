/**
 * WhatsApp Notification Service for Hi-AQLI
 *
 * Provider: WatZap Gateway (WhatsApp Unofficial & Official API)
 * Fallback: Fonnte (jika WatZap belum dikonfigurasi)
 */

export interface WhatsAppSendResult {
  success: boolean;
  provider: 'watzap' | 'fonnte' | 'none';
  messageId?: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface WatZapStatusInfo {
  configured: boolean;
  apiKeyConfigured: boolean;
  numberKeyConfigured: boolean;
  senderNumber?: string;
  displayPhoneNumber?: string;
  accountName?: string;
  plan?: string;
  isConnected?: boolean;
  expiresOn?: string;
  type?: string;
}

export interface WhatsAppStatusResult {
  configured: boolean;
  provider: 'watzap' | 'fonnte' | 'none';
  watzap: WatZapStatusInfo;
}

export interface WhatsAppGroupItem {
  id: string;
  name: string;
  participantsCount?: number;
}

const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; HiAQLI-System/1.0)',
  'Connection': 'close',
};

/**
 * Normalisasi nomor WhatsApp ke format internasional (E.164 digits tanpa tanda +)
 * e.g.:
 *  '08123456789'    -> '628123456789'
 *  '+62 812-3456'   -> '628123456789'
 *  '6281330000784'  -> '6281330000784'
 */
export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  let cleaned = rawPhone.replace(/[^0-9]/g, '');

  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8') && cleaned.length >= 9 && cleaned.length <= 13) {
    cleaned = '62' + cleaned;
  }

  return cleaned;
}

export class WhatsAppService {
  private static instance: WhatsAppService;

  private watzapApiKey: string;
  private watzapNumberKey: string;
  private fonnteApiKey: string;

  private constructor() {
    this.watzapApiKey = process.env.WATZAP_API_KEY?.trim() || '';
    this.watzapNumberKey = process.env.WATZAP_NUMBER_KEY?.trim() || '';
    this.fonnteApiKey = process.env.FONNTE_API_KEY?.trim() || '';
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  /**
   * Cek status koneksi dan paket WatZap melalui checking_key
   */
  public async getStatus(): Promise<WhatsAppStatusResult> {
    const isWatzapConfigured = Boolean(this.watzapApiKey && this.watzapNumberKey);

    const result: WhatsAppStatusResult = {
      configured: isWatzapConfigured || Boolean(this.fonnteApiKey),
      provider: isWatzapConfigured ? 'watzap' : this.fonnteApiKey ? 'fonnte' : 'none',
      watzap: {
        configured: isWatzapConfigured,
        apiKeyConfigured: Boolean(this.watzapApiKey),
        numberKeyConfigured: Boolean(this.watzapNumberKey),
      },
    };

    if (!isWatzapConfigured) {
      return result;
    }

    try {
      const resp = await fetch('https://api.watzap.id/v1/checking_key', {
        method: 'POST',
        headers: COMMON_HEADERS,
        body: JSON.stringify({
          api_key: this.watzapApiKey,
          number_key: this.watzapNumberKey,
        }),
      });

      if (resp.ok) {
        const json = await resp.json();
        if (json.data) {
          result.watzap.accountName = json.data.name;
          result.watzap.plan = json.data.plan;
          result.watzap.expiresOn = json.data.expires_on;

          const licenses = json.data.licenses_key || [];
          const matchedLicense = licenses.find(
            (lic: { key?: string }) => lic.key === this.watzapNumberKey
          ) || licenses[0];

          if (matchedLicense) {
            result.watzap.senderNumber = matchedLicense.wa_number;
            result.watzap.displayPhoneNumber = matchedLicense.wa_number
              ? `+${matchedLicense.wa_number.replace(/^(\d{2})(\d{3})(\d{4})(\d+)/, '$1 $2-$3-$4')}`
              : undefined;
            result.watzap.isConnected = Boolean(
              matchedLicense.is_connected || matchedLicense.connection_status === 'connected'
            );
            result.watzap.type = matchedLicense.type || 'unofficial';
          }
        }
      }
    } catch (err) {
      console.warn('[WhatsAppService] Gagal cek status WatZap key:', err);
    }

    return result;
  }

  /**
   * Kirim pesan WhatsApp ke nomor personal
   */
  public async sendTextMessage(to: string, message: string): Promise<WhatsAppSendResult> {
    const formattedPhone = normalizePhoneNumber(to);
    if (!formattedPhone) {
      return {
        success: false,
        provider: 'none',
        error: 'Nomor WhatsApp tujuan tidak valid',
      };
    }

    // 1. Coba kirim via WatZap jika aktif
    if (this.watzapApiKey && this.watzapNumberKey) {
      try {
        const res = await fetch('https://api.watzap.id/v1/send_message', {
          method: 'POST',
          headers: COMMON_HEADERS,
          body: JSON.stringify({
            api_key: this.watzapApiKey,
            number_key: this.watzapNumberKey,
            phone_no: formattedPhone,
            message: message,
          }),
        });

        const data = await res.json();

        if (
          data.status === '200' ||
          data.status === 200 ||
          data.status === true ||
          data.ack === 'successfully'
        ) {
          return {
            success: true,
            provider: 'watzap',
            messageId: data.message_id || data.id || `watzap_${Date.now()}`,
            details: data,
          };
        }

        const errorMessage = data.message || 'WatZap gagal mengirim pesan';
        console.warn('[WhatsAppService] WatZap send error:', errorMessage, data);

        return {
          success: false,
          provider: 'watzap',
          error: errorMessage,
          details: data,
        };
      } catch (err: any) {
        console.error('[WhatsAppService] WatZap network error:', err);
        // Lanjut ke fallback Fonnte jika error jaringan
      }
    }

    // 2. Fallback Fonnte jika ada
    if (this.fonnteApiKey) {
      try {
        const res = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: { Authorization: this.fonnteApiKey },
          body: new URLSearchParams({
            target: formattedPhone,
            message: message,
          }),
        });
        const data = await res.json();
        return {
          success: Boolean(data.status),
          provider: 'fonnte',
          messageId: data.id?.[0] || `fonnte_${Date.now()}`,
          details: data,
          error: data.status ? undefined : (data.reason || 'Fonnte gagal mengirim pesan'),
        };
      } catch (err: any) {
        return {
          success: false,
          provider: 'fonnte',
          error: err.message,
        };
      }
    }

    return {
      success: false,
      provider: 'none',
      error: 'Layanan WhatsApp belum dikonfigurasi (WATZAP_API_KEY/WATZAP_NUMBER_KEY tidak ditemukan)',
    };
  }

  /**
   * Kirim pesan WhatsApp ke Grup
   */
  public async sendGroupMessage(groupId: string, message: string): Promise<WhatsAppSendResult> {
    if (!groupId) {
      return {
        success: false,
        provider: 'none',
        error: 'Group ID WhatsApp tidak valid / kosong',
      };
    }

    // 1. Kirim via WatZap Group API
    if (this.watzapApiKey && this.watzapNumberKey) {
      try {
        const res = await fetch('https://api.watzap.id/v1/send_message_group', {
          method: 'POST',
          headers: COMMON_HEADERS,
          body: JSON.stringify({
            api_key: this.watzapApiKey,
            number_key: this.watzapNumberKey,
            group_id: groupId,
            message: message,
          }),
        });

        const data = await res.json();

        if (
          data.status === '200' ||
          data.status === 200 ||
          data.status === true ||
          data.ack === 'successfully'
        ) {
          return {
            success: true,
            provider: 'watzap',
            messageId: data.message_id || data.id || `watzap_grp_${Date.now()}`,
            details: data,
          };
        }

        const errorMessage = data.message || 'WatZap gagal mengirim pesan grup';
        console.warn('[WhatsAppService] WatZap send group error:', errorMessage, data);

        return {
          success: false,
          provider: 'watzap',
          error: errorMessage,
          details: data,
        };
      } catch (err: any) {
        console.error('[WhatsAppService] WatZap group network error:', err);
      }
    }

    // 2. Fallback Fonnte jika ada
    if (this.fonnteApiKey) {
      try {
        const res = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: { Authorization: this.fonnteApiKey },
          body: new URLSearchParams({
            target: groupId,
            message: message,
          }),
        });
        const data = await res.json();
        return {
          success: Boolean(data.status),
          provider: 'fonnte',
          messageId: data.id?.[0] || `fonnte_grp_${Date.now()}`,
          details: data,
          error: data.status ? undefined : (data.reason || 'Fonnte gagal mengirim pesan grup'),
        };
      } catch (err: any) {
        return {
          success: false,
          provider: 'fonnte',
          error: err.message,
        };
      }
    }

    return {
      success: false,
      provider: 'none',
      error: 'Konfigurasi WatZap atau Fonnte tidak ditemukan',
    };
  }

  /**
   * Tarik daftar grup WhatsApp yang terhubung
   */
  public async getGroups(): Promise<WhatsAppGroupItem[]> {
    // 1. Tarik dari WatZap
    if (this.watzapApiKey && this.watzapNumberKey) {
      try {
        const res = await fetch('https://api.watzap.id/v1/groups', {
          method: 'POST',
          headers: COMMON_HEADERS,
          body: JSON.stringify({
            api_key: this.watzapApiKey,
            number_key: this.watzapNumberKey,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.groups && typeof json.groups === 'object') {
            const list: WhatsAppGroupItem[] = [];
            for (const [gid, ginfo] of Object.entries<any>(json.groups)) {
              list.push({
                id: gid,
                name: ginfo.name || gid,
                participantsCount: Array.isArray(ginfo.participants) ? ginfo.participants.length : undefined,
              });
            }
            return list;
          }
        }
      } catch (err) {
        console.error('[WhatsAppService] WatZap getGroups error:', err);
      }
    }

    // 2. Fallback Fonnte
    if (this.fonnteApiKey) {
      try {
        const response = await fetch('https://api.fonnte.com/get-groups', {
          method: 'POST',
          headers: { Authorization: this.fonnteApiKey },
        });
        const data = await response.json();
        if (Array.isArray(data.data)) {
          return data.data.map((g: any) => ({
            id: g.id,
            name: g.name,
            participantsCount: g.member_count,
          }));
        }
      } catch (err) {
        console.error('[WhatsAppService] Fonnte getGroups error:', err);
      }
    }

    return [];
  }
}

export const whatsappService = WhatsAppService.getInstance();
