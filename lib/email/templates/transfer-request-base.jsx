import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
    Button,
    Hr,
    Heading,
    Img,
} from '@react-email/components';

/**
 * Base template for all transfer request email notifications
 * Uses brand colors: Metallic Gold (#D4AF37) and Teal (#0891b2)
 */
export default function TransferRequestBaseEmail({
    requestNumber = 'TR-2025-0001',
    requestType = 'DWAC Deposit',
    shareholderName = 'John Doe',
    accountNumber = '',
    cusip = '',
    quantity = 1000,
    securityType = 'Class A',
    priority = 'Normal',
    brokerName = 'Unknown Broker',
    brokerEmail = 'broker@example.com',
    brokerCompany = '',
    issuerName = 'Example Corp',
    requestPurpose = '',
    specialInstructions = '',
    submittedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    requestUrl = '#',
    logoUrl = '' // Logo URL - update with hosted URL
}) {
    const priorityColors = {
        'Urgent': '#dc2626',      // Red
        'High': '#ea580c',        // Orange
        'Normal': '#0891b2'       // Teal (app primary color)
    };

    const priorityColor = priorityColors[priority] || priorityColors.Normal;

    // Brand colors
    const brandGold = '#D4AF37';      // Metallic gold
    const brandGoldDark = '#C5A028';  // Darker gold
    const brandTeal = '#0891b2';      // App primary teal color

    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    {/* Logo Header - COMMENTED OUT - Add LOGO_URL to .env.local to enable */}
                    {/* {logoUrl && (
                        <Section style={logoSection}>
                            <Img
                                src={logoUrl}
                                alt="EZ Transfer Agent"
                                width="200"
                                height="auto"
                                style={logo}
                            />
                        </Section>
                    )} */}

                    {/* Header with teal gradient */}
                    <Section style={{ ...headerSection, background: `linear-gradient(135deg, ${brandTeal} 0%, #0e7490 100%)` }}>
                        <Heading style={heading}>New Transfer Request</Heading>
                        <Text style={headerSubtext}>Efficiency Transfer Agent</Text>
                    </Section>

                    {/* Alert Box with Priority */}
                    <Section style={{ ...alertBox, borderLeftColor: priorityColor }}>
                        <Text style={alertText}>
                            Request <strong>#{requestNumber}</strong> has been submitted and requires review
                        </Text>
                        <Text style={{ ...alertText, fontSize: '12px', marginTop: '4px' }}>
                            Priority: <strong style={{ color: priorityColor }}>{priority}</strong>
                        </Text>
                    </Section>

                    <Hr style={hr} />

                    {/* Request Details */}
                    <Section>
                        <Text style={sectionHeading}>Request Details</Text>
                        <table style={table}>
                            <tbody>
                                <tr>
                                    <td style={labelCell}>Type:</td>
                                    <td style={valueCell}>{requestType}</td>
                                </tr>
                                {requestPurpose && (
                                    <tr>
                                        <td style={labelCell}>Purpose:</td>
                                        <td style={valueCell}>{requestPurpose}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td style={labelCell}>Issuer:</td>
                                    <td style={valueCell}>{issuerName}</td>
                                </tr>
                                <tr>
                                    <td style={labelCell}>Shareholder:</td>
                                    <td style={valueCell}>{shareholderName}</td>
                                </tr>
                                {accountNumber && (
                                    <tr>
                                        <td style={labelCell}>Account #:</td>
                                        <td style={valueCell}>{accountNumber}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td style={labelCell}>Security:</td>
                                    <td style={valueCell}>{securityType}</td>
                                </tr>
                                {cusip && (
                                    <tr>
                                        <td style={labelCell}>CUSIP:</td>
                                        <td style={valueCell}>{cusip}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td style={labelCell}>Quantity:</td>
                                    <td style={valueCell}>{quantity.toLocaleString()} shares</td>
                                </tr>
                                <tr>
                                    <td style={labelCell}>Submitted:</td>
                                    <td style={valueCell}>{submittedDate}</td>
                                </tr>
                            </tbody>
                        </table>
                    </Section>

                    {/* Special Instructions (if any) */}
                    {specialInstructions && (
                        <>
                            <Hr style={hr} />
                            <Section>
                                <Text style={sectionHeading}>Special Instructions</Text>
                                <Section style={instructionsBox}>
                                    <Text style={instructionsText}>{specialInstructions}</Text>
                                </Section>
                            </Section>
                        </>
                    )}

                    <Hr style={hr} />

                    {/* Broker Info */}
                    <Section>
                        <Text style={sectionHeading}>Submitted By</Text>
                        <Text style={value}>{brokerName}</Text>
                        {brokerCompany && (
                            <Text style={{ ...value, color: '#6b7280', fontSize: '14px' }}>{brokerCompany}</Text>
                        )}
                        <Text style={{ ...value, color: '#6b7280', fontSize: '14px' }}>{brokerEmail}</Text>
                    </Section>

                    <Hr style={hr} />

                    {/* CTA Button with metallic gold */}
                    <Section style={{ textAlign: 'center', marginTop: '24px' }}>
                        <Button
                            style={{ ...button, backgroundColor: brandGold }}
                            href={requestUrl}
                        >
                            View Request Details →
                        </Button>
                    </Section>

                    {/* Footer */}
                    <Text style={footer}>
                        This is an automated notification from your transfer agent system.
                        Please do not reply to this email.
                    </Text>

                    <Hr style={hr} />

                    {/* Company Footer */}
                    <Section style={companyFooter}>
                        <Text style={{ ...footerCompany, color: brandTeal }}>
                            Efficiency Transfer Agent
                        </Text>
                        <Text style={{ ...footerQuote, color: '#6b7280', fontStyle: 'italic' }}>
                            "Always act with urgency"
                        </Text>
                        <Text style={footerLinks}>
                            Need help? <a href="mailto:support@useefficiency.com" style={{ ...footerLink, color: brandTeal }}>Contact Support</a>
                        </Text>
                        <Text style={footerCopyright}>
                            © {new Date().getFullYear()} Efficiency. All rights reserved.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

// Styles
const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    padding: '40px 0',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '0',
    borderRadius: '8px',
    maxWidth: '600px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
};

const logoSection = {
    textAlign: 'center',
    padding: '24px 32px 16px 32px',
    backgroundColor: '#ffffff',
};

const logo = {
    margin: '0 auto',
    display: 'block',
};

const headerSection = {
    padding: '24px 32px',
    textAlign: 'center',
};

const heading = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 8px 0',
    textAlign: 'center',
};

const headerSubtext = {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.9)',
    margin: '0',
    textAlign: 'center',
};

const alertBox = {
    backgroundColor: '#eff6ff',
    borderLeft: '4px solid #0891b2',
    padding: '16px',
    borderRadius: '4px',
    margin: '24px 32px',
};

const alertText = {
    margin: '0',
    fontSize: '14px',
    color: '#1e40af',
    lineHeight: '1.5',
};

const hr = {
    borderColor: '#e5e7eb',
    margin: '0 32px',
};

const sectionHeading = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '24px 32px 12px 32px',
};

const table = {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '0 32px',
    maxWidth: 'calc(100% - 64px)',
};

const labelCell = {
    fontSize: '14px',
    color: '#6b7280',
    padding: '8px 16px 8px 0',
    verticalAlign: 'top',
    width: '140px',
};

const valueCell = {
    fontSize: '14px',
    color: '#111827',
    fontWeight: '500',
    padding: '8px 0',
    verticalAlign: 'top',
};

const value = {
    fontSize: '14px',
    color: '#111827',
    margin: '4px 32px',
};

const instructionsBox = {
    backgroundColor: '#fef3c7',
    borderLeft: '4px solid #f59e0b',
    padding: '16px',
    borderRadius: '4px',
    margin: '0 32px',
};

const instructionsText = {
    fontSize: '14px',
    color: '#78350f',
    margin: '0',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
};

const button = {
    backgroundColor: '#0891b2',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center',
    display: 'inline-block',
    padding: '12px 32px',
    lineHeight: '1.5',
};

const footer = {
    fontSize: '12px',
    color: '#9ca3af',
    textAlign: 'center',
    margin: '24px 32px',
    lineHeight: '1.5',
};

const companyFooter = {
    backgroundColor: '#f9fafb',
    padding: '24px 32px',
    textAlign: 'center',
};

const footerCompany = {
    fontSize: '13px',
    fontWeight: '600',
    color: '#4b5563',
    margin: '0 0 4px 0',
};

const footerQuote = {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0 0 16px 0',
    lineHeight: '1.5',
    fontStyle: 'italic',
};

const footerLinks = {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0 0 12px 0',
};

const footerLink = {
    color: '#0891b2',
    textDecoration: 'none',
};

const footerCopyright = {
    fontSize: '11px',
    color: '#9ca3af',
    margin: '0',
};
