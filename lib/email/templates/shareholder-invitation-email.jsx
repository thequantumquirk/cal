import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
    Button,
    Link,
    Img,
    Hr,
} from '@react-email/components';

/**
 * Professional email template for shareholder invitation
 */
export default function ShareholderInvitationEmail({
    shareholderName = 'Shareholder',
    inviteUrl = '#',
    issuerName = null,
    logoUrl = null,
}) {
    const brandColor = '#0891b2';
    const brandGold = '#D4AF37';
    const effectiveLogoUrl = logoUrl || 'https://app.useefficiency.com/logo.png';

    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    {/* Header with Logo */}
                    <Section style={headerSection}>
                        <Img
                            src={effectiveLogoUrl}
                            alt="Efficiency"
                            width="180"
                            height="auto"
                            style={{ margin: '0 auto', display: 'block' }}
                        />
                    </Section>

                    {/* Main Content */}
                    <Section style={contentSection}>
                        <Text style={greeting}>{shareholderName},</Text>

                        <Text style={paragraph}>
                            {issuerName
                                ? `You have been invited to access your shareholder account for ${issuerName} on Efficiency.`
                                : 'You have been invited to access your shareholder account on Efficiency.'
                            }
                        </Text>

                        <Text style={paragraph}>
                            Please click on the link below to set up your account.
                        </Text>

                        {/* CTA Button */}
                        <Section style={buttonContainer}>
                            <Button style={ctaButton} href={inviteUrl}>
                                Set Up Your Account
                            </Button>
                        </Section>

                        <Text style={paragraph}>
                            Do not hesitate to reach out to{' '}
                            <Link href="mailto:info@useefficiency.com" style={link}>
                                info@useefficiency.com
                            </Link>{' '}
                            if you have any questions.
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
                            <Link href="mailto:info@useefficiency.com" style={footerLink}>
                                info@useefficiency.com
                            </Link>
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
    maxWidth: '520px',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
};

const headerSection = {
    backgroundColor: '#ffffff',
    padding: '32px 40px 24px',
    borderBottom: '1px solid #e4e4e7',
};

const contentSection = {
    padding: '32px 40px',
};

const greeting = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#18181b',
    margin: '0 0 24px 0',
};

const paragraph = {
    fontSize: '15px',
    color: '#3f3f46',
    lineHeight: '1.7',
    margin: '0 0 20px 0',
};

const link = {
    color: '#0891b2',
    textDecoration: 'none',
    fontWeight: '500',
};

const buttonContainer = {
    textAlign: 'center',
    margin: '32px 0',
};

const ctaButton = {
    backgroundColor: '#D4AF37',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center',
    display: 'inline-block',
    padding: '14px 36px',
    boxShadow: '0 2px 4px rgba(212, 175, 55, 0.3)',
};

const signoff = {
    fontSize: '15px',
    color: '#3f3f46',
    margin: '32px 0 4px 0',
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

const divider = {
    borderColor: '#e4e4e7',
    margin: '0',
};

const footerSection = {
    padding: '24px 40px',
    backgroundColor: '#fafafa',
};

const footerText = {
    fontSize: '12px',
    color: '#71717a',
    lineHeight: '1.6',
    margin: '0 0 8px 0',
    textAlign: 'center',
};

const footerLink = {
    color: '#0891b2',
    textDecoration: 'none',
};
