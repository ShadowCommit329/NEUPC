'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FacebookIcon,
  LinkedInIcon,
  GitHubIcon,
  TwitterIcon,
  YouTubeIcon,
} from '../_components/ui/SocialIcons';
import { submitContactFormAction } from '@/app/_lib/contact-actions';
import { cn } from '../_lib/utils';

const ScrollToTop = dynamic(() => import('../_components/ui/ScrollToTop'), {
  ssr: false,
});

// ─── Motion variants — synced with events & achievements pages ───────────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const cardReveal = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const viewport = { once: true, margin: '-40px 0px' };

// ─── Constants ───────────────────────────────────────────────────────────────

const SUBJECT_OPTIONS = [
  'General Inquiry',
  'Membership Information',
  'Event Participation',
  'Collaboration Proposal',
  'Sponsorship Inquiry',
  'Technical Support',
  'Feedback / Suggestion',
];

const DEFAULT_CONTACT_INFO = {
  email: 'programmingclub@nu.edu.bd',
  phone: '+880 1XXX-XXXXXX',
  address: 'Department of CSE, Netrokona University, Netrokona, Bangladesh',
  officeHours: 'Sunday – Thursday, 10:00 AM – 4:00 PM',
};

const DEFAULT_KEY_CONTACTS = [
  { id: 1, role: 'President', name: 'TBD', email: 'president@neupc.com', linkedin: '#' },
  { id: 2, role: 'General Secretary', name: 'TBD', email: 'gs@neupc.com', linkedin: '#' },
  { id: 3, role: 'Faculty Advisor', name: 'TBD', email: 'advisor@nu.edu.bd', linkedin: '#' },
];

const DEFAULT_FAQS = [
  {
    id: 1,
    question: 'How can I join the programming club?',
    answer:
      'Fill out the membership form on our Join page. All CSE students are welcome to participate in our activities.',
  },
  {
    id: 2,
    question: 'When are events typically held?',
    answer:
      'We organize events throughout the academic year — weekly problem-solving sessions, monthly workshops, and annual programming contests. Check our Events page for the latest schedule.',
  },
  {
    id: 3,
    question: 'Do I need prior programming experience?',
    answer:
      'No. We welcome students of all skill levels. Beginner-friendly workshops are designed to help you learn and grow from scratch.',
  },
  {
    id: 4,
    question: 'How can I sponsor or collaborate with the club?',
    answer:
      'Use the contact form with subject "Collaboration Proposal" or "Sponsorship Inquiry". Our team responds promptly.',
  },
  {
    id: 5,
    question: 'What is the response time for inquiries?',
    answer:
      'We typically respond within 24–48 hours during office hours (Sunday–Thursday, 10 AM–4 PM).',
  },
];

const DEFAULT_SOCIAL_NAMES = ['Facebook', 'LinkedIn', 'GitHub', 'Twitter', 'YouTube'];

const SOCIAL_ICON_MAP = {
  facebook: FacebookIcon,
  linkedin: LinkedInIcon,
  github: GitHubIcon,
  twitter: TwitterIcon,
  youtube: YouTubeIcon,
};

const INITIAL_FORM = { name: '', email: '', phone: '', subject: '', message: '' };

// ─── Contact info config ─────────────────────────────────────────────────────

