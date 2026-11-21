import type { Firestore } from 'firebase/firestore';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export type ServerWhatsAppStatus =
  | 'Sent'
  | 'Pending'
  | 'Failed'
  | 'Not Configured'
  | 'Skipped (Opted Out)';

export type ServerWhatsAppType = 'attendance' | 'test_result' | 'fee_reminder' | 'general';

export interface SendWhatsAppRequestPayload {
  notificationId: string;
  uniqueKey: string;
  studentId: string;
  studentRoll: string;
  studentName: string;
  batch: string;
  studentClass?: string;
  timing?: string;
  parentWhatsApp: string;
  notificationType: ServerWhatsAppType;
  messageContent: string;
  templateParams?: string[];
  relatedRecordId: string;
  relatedDate: string;
  triggerSource:
    | 'auto_attendance'
    | 'auto_attendance_edit'
    | 'auto_test_publish'
    | 'auto_test_update'
    | 'manual_hub';
  isUpdatedNotification?: boolean;
  triggeredBy?: string;
  useApprovedTemplate?: boolean;
  defaultCountryCode?: string;
  allowResend?: boolean;
}

export interface WhatsAppConfigStatusResponse {
  configured: boolean;
  provider: string;
  apiVersion: string;
  phoneNumberIdMasked: string | null;
  templatesConfigured: {
    attendance: boolean;
    test: boolean;
  };
  missingEnvVars: string[];
}

function cleanFirestorePayload<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      result[key as keyof T] = val;
    }
  }
  return result;
}

function maskPhoneId(id?: string): string | null {
  if (!id) return null;
  const trimmed = id.trim();
  if (trimmed.length <= 4) return '****';
  return `...${trimmed.slice(-4)}`;
}

function isPlaceholderEnv(value?: string): boolean {
  if (!value) return true;
  const v = value.trim();
  if (!v) return true;
  return v.startsWith('MY_') || v.startsWith('PLACEHOLDER_') || v === 'YOUR_TOKEN_HERE';
}

export function getWhatsAppServerConfigStatus(): WhatsAppConfigStatusResponse {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION || 'v21.0';
  const attendanceTpl = process.env.WHATSAPP_ATTENDANCE_TEMPLATE_NAME;
  const testTpl = process.env.WHATSAPP_TEST_TEMPLATE_NAME;

  const missingEnvVars: string[] = [];
  if (isPlaceholderEnv(token)) missingEnvVars.push('WHATSAPP_CLOUD_API_TOKEN');
  if (isPlaceholderEnv(phoneId)) missingEnvVars.push('WHATSAPP_PHONE_NUMBER_ID');

  return {
    configured: missingEnvVars.length === 0,
    provider: 'Meta WhatsApp Cloud API',
    apiVersion: version,
    phoneNumberIdMasked: isPlaceholderEnv(phoneId) ? null : maskPhoneId(phoneId),
    templatesConfigured: {
      attendance: !isPlaceholderEnv(attendanceTpl),
      test: !isPlaceholderEnv(testTpl),
    },
    missingEnvVars,
  };
}

