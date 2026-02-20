import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';
import { ArrowLeft, Bug, Send, CheckCircle } from 'lucide-react';

interface BugFormData {
  email: string;
  bug: string;
  description: string;
}

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Container = styled.div`
  max-width: 500px;
  width: 100%;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xxl} ${({ theme }) => theme.spacing.xl};
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSize.md};
  cursor: pointer;
  padding: 0;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.white};
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSize.xl};
  color: ${({ theme }) => theme.colors.white};
  margin: 0 0 ${({ theme }) => theme.spacing.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 0;
  font-size: ${({ theme }) => theme.fontSize.md};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
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
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const TextArea = styled.textarea`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  font-size: ${({ theme }) => theme.fontSize.base};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.white};
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const FieldError = styled.span`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const SubmitButton = styled.button`
  padding: 14px 28px;
  font-size: ${({ theme }) => theme.fontSize.base};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.white};
  background: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  transition: background ${({ theme }) => theme.transitions.fast};
  margin-top: ${({ theme }) => theme.spacing.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover};
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.border};
    cursor: not-allowed;
  }
`;

const SuccessBox = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const SuccessIcon = styled(CheckCircle)`
  color: ${({ theme }) => theme.colors.success};
`;

const SuccessTitle = styled.h2`
  color: ${({ theme }) => theme.colors.white};
  margin: 0;
`;

const SuccessText = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 0;
`;

const ApiError = styled.p`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.fontSize.md};
  text-align: center;
`;

export function ReportBug() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BugFormData>();

  const onSubmit = async (data: BugFormData) => {
    setApiError(null);
    const accessKey = import.meta.env.VITE_WEB3FORMS_KEY;

    if (!accessKey || accessKey === 'your_web3forms_access_key_here') {
      setApiError('Web3Forms API key is not configured.');
      return;
    }

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `Bug Report: ${data.bug}`,
          from_name: 'Instant Web Chat - Bug Report',
          email: data.email,
          bug: data.bug,
          description: data.description,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setSubmitted(true);
      } else {
        setApiError(result.message || 'Failed to submit. Please try again.');
      }
    } catch {
      setApiError('Network error. Please try again.');
    }
  };

  if (submitted) {
    return (
      <Page>
        <Container>
          <BackButton onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Back to Home
          </BackButton>
          <SuccessBox>
            <SuccessIcon size={48} />
            <SuccessTitle>Bug Report Submitted</SuccessTitle>
            <SuccessText>
              Thank you for your feedback. We'll look into it.
            </SuccessText>
          </SuccessBox>
        </Container>
      </Page>
    );
  }

  return (
    <Page>
      <Container>
        <BackButton onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Back to Home
        </BackButton>

        <Header>
          <Title>
            <Bug size={24} />
            Report a Bug
          </Title>
          <Subtitle>Help us improve by reporting issues</Subtitle>
        </Header>

        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="your@email.com"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email',
                },
              })}
            />
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </FormGroup>

          <FormGroup>
            <Label>Bug Title</Label>
            <Input
              type="text"
              placeholder="Short summary of the issue"
              {...register('bug', {
                required: 'Bug title is required',
                minLength: { value: 3, message: 'At least 3 characters' },
              })}
            />
            {errors.bug && <FieldError>{errors.bug.message}</FieldError>}
          </FormGroup>

          <FormGroup>
            <Label>Description</Label>
            <TextArea
              placeholder="Describe the issue in detail..."
              {...register('description', {
                required: 'Description is required',
                minLength: { value: 10, message: 'At least 10 characters' },
              })}
            />
            {errors.description && (
              <FieldError>{errors.description.message}</FieldError>
            )}
          </FormGroup>

          {apiError && <ApiError>{apiError}</ApiError>}

          <SubmitButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              'Submitting...'
            ) : (
              <>
                <Send size={16} />
                Submit Report
              </>
            )}
          </SubmitButton>
        </Form>
      </Container>
    </Page>
  );
}
