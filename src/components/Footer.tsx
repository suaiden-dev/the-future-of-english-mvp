import { Envelope, MapPin } from '@phosphor-icons/react';
import { useI18n } from '../contexts/I18nContext';

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-slate-800 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Company Information */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">TFE</span>
              </div>
              <h3 className="text-xl font-bold text-white">
                The Future of English
              </h3>
            </div>
            
            <p className="text-gray-300 leading-relaxed">
              Transforming dreams into reality through specialized mentoring for scholarships in the United States.
            </p>
          </div>

          {/* Our Services */}
          <div>
            <h4 className="text-lg font-bold text-white mb-4">{t('footer.services.title')}</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-300 hover:text-white transition-colors">
                  {t('footer.services.mentorship')}
                </a>
              </li>
              <li>
                <a href="/translations" className="text-gray-300 hover:text-white transition-colors">
                  {t('footer.services.documentTranslation')}
                </a>
              </li>
              <li>
                <a href="/verify" className="text-gray-300 hover:text-white transition-colors">
                  {t('footer.services.documentVerification')}
                </a>
              </li>
            </ul>
          </div>

          

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold text-white mb-4">{t('footer.contact.title')}</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Envelope className="w-5 h-5 text-orange-400" weight="fill" />
                <a href="mailto:info@thefutureofenglish.com" className="text-gray-300 hover:text-white transition-colors">
                  info@thefutureofenglish.com
                </a>
              </div>
              
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-orange-400" weight="fill" />
                <span className="text-gray-300">
                  {t('footer.contact.location')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-sm">
              {t('footer.copyright')}
            </div>
            
            <div className="flex gap-6 text-sm">
              <a href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                {t('footer.links.privacy')}
              </a>
              <a href="/terms" className="text-gray-400 hover:text-white transition-colors">
                {t('footer.links.terms')}
              </a>
              <a href="/cookies" className="text-gray-400 hover:text-white transition-colors">
                {t('footer.links.cookies')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 
