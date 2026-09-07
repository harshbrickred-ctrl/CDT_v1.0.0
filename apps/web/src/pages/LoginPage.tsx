import { FormEvent, useId, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/brand/BrandLogo';
import {
  ORGANIZATIONS,
  orgLogoSrc,
  type OrganizationId,
} from '../lib/organizations';

const FEATURES = [
  {
    title: 'Candidate master',
    description: 'Single source of truth for every placed candidate.',
  },
  {
    title: 'Leave & timesheets',
    description: 'Track presence and time delivery without spreadsheets.',
  },
  {
    title: 'Engagement health',
    description: 'On Track, At Risk, and Escalated signals in one view.',
  },
] as const;

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

const formStagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const formItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function MailIcon() {
  return (
    <svg
      aria-hidden
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        aria-hidden
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      aria-hidden
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
      />
    </svg>
  );
}

type LoginFieldProps = {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
};

function LoginField({
  id,
  label,
  type,
  autoComplete,
  value,
  onChange,
  icon,
  trailing,
}: LoginFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className={`mb-2 block text-sm font-medium transition-colors ${
          focused ? 'text-slate-deep' : 'text-foreground'
        }`}
      >
        {label}
      </label>
      <div
        className={`login-field-shell flex items-center gap-2 rounded-lg border bg-background px-3 transition-all duration-200 ${
          focused
            ? 'border-primary/60 shadow-[0_0_0_3px_hsl(38_92%_46%_/_0.12)]'
            : 'border-border hover:border-border/80'
        }`}
      >
        <span
          className={`transition-colors ${
            focused ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          {icon}
        </span>
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/70"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required
        />
        {trailing}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login, accessToken } = useAuth();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const passwordToggleId = useId();
  const [organization, setOrganization] =
    useState<OrganizationId>('brickred');
  const [email, setEmail] = useState('admin@sst.local');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (accessToken) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password, organization);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  const motionProps = prefersReducedMotion
    ? { initial: false as const, animate: { opacity: 1, x: 0, y: 0 } }
    : {};

  const selectedOrg =
    ORGANIZATIONS.find((o) => o.id === organization) ?? ORGANIZATIONS[0];

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <section
        aria-labelledby="login-brand-heading"
        className="relative overflow-hidden bg-slate-deep px-6 py-10 sm:px-10 lg:px-14 lg:py-16"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,hsl(222_28%_12%)_0%,hsl(222_28%_16%)_45%,hsl(222_24%_20%)_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(210 20% 96%) 1px, transparent 1px), linear-gradient(90deg, hsl(210 20% 96%) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div
          aria-hidden
          className="login-orb pointer-events-none absolute -left-16 top-12 h-56 w-56 rounded-full bg-primary/20 blur-3xl"
        />
        <div
          aria-hidden
          className="login-orb-alt pointer-events-none absolute bottom-8 right-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />

        <motion.div
          className="relative z-10 mx-auto flex h-full max-w-lg flex-col justify-center"
          variants={stagger}
          initial={prefersReducedMotion ? false : 'hidden'}
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <BrandLogo
              organization={organization}
              tone="dark"
              showTagline
              imgClassName="h-16 w-auto max-w-[360px] object-contain object-left sm:h-20 lg:h-24 lg:max-w-[420px]"
            />
          </motion.div>
          <motion.p
            variants={fadeUp}
            id="login-brand-heading"
            className="mt-6 max-w-md text-base leading-relaxed text-white/75 sm:text-lg"
          >
            {selectedOrg.name} post-placement delivery control—presence, time,
            and engagement health in one ops console.
          </motion.p>

          <motion.ul
            variants={fadeUp}
            className="mt-8 hidden space-y-4 sm:block lg:mt-10"
          >
            {FEATURES.map((feature, index) => (
              <motion.li
                key={feature.title}
                variants={fadeUp}
                className="group flex gap-4"
              >
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {feature.title}
                  </p>
                  <p className="mt-0.5 text-sm text-white/60">
                    {feature.description}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </section>

      {/* Form panel */}
      <section className="relative flex items-center justify-center bg-background px-6 py-10 sm:px-10 lg:px-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_100%_0%,hsl(38_80%_92%_/_0.35),transparent_50%)]"
        />
        <div
          aria-hidden
          className="login-orb-alt pointer-events-none absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl"
        />

        <motion.div
          className="relative z-10 w-full max-w-[420px]"
          initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={
            prefersReducedMotion
              ? undefined
              : { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const, delay: 0.15 }
          }
          {...motionProps}
        >
          <div className="mb-8 lg:hidden">
            <BrandLogo organization={organization} tone="light" showTagline />
          </div>

          <motion.p
            variants={formItem}
            initial={prefersReducedMotion ? false : 'hidden'}
            animate="visible"
            className="mb-4 hidden text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground lg:block"
          >
            Welcome back
          </motion.p>

          <motion.form
            onSubmit={onSubmit}
            variants={formStagger}
            initial={prefersReducedMotion ? false : 'hidden'}
            animate="visible"
            className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/95 p-6 shadow-[0_24px_80px_-24px_hsl(222_28%_16%_/_0.18)] backdrop-blur-sm sm:p-8"
          >
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl"
            />

            <motion.div variants={formItem} className="relative flex gap-4">
              <BrandLogo
                organization={organization}
                variant="mark"
                tone="light"
                markClassName="h-11 w-11 shrink-0"
              />
              <div>
                <h1 className="font-display text-2xl font-semibold text-slate-deep">
                  Sign in
                </h1>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Choose your organization, then sign in with team credentials.
                </p>
              </div>
            </motion.div>

            <div className="relative mt-8 space-y-5">
              <motion.div variants={formItem}>
                <p
                  id="org-label"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Organization
                </p>
                <div
                  role="radiogroup"
                  aria-labelledby="org-label"
                  className="grid grid-cols-2 gap-2"
                >
                  {ORGANIZATIONS.map((org) => {
                    const selected = organization === org.id;
                    return (
                      <button
                        key={org.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setOrganization(org.id)}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition ${
                          selected
                            ? 'border-primary bg-primary/10 shadow-[0_0_0_3px_hsl(38_92%_46%_/_0.12)]'
                            : 'border-border bg-background hover:border-border/80 hover:bg-muted/40'
                        }`}
                      >
                        <img
                          src={orgLogoSrc(org, 'light', 'mark')}
                          alt=""
                          className="h-8 w-8 shrink-0 object-contain"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-deep">
                            {org.name}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {org.productName}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div variants={formItem}>
                <LoginField
                  id="email"
                  label="Work email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={setEmail}
                  icon={<MailIcon />}
                />
              </motion.div>

              <motion.div variants={formItem}>
                <LoginField
                  id="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={setPassword}
                  icon={<LockIcon />}
                  trailing={
                    <button
                      type="button"
                      id={passwordToggleId}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  }
                />
              </motion.div>
            </div>

            {error && (
              <motion.div
                role="alert"
                variants={formItem}
                initial={prefersReducedMotion ? false : { opacity: 0, x: 0 }}
                animate={
                  prefersReducedMotion
                    ? { opacity: 1 }
                    : { opacity: 1, x: [0, -6, 6, -4, 4, 0] }
                }
                transition={{ duration: 0.45 }}
                className="mt-5 flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
              >
                <AlertIcon />
                <span>{error}</span>
              </motion.div>
            )}

            <motion.div variants={formItem} className="mt-6">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={
                  prefersReducedMotion || loading ? undefined : { y: -1 }
                }
                whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-12px_hsl(38_92%_46%_/_0.65)] transition-shadow hover:shadow-[0_16px_36px_-12px_hsl(38_92%_46%_/_0.75)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 opacity-0 transition-opacity group-hover:opacity-100"
                />
                {loading ? (
                  <>
                    <span
                      aria-hidden
                      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                    />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in to {selectedOrg.name}
                    <svg
                      aria-hidden
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </>
                )}
              </motion.button>
            </motion.div>

            <motion.p
              variants={formItem}
              className="mt-5 text-center text-xs text-muted-foreground"
            >
              Authorized personnel only. Activity is logged for audit.
            </motion.p>
          </motion.form>
        </motion.div>
      </section>
    </div>
  );
}
