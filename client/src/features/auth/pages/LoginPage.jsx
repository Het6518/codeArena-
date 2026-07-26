import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; // toast notification library
import { Button, Input, Spinner } from '../../../components/ui';
import { authService } from '../services/authService';
import { loginSchema } from '../services/schemas';
import { AuthLayout } from '../components/AuthLayout';
import { useAuthStore } from '../../../store/useAuthStore';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation(); //uselocation to get the current location and pass it to the login page so that we can redirect the user back to the page they were trying to access after they log in
  const login = useAuthStore((state) => state.login);
  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values) => {
    try {
      const response = await authService.login(values);
      login({ token: response.token, user: response.user });
      toast.success('Logged in successfully.');
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setError('root', { message: error.message });
      toast.error(error.message);
    }
  };

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in to CodeArena"
      description="Continue to your competitive programming workspace."
      footerText="New to CodeArena?"
      footerLinkText="Create an account"
      footerTo="/register"
    >
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {errors.root?.message && <div className="form-alert">{errors.root.message}</div>}
        <Input id="email" label="Email" type="email" placeholder="you@example.com" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input id="password" label="Password" type="password" placeholder="Your password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
        <Button type="submit" className="auth-submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner label="Logging in" /> : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