export function validateAndNormalizeInternationalPhone(
  rawPhone?: string,
  defaultCountryCode: string = '92'
): {
  valid: boolean;
  normalized: string;
  formattedE164: string;
  reason?: string;
} {
  const raw = String(rawPhone || '').trim();
  if (!raw || raw.toLowerCase() === 'not provided' || raw.toLowerCase() === 'n/a') {
    return {
      valid: false,
      normalized: '',
      formattedE164: '',
      reason: 'Parent WhatsApp number is missing on the student profile.',
    };
  }

  const cleanedCountry = (defaultCountryCode || '92').replace(/\D/g, '') || '92';
  const hadPlus = raw.startsWith('+');
  let digits = raw.replace(/\D/g, '');

  // Handle international 00 prefix (e.g. 00923001234567 -> 923001234567)
  if (!hadPlus && digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (!hadPlus && digits.startsWith('0')) {
    // Local format like 03001234567 -> prepend default country code (e.g. 92)
    digits = `${cleanedCountry}${digits.slice(1)}`;
  } else if (!hadPlus && digits.length === 10 && digits.startsWith('3') && cleanedCountry === '92') {
    // Local mobile without leading 0 (e.g. 3001234567 -> 923001234567)
    digits = `${cleanedCountry}${digits}`;
  }

  // Strip accidental trunk zero after country code (e.g. 920300... -> 92300...)
  if (digits.startsWith(`${cleanedCountry}0`) && digits.length > cleanedCountry.length + 9) {
    digits = `${cleanedCountry}${digits.slice(cleanedCountry.length + 1)}`;
  }

  // E.164 international phone numbers are 8 to 15 digits (excluding leading +)
  // Reject obvious dummy strings like 0000000000
  if (digits.length < 10 || digits.length > 15 || /^0+$/.test(digits)) {
    return {
      valid: false,
      normalized: digits,
      formattedE164: digits ? `+${digits}` : '',
      reason: `Invalid international WhatsApp number "${raw}". Expected E.164 format with country code (e.g. +92 300 1234567).`,
    };
  }

  return {
    valid: true,
    normalized: digits,
    formattedE164: `+${digits}`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callMetaCloudApiWithRetry(params: {
  phoneNumberId: string;
  accessToken: string;
  apiVersion: string;
  toPhoneDigits: string;
  messageContent: string;
  templateName?: string;
  templateLanguage?: string;
  templateParams?: string[];
  maxRetries?: number;
}): Promise<{
  ok: boolean;
  statusCode: number;
  messageId?: string;
  mode: 'template' | 'text';
  retryCount: number;
  errorDetails?: string;
  raw?: any;
}> {
  const {
    phoneNumberId,
    accessToken,
    apiVersion,
    toPhoneDigits,
    messageContent,
    templateName,
    templateLanguage = 'en',
    templateParams = [],
    maxRetries = 2,
  } = params;

  const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const useTemplate = Boolean(templateName && templateName.trim().length > 0);
  const mode: 'template' | 'text' = useTemplate ? 'template' : 'text';

  const requestBody: Record<string, any> = useTemplate
    ? {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toPhoneDigits,
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLanguage },
          ...(templateParams.length > 0
            ? {
                components: [
                  {
                    type: 'body',
                    parameters: templateParams.map((text) => ({
                      type: 'text',
                      text: String(text || '-'),
                    })),
                  },
                ],
              }
            : {}),
        },
      }
    : {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toPhoneDigits,
        type: 'text',
        text: {
          preview_url: false,
          body: messageContent,
        },
      };

  let attempt = 0;
  let lastError = 'Unknown WhatsApp Cloud API error';
  let lastStatusCode = 0;
  let lastRaw: any = null;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      lastStatusCode = response.status;
      const jsonData: any = await response.json().catch(() => ({}));
      lastRaw = jsonData;

      if (response.ok) {
        const messageId = jsonData?.messages?.[0]?.id;
        return {
          ok: true,
          statusCode: response.status,
          messageId,
          mode,
          retryCount: attempt,
          raw: jsonData,
        };
      }

      const apiErrMsg =
        jsonData?.error?.message ||
        jsonData?.message ||
        `HTTP ${response.status} from WhatsApp Cloud API`;
      const apiErrCode = jsonData?.error?.code ? ` (Code ${jsonData.error.code})` : '';
      lastError = `${apiErrMsg}${apiErrCode}`;

      // Retry only on rate limit (429) or transient server errors (5xx)
      const isTransient = response.status === 429 || response.status >= 500;
      if (!isTransient || attempt >= maxRetries) {
        return {
          ok: false,
          statusCode: response.status,
          mode,
          retryCount: attempt,
          errorDetails: lastError,
          raw: jsonData,
        };
      }
    } catch (err: any) {
      lastError = err?.message || 'Network error while contacting Meta WhatsApp Cloud API';
      if (attempt >= maxRetries) {
        return {
          ok: false,
          statusCode: lastStatusCode,
          mode,
          retryCount: attempt,
          errorDetails: lastError,
          raw: lastRaw,
        };
      }
    }

    attempt += 1;
    await sleep(700 * attempt);
  }

  return {
    ok: false,
    statusCode: lastStatusCode,
    mode,
    retryCount: attempt,
    errorDetails: lastError,
    raw: lastRaw,
  };
}

