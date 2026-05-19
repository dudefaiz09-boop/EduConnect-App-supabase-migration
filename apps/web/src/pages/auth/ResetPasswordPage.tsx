import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { FormError } from '../../components/ui/FormError';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { getAuthErrorMessage } from '../../lib/auth-errors';
import { resetPasswordSchema, type ResetPasswordFormData } from '../../lib/validation';
import { AuthShell } from './AuthShell';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setFormError(null);
    try {
      await updatePassword(data.password);
      navigate('/auth/login', { replace: true });
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    }
  };

  return (
    <AuthShell
      title="Choose New Password"
      description="Set a strong password for your EduConnect account."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left" noValidate>
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <FormError message={formError || undefined} />
        <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
          Update Password
        </Button>
      </form>
    </AuthShell>
  );
}