const INFO_ITEMS = [
  {
    key: 'email',
    label: 'Electronic Mail',
    isLink: true,
    prefix: 'mailto:',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: 'phone',
    label: 'Voice Line',
    isLink: true,
    prefix: 'tel:',
    format: (v) => v.replace(/\s/g, ''),
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
  },
  {
    key: 'address',
    label: 'Physical Node',
    isLink: false,
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'officeHours',
    label: 'Active Hours',
    isLink: false,
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionEyebrow({ tag, title, accent }) {
  return (
    <div className="mb-10 sm:mb-12">
      <div className="flex items-center gap-3">
        <span className="h-px w-7 bg-neon-lime" />
        <span className="font-mono text-[10px] font-bold tracking-[0.35em] text-neon-lime uppercase sm:text-[11px]">
          {tag}
        </span>
      </div>
      <h2 className="kinetic-headline mt-2 font-heading text-3xl font-black text-white uppercase sm:text-4xl">
        {title}
        {accent && (
          <>
            {' '}
            <span className="neon-text">{accent}</span>
          </>
        )}
      </h2>
    </div>
  );
}

function FaqItem({ faq, isActive, onToggle }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] transition-colors hover:border-white/12 hover:bg-white/[0.05]">
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 p-5 text-left"
      >
        <span className="font-heading text-sm font-bold leading-snug text-white sm:text-base">
          {faq.question}
        </span>
        <svg
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0 text-neon-lime transition-transform duration-300',
            isActive && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {isActive && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="border-t border-white/8 bg-black/10 px-5 py-4 text-sm leading-relaxed text-zinc-400">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ContactClient({
  contactInfo: propContactInfo = {},
  keyContacts: propKeyContacts = [],
  socialLinks: propSocialLinks = {},
  faqs: propFaqs = [],
  settings = {},
}) {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState(() => ({
    ...INITIAL_FORM,
    name: searchParams.get('name') ?? '',
    email: searchParams.get('email') ?? '',
  }));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  // Data normalization
  const contactInfo = { ...DEFAULT_CONTACT_INFO, ...propContactInfo };
  if (propContactInfo.office_hours && !propContactInfo.officeHours) {
    contactInfo.officeHours = propContactInfo.office_hours;
  }

  const keyContacts = propKeyContacts.length > 0 ? propKeyContacts : DEFAULT_KEY_CONTACTS;

  const socialLinks = (() => {
    const entries = Object.entries(propSocialLinks)
      .filter(([, url]) => url && url !== '#')
      .map(([name, url], idx) => {
        const Icon = SOCIAL_ICON_MAP[name.toLowerCase()] || GitHubIcon;
        return { id: idx + 1, name: name.charAt(0).toUpperCase() + name.slice(1), url, Icon };
      });
    if (entries.length > 0) return entries;
    return DEFAULT_SOCIAL_NAMES.map((name, idx) => ({
      id: idx + 1,
      name,
      url: '#',
      Icon: SOCIAL_ICON_MAP[name.toLowerCase()],
    }));
  })();

  const faqs =
    propFaqs.length > 0
      ? propFaqs.map((f, i) => ({ ...f, id: f.id || i + 1 }))
      : DEFAULT_FAQS;

  // Form logic
  const validateForm = () => {
    const e = {};
    if (!formData.name.trim()) e.name = 'Name is required';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Invalid email';
    if (!formData.subject) e.subject = 'Please select a subject';
    if (!formData.message.trim()) e.message = 'Message is required';
    else if (formData.message.trim().length < 10) e.message = 'Minimum 10 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.set('name', formData.name);
      fd.set('email', formData.email);
      fd.set('subject', formData.subject);
      fd.set('message', formData.message);
      const result = await submitContactFormAction(fd);
      if (result?.error) {
        setErrors({ submit: result.error });
      } else {
        setSubmitSuccess(true);
        setFormData(INITIAL_FORM);
        setTimeout(() => setSubmitSuccess(false), 6000);
      }
    } catch {
      setErrors({ submit: 'Something went wrong. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBase = 'w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none backdrop-blur-sm transition-all focus:bg-white/8 sm:text-base';
  const inputNormal = 'border-white/10 focus:border-neon-lime/40 focus:ring-1 focus:ring-neon-lime/20';
  const inputError = 'border-red-500/50 focus:border-red-500/80 focus:ring-1 focus:ring-red-500/20';

  return (
    <div className="overflow-x-clip">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative isolate flex min-h-[75vh] items-center overflow-hidden px-4 pt-24 pb-16 sm:min-h-[80vh] sm:px-6 sm:pt-28 sm:pb-20 lg:px-8">

        {/* Ambient background — identical to events/achievements */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="grid-overlay absolute inset-0 opacity-25" />
          <div className="absolute -top-24 left-1/4 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-neon-violet/12 blur-[120px] sm:h-[500px] sm:w-[500px]" />
          <div className="absolute top-1/3 right-0 h-[300px] w-[300px] rounded-full bg-neon-lime/8 blur-[120px] sm:h-[400px] sm:w-[400px]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#05060b] to-transparent" />
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="mx-auto w-full max-w-7xl"
        >
          <div className="max-w-2xl space-y-6 sm:max-w-3xl sm:space-y-8">

            {/* Eyebrow — same pulse-dot pattern as events/achievements */}
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <span className="pulse-dot bg-neon-lime inline-block h-1.5 w-1.5 rounded-full" />
              <span className="font-mono text-[10px] tracking-[0.3em] text-zinc-400 uppercase sm:text-[11px]">
                {settings?.contact_page_badge || 'Contact · NEUPC'}
              </span>
            </motion.div>

            {/* Kinetic headline */}
            <motion.h1
              variants={fadeUp}
              className="kinetic-headline font-heading text-[clamp(2.8rem,11vw,7rem)] font-black leading-none text-white uppercase select-none"
            >
              {settings?.contact_page_title
                ? settings.contact_page_title
                : (
                  <>
                    Get in<br />
                    <span className="neon-text">Touch.</span>
                  </>
                )}
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={fadeUp}
              className="max-w-lg text-sm leading-relaxed text-zinc-400 sm:max-w-xl sm:text-base lg:text-lg"
            >
              {settings?.contact_page_description ||
                "Have questions, ideas, or collaboration proposals? Direct channel to the core team — reach out and let's build something together."}
            </motion.p>

            {/* Status pill */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2.5 rounded-full border border-neon-lime/20 bg-neon-lime/8 px-4 py-2 font-mono text-[10px] tracking-[0.18em] text-neon-lime uppercase sm:px-5 sm:py-2.5 sm:text-[11px]"
            >
              <span className="pulse-dot bg-neon-lime h-1.5 w-1.5 rounded-full" />
              Responding within 24–48 hrs
            </motion.div>

            {/* Quick stat row */}
            <motion.div variants={fadeUp} className="border-t border-white/8 pt-6 sm:pt-8">
              <div className="grid grid-cols-3 divide-x divide-white/8">
                {[
                  { value: '24h', label: 'Avg Response', mobile: '24h' },
                  { value: faqs.length, label: 'FAQ Answered', mobile: 'FAQs' },
                  { value: keyContacts.length, label: 'Key Contacts', mobile: 'Contacts' },
                ].map((stat, i) => (
                  <div key={i} className={cn('flex flex-col items-center gap-0.5 text-center sm:items-start sm:text-left', i === 0 ? 'pr-3 sm:pr-6 lg:pr-8' : i === 1 ? 'px-3 sm:px-6 lg:px-8' : 'pl-3 sm:pl-6 lg:pl-8')}>
                    <span className={cn('font-heading text-2xl font-black tabular-nums sm:text-3xl lg:text-4xl', i === 0 ? 'text-neon-lime' : 'text-white')}>
                      {stat.value}
                    </span>
                    <span className="font-mono text-[8px] tracking-[0.22em] text-zinc-500 uppercase sm:text-[9px] lg:text-[10px]">
                      <span className="sm:hidden">{stat.mobile}</span>
                      <span className="hidden sm:inline">{stat.label}</span>
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </motion.div>

        {/* Scroll cue */}
        <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 lg:flex">
          <span className="font-mono text-[9px] tracking-[0.4em] text-zinc-700 uppercase">Scroll</span>
          <div className="h-7 w-px bg-gradient-to-b from-zinc-600 to-transparent" />
        </div>
      </section>

      {/* ── Main Contact Grid ──────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">

          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">

            {/* ── LEFT: Info + Social + Key Contacts ── */}
            <div className="flex flex-col gap-6 lg:col-span-5">

              {/* Contact info card */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                className="glass-panel rounded-2xl p-6 sm:p-7"
              >
                <div className="mb-5 flex items-center gap-3">
                  <span className="h-px w-7 bg-neon-lime" />
                  <span className="font-mono text-[10px] font-bold tracking-[0.35em] text-neon-lime uppercase">
                    Direct Line
                  </span>
                </div>

                <div className="space-y-5">
                  {INFO_ITEMS.map(({ key, label, isLink, prefix, format, icon }) => {
                    const value = contactInfo[key];
                    const href = isLink ? `${prefix}${format ? format(value) : value}` : undefined;
                    return (
                      <div key={key} className="flex items-start gap-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-neon-lime/20 bg-neon-lime/8 text-neon-lime">
                          {icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                            {label}
                          </p>
                          {isLink ? (
                            <a
                              href={href}
                              className="mt-0.5 block text-sm font-semibold text-white break-all transition-colors hover:text-neon-lime"
                            >
                              {value}
                            </a>
                          ) : (
                            <p className="mt-0.5 text-sm leading-snug text-zinc-300">{value}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Social links */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                className="glass-panel rounded-2xl p-6 sm:p-7"
              >
                <div className="mb-5 flex items-center gap-3">
                  <span className="h-px w-7 bg-neon-lime" />
                  <span className="font-mono text-[10px] font-bold tracking-[0.35em] text-neon-lime uppercase">
                    Follow Us
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  {socialLinks.map((social) => (
                    <motion.a
                      key={social.id}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 transition-all hover:border-neon-lime/30 hover:bg-neon-lime/5"
                    >
                      <span className="shrink-0 text-zinc-400 transition-colors group-hover:text-neon-lime">
                        <social.Icon className="h-4 w-4" />
                      </span>
                      <span className="truncate font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:text-white">
                        {social.name}
                      </span>
                    </motion.a>
                  ))}
                </div>
              </motion.div>

              {/* Key contacts */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                className="glass-panel rounded-2xl p-6 sm:p-7"
              >
                <div className="mb-5 flex items-center gap-3">
                  <span className="h-px w-7 bg-neon-lime" />
                  <span className="font-mono text-[10px] font-bold tracking-[0.35em] text-neon-lime uppercase">
                    Key Contacts
                  </span>
                </div>
                <motion.div
                  className="space-y-3"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
                  initial="hidden"
                  whileInView="visible"
                  viewport={viewport}
                >
                  {keyContacts.map((contact) => (
                    <motion.div
                      key={contact.id}
                      variants={cardReveal}
                      whileHover={{ y: -2, transition: { duration: 0.2 } }}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 transition-colors hover:border-neon-lime/20 hover:bg-white/[0.05]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-neon-lime">
                          {contact.role}
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-white">{contact.name}</p>
                        <a
                          href={`mailto:${contact.email}`}
                          className="mt-0.5 block truncate font-mono text-[10px] text-zinc-500 transition-colors hover:text-neon-lime"
                        >
                          {contact.email}
                        </a>
                      </div>
                      <a
                        href={contact.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all hover:border-neon-lime/40 hover:bg-neon-lime/10"
                      >
                        <LinkedInIcon className="h-4 w-4 text-zinc-400" />
                      </a>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </div>

            {/* ── RIGHT: Contact Form ── */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={viewport}
              className="lg:col-span-7"
            >
              <div className="glass-panel rounded-2xl p-6 sm:p-8 lg:p-10">

                {/* Form header */}
                <div className="mb-8">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="h-px w-7 bg-neon-lime" />
                    <span className="font-mono text-[10px] font-bold tracking-[0.35em] text-neon-lime uppercase">
                      Send Message
                    </span>
                  </div>
                  <h2 className="kinetic-headline font-heading text-3xl font-black text-white uppercase sm:text-4xl">
                    Start the<br />
                    <span className="neon-text">Conversation</span>
                  </h2>
                </div>

                {/* Success banner */}
                <AnimatePresence>
                  {submitSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="mb-6 overflow-hidden rounded-xl border border-neon-lime/25 bg-neon-lime/8 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon-lime/20">
                          <svg className="h-4 w-4 text-neon-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neon-lime">Message sent!</p>
                          <p className="mt-0.5 font-mono text-[10px] tracking-wider text-neon-lime/70">
                            We will get back to you within 24–48 hours.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error banner */}
                <AnimatePresence>
                  {errors.submit && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                      className="mb-6 rounded-xl border border-red-500/30 bg-red-500/8 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <p className="text-sm text-red-300">{errors.submit}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Name + Email */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                        Full Name <span className="text-neon-lime">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                        className={cn(inputBase, errors.name ? inputError : inputNormal)}
                      />
                      {errors.name && <p className="mt-1 font-mono text-[9px] text-red-400">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                        Email <span className="text-neon-lime">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        className={cn(inputBase, errors.email ? inputError : inputNormal)}
                      />
                      {errors.email && <p className="mt-1 font-mono text-[9px] text-red-400">{errors.email}</p>}
                    </div>
                  </div>

                  {/* Phone + Subject */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                        Phone <span className="text-zinc-700">(optional)</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+880 1XXX-XXXXXX"
                        className={cn(inputBase, inputNormal)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                        Subject <span className="text-neon-lime">*</span>
                      </label>
                      <select
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        className={cn(inputBase, 'cursor-pointer', errors.subject ? inputError : inputNormal, !formData.subject && 'text-zinc-600')}
                      >
                        <option value="" className="bg-[#0c0e16]">Select a subject</option>
                        {SUBJECT_OPTIONS.map((s) => (
                          <option key={s} value={s} className="bg-[#0c0e16] text-white">{s}</option>
                        ))}
                      </select>
                      {errors.subject && <p className="mt-1 font-mono text-[9px] text-red-400">{errors.subject}</p>}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="mb-1.5 block font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                      Message <span className="text-neon-lime">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={5}
                      placeholder="Tell us what's on your mind..."
                      className={cn(inputBase, 'resize-none', errors.message ? inputError : inputNormal)}
                    />
                    <div className="mt-1 flex items-center justify-between">
                      {errors.message
                        ? <p className="font-mono text-[9px] text-red-400">{errors.message}</p>
                        : <p className="font-mono text-[9px] text-zinc-600">Minimum 10 characters</p>
                      }
                      <p className="font-mono text-[9px] text-zinc-600">{formData.message.length}/500</p>
                    </div>
                  </div>

                  {/* Submit button — same style as FeaturedBanner CTA */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-neon-lime px-8 py-4 font-heading text-[11px] font-bold tracking-widest text-black uppercase shadow-[0_0_30px_-8px_rgba(182,243,107,0.5)] transition-all hover:shadow-[0_0_50px_-4px_rgba(182,243,107,0.7)] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending…
                      </>
                    ) : (
                      <>
                        Send Message
                        <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── FAQ Section ────────────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="mb-10 flex flex-col gap-1 sm:mb-12 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <motion.div variants={fadeUp} className="flex items-center gap-3">
                <span className="h-px w-7 bg-neon-lime" />
                <span className="font-mono text-[10px] tracking-[0.35em] text-neon-lime uppercase sm:text-[11px]">
                  FAQ
                </span>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="kinetic-headline mt-2 font-heading text-3xl font-black text-white uppercase sm:text-4xl"
              >
                Common <span className="neon-text">Questions</span>
              </motion.h2>
            </div>
            <motion.p variants={fadeUp} className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase sm:text-[11px]">
              {faqs.length} answers
            </motion.p>
          </motion.div>

          <motion.div
            className="grid gap-3 lg:grid-cols-2"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
          >
            {faqs.map((faq) => (
              <motion.div key={faq.id} variants={cardReveal}>
                <FaqItem
                  faq={faq}
                  isActive={activeFaq === faq.id}
                  onToggle={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
                />
              </motion.div>
            ))}
          </motion.div>

        </div>
      </section>

      {/* ── CTA Strip — same pattern as events page join prompt ───────────── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="glass-panel overflow-hidden rounded-2xl border-neon-lime/10 p-8 sm:p-12 lg:p-16"
          >
            <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-px w-7 bg-neon-lime" />
                  <span className="font-mono text-[10px] tracking-[0.35em] text-neon-lime uppercase">
                    Ready to join?
                  </span>
                </div>
                <h3 className="kinetic-headline font-heading text-3xl font-black text-white uppercase sm:text-4xl">
                  {settings?.contact_page_cta_title || (
                    <>Become Part<br />of the Crew</>
                  )}
                </h3>
                <p className="max-w-md text-sm leading-relaxed text-zinc-400">
                  {settings?.contact_page_cta_description ||
                    "Whether you're a student looking to join, a company interested in collaboration, or just want to say hello — we're here."}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <a
                  href="/join"
                  className="inline-flex items-center gap-2 rounded-full bg-neon-lime px-7 py-3.5 font-heading text-[11px] font-bold tracking-widest text-black uppercase shadow-[0_0_30px_-8px_rgba(182,243,107,0.5)] transition-all hover:shadow-[0_0_50px_-4px_rgba(182,243,107,0.7)] sm:py-4"
                >
                  Join Our Club →
                </a>
                <a
                  href="/events"
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 px-7 py-3.5 font-heading text-[11px] font-bold tracking-widest text-zinc-400 uppercase transition-all hover:border-neon-lime/35 hover:text-neon-lime sm:py-4"
                >
                  Explore Events
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <ScrollToTop />
    </div>
  );
}
