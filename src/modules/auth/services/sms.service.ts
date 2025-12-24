import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);
    private smsEnabled = false;
    private apiKey: string;
    private senderId: string;

    constructor() {
        this.apiKey = process.env.FAST2SMS_API_KEY || '';
        this.senderId = process.env.FAST2SMS_SENDER_ID || 'VYASAI';

        if (this.apiKey) {
            this.smsEnabled = true;
            this.logger.log('SMS service initialized with Fast2SMS');
        } else {
            this.logger.warn(
                'SMS service not configured. Missing FAST2SMS_API_KEY. OTPs will only be logged to console.',
            );
        }
    }

    async sendOtp(phoneE164: string, otp: string): Promise<boolean> {
        if (!this.smsEnabled || !this.apiKey) {
            this.logger.warn(`[SMS DISABLED] OTP for ${phoneE164}: ${otp}`);

            // In development, still log the OTP
            //   if (process.env.NODE_ENV !== 'production') {
            this.logger.log(`[DEV] OTP for ${phoneE164}: ${otp}`);
            //   }

            return false;
        }

        try {
            // Remove '+' and country code for Indian numbers (Fast2SMS expects 10-digit numbers)
            let phoneNumber = phoneE164.replace(/^\+91/, '').replace(/^\+/, '');

            // If still has country code, try to extract last 10 digits
            if (phoneNumber.length > 10) {
                phoneNumber = phoneNumber.slice(-10);
            }

            const message = `Your Vyasa verification code is ${otp}. Valid for 5 minutes. Do not share this code.`;

            const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
                method: 'POST',
                headers: {
                    'authorization': this.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    route: 'q',
                    sender_id: this.senderId,
                    message: message,
                    language: 'english',
                    flash: 0,
                    numbers: phoneNumber,
                }),
            });

            const result = await response.json();

            if (result.return === true || response.ok) {
                this.logger.log(`SMS sent successfully to ${phoneNumber}, Message ID: ${result.request_id || 'N/A'}`);
                return true;
            } else {
                throw new Error(result.message || 'Fast2SMS API error');
            }
        } catch (error) {
            this.logger.error(
                `Failed to send SMS to ${phoneE164}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );

            // Fallback: log OTP in dev mode if SMS fails
            if (process.env.NODE_ENV !== 'production') {
                this.logger.log(`[DEV FALLBACK] OTP for ${phoneE164}: ${otp}`);
            }

            // Don't throw error - allow the flow to continue even if SMS fails
            return false;
        }
    }

    isEnabled(): boolean {
        return this.smsEnabled;
    }
}
