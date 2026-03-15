/**
 * @file Footer
 * @module Footer
 */

import Link from 'next/link';
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Github,
  Linkedin,
  Youtube,
  Twitter,
  ArrowRight,
  Code2,
} from 'lucide-react';

const socialIcons = {
  facebook: Facebook,
  github: Github,
  linkedin: Linkedin,
  youtube: Youtube,
  twitter: Twitter,
};

const defaultSocial = {
  facebook: 'https://facebook.com',
  github: 'https://github.com',
  linkedin: 'https://linkedin.com',
  youtube: 'https://youtube.com',
  twitter: 'https://twitter.com',
};

const defaultContact = {
  email: 'contact@neupc.edu',
  phone: '+880 123 456 7890',
  address: 'Netrokona University\nNetrokona, Bangladesh',
};

const defaultDescription =
  'Netrokona University Programming Club - Empowering students with competitive programming, web development, and cutting-edge technology skills.';

export default function Footer({
  session,
  social = {},
  contact = {},
  footer = {},
  settings = {},
}) {
  const currentYear = new Date().getFullYear();
  const isLoggedIn = !!session?.user;

  const socialLinks = { ...defaultSocial, ...social };
  const contactInfo = { ...defaultContact, ...contact };
  const footerDescription = footer.description || defaultDescription;

  return (
    <footer className="bg-primary-950 border-primary-800 border-t">
      <div className="container-custom">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 gap-8 py-12 md:grid-cols-2 md:py-16 lg:grid-cols-4 lg:gap-12">
          {/* About Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Code2 className="text-primary-500 h-8 w-8" />
              <h3 className="font-heading text-primary-50 text-xl font-bold">
                {settings?.site_name || 'NEUPC'}
              </h3>
            </div>
            <p className="text-primary-300 text-sm leading-relaxed">
              {footerDescription}
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3 pt-2">
              {Object.entries(socialLinks).map(([platform, url]) => {
                if (!url) return null;
                const IconComponent = socialIcons[platform];
                if (!IconComponent) return null;
                return (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-primary-800 text-primary-200 hover:bg-primary-500 flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:text-white"
                    aria-label={
                      platform.charAt(0).toUpperCase() + platform.slice(1)
                    }
                  >
                    <IconComponent className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading text-primary-50 mb-4 text-base font-semibold">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[
                { href: '/about', label: 'About Us' },
                { href: '/events', label: 'Events' },
                { href: '/achievements', label: 'Achievements' },
                { href: '/committee', label: 'Committee' },
                { href: '/gallery', label: 'Gallery' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-primary-300 hover:text-secondary-400 group flex items-center gap-2 text-sm transition-colors duration-200"
                  >
                    <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-heading text-primary-50 mb-4 text-base font-semibold">
              Resources
            </h4>
            <ul className="space-y-3">
              {[
                { href: '/blogs', label: 'Blogs' },
                { href: '/roadmaps', label: 'Roadmaps' },
                ...(!isLoggedIn ? [{ href: '/join', label: 'Join Us' }] : []),
                { href: '/contact', label: 'Contact' },
                { href: '/developers', label: 'Developers' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-primary-300 hover:text-secondary-400 group flex items-center gap-2 text-sm transition-colors duration-200"
                  >
                    <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-heading text-primary-50 mb-4 text-base font-semibold">
              Contact Us
            </h4>
            <ul className="space-y-4">
              {contactInfo.email && (
                <li>
                  <a
                    href={`mailto:${contactInfo.email}`}
                    className="text-primary-300 hover:text-secondary-400 group flex items-start gap-3 text-sm transition-colors duration-200"
                  >
                    <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{contactInfo.email}</span>
                  </a>
                </li>
              )}
              {contactInfo.phone && (
                <li>
                  <a
                    href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
                    className="text-primary-300 hover:text-secondary-400 group flex items-start gap-3 text-sm transition-colors duration-200"
                  >
                    <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{contactInfo.phone}</span>
                  </a>
                </li>
              )}
              {contactInfo.address && (
                <li>
                  <div className="text-primary-300 flex items-start gap-3 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {contactInfo.address.split('\n').map((line, i) => (
                        <span key={i}>
                          {line}
                          {i < contactInfo.address.split('\n').length - 1 && (
                            <br />
                          )}
                        </span>
                      ))}
                    </span>
                  </div>
                </li>
              )}
            </ul>
            {!isLoggedIn && (
              <div className="mt-6">
                <Link
                  href="/join"
                  className="from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 group inline-flex items-center gap-2 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg"
                >
                  <Mail className="h-4 w-4" />
                  <span>Subscribe</span>
                  <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-primary-800 border-t py-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-primary-400 text-center text-sm md:text-left">
              &copy; {currentYear}{' '}
              {settings?.site_name_full ||
                'Netrokona University Programming Club'}
              . All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/developers"
                className="text-primary-400 hover:text-secondary-400 text-sm transition-colors duration-200"
              >
                {settings?.footer_developer_credit ||
                  'Made with ❤️ by NEUPC Developers'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
