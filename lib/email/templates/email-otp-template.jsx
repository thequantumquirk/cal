import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
    Hr,
    Img,
} from '@react-email/components';

/**
 * Email template for OTP verification code
 */
export default function EmailOTPTemplate({
    userName = 'there',
    otpCode = '000000',
    expiryMinutes = 5,
}) {
    const logoUrl = 'https://app.useefficiency.com/logo.png';

    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    {/* Header with Logo */}
                    <Section style={headerSection}>
                        <Img
                            src={logoUrl}
                            alt="Efficiency"
                            width="160"
                            height="auto"
                            style={{ margin: '0 auto', display: 'block' }}
                        />
                    </Section>

                    {/* Main Content */}
                    <Section style={contentSection}>
                        <Text style={greeting}>Hi {userName},</Text>

                        <Text style={paragraph}>
                            Here's your verification code to complete your account setup:
                        </Text>

                        {/* OTP Code Box */}
                        <Section style={otpContainer}>
                            <Text style={otpCodeStyle}>{otpCode}</Text>
                        </Section>

                        <Text style={expiryText}>
                            This code expires in {expiryMinutes} minutes.
                        </Text>

                        <Text style={paragraph}>
                            If you didn't request this code, you can safely ignore this email.
                        </Text>

                        <Text style={signoff}>Thank you,</Text>
                        <Text style={signoffName}>Carol Nguyen</Text>
                        <Text style={signoffTitle}>CEO, Efficiency</Text>
                    </Section>

                    <Hr style={divider} />

                    {/* Footer */}
                    <Section style={footerSection}>
                        <Text style={footerText}>
                            This email was sent by Efficiency.
                        </Text>
                        <Text style={footerText}>
                            If you did not expect this email, please ignore it or contact{' '}
                            <a href="mailto:info@useefficiency.com" style={footerLink}>info@useefficiency.com</a>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

// Styles
const main = {
    backgroundColor: '#f4f4f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    padding: '40px 0',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    maxWidth: '480px',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
};

const headerSection = {
    backgroundColor: '#ffffff',
    padding: '32px 40px 16px',
    borderBottom: '1px solid #e4e4e7',
};

const logoText = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0891b2',
    margin: '0',
    textAlign: 'center',
};

const contentSection = {
    padding: '32px 40px',
};

const greeting = {
    fontSize: '16px',
    color: '#18181b',
    margin: '0 0 20px 0',
};

const paragraph = {
    fontSize: '15px',
    color: '#3f3f46',
    lineHeight: '1.6',
    margin: '0 0 20px 0',
};

const otpContainer = {
    backgroundColor: '#f4f4f5',
    borderRadius: '8px',
    padding: '24px',
    margin: '24px 0',
    textAlign: 'center',
};

const otpCodeStyle = {
    fontSize: '36px',
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: '8px',
    color: '#18181b',
    margin: '0',
};

const expiryText = {
    fontSize: '13px',
    color: '#71717a',
    textAlign: 'center',
    margin: '0 0 24px 0',
};

const signoff = {
    fontSize: '15px',
    color: '#3f3f46',
    margin: '24px 0 4px 0',
};

const signoffName = {
    fontSize: '15px',
    color: '#18181b',
    fontWeight: '600',
    margin: '0',
};

const signoffTitle = {
    fontSize: '14px',
    color: '#3f3f46',
    margin: '0',
};

const footerLink = {
    color: '#0891b2',
    textDecoration: 'none',
};

const divider = {
    borderColor: '#e4e4e7',
    margin: '0',
};

const footerSection = {
    padding: '20px 40px',
    backgroundColor: '#fafafa',
};

const footerText = {
    fontSize: '12px',
    color: '#71717a',
    textAlign: 'center',
    margin: '0',
};
