import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { FormError } from '../../components/ui/FormError';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { getAuthErrorMessage } from '../../lib/auth-errors';
import { registerSchema, type RegisterFormData } from '../../lib/validation';
import { AuthShell } from './AuthShell';

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptedTerms: false,
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setFormError(null);
    try {
      await signUp({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
      });
      navigate('/auth/login', { replace: true });
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    }
  };

  return (
    <AuthShell
      title="Create Account"
      description="Register with your school-provided email address."
      footer={
        <>
          Already registered?{' '}
          <Link to="/auth/login" className="font-black text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left" noValidate>
        <Input
          label="Full name"
          autoComplete="name"
          error={errors.displayName?.message}
          {...register('displayName')}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
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
        <label className="flex items-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
            {...register('acceptedTerms')}
          />
          <span>I accept the Terms of Service and Privacy Policy.</span>
        </label>
        <FormError message={errors.acceptedTerms?.message || formError || undefined} />
        <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
          Create Account
        </Button>
      </form>
    </AuthShell>
  );
}
