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
    const logoUrl = 'https://app.useefficiency.com/logo.png';
    const brandGold = '#D4AF37';

    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    {/* Logo Header */}
                    <Section style={{ textAlign: 'center', marginBottom: '16px' }}>
                        <Img
                            src={logoUrl}
                            alt="Efficiency"
                            width="180"
                            height="auto"
                            style={{ margin: '0 auto', display: 'block' }}
                        />
                    </Section>

                    {/* Header */}
                    <Heading style={heading}>New Transfer Request</Heading>

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

                    {/* Sign-off */}
                    <Section style={{ padding: '24px 0 0 0' }}>
                        <Text style={signoff}>Thank you,</Text>
                        <Text style={signoffName}>Carol Nguyen</Text>
                        <Text style={signoffTitle}>CEO, Efficiency</Text>
                    </Section>

                    <Hr style={hr} />

                    {/* Footer */}
                    <Section style={companyFooter}>
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

const signoff = {
    fontSize: '15px',
    color: '#3f3f46',
    margin: '0 0 4px 0',
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

const footerText = {
    fontSize: '12px',
    color: '#71717a',
    lineHeight: '1.6',
    margin: '0 0 8px 0',
    textAlign: 'center',
};

const companyFooter = {
    backgroundColor: '#fafafa',
    padding: '24px',
    borderRadius: '0 0 8px 8px',
    textAlign: 'center',
};

const footerLink = {
    color: '#0891b2',
    textDecoration: 'none',
};
