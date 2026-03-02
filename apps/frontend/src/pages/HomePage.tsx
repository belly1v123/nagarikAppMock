/**
 * Home Page
 *
 * Landing page for Nagarik App with navigation to registration.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks';

const TEXT = {
    en: {
        appName: 'Nagarik App',
        registerNow: 'Register Now',
        titleTop: 'Nepal Digital Identity',
        titleBottom: 'Verification Platform',
        subtitle: 'Register your identity securely with face recognition technology. Enable seamless verification for government services and trusted third-party applications.',
        startRegistration: 'Start Registration',
        learnMore: 'Learn More',
        secureTitle: 'Secure Identity',
        secureDesc: 'Personal information is encrypted and protected with modern security controls.',
        faceTitle: 'Face Recognition',
        faceDesc: 'Three-angle capture improves identity confidence during registration and verification.',
        govTitle: 'Public Services Ready',
        govDesc: 'Supports identity checks for civic, financial, and government-facing workflows.',
        footerBrand: 'Nagarik App',
        footerNote: 'Nepal Digital Identity Platform',
        essence: 'Nepal inspired digital experience',
    },
    ne: {
        appName: 'नागरिक एप',
        registerNow: 'अहिले दर्ता गर्नुहोस्',
        titleTop: 'नेपाल डिजिटल परिचय',
        titleBottom: 'प्रमाणीकरण प्लेटफर्म',
        subtitle: 'अनुहार पहिचान प्रविधिबाट सुरक्षित रूपमा आफ्नो परिचय दर्ता गर्नुहोस्। सरकारी सेवा र विश्वसनीय तेस्रो-पक्ष एपहरूमा सहज प्रमाणीकरण सक्षम बनाउनुहोस्।',
        startRegistration: 'दर्ता सुरु गर्नुहोस्',
        learnMore: 'थप जानकारी',
        secureTitle: 'सुरक्षित परिचय',
        secureDesc: 'व्यक्तिगत विवरण आधुनिक सुरक्षा नियन्त्रणसँग सुरक्षित रूपमा संरक्षित हुन्छ।',
        faceTitle: 'अनुहार प्रमाणीकरण',
        faceDesc: 'तीन कोणबाट क्याप्चर गर्दा दर्ता र प्रमाणीकरणको विश्वसनीयता बढ्छ।',
        govTitle: 'सार्वजनिक सेवा तयार',
        govDesc: 'नागरिक, वित्तीय र सरकारी कार्यप्रवाहका लागि परिचय जाँचमा सहायक।',
        footerBrand: 'नागरिक एप',
        footerNote: 'नेपाल डिजिटल परिचय प्लेटफर्म',
        essence: 'नेपाली शैलीको डिजिटल अनुभव',
    },
};

export const HomePage: React.FC = () => {
    const { language, setLanguage } = useLanguage();
    const t = TEXT[language];

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-red-50">
            <header className="bg-white shadow-sm border-b border-blue-100">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div>
                            <span className="text-xl font-bold text-gray-900">{t.appName}</span>
                            <p className="text-xs text-gray-500">{t.essence}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                            <button
                                onClick={() => setLanguage('en')}
                                className={`px-3 py-1.5 text-sm font-medium ${language === 'en' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                            >
                                EN
                            </button>
                            <button
                                onClick={() => setLanguage('ne')}
                                className={`px-3 py-1.5 text-sm font-medium ${language === 'ne' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                            >
                                नेपाली
                            </button>
                        </div>

                        <Link
                            to="/register"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            {t.registerNow}
                        </Link>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 md:py-16">
                <div className="max-w-5xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                        {t.titleTop}
                        <br />
                        <span className="text-blue-700">{t.titleBottom}</span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                        {t.subtitle}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
                        <Link
                            to="/register"
                            className="px-8 py-4 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                        >
                            {t.startRegistration}
                        </Link>
                        <a
                            href="#features"
                            className="px-8 py-4 border-2 border-gray-300 text-gray-700 text-lg font-medium rounded-lg hover:border-gray-400 transition-colors"
                        >
                            {t.learnMore}
                        </a>
                    </div>

                    <div id="features" className="grid md:grid-cols-3 gap-6 text-left">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-50">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.secureTitle}</h3>
                            <p className="text-gray-600">{t.secureDesc}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-50">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.faceTitle}</h3>
                            <p className="text-gray-600">{t.faceDesc}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-50">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.govTitle}</h3>
                            <p className="text-gray-600">{t.govDesc}</p>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="bg-gray-900 text-white mt-16">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center gap-3 mb-4 md:mb-0">
                            <span className="font-semibold">{t.footerBrand}</span>
                        </div>
                        <p className="text-gray-400 text-sm">{t.footerNote}</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default HomePage;
