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
    Row,
    Column,
    Img,
} from '@react-email/components';

/**
 * Email template for broker split requests
 * Includes all 3 CUSIPs and Approve/Reject action buttons
 */
export default function BrokerSplitRequestEmail({
    requestNumber = 'TR-2025-0001',
    // Broker Information
    brokerName = 'Unknown Broker',
    brokerEmail = 'broker@example.com',
    brokerCompany = '',
    dtcParticipantNumber = '0000',
    dwacSubmitted = false,
    // Issuer Information
    issuerName = 'Example Corp',
    // Split Details - All 3 Securities
    unitsQuantity = 10000,
    classAQuantity = 10000,
    warrantsQuantity = 10000,
    unitsCusip = 'XXXXXXXXX',
    classACusip = 'YYYYYYYYY',
    warrantsCusip = 'ZZZZZZZZZ',
    warrantsLabel = 'Warrants', // "Warrants" or "Rights"
    // Special Instructions
    specialInstructions = '',
    // Dates
    submittedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    // Action URLs
    approveUrl = '#',
    rejectUrl = '#',
    // Logo URL
    logoUrl = 'https://app.useefficiency.com/logo.png',
}) {
    // Brand colors
    const brandGold = '#D4AF37';
    const brandTeal = '#0891b2';
    const approveGreen = '#16a34a';
    const rejectRed = '#dc2626';

    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    {/* Header with Logo */}
                    <Section style={logoSection}>
                        <Img
                            src={logoUrl}
                            alt="Efficiency"
                            width="180"
                            height="auto"
                            style={logoImage}
                        />
                    </Section>

                    {/* Title Section */}
                    <Section style={headerSection}>
                        <Heading style={headingDark}>Broker Split Request</Heading>
                        <Text style={headerSubtextDark}>Action Required</Text>
                    </Section>

                    {/* Alert Box */}
                    <Section style={alertBox}>
                        <Text style={alertText}>
                            New split request <strong>#{requestNumber}</strong> requires your review
                        </Text>
                    </Section>

                    <Hr style={hr} />

                    {/* Broker Information */}
                    <Section style={sectionContainer}>
                        <Text style={sectionHeading}>BROKER INFORMATION</Text>
                        <table style={table}>
                            <tbody>
                                <tr>
                                    <td style={labelCell}>Broker:</td>
                                    <td style={valueCell}>{brokerName}</td>
                                </tr>
                                {brokerCompany && (
                                    <tr>
                                        <td style={labelCell}>Company:</td>
                                        <td style={valueCell}>{brokerCompany}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td style={labelCell}>Email:</td>
                                    <td style={valueCell}>{brokerEmail}</td>
                                </tr>
                                <tr>
                                    <td style={labelCell}>DTC Participant #:</td>
                                    <td style={{ ...valueCell, fontFamily: 'monospace', fontWeight: 'bold', fontSize: '16px' }}>
                                        {dtcParticipantNumber}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={labelCell}>DWAC Submitted:</td>
                                    <td style={valueCell}>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            backgroundColor: dwacSubmitted ? '#dcfce7' : '#fef3c7',
                                            color: dwacSubmitted ? '#166534' : '#92400e',
                                        }}>
                                            {dwacSubmitted ? 'YES' : 'NO'}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </Section>

                    <Hr style={hr} />

                    {/* Split Request Details - 3 Securities */}
                    <Section style={sectionContainer}>
                        <Text style={sectionHeading}>SPLIT REQUEST DETAILS</Text>
                        <Text style={{ ...value, color: '#6b7280', marginBottom: '16px' }}>
                            Issuer: <strong style={{ color: '#111827' }}>{issuerName}</strong>
                        </Text>

                        {/* Units - DEBIT */}
                        <div style={securityCard}>
                            <div style={{ ...securityHeader, backgroundColor: '#fee2e2', borderColor: '#fecaca' }}>
                                <span style={{ ...securityBadge, backgroundColor: rejectRed }}>DEBIT</span>
                                <span style={securityTitle}>Units</span>
                            </div>
                            <table style={{ ...securityTable }}>
                                <tbody>
                                    <tr>
                                        <td style={securityLabel}>Quantity:</td>
                                        <td style={{ ...securityValue, color: rejectRed }}>
                                            -{unitsQuantity.toLocaleString()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={securityLabel}>CUSIP:</td>
                                        <td style={{ ...securityValue, fontFamily: 'monospace' }}>{unitsCusip}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Class A - CREDIT */}
                        <div style={securityCard}>
                            <div style={{ ...securityHeader, backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }}>
                                <span style={{ ...securityBadge, backgroundColor: approveGreen }}>CREDIT</span>
                                <span style={securityTitle}>Class A Shares</span>
                            </div>
                            <table style={{ ...securityTable }}>
                                <tbody>
                                    <tr>
                                        <td style={securityLabel}>Quantity:</td>
                                        <td style={{ ...securityValue, color: approveGreen }}>
                                            +{classAQuantity.toLocaleString()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={securityLabel}>CUSIP:</td>
                                        <td style={{ ...securityValue, fontFamily: 'monospace' }}>{classACusip}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Warrants/Rights - CREDIT */}
                        <div style={securityCard}>
                            <div style={{ ...securityHeader, backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }}>
                                <span style={{ ...securityBadge, backgroundColor: approveGreen }}>CREDIT</span>
                                <span style={securityTitle}>{warrantsLabel}</span>
                            </div>
                            <table style={{ ...securityTable }}>
                                <tbody>
                                    <tr>
                                        <td style={securityLabel}>Quantity:</td>
                                        <td style={{ ...securityValue, color: approveGreen }}>
                                            +{warrantsQuantity.toLocaleString()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={securityLabel}>CUSIP:</td>
                                        <td style={{ ...securityValue, fontFamily: 'monospace' }}>{warrantsCusip}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Section>

                    {/* Special Instructions */}
                    {specialInstructions && (
                        <>
                            <Hr style={hr} />
                            <Section style={sectionContainer}>
                                <Text style={sectionHeading}>SPECIAL INSTRUCTIONS</Text>
                                <Section style={instructionsBox}>
                                    <Text style={instructionsText}>{specialInstructions}</Text>
                                </Section>
                            </Section>
                        </>
                    )}

                    {/* Spacer before action sections */}
                    <Section style={{ padding: '16px 0' }} />

                    <Hr style={hr} />

                    {/* Action Buttons */}
                    <Section style={actionSection}>
                        <Text style={{ ...sectionHeading, textAlign: 'center', marginBottom: '8px' }}>
                            TAKE ACTION
                        </Text>
                        <Text style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', margin: '0 0 24px 0' }}>
                            Review the details above and approve or reject the request
                        </Text>

                        <Row>
                            <Column align="center" style={{ paddingRight: '8px' }}>
                                <Button
                                    style={approveButton}
                                    href={approveUrl}
                                >
                                    Approve Request
                                </Button>
                            </Column>
                            <Column align="center" style={{ paddingLeft: '8px' }}>
                                <Button
                                    style={rejectButton}
                                    href={rejectUrl}
                                >
                                    Reject Request
                                </Button>
                            </Column>
                        </Row>

                        <Text style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '16px' }}>
                            Approve will redirect you to process the transaction.
                            Reject will prompt you for a rejection reason.
                        </Text>
                    </Section>

                    {/* Sign-off */}
                    <Section style={{ padding: '24px 32px 0' }}>
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
                        <Text style={{ ...footerText, marginTop: '12px', color: '#9ca3af' }}>
                            Submitted: {submittedDate}
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

