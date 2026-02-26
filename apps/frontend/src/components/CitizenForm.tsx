/**
 * CitizenForm Component
 * 
 * Form for collecting citizen registration information.
 */

import React, { useState } from 'react';
import type { Gender, NepalDistrict, CitizenRegistrationInput } from '../types';

// Nepal districts for the dropdown
const NEPAL_DISTRICTS: NepalDistrict[] = [
    'Achham', 'Arghakhanchi', 'Baglung', 'Baitadi', 'Bajhang', 'Bajura',
    'Banke', 'Bara', 'Bardiya', 'Bhaktapur', 'Bhojpur', 'Chitwan',
    'Dadeldhura', 'Dailekh', 'Dang', 'Darchula', 'Dhading', 'Dhankuta',
    'Dhanusa', 'Dolakha', 'Dolpa', 'Doti', 'Gorkha', 'Gulmi', 'Humla',
    'Ilam', 'Jajarkot', 'Jhapa', 'Jumla', 'Kailali', 'Kalikot', 'Kanchanpur',
    'Kapilvastu', 'Kaski', 'Kathmandu', 'Kavrepalanchok', 'Khotang', 'Lalitpur',
    'Lamjung', 'Mahottari', 'Makwanpur', 'Manang', 'Morang', 'Mugu', 'Mustang',
    'Myagdi', 'Nawalpur', 'Nuwakot', 'Okhaldhunga', 'Palpa', 'Panchthar',
    'ParbatDistrict', 'Parsa', 'Pyuthan', 'Ramechhap', 'Rasuwa', 'Rautahat',
    'Rolpa', 'Rukum', 'Rupandehi', 'Salyan', 'Sankhuwasabha', 'Saptari',
    'Sarlahi', 'Sindhuli', 'Sindhupalchok', 'Siraha', 'Solukhumbu', 'Sunsari',
    'Surkhet', 'Syangja', 'Tanahu', 'Taplejung', 'Terhathum', 'Udayapur',
];

interface CitizenFormProps {
    onSubmit: (data: Omit<CitizenRegistrationInput, 'faceDescriptors'>) => void;
    onCancel?: () => void;
    isLoading?: boolean;
    initialData?: Partial<CitizenRegistrationInput>;
}

interface FormErrors {
    [key: string]: string;
}

