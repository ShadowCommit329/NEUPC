/**
 * @file Contact page client component.
 * Renders contact form, info cards, social links, and FAQ accordion.
 *
 * @module ContactClient
 */

'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CTASection from '../_components/ui/CTASection';
import PageShell from '../_components/ui/PageShell';
import dynamic from 'next/dynamic';
const ScrollToTop = dynamic(() => import('../_components/ui/ScrollToTop'), {
  ssr: false,
});
import {
  FacebookIcon,
  LinkedInIcon,
  GitHubIcon,
  YouTubeIcon,
} from '../_components/ui/SocialIcons';
import { submitContactFormAction } from '@/app/_lib/contact-actions';
import { cn } from '../_lib/utils';
import Button from '../_components/ui/Button';
import { motion } from 'framer-motion';
import {
  fadeUp,
  fadeIn,
  staggerContainer,
  cardHover,
  buttonTap,
  viewportConfig,
} from '../_components/motion/motion';

// ---------------------------------------------------------------------------
// Constants & defaults
// ---------------------------------------------------------------------------

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
  officeHours: 'Sunday - Thursday, 10:00 AM - 4:00 PM',
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
      'You can join by filling out the membership form on our Join page. All CSE students are welcome to participate in our activities.',
  },
  {
    id: 2,
    question: 'When are events typically held?',
    answer:
      'We organize events throughout the academic year, including weekly problem-solving sessions, monthly workshops, and annual programming contests. Check our Events page for the latest schedule.',
  },
  {
    id: 3,
    question: 'Do I need prior programming experience?',
    answer:
      'No! We welcome students of all skill levels. We have beginner-friendly workshops designed to help you learn and grow.',
  },
  {
    id: 4,
    question: 'How can I sponsor or collaborate with the club?',
    answer:
      'We welcome collaboration proposals and sponsorships. Please use the contact form with subject "Collaboration Proposal" or "Sponsorship Inquiry" and our team will respond promptly.',
  },
  {
    id: 5,
    question: 'What is the response time for inquiries?',
    answer:
      'We typically respond within 24-48 hours during office hours (Sunday - Thursday, 10 AM - 4 PM).',
  },
];

const DEFAULT_SOCIAL_NAMES = ['Facebook', 'LinkedIn', 'GitHub', 'YouTube'];

const SOCIAL_ICON_COMPONENTS = {
  facebook: <FacebookIcon className="h-5 w-5" />,
  linkedin: <LinkedInIcon className="h-5 w-5" />,
  github: <GitHubIcon className="h-5 w-5" />,
  youtube: <YouTubeIcon className="h-5 w-5" />,
};

