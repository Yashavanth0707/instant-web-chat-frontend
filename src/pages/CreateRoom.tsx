import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Video, MessageSquare, Check } from 'lucide-react';
import { useCreateRoom } from '../hooks/useRoomApi';
import type { ChatType } from '../types/room';

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

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  text-align: left;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSize.md};
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: 500;
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

const CountSelector = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const CountButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.fontSize.lg};
  font-weight: 600;
  border: 2px solid ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.surface};
  color: ${({ theme, $active }) => $active ? theme.colors.white : theme.colors.textMuted};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.white};
  }
`;

const TypeSelector = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const TypeButton = styled.button<{ $active: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.lg};
  border: 2px solid ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme, $active }) => $active ? 'rgba(100, 108, 255, 0.1)' : theme.colors.surface};
  color: ${({ theme, $active }) => $active ? theme.colors.white : theme.colors.textMuted};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.white};
  }
`;

const TypeIcon = styled.span`
  font-size: ${({ theme }) => theme.fontSize.xl};
`;

const PrimaryButton = styled.button<{ $large?: boolean }>`
  padding: ${({ $large }) => $large ? '18px 40px' : '14px 28px'};
  font-size: ${({ $large, theme }) => $large ? theme.fontSize.lg : theme.fontSize.base};
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

  &:disabled {
    background: ${({ theme }) => theme.colors.border};
    cursor: not-allowed;
  }
`;

const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.error};
  margin-top: 1rem;
`;

const RoomLinkBox = styled.div`
  position: relative;
  margin: 1.5rem 0;
`;

const LinkInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  font-size: ${({ theme }) => theme.fontSize.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.white};
  text-align: center;
`;

const CopiedBadge = styled.span`
  position: absolute;
  top: -10px;
  right: 10px;
  padding: 4px 8px;
  background: ${({ theme }) => theme.colors.success};
  color: ${({ theme }) => theme.colors.white};
  font-size: ${({ theme }) => theme.fontSize.xs};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const RedirectMsg = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSize.md};
`;

export function CreateRoom() {
  const navigate = useNavigate();
  const createRoomMutation = useCreateRoom();
  const [copied, setCopied] = useState(false);
  const [roomLink, setRoomLink] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [maxUsers, setMaxUsers] = useState(2);
  const [chatType, setChatType] = useState<ChatType>('video');
  const [adminName, setAdminName] = useState('');

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!adminName.trim()) {
      setValidationError('Please enter your name');
      return;
    }

    createRoomMutation.mutate(
      { maxUsers, chatType },
      {
        onSuccess: async (data) => {
          const link = `${window.location.origin}/join/${data.roomId}`;
          setRoomLink(link);
          await navigator.clipboard.writeText(link);
          setCopied(true);

          setTimeout(() => {
            navigate(`/room/${data.roomId}`, {
              state: { userName: adminName.trim(), chatType: data.chatType }
            });
          }, 1500);
        },
      }
    );
  };

  const error = validationError || (createRoomMutation.error?.message ?? null);

  if (roomLink) {
    return (
      <Page>
        <Container>
          <Title>Room Created!</Title>
          <Subtitle>Link copied to clipboard</Subtitle>
          <RoomLinkBox>
            <LinkInput type="text" value={roomLink} readOnly />
            {copied && (
              <CopiedBadge>
                <Check size={12} /> Copied!
              </CopiedBadge>
            )}
          </RoomLinkBox>
          <RedirectMsg>Joining room as {adminName}...</RedirectMsg>
        </Container>
      </Page>
    );
  }

  return (
    <Page>
      <Container>
        <Title>Instant Web Chat</Title>
        <Subtitle>P2P Video & Text Chat</Subtitle>

        <Form onSubmit={handleCreateRoom}>
          <FormGroup>
            <Label>Your Name (Admin)</Label>
            <Input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label>Number of Participants</Label>
            <CountSelector>
              {[2, 3, 4].map((num) => (
                <CountButton
                  key={num}
                  type="button"
                  $active={maxUsers === num}
                  onClick={() => setMaxUsers(num)}
                >
                  {num}
                </CountButton>
              ))}
            </CountSelector>
          </FormGroup>

          <FormGroup>
            <Label>Chat Type</Label>
            <TypeSelector>
              <TypeButton
                type="button"
                $active={chatType === 'video'}
                onClick={() => setChatType('video')}
              >
                <TypeIcon><Video size={24} /></TypeIcon>
                <span>Video Chat</span>
              </TypeButton>
              <TypeButton
                type="button"
                $active={chatType === 'text'}
                onClick={() => setChatType('text')}
              >
                <TypeIcon><MessageSquare size={24} /></TypeIcon>
                <span>Text Only</span>
              </TypeButton>
            </TypeSelector>
          </FormGroup>

          <PrimaryButton type="submit" disabled={createRoomMutation.isPending} $large>
            {createRoomMutation.isPending ? 'Creating...' : 'Create Room & Get Link'}
          </PrimaryButton>

          {error && <ErrorText>{error}</ErrorText>}
        </Form>
      </Container>
    </Page>
  );
}
