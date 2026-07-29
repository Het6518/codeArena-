import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button, Input, Spinner } from '../../../components/ui';
import { authService } from '../services/authService';
import { registerSchema } from '../services/schemas';
import { AuthLayout } from '../components/AuthLayout';

export function RegisterPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values) => {
    try {
      await authService.register(values);
      toast.success('Account created. You can now log in.');
      navigate('/login');
    } catch (error) {
      setError('root', { message: error.message });
      toast.error(error.message);
    }
  };

  return (
    <AuthLayout
      eyebrow="Create account"
      title="Join CodeArena"
      description="Create your developer profile and prepare for real-time coding battles."
      footerText="Already have an account?"
      footerLinkText="Log in"
      footerTo="/login"
    >
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {errors.root?.message && <div className="form-alert">{errors.root.message}</div>}
        <Input id="username" label="Username" placeholder="tourist_01" autoComplete="username" error={errors.username?.message} {...register('username')} />
        <Input id="email" label="Email" type="email" placeholder="you@example.com" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input id="password" label="Password" type="password" placeholder="Minimum 6 characters" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
        <Button type="submit" className="auth-submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner label="Creating account" /> : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
