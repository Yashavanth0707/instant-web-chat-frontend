import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Home } from 'lucide-react';

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Container = styled.div`
  text-align: center;
  max-width: 400px;
`;

const Code = styled.h1`
  font-size: 6rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  margin: 0;
  line-height: 1;

  @media (max-width: 480px) {
    font-size: 4rem;
  }
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSize.xl};
  color: ${({ theme }) => theme.colors.white};
  margin: ${({ theme }) => theme.spacing.md} 0;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSize.md};
  margin-bottom: 2rem;
`;

const HomeButton = styled.button`
  padding: 14px 28px;
  font-size: ${({ theme }) => theme.fontSize.base};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.white};
  background: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  transition: background ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover};
  }
`;

export function NotFound() {
  const navigate = useNavigate();

  return (
    <Page>
      <Container>
        <Code>404</Code>
        <Title>Page Not Found</Title>
        <Description>
          The page you're looking for doesn't exist or has been moved.
        </Description>
        <HomeButton onClick={() => navigate('/')}>
          <Home size={18} />
          Go Home
        </HomeButton>
      </Container>
    </Page>
  );
}
