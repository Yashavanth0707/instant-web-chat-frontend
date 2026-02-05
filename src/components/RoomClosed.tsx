import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { XCircle, Home } from 'lucide-react';

const Wrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Content = styled.div`
  text-align: center;
`;

const IconWrapper = styled.div`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.error};
`;

const Title = styled.h2`
  color: ${({ theme }) => theme.colors.error};
  margin-bottom: 1rem;
`;

const Message = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: 2rem;
`;

const PrimaryButton = styled.button`
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

interface RoomClosedProps {
  reason?: string;
}

export function RoomClosed({ reason = 'Room is full or does not exist' }: RoomClosedProps) {
  const navigate = useNavigate();

  return (
    <Wrapper>
      <Content>
        <IconWrapper>
          <XCircle size={64} />
        </IconWrapper>
        <Title>Room Closed</Title>
        <Message>{reason}</Message>
        <PrimaryButton onClick={() => navigate('/')}>
          <Home size={18} />
          Go Home
        </PrimaryButton>
      </Content>
    </Wrapper>
  );
}