export const CitizenForm: React.FC<CitizenFormProps> = ({
    onSubmit,
    onCancel,
    isLoading = false,
    initialData = {},
}) => {
    const [formData, setFormData] = useState({
        fullName: initialData.fullName || '',
        citizenshipNumber: initialData.citizenshipNumber || '',
        dateOfBirth: initialData.dateOfBirth || '',
        gender: initialData.gender || ('' as Gender),
        district: initialData.district || ('' as NepalDistrict),
        municipality: initialData.municipality || '',
        wardNumber: initialData.wardNumber?.toString() || '',
        phoneNumber: initialData.phoneNumber || '',
    });

    const [errors, setErrors] = useState<FormErrors>({});

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        // Full name validation
        if (!formData.fullName.trim()) {
            newErrors.fullName = 'Full name is required';
        } else if (formData.fullName.trim().length < 3) {
            newErrors.fullName = 'Name must be at least 3 characters';
        }

        // Citizenship number validation
        if (!formData.citizenshipNumber.trim()) {
            newErrors.citizenshipNumber = 'Citizenship number is required';
        } else if (!/^\d{2}-\d{2}-\d{2}-\d{5}$/.test(formData.citizenshipNumber)) {
            newErrors.citizenshipNumber = 'Format: XX-XX-XX-XXXXX';
        }

        // Date of birth validation
        if (!formData.dateOfBirth) {
            newErrors.dateOfBirth = 'Date of birth is required';
        } else {
            const dob = new Date(formData.dateOfBirth);
            const today = new Date();
            const age = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            if (age < 16) {
                newErrors.dateOfBirth = 'Must be at least 16 years old';
            }
            if (age > 120) {
                newErrors.dateOfBirth = 'Invalid date of birth';
            }
        }

        // Gender validation
        if (!formData.gender) {
            newErrors.gender = 'Gender is required';
        } else if (!['male', 'female', 'other'].includes(formData.gender)) {
            newErrors.gender = 'Invalid gender selection';
        }

        // District validation
        if (!formData.district) {
            newErrors.district = 'District is required';
        }

        // Municipality validation
        if (!formData.municipality.trim()) {
            newErrors.municipality = 'Municipality is required';
        }

        // Ward number validation
        if (!formData.wardNumber) {
            newErrors.wardNumber = 'Ward number is required';
        } else {
            const ward = parseInt(formData.wardNumber, 10);
            if (isNaN(ward) || ward < 1 || ward > 33) {
                newErrors.wardNumber = 'Ward must be between 1-33';
            }
        }

        // Phone number validation
        if (!formData.phoneNumber.trim()) {
            newErrors.phoneNumber = 'Phone number is required';
        } else if (!/^(98|97|96)\d{8}$/.test(formData.phoneNumber)) {
            newErrors.phoneNumber = 'Enter valid Nepal mobile (98/97/96XXXXXXXX)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // Clear error when field is edited
        if (errors[name]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            onSubmit({
                fullName: formData.fullName.trim(),
                citizenshipNumber: formData.citizenshipNumber.trim(),
                dateOfBirth: formData.dateOfBirth,
                gender: formData.gender as Gender,
                district: formData.district as NepalDistrict,
                municipality: formData.municipality.trim(),
                wardNumber: parseInt(formData.wardNumber, 10),
                phoneNumber: formData.phoneNumber.trim(),
            });
        }
    };

    const inputClasses = (hasError: boolean) =>
        `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 
    ${hasError
            ? 'border-red-500 focus:ring-red-200'
            : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
        }`;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name (as per citizenship)
                </label>
                <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g., Ram Bahadur Shrestha"
                    className={inputClasses(!!errors.fullName)}
                    disabled={isLoading}
                />
                {errors.fullName && (
                    <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>
                )}
            </div>

            {/* Citizenship Number */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Citizenship Number
                </label>
                <input
                    type="text"
                    name="citizenshipNumber"
                    value={formData.citizenshipNumber}
                    onChange={handleChange}
                    placeholder="XX-XX-XX-XXXXX"
                    className={inputClasses(!!errors.citizenshipNumber)}
                    disabled={isLoading}
                />
                {errors.citizenshipNumber && (
                    <p className="mt-1 text-sm text-red-500">{errors.citizenshipNumber}</p>
                )}
            </div>

            {/* Date of Birth & Gender */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth
                    </label>
                    <input
                        id="dateOfBirth"
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className={inputClasses(!!errors.dateOfBirth)}
                        disabled={isLoading}
                        title="Date of Birth"
                    />
                    {errors.dateOfBirth && (
                        <p className="mt-1 text-sm text-red-500">{errors.dateOfBirth}</p>
                    )}
                </div>

                <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                        Gender
                    </label>
                    <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className={inputClasses(!!errors.gender)}
                        disabled={isLoading}
                        title="Select Gender"
                    >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>
                    {errors.gender && (
                        <p className="mt-1 text-sm text-red-500">{errors.gender}</p>
                    )}
                </div>
            </div>

            {/* District */}
            <div>
                <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
                    District
                </label>
                <select
                    id="district"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    className={inputClasses(!!errors.district)}
                    disabled={isLoading}
                    title="Select District"
                >
                    <option value="">Select District</option>
                    {NEPAL_DISTRICTS.map((district) => (
                        <option key={district} value={district}>
                            {district}
                        </option>
                    ))}
                </select>
                {errors.district && (
                    <p className="mt-1 text-sm text-red-500">{errors.district}</p>
                )}
            </div>

            {/* Municipality & Ward */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Municipality/VDC
                    </label>
                    <input
                        type="text"
                        name="municipality"
                        value={formData.municipality}
                        onChange={handleChange}
                        placeholder="e.g., Kathmandu Metropolitan"
                        className={inputClasses(!!errors.municipality)}
                        disabled={isLoading}
                    />
                    {errors.municipality && (
                        <p className="mt-1 text-sm text-red-500">{errors.municipality}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ward Number
                    </label>
                    <input
                        type="number"
                        name="wardNumber"
                        value={formData.wardNumber}
                        onChange={handleChange}
                        min="1"
                        max="33"
                        placeholder="1-33"
                        className={inputClasses(!!errors.wardNumber)}
                        disabled={isLoading}
                    />
                    {errors.wardNumber && (
                        <p className="mt-1 text-sm text-red-500">{errors.wardNumber}</p>
                    )}
                </div>
            </div>

            {/* Phone Number */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number
                </label>
                <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="98XXXXXXXX"
                    className={inputClasses(!!errors.phoneNumber)}
                    disabled={isLoading}
                />
                {errors.phoneNumber && (
                    <p className="mt-1 text-sm text-red-500">{errors.phoneNumber}</p>
                )}
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-4">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg 
              hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg 
            hover:bg-blue-700 transition-colors disabled:opacity-50
            flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing...
                        </>
                    ) : (
                        'Continue to Face Capture'
                    )}
                </button>
            </div>
        </form>
    );
};

export default CitizenForm;