export async function processWhatsAppSend(
  firestore: Firestore,
  payload: SendWhatsAppRequestPayload
): Promise<{
  ok: boolean;
  deduplicated?: boolean;
  status: ServerWhatsAppStatus;
  notification: Record<string, any>;
}> {
  const now = new Date().toISOString();
  const notifRef = doc(firestore, 'whatsapp_notifications', payload.notificationId);

  // 1. Server-side deduplication check (strictly block double-sending unless explicit admin resend)
  if (!payload.allowResend) {
    try {
      const existingSnap = await getDoc(notifRef);
      if (existingSnap.exists()) {
        const existingData = existingSnap.data();
        if (existingData?.status === 'Sent' || existingData?.status === 'Pending') {
          return {
            ok: true,
            deduplicated: true,
            status: existingData.status as ServerWhatsAppStatus,
            notification: { ...existingData, id: existingSnap.id },
          };
        }
      }
    } catch (err) {
      console.warn('[WhatsApp] Deduplication check warning:', err);
    }
  }

  // 2. Check Parental WhatsApp Opt-Out / Consent preference in Firestore `students`
  let isOptedOut = false;
  let resolvedParentPhone = payload.parentWhatsApp;
  try {
    const studentSnap = await getDoc(doc(firestore, 'students', payload.studentId));
    if (studentSnap.exists()) {
      const sData = studentSnap.data();
      if (sData?.whatsappOptOut === true) {
        isOptedOut = true;
      }
      if (!resolvedParentPhone && sData?.parentWhatsApp) {
        resolvedParentPhone = String(sData.parentWhatsApp);
      }
    }
  } catch (err) {
    console.warn('[WhatsApp] Student consent lookup warning:', err);
  }

  const defaultCC = payload.defaultCountryCode || process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '92';
  const phoneCheck = validateAndNormalizeInternationalPhone(resolvedParentPhone, defaultCC);

  const baseRecord: Record<string, any> = {
    id: payload.notificationId,
    uniqueKey: payload.uniqueKey,
    studentId: payload.studentId,
    studentRoll: payload.studentRoll,
    studentName: payload.studentName,
    batch: payload.batch,
    studentClass: payload.studentClass,
    timing: payload.timing,
    parentWhatsApp: resolvedParentPhone || 'Not provided',
    normalizedPhone: phoneCheck.normalized || '',
    notificationType: payload.notificationType,
    messageContent: payload.messageContent,
    templateParams: payload.templateParams,
    relatedRecordId: payload.relatedRecordId,
    relatedDate: payload.relatedDate,
    triggerSource: payload.triggerSource,
    isUpdatedNotification: Boolean(payload.isUpdatedNotification),
    retryCount: 0,
    maxRetries: 2,
    createdAt: now,
    updatedAt: now,
    triggeredBy: payload.triggeredBy || 'System',
  };

  // Preserve original createdAt if retrying/resending existing doc
  try {
    const prevSnap = await getDoc(notifRef);
    if (prevSnap.exists() && prevSnap.data()?.createdAt) {
      baseRecord.createdAt = prevSnap.data().createdAt;
      baseRecord.retryCount = (prevSnap.data()?.retryCount || 0) + (payload.allowResend ? 1 : 0);
    }
  } catch {}

  if (isOptedOut) {
    const optedOutRecord = {
      ...baseRecord,
      status: 'Skipped (Opted Out)' as ServerWhatsAppStatus,
      errorDetails: 'Parent/guardian has opted out of automated WhatsApp notifications.',
    };
    await setDoc(notifRef, cleanFirestorePayload(optedOutRecord), { merge: true });
    return { ok: false, status: 'Skipped (Opted Out)', notification: optedOutRecord };
  }

  // 3. Validate International Phone Number
  if (!phoneCheck.valid) {
    const invalidPhoneRecord = {
      ...baseRecord,
      status: 'Failed' as ServerWhatsAppStatus,
      errorDetails: phoneCheck.reason || 'Invalid WhatsApp phone number.',
    };
    await setDoc(notifRef, cleanFirestorePayload(invalidPhoneRecord), { merge: true });
    return { ok: false, status: 'Failed', notification: invalidPhoneRecord };
  }

  // 4. Verify Server-Side WhatsApp Cloud API Credentials
  const configStatus = getWhatsAppServerConfigStatus();
  if (!configStatus.configured) {
    const notConfiguredRecord = {
      ...baseRecord,
      status: 'Not Configured' as ServerWhatsAppStatus,
      errorDetails: `WhatsApp Cloud API credentials (${configStatus.missingEnvVars.join(', ')}) are not configured on the server. Delivery deferred until configured.`,
    };
    await setDoc(notifRef, cleanFirestorePayload(notConfiguredRecord), { merge: true });
    return { ok: false, status: 'Not Configured', notification: notConfiguredRecord };
  }

  // 5. Mark Pending before calling Meta Cloud API
  await setDoc(
    notifRef,
    cleanFirestorePayload({ ...baseRecord, status: 'Pending' as ServerWhatsAppStatus }),
    { merge: true }
  );

  // Determine optional approved template name if requested & configured
  let templateName: string | undefined;
  if (payload.useApprovedTemplate) {
    if (payload.notificationType === 'attendance' && configStatus.templatesConfigured.attendance) {
      templateName = process.env.WHATSAPP_ATTENDANCE_TEMPLATE_NAME;
    } else if (payload.notificationType === 'test_result' && configStatus.templatesConfigured.test) {
      templateName = process.env.WHATSAPP_TEST_TEMPLATE_NAME;
    }
  }

  const sendResult = await callMetaCloudApiWithRetry({
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    accessToken: process.env.WHATSAPP_CLOUD_API_TOKEN!,
    apiVersion: configStatus.apiVersion,
    toPhoneDigits: phoneCheck.normalized,
    messageContent: payload.messageContent,
    templateName,
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en',
    templateParams: payload.templateParams,
    maxRetries: 2,
  });

  const finishedAt = new Date().toISOString();

  if (sendResult.ok) {
    const sentRecord = {
      ...baseRecord,
      status: 'Sent' as ServerWhatsAppStatus,
      templateName,
      retryCount: baseRecord.retryCount + sendResult.retryCount,
      sentAt: finishedAt,
      updatedAt: finishedAt,
      errorDetails: '',
      apiResponse: {
        messageId: sendResult.messageId,
        statusCode: sendResult.statusCode,
        provider: 'Meta WhatsApp Cloud API',
        mode: sendResult.mode,
      },
    };
    await setDoc(notifRef, cleanFirestorePayload(sentRecord), { merge: true });
    return { ok: true, status: 'Sent', notification: sentRecord };
  } else {
    const failedRecord = {
      ...baseRecord,
      status: 'Failed' as ServerWhatsAppStatus,
      templateName,
      retryCount: baseRecord.retryCount + sendResult.retryCount,
      updatedAt: finishedAt,
      errorDetails: sendResult.errorDetails || 'WhatsApp Cloud API delivery failed.',
      apiResponse: {
        statusCode: sendResult.statusCode,
        provider: 'Meta WhatsApp Cloud API',
        mode: sendResult.mode,
        raw: sendResult.raw,
      },
    };
    await setDoc(notifRef, cleanFirestorePayload(failedRecord), { merge: true });
    return { ok: false, status: 'Failed', notification: failedRecord };
  }
}

export async function retryStoredWhatsAppNotification(
  firestore: Firestore,
  notificationId: string,
  triggeredBy: string,
  customMessageContent?: string,
  allowResend: boolean = true
) {
  const snap = await getDoc(doc(firestore, 'whatsapp_notifications', notificationId));
  if (!snap.exists()) {
    throw new Error('Notification record not found in Firestore.');
  }

  const data = snap.data();
  return processWhatsAppSend(firestore, {
    notificationId: snap.id,
    uniqueKey: data.uniqueKey || snap.id,
    studentId: data.studentId,
    studentRoll: data.studentRoll,
    studentName: data.studentName,
    batch: data.batch,
    studentClass: data.studentClass,
    timing: data.timing,
    parentWhatsApp: data.parentWhatsApp,
    notificationType: data.notificationType,
    messageContent: customMessageContent?.trim() || data.messageContent,
    templateParams: data.templateParams,
    relatedRecordId: data.relatedRecordId,
    relatedDate: data.relatedDate,
    triggerSource: data.triggerSource || 'manual_hub',
    isUpdatedNotification: data.isUpdatedNotification,
    triggeredBy,
    useApprovedTemplate: Boolean(data.templateName),
    allowResend,
  });
}
