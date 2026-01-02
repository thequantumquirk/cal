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
} from '@react-email/components';

export default function BrokerRequestSubmittedEmail({
    requestNumber = 'TR-2025-0001',
    requestType = 'DWAC Deposit',
    shareholderName = 'John Doe',
    quantity = 1000,
    securityType = 'Class A',
    priority = 'Normal',
    brokerName = 'Unknown Broker',
    brokerEmail = 'broker@example.com',
    brokerCompany = '',
    issuerName = 'Example Corp',
    submittedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    requestUrl = '#'
}) {
    const priorityColors = {
        'Urgent': '#dc2626',
        'High': '#ea580c',
        'Normal': '#0891b2'
    };

    const priorityColor = priorityColors[priority] || priorityColors.Normal;

    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Heading style={heading}>🔔 New Transfer Request</Heading>

                    {/* Alert Box */}
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
                                <tr>
                                    <td style={labelCell}>Issuer:</td>
                                    <td style={valueCell}>{issuerName}</td>
                                </tr>
                                <tr>
                                    <td style={labelCell}>Shareholder:</td>
                                    <td style={valueCell}>{shareholderName}</td>
                                </tr>
                                <tr>
                                    <td style={labelCell}>Security:</td>
                                    <td style={valueCell}>{securityType}</td>
                                </tr>
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

                    {/* CTA Button */}
                    <Section style={{ textAlign: 'center', marginTop: '24px' }}>
                        <Button style={button} href={requestUrl}>
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
                        <Text style={footerCompany}>EZ Transfer Agent | Senatio Financial Services</Text>
                        <Text style={footerAddress}>
                            123 Financial District, Chennai, Tamil Nadu 600001, India
                        </Text>
                        <Text style={footerLinks}>
                            Need help? <a href="mailto:support@useefficiency.com" style={footerLink}>Contact Support</a>
                        </Text>
                        <Text style={footerCopyright}>
                            © {new Date().getFullYear()} Senatio. All rights reserved.
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
    padding: '32px',
    borderRadius: '8px',
    maxWidth: '600px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const heading = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 24px 0',
    textAlign: 'center',
};

const alertBox = {
    backgroundColor: '#eff6ff',
    borderLeft: '4px solid #0891b2',
    padding: '16px',
    borderRadius: '4px',
    margin: '16px 0',
};

const alertText = {
    margin: '0',
    fontSize: '14px',
    color: '#1e40af',
    lineHeight: '1.5',
};

const hr = {
    borderColor: '#e5e7eb',
    margin: '24px 0',
};

const sectionHeading = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 12px 0',
};

const table = {
    width: '100%',
    borderCollapse: 'collapse',
};

const labelCell = {
    fontSize: '14px',
    color: '#6b7280',
    padding: '8px 16px 8px 0',
    verticalAlign: 'top',
    width: '120px',
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
    margin: '4px 0',
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
    marginTop: '32px',
    lineHeight: '1.5',
};

const companyFooter = {
    backgroundColor: '#f9fafb',
    padding: '24px',
    borderRadius: '0 0 8px 8px',
    textAlign: 'center',
    marginTop: '24px',
};

const footerCompany = {
    fontSize: '13px',
    fontWeight: '600',
    color: '#4b5563',
    margin: '0 0 8px 0',
};

const footerAddress = {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0 0 12px 0',
    lineHeight: '1.5',
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