const CONTACT_INFO_CARDS = [
  {
    key: 'email',
    label: 'Email',
    borderColor: 'border-primary-500/30',
    bgColor: 'bg-primary-500/10',
    textColor: 'text-primary-300',
    linkClass: 'text-primary-300 hover:text-primary-200',
    isLink: true,
    linkPrefix: 'mailto:',
    icon: (
      <svg className="text-primary-300 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: 'phone',
    label: 'Phone',
    borderColor: 'border-secondary-500/30',
    bgColor: 'bg-secondary-500/10',
    textColor: 'text-secondary-300',
    linkClass: 'text-secondary-300 hover:text-secondary-200',
    isLink: true,
    linkPrefix: 'tel:',
    formatLink: (v) => v.replace(/\s/g, ''),
    icon: (
      <svg className="text-secondary-300 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
  },
  {
    key: 'address',
    label: 'Address',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-300',
    isLink: false,
    icon: (
      <svg className="h-5 w-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'officeHours',
    label: 'Office Hours',
    borderColor: 'border-pink-500/30',
    bgColor: 'bg-pink-500/10',
    textColor: 'text-pink-300',
    isLink: false,
    icon: (
      <svg className="h-5 w-5 text-pink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const INITIAL_FORM = { name: '', email: '', phone: '', subject: '', message: '' };

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FormField({ label, name, type = 'text', required, value, error, onChange, placeholder, children }) {
  const inputClasses = cn(
    'w-full rounded-lg border bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 backdrop-blur-sm transition-all focus:ring-2 focus:outline-none sm:text-base',
    error
      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50'
      : 'border-white/10 focus:border-primary-500 focus:ring-primary-500/50'
  );

  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-gray-300">
        {label}{' '}
        {required ? (
          <span className="text-red-400">*</span>
        ) : (
          <span className="text-gray-600">(Optional)</span>
        )}
      </label>
      {children || (
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className={inputClasses}
          placeholder={placeholder}
        />
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function FaqItem({ faq, isActive, onToggle }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl transition-colors hover:border-primary-500/30 hover:bg-white/8">
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 p-4 text-left sm:p-5"
      >
        <span className="text-sm font-semibold leading-snug text-white sm:text-base">
          {faq.question}
        </span>
        <svg
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0 text-primary-400 transition-transform duration-300',
            isActive && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isActive ? 'max-h-96' : 'max-h-0'
        )}
      >
        <div className="border-t border-white/10 bg-black/20 px-4 py-4 sm:px-5">
          <p className="text-sm leading-relaxed text-gray-300">{faq.answer}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

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

  // --- Data normalization ---
  const contactInfo = { ...DEFAULT_CONTACT_INFO, ...propContactInfo };
  if (propContactInfo.office_hours && !propContactInfo.officeHours) {
    contactInfo.officeHours = propContactInfo.office_hours;
  }

  const keyContacts = propKeyContacts.length > 0 ? propKeyContacts : DEFAULT_KEY_CONTACTS;

  const socialLinks = (() => {
    const entries = Object.entries(propSocialLinks)
      .filter(([, url]) => url && url !== '#')
      .map(([name, url], idx) => ({
        id: idx + 1,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        url,
        icon: SOCIAL_ICON_COMPONENTS[name.toLowerCase()] || SOCIAL_ICON_COMPONENTS.github,
      }));
    if (entries.length > 0) return entries;
    return DEFAULT_SOCIAL_NAMES.map((name, idx) => ({
      id: idx + 1,
      name,
      url: '#',
      icon: SOCIAL_ICON_COMPONENTS[name.toLowerCase()],
    }));
  })();

  const faqs =
    propFaqs.length > 0
      ? propFaqs.map((f, i) => ({ ...f, id: f.id || i + 1 }))
      : DEFAULT_FAQS;

  // --- Form logic ---
  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.subject) newErrors.subject = 'Please select a subject';
    if (!formData.message.trim()) newErrors.message = 'Message is required';
    else if (formData.message.trim().length < 10) newErrors.message = 'Message must be at least 10 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  return (
    <PageShell showBlobs>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 py-14 text-center sm:px-6 sm:py-20 md:py-24 lg:px-8 lg:py-28">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="from-primary-500/10 absolute -top-16 -left-16 h-72 w-72 rounded-full bg-linear-to-br to-transparent blur-3xl" />
          <div className="from-secondary-500/10 absolute -right-16 -bottom-16 h-72 w-72 rounded-full bg-linear-to-tl to-transparent blur-3xl" />
        </div>

        <motion.div
          variants={staggerContainer(0.12, 0.1)}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-3xl"
        >
          {/* Badge */}
          <motion.div
            variants={fadeUp}
            className="bg-primary-500/10 text-primary-300 ring-primary-500/20 mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ring-1 sm:text-sm"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {settings?.contact_page_badge || 'Contact Us'}
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={fadeUp}
            className="from-primary-300 to-secondary-300 mb-4 bg-linear-to-r via-white bg-clip-text text-3xl font-extrabold leading-tight text-transparent sm:text-4xl md:text-5xl lg:text-6xl"
          >
            {settings?.contact_page_title || 'Get in Touch'}
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={fadeUp}
            className="mx-auto max-w-2xl text-sm leading-relaxed text-gray-400 sm:text-base md:text-lg"
          >
            {settings?.contact_page_description ||
              "Have questions, ideas, or collaboration proposals? We'd love to hear from you. Reach out and let's build something amazing together."}
          </motion.p>
        </motion.div>
      </section>

      {/* ── Main Contact Section ──────────────────────────────────────────── */}
      <section className="px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">

            {/* ── Contact Form ── */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={viewportConfig}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl sm:p-7"
            >
              <h2 className="mb-5 text-xl font-bold text-white sm:text-2xl">
                Send us a Message
              </h2>

              {/* Success message */}
              {submitSuccess && (
                <div className="mb-5 overflow-hidden rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500/20">
                      <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-green-300">Message Sent Successfully!</h3>
                      <p className="mt-0.5 text-xs text-green-200">
                        Thank you for contacting us. We will get back to you within 24-48 hours.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error message */}
              {errors.submit && (
                <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-sm text-red-300">{errors.submit}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name + Email — side-by-side on sm+ */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="Full Name"
                    name="name"
                    required
                    value={formData.name}
                    error={errors.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                  />
                  <FormField
                    label="Email Address"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    error={errors.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                  />
                </div>

                {/* Phone + Subject — side-by-side on sm+ */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+880 1XXX-XXXXXX"
                  />
                  <FormField
                    label="Subject"
                    name="subject"
                    required
                    value={formData.subject}
                    error={errors.subject}
                    onChange={handleChange}
                  >
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className={cn(
                        'w-full rounded-lg border bg-white/5 px-4 py-3 text-sm text-white backdrop-blur-sm transition-all focus:ring-2 focus:outline-none sm:text-base',
                        errors.subject
                          ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50'
                          : 'border-white/10 focus:border-primary-500 focus:ring-primary-500/50'
                      )}
                    >
                      <option value="" className="bg-gray-900">Select a subject</option>
                      {SUBJECT_OPTIONS.map((s) => (
                        <option key={s} value={s} className="bg-gray-900">{s}</option>
                      ))}
                    </select>
                  </FormField>
                </div>

                {/* Message */}
                <FormField
                  label="Message"
                  name="message"
                  required
                  value={formData.message}
                  error={errors.message}
                  onChange={handleChange}
                >
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    className={cn(
                      'w-full resize-none rounded-lg border bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 backdrop-blur-sm transition-all focus:ring-2 focus:outline-none sm:text-base',
                      errors.message
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50'
                        : 'border-white/10 focus:border-primary-500 focus:ring-primary-500/50'
                    )}
                    placeholder="Tell us what's on your mind..."
                  />
                  <div className="mt-1 flex items-center justify-between">
                    {errors.message ? (
                      <p className="text-xs text-red-400">{errors.message}</p>
                    ) : (
                      <p className="text-xs text-gray-600">Minimum 10 characters</p>
                    )}
                    <p className="text-xs text-gray-600">{formData.message.length}/500</p>
                  </div>
                </FormField>

                {/* Submit */}
                <Button
                  type="submit"
                  variant="gradient"
                  size="md"
                  loading={isSubmitting}
                  loadingText="Sending..."
                  fullWidth
                  className="rounded-full"
                  iconRight={
                    !isSubmitting ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    ) : undefined
                  }
                >
                  Send Message
                </Button>
              </form>
            </motion.div>

            {/* ── Right Column: Info + Key Contacts + Social ── */}
            <div className="space-y-5">

              {/* Official Contact Info */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={viewportConfig}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl sm:p-6"
              >
                <h2 className="mb-4 text-lg font-bold text-white sm:text-xl">
                  Contact Information
                </h2>
                <div className="space-y-4">
                  {CONTACT_INFO_CARDS.map((card) => {
                    const value = contactInfo[card.key];
                    const href = card.isLink
                      ? `${card.linkPrefix}${card.formatLink ? card.formatLink(value) : value}`
                      : undefined;
                    return (
                      <div key={card.key} className="flex items-start gap-3">
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                            card.borderColor,
                            card.bgColor
                          )}
                        >
                          {card.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-500">{card.label}</p>
                          {card.isLink ? (
                            <a
                              href={href}
                              className={cn(
                                'mt-0.5 block break-all text-sm font-medium transition-colors',
                                card.linkClass
                              )}
                            >
                              {value}
                            </a>
                          ) : (
                            <p className="mt-0.5 text-sm leading-snug text-gray-300">{value}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Key Contacts */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={viewportConfig}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl sm:p-6"
              >
                <h3 className="mb-4 text-lg font-bold text-white">Key Contacts</h3>
                <motion.div
                  className="space-y-3"
                  variants={staggerContainer(0.08)}
                  initial="hidden"
                  whileInView="visible"
                  viewport={viewportConfig}
                >
                  {keyContacts.map((contact) => (
                    <motion.div
                      key={contact.id}
                      variants={fadeUp}
                      whileHover={{ y: -2, transition: { duration: 0.2 } }}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/5 p-3 sm:p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-primary-400 text-[10px] font-semibold tracking-wide uppercase">
                          {contact.role}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-white">{contact.name}</p>
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-primary-300 hover:text-primary-200 mt-0.5 block truncate text-xs transition-colors"
                        >
                          {contact.email}
                        </a>
                      </div>
                      <a
                        href={contact.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:bg-primary-500/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all"
                      >
                        <LinkedInIcon className="h-4 w-4 text-gray-400" />
                      </a>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              {/* Social Media */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={viewportConfig}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl sm:p-6"
              >
                <h3 className="mb-1.5 text-lg font-bold text-white">Follow Us</h3>
                <p className="mb-4 text-xs text-gray-500">
                  Stay connected with our latest updates and activities
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  {socialLinks.map((social) => (
                    <motion.a
                      key={social.id}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:border-primary-500/30 hover:bg-primary-500/10 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm transition-colors"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      title={social.name}
                    >
                      <span className="shrink-0 text-gray-400">{social.icon}</span>
                      <span className="truncate text-xs font-medium text-gray-300">{social.name}</span>
                    </motion.a>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ───────────────────────────────────────────────────── */}
      <section className="px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <motion.div
            className="mb-8 text-center"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
          >
            <h2 className="mb-2 text-2xl font-extrabold text-white sm:text-3xl">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-gray-500">Quick answers to common questions</p>
          </motion.div>

          <motion.div
            className="space-y-3"
            variants={staggerContainer(0.08)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
          >
            {faqs.map((faq) => (
              <motion.div key={faq.id} variants={fadeUp}>
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

      <CTASection
        icon="💬"
        title={settings?.contact_page_cta_title || 'Ready to Get Started?'}
        description={
          settings?.contact_page_cta_description ||
          "Whether you're a student looking to join, a company interested in collaboration, or just want to say hello — we're here to help."
        }
        primaryAction={{ label: 'Join Our Club', href: '/join' }}
        secondaryAction={{ label: 'Explore Events', href: '/events' }}
      />

      <ScrollToTop />
    </PageShell>
  );
}