const headingDark = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#18181b',
    margin: '0 0 8px 0',
    textAlign: 'center',
};

const headerSubtext = {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.9)',
    margin: '0',
    textAlign: 'center',
};

const headerSubtextDark = {
    fontSize: '14px',
    color: '#6b7280',
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

const sectionContainer = {
    padding: '0 32px',
};

const sectionHeading = {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '24px 0 12px 0',
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
    margin: '4px 0',
};

// Security card styles
const securityCard = {
    marginBottom: '16px',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
};

const securityHeader = {
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid #e5e7eb',
};

const securityBadge = {
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '2px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase',
};

const securityTitle = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    marginLeft: '8px',
};

const securityTable = {
    width: '100%',
    padding: '12px 16px',
};

const securityLabel = {
    fontSize: '13px',
    color: '#6b7280',
    padding: '4px 12px 4px 0',
    width: '80px',
};

const securityValue = {
    fontSize: '14px',
    fontWeight: '600',
    padding: '4px 0',
};

const instructionsBox = {
    backgroundColor: '#fef3c7',
    borderLeft: '4px solid #f59e0b',
    padding: '16px',
    borderRadius: '4px',
};

const instructionsText = {
    fontSize: '14px',
    color: '#78350f',
    margin: '0',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
};

const actionSection = {
    padding: '24px 32px',
    backgroundColor: '#f9fafb',
};

const approveButton = {
    backgroundColor: '#16a34a',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center',
    display: 'inline-block',
    padding: '12px 24px',
    lineHeight: '1.5',
    minWidth: '140px',
};

const rejectButton = {
    backgroundColor: '#dc2626',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center',
    display: 'inline-block',
    padding: '12px 24px',
    lineHeight: '1.5',
    minWidth: '140px',
};

const viewButton = {
    borderRadius: '6px',
    color: '#000000',
    fontSize: '14px',
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

const companyFooter = {
    backgroundColor: '#fafafa',
    padding: '24px 32px',
    textAlign: 'center',
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

const logoSection = {
    padding: '24px 32px',
    textAlign: 'center',
    backgroundColor: '#ffffff',
};

const logoImage = {
    margin: '0 auto',
};
