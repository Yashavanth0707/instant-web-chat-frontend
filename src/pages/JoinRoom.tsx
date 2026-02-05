import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Video, MessageSquare, Users, Loader2 } from 'lucide-react';
import { useRoomInfo } from '../hooks/useRoomApi';
import { RoomClosed } from '../components/RoomClosed';

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Container = styled.div`
  max-width: 500px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xxl} ${({ theme }) => theme.spacing.xl};
  text-align: center;
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSize.xxl};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.white};
`;

const RoomIdText = styled.p`
  font-size: ${({ theme }) => theme.fontSize.lg};
  color: ${({ theme }) => theme.colors.textDark};
  margin-bottom: 1rem;
`;

const RoomInfo = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const InfoBadge = styled.span`
  padding: 6px 12px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.white};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const Input = styled.input`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  font-size: ${({ theme }) => theme.fontSize.base};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.white};
  text-align: center;
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
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
  transition: background ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover};
  }
`;

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const SpinnerIcon = styled(Loader2)`
  animation: spin 1s linear infinite;

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
`;

export function JoinRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');

  const { data, isLoading, error } = useRoomInfo(roomId);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim() && roomId && data?.room) {
      navigate(`/room/${roomId}`, {
        state: { userName: userName.trim(), chatType: data.room.chatType }
      });
    }
  };

  if (isLoading) {
    return (
      <Page>
        <Container>
          <LoadingWrapper>
            <SpinnerIcon size={32} />
            <LoadingText>Checking room...</LoadingText>
          </LoadingWrapper>
        </Container>
      </Page>
    );
  }

  if (error || !data?.canJoin) {
    const errorMessage = error?.message || data?.message || data?.reason || 'Room is full or does not exist';
    return <RoomClosed reason={errorMessage} />;
  }

  const { room } = data;

  return (
    <Page>
      <Container>
        <Title>Join Room</Title>
        <RoomIdText>Room: {roomId}</RoomIdText>

        <RoomInfo>
          <InfoBadge>
            {room.chatType === 'video' ? <Video size={16} /> : <MessageSquare size={16} />}
            {room.chatType === 'video' ? 'Video Chat' : 'Text Only'}
          </InfoBadge>
          <InfoBadge>
            <Users size={16} />
            {room.userCount}/{room.maxUsers} users
          </InfoBadge>
        </RoomInfo>

        <Form onSubmit={handleJoin}>
          <Input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            required
            autoFocus
          />
          <PrimaryButton type="submit">Join Room</PrimaryButton>
        </Form>
      </Container>
    </Page>
  );
}
