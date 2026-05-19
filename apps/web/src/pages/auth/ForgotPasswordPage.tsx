import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { FormError } from '../../components/ui/FormError';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { getAuthErrorMessage } from '../../lib/auth-errors';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../../lib/validation';
import { AuthShell } from './AuthShell';

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setFormError(null);
    try {
      await sendPasswordReset(data.email);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    }
  };

  return (
    <AuthShell
      title="Reset Password"
      description="Enter your email and we will send a secure reset link."
      footer={
        <Link to="/auth/login" className="font-black text-blue-600">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormError message={formError || undefined} />
        <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
          Send Reset Link
        </Button>
      </form>
    </AuthShell>
  );
}
