import React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { DailyDigestEmailProps } from '@/lib/types';


const categoryStyles: { [key: string]: React.CSSProperties } = {
  'Аграрна': { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' },
  'Соціальна': { backgroundColor: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd' },
  'Корпоративна': { backgroundColor: '#fefce8', color: '#854d0e', borderColor: '#fde047' },
  'default': { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#d1d5db' },
};

const tagBaseStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 10px',
  margin: '0 4px 4px 0',
  fontSize: '12px',
  fontWeight: 500,
  borderRadius: '12px',
  border: '1px solid',
};

// --- Основний компонент листа ---

export const DailyDigestEmail = ({ bills }: DailyDigestEmailProps) => {
  const previewText = `Знайдено ${bills.length} нових законопроєктів, що відповідають вашим критеріям.`;
  const reportDate = new Date().toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Щоденний дайджест законодавства</Heading>
          <Text style={paragraph}>Звіт за {reportDate}</Text>
          <Hr style={hr} />

          {bills.map((bill) => (
            <Section key={bill.number} style={billSection}>
              <Link href={bill.url} style={link}>
                <Text style={billTitle}>{bill.number}: {bill.title}</Text>
              </Link>
              <Text style={billMeta}>Дата реєстрації: {bill.date}</Text>
              
              <div style={{ marginTop: '12px' }}>
                {bill.categories.map((category) => (
                  <span key={category} style={{ ...tagBaseStyle, ...(categoryStyles[category] || categoryStyles.default) }}>
                    {category}
                  </span>
                ))}
              </div>
            </Section>
          ))}

          <Hr style={hr} />
          <Text style={footer}>
            Цей лист згенеровано автоматично системою &quot;Законодавчий Монітор&quot;.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DailyDigestEmail;

const main: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px',
  border: '1px solid #eee',
  borderRadius: '5px',
};

const heading: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#333',
  lineHeight: '1.4',
};

const paragraph: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#555',
};

const billSection: React.CSSProperties = {
  margin: '24px 0',
};

const link: React.CSSProperties = {
  color: '#007bff',
  textDecoration: 'none',
};

const billTitle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  margin: 0,
  color: '#111827'
};

const billMeta: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '4px 0 0 0',
};

const hr: React.CSSProperties = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer: React.CSSProperties = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '1.5',
};