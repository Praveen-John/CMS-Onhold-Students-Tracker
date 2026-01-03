import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Encryption configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 10;
const AUTH_TAG_LENGTH = 16;

/**
 * Encryption Service for sensitive data
 * - Uses bcrypt for one-way hashing (emails, phone numbers)
 * - Uses AES-256-GCM for reversible encryption (comments, notes)
 */

// One-way hashing for identifiers (can't be decrypted, only verified)
export const hashIdentifier = async (data: string): Promise<string> => {
  if (!data) return '';
  const salt = await bcrypt.genSalt(SALT_LENGTH);
  return bcrypt.hash(data.toLowerCase().trim(), salt);
};

// Verify a hash (for lookups)
export const verifyHash = async (data: string, hash: string): Promise<boolean> => {
  if (!data || !hash) return false;
  return bcrypt.compare(data.toLowerCase().trim(), hash);
};

// Reversible encryption for sensitive text data
export const encryptText = (text: string): string => {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    return text; // Fallback to plain text on error
  }
};

// Decrypt sensitive text data
export const decryptText = (encryptedData: string): string => {
  if (!encryptedData) return '';
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      // Data might not be encrypted (backward compatibility)
      return encryptedData;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedData; // Return as-is if decryption fails
  }
};

// Hash multiple identifiers for storage
export const hashStudentIdentifiers = async (student: any) => {
  const { registeredMailId, phoneNumber, ...rest } = student;

  return {
    ...rest,
    registeredMailIdHash: await hashIdentifier(registeredMailId),
    phoneNumberHash: phoneNumber ? await hashIdentifier(phoneNumber) : '',
    // Keep plain text versions for display purposes (optional)
    registeredMailId: registeredMailId,
    phoneNumber: phoneNumber,
  };
};

// Encrypt sensitive comments and notes
export const encryptSensitiveFields = (student: any) => {
  const { reasonToHold, followUpComments, ...rest } = student;

  return {
    ...rest,
    reasonToHold: reasonToHold ? encryptText(reasonToHold) : '',
    followUpComments: followUpComments ? encryptText(followUpComments) : '',
  };
};

// Decrypt sensitive comments and notes
export const decryptSensitiveFields = (student: any) => {
  return {
    ...student,
    reasonToHold: student.reasonToHold ? decryptText(student.reasonToHold) : '',
    followUpComments: student.followUpComments ? decryptText(student.followUpComments) : '',
  };
};
