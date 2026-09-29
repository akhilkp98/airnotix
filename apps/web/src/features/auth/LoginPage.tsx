import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Eye, EyeOff } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { DEMO_PASSWORD, DEMO_USERS, REMEMBERED_EMAIL_KEY } from '../../domain/demoData';
import { ROLE_LABELS, homePathForRole } from '../../domain/permissions';
import { AppSelect } from '../../components/forms/AppSelect';
import { tokens } from '../../theme/tokens';
import { useSnackbar } from '../../components/feedback/snackbar';
import { useAuth } from './AuthProvider';

function rememberedEmail() {
  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? 'meera.krishnan@northstar.example';
  } catch {
    return 'meera.krishnan@northstar.example';
  }
}

export function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useSnackbar();
  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');

  if (user) return <Navigate to={homePathForRole(user.role)} replace />;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = signIn(email, password);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    try {
      if (remember) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, result.user.email);
      else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    } catch {
      // Sign-in still continues when the browser blocks storage.
    }
    const from = (location.state as { from?: string } | null)?.from;
    notify(`Signed in as ${result.user.name}`);
    navigate(from && from !== '/login' ? from : homePathForRole(result.user.role), { replace: true });
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, py: 4, bgcolor: tokens.page }}>
      <Box
        component="form"
        onSubmit={submit}
        data-testid="login-form"
        sx={{
          width: '100%',
          maxWidth: 440,
          bgcolor: tokens.surface,
          border: `1px solid ${tokens.line}`,
          borderRadius: 3,
          p: { xs: 3, sm: 4 },
        }}
      >
        <Box component="img" src="/airnotix-logo.png" alt="Airnotix" sx={{ width: 168, height: 'auto', display: 'block', mb: 3 }} />
        <Typography component="h1" variant="h1" sx={{ fontSize: '1.5rem', mb: 0.75 }}>
          Sign in to your academy workspace
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Northstar Flight Academy · Kochi Training Base. This sign-in checks the sample accounts in this browser only.
        </Typography>
        <AppSelect
          fullWidth
          label="Demonstration account"
          value={DEMO_USERS.some((account) => account.email === email) ? email : ''}
          onChange={(value) => { setEmail(value); setError(''); }}
          sx={{ mb: 2 }}
          options={DEMO_USERS.map((account) => ({
            value: account.email,
            label: `${account.name} — ${ROLE_LABELS[account.role]}`,
          }))}
        />
        <TextField
          fullWidth
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => { setEmail(event.target.value); setError(''); }}
          sx={{ mb: 2 }}
          required
        />
        <TextField
          fullWidth
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={(event) => { setPassword(event.target.value); setError(''); }}
          helperText="Shared demonstration password: demonstration"
          required
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((value) => !value)}
                    edge="end"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControlLabel
          sx={{ mt: 1, mb: 1 }}
          control={<Checkbox checked={remember} onChange={(event) => setRemember(event.target.checked)} />}
          label="Remember email on this browser"
        />
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        <Button type="submit" variant="contained" color="accent" fullWidth>
          Sign in
        </Button>
      </Box>
    </Box>
  );
}
